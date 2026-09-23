from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.bookings.models import Booking, Ticket
from apps.payments.integrations.sepay import extract_payment_code
from apps.payments.models import Payment, PaymentTransaction


def process_sepay_webhook(payload: dict) -> dict:
    """
    Xử lý giao dịch webhook từ SePay:
    - Idempotency theo sepay_transaction_id (BR-027)
    - Đối soát payment_code và số tiền (BR-028)
    - Kích hoạt SUCCESS / CONFIRMED nếu hợp lệ (BR-029)
    - Đánh dấu REVIEW_REQUIRED nếu trễ hạn hoặc sai số tiền (BR-030)
    - Lưu audit log vào payment_transactions (BR-031)
    """
    sepay_tx_id = str(payload.get("id", ""))
    if not sepay_tx_id:
        return {"success": False, "error": "Thiếu mã giao dịch sepay transaction id"}

    # 1. Idempotency check: Tránh xử lý lặp lại giao dịch đã ghi nhận
    if PaymentTransaction.objects.filter(sepay_transaction_id=sepay_tx_id).exists():
        return {
            "success": True,
            "status": "ALREADY_PROCESSED",
            "message": "Giao dịch đã được ghi nhận trước đó (Idempotent OK)",
        }

    # 2. Tìm payment_code từ nội dung chuyển khoản hoặc trường code do SePay bóc tách
    raw_code = str(payload.get("code") or "")
    content = str(payload.get("content") or payload.get("description") or "")
    payment_code = extract_payment_code(raw_code) or extract_payment_code(content)

    transfer_type = str(payload.get("transferType") or "in").lower()
    if transfer_type == "out":
        return {
            "success": True,
            "status": "IGNORED_OUTGOING",
            "message": "Bỏ qua giao dịch tiền ra (transferType == 'out')",
        }

    payment = None
    if payment_code:
        payment = (
            Payment.objects.select_related("booking")
            .filter(payment_code=payment_code)
            .first()
        )
        if not payment:
            clean_code = payment_code.replace("-", "").upper()
            candidates = Payment.objects.select_related("booking").filter(
                payment_status__in=[Payment.Status.PENDING, Payment.Status.REVIEW_REQUIRED]
            ).order_by("-id")[:50]
            for c in candidates:
                if c.payment_code.replace("-", "").upper() == clean_code:
                    payment = c
                    payment_code = c.payment_code
                    break

    transfer_amount = Decimal(str(payload.get("transferAmount", 0)))
    gateway = payload.get("gateway", "SEPAY")
    reference_code = payload.get("referenceCode") or payload.get("code") or ""

    now = timezone.now()
    result_status = "UNMATCHED"

    with transaction.atomic():
        if payment:
            booking = payment.booking
            is_expired = bool(booking.expires_at and booking.expires_at < now)
            is_cancelled = booking.booking_status == Booking.Status.CANCELLED

            if not is_expired and not is_cancelled and transfer_amount >= payment.amount:
                # Thanh toán đúng hạn và đủ tiền
                payment.payment_status = Payment.Status.SUCCESS
                payment.paid_at = now
                payment.save(update_fields=["payment_status", "paid_at", "updated_at"])

                booking.booking_status = Booking.Status.CONFIRMED
                booking.save(update_fields=["booking_status"])

                Ticket.objects.filter(booking=booking).update(
                    ticket_status=Ticket.Status.CONFIRMED
                )
                result_status = "SUCCESS"
            else:
                # Chuyển khoản quá hạn hoặc thiếu tiền -> Yêu cầu kiểm duyệt thủ công
                payment.payment_status = Payment.Status.REVIEW_REQUIRED
                payment.notes = (
                    "Thanh toán trễ hạn sau 15 phút hoặc sai lệch số tiền"
                    if is_expired
                    else "Số tiền thanh toán không khớp"
                )
                payment.save(update_fields=["payment_status", "notes", "updated_at"])
                result_status = "REVIEW_REQUIRED"

        # 3. Ghi nhận lịch sử giao dịch webhook SePay (Audit Log)
        PaymentTransaction.objects.create(
            payment=payment,
            sepay_transaction_id=sepay_tx_id,
            gateway=gateway,
            reference_number=reference_code,
            amount_in=transfer_amount,
            raw_payload=payload,
        )

    return {
        "success": True,
        "status": result_status,
        "paymentCode": payment_code,
        "amount": float(transfer_amount),
    }
