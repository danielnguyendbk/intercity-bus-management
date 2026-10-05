"""SePay VietQR checkout and bank-verified webhook settlement."""
import hmac
import re
import secrets
from datetime import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.models.ticket import Payment, PaymentStatus, Ticket, TicketStatus


class SePayService:
    CODE_PATTERN = re.compile(r"(?<![A-Z0-9])BUS[0-9A-F]{24}(?![A-Z0-9])")

    @staticmethod
    def require_config():
        if not all((settings.SEPAY_API_KEY, settings.SEPAY_WEBHOOK_TOKEN,
                    settings.SEPAY_BANK_CODE, settings.SEPAY_ACCOUNT_NUMBER,
                    settings.SEPAY_ACCOUNT_NAME)):
            raise HTTPException(503, "Thanh toán SePay chưa được cấu hình đầy đủ.")

    @staticmethod
    def create_payment(ticket_id, user, db):
        SePayService.require_config()
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).with_for_update().first()
        if not ticket:
            raise HTTPException(404, "Không tìm thấy vé.")
        if not ticket.passenger or ticket.passenger.user_id != user.id:
            raise HTTPException(403, "Bạn không có quyền thanh toán vé này.")
        if ticket.status not in (TicketStatus.HOLD, TicketStatus.BOOKED):
            raise HTTPException(409, "Vé không còn ở trạng thái chờ thanh toán.")
        if ticket.trip and ticket.trip.departureTime <= datetime.now():
            raise HTTPException(409, "Chuyến xe đã khởi hành.")
        payment = db.query(Payment).filter(Payment.ticket_id == ticket.id).with_for_update().first()
        if payment and payment.status in (PaymentStatus.SUCCESS, PaymentStatus.REVIEW_REQUIRED):
            raise HTTPException(409, "Giao dịch đã được ghi nhận. Vui lòng kiểm tra trạng thái vé.")
        if (payment and payment.paymentMethod == "SEPAY" and payment.paymentCode
                and (payment.rawPayload or {}).get("checkout")):
            if payment.status != PaymentStatus.PENDING:
                raise HTTPException(409, "Giao dịch đã đóng. Vui lòng liên hệ nhân viên.")
            return ticket
        amount = Decimal(str(ticket.price))
        if not amount.is_finite() or amount <= 0 or amount != amount.to_integral_value():
            raise HTTPException(400, "Giá vé phải là số nguyên VND lớn hơn 0.")
        code = "BUS" + secrets.token_hex(12).upper()
        info = {
            "bankName": settings.SEPAY_BANK_CODE,
            "accountNumber": settings.SEPAY_ACCOUNT_NUMBER,
            "accountName": settings.SEPAY_ACCOUNT_NAME,
        }
        info["qrUrl"] = "https://vietqr.app/img?" + urlencode({
            "acc": info["accountNumber"], "bank": info["bankName"],
            "amount": str(int(amount)), "des": code, "template": "compact",
            "holder": info["accountName"],
        })
        if payment is None:
            payment = Payment(ticket_id=ticket.id)
            db.add(payment)
        payment.amount = amount
        payment.paymentMethod = "SEPAY"
        payment.paymentCode = code
        payment.status = PaymentStatus.PENDING
        payment.transactionCode = None
        payment.paidAt = None
        payment.rawPayload = {"checkout": info}
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def get_status(code, user, db):
        payment = db.query(Payment).filter(Payment.paymentCode == code).first()
        if not payment or not payment.ticket or not payment.ticket.passenger or payment.ticket.passenger.user_id != user.id:
            raise HTTPException(404, "Không tìm thấy giao dịch.")
        return {
            "paymentCode": code, "paymentStatus": payment.status.value,
            "amount": payment.amount, "paidAt": payment.paidAt,
            "ticketId": payment.ticket_id,
            "seatNumber": payment.ticket.seat.seatNumber if payment.ticket.seat else None,
        }

    @staticmethod
    def authenticate_webhook(authorization):
        token = settings.SEPAY_WEBHOOK_TOKEN
        if not token:
            raise HTTPException(503, "SePay webhook chưa được cấu hình.")
        scheme, _, credential = authorization.partition(" ")
        if scheme.lower() != "apikey" or not hmac.compare_digest(credential.encode(), token.encode()):
            raise HTTPException(401, "Invalid webhook credentials")

    @staticmethod
    async def verify_transaction(payload):
        if not isinstance(payload, dict) or not str(payload.get("id", "")).isdigit():
            raise HTTPException(400, "Missing transaction id")
        if not settings.SEPAY_API_KEY:
            raise HTTPException(503, "SePay API chưa được cấu hình.")
        # Never settle from browser data or a webhook's claimed amount alone.
        transaction_id = str(payload["id"])
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://my.sepay.vn/userapi/transactions/details/{transaction_id}",
                    headers={"Authorization": f"Bearer {settings.SEPAY_API_KEY}"},
                )
                response.raise_for_status()
                body = response.json()
            transaction = body.get("transaction") or body.get("data")
            if not isinstance(transaction, dict) or str(transaction.get("id")) != transaction_id:
                raise ValueError("Unexpected transaction response")
            return transaction
        except (httpx.HTTPError, ValueError, AttributeError) as exc:
            import logging
            logging.getLogger("sepay").warning("SePay API verification failed for transaction %s: %s", transaction_id, exc)
            raise HTTPException(502, "Chưa đối chiếu được giao dịch với SePay; webhook cần gửi lại.")

    @staticmethod
    def settle(transaction, db):
        content = " ".join([
            str(transaction.get("code") or ""),
            str(transaction.get("transaction_content") or ""),
            str(transaction.get("content") or ""),
            str(transaction.get("description") or ""),
        ])
        codes = set(SePayService.CODE_PATTERN.findall(content.upper()))
        if len(codes) != 1:
            return None
        code = codes.pop()
        payment = db.query(Payment).filter(Payment.paymentCode == code).first()
        if not payment:
            return None
        # Lock ticket before payment, matching checkout/cancellation lock order.
        ticket = db.query(Ticket).filter(Ticket.id == payment.ticket_id).with_for_update().first()
        payment = db.query(Payment).filter(Payment.id == payment.id).populate_existing().with_for_update().first()
        if not ticket or payment.paymentMethod != "SEPAY" or payment.status in (PaymentStatus.SUCCESS, PaymentStatus.REVIEW_REQUIRED):
            return None
        info = (payment.rawPayload or {}).get("checkout", {})
        configured_account = (info.get("accountNumber") or "").strip().upper()
        accounts = {
            str(a or "").strip().upper()
            for a in (
                transaction.get("account_number"),
                transaction.get("accountNumber"),
                transaction.get("sub_account"),
                transaction.get("subAccount"),
            )
            if a
        }
        if not configured_account or configured_account not in accounts:
            return None
        try:
            amount_val = transaction.get("amount_in") if transaction.get("amount_in") is not None else transaction.get("transferAmount", 0)
            amount = Decimal(str(amount_val))
            outgoing = Decimal(str(transaction.get("amount_out", 0)))
        except InvalidOperation:
            raise HTTPException(502, "Invalid SePay amount")
        if not amount.is_finite() or not outgoing.is_finite() or amount <= 0 or outgoing != 0:
            return None
        transaction_id = str(transaction["id"])
        if db.query(Payment).filter(Payment.sepayTransactionId == transaction_id).first():
            return None
        payment.sepayTransactionId = transaction_id
        payment.transactionCode = str(transaction.get("reference_number") or transaction.get("referenceCode") or transaction_id)
        payment.rawPayload = {**(payment.rawPayload or {}), "transaction": transaction}
        if amount != payment.amount or ticket.status not in (TicketStatus.HOLD, TicketStatus.BOOKED):
            payment.status = PaymentStatus.REVIEW_REQUIRED
            payment.notes = "SePay: amount mismatch or ticket no longer payable; manual reconciliation required."
            SePayService._commit_transaction(db, transaction_id)
            return None
        paid_at = datetime.now()
        payment.status = PaymentStatus.SUCCESS
        payment.paidAt = paid_at
        ticket.status = TicketStatus.PAID
        ticket.paidAt = paid_at
        event = {
            "ticketId": ticket.id, "tripId": ticket.trip_id,
            "seatNumber": ticket.seat.seatNumber if ticket.seat else "",
            "passengerName": ticket.passenger.fullName if ticket.passenger else "",
            "passengerPhone": ticket.passenger.phone if ticket.passenger else "",
            "amount": float(payment.amount), "paymentCode": code,
            "transactionId": transaction_id, "paidAt": paid_at.isoformat(),
            "pickupPoint": ticket.pickupPoint, "dropoffPoint": ticket.dropoffPoint,
        }
        if not SePayService._commit_transaction(db, transaction_id):
            return None
        return event

    @staticmethod
    def _commit_transaction(db, transaction_id):
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if db.query(Payment).filter(Payment.sepayTransactionId == transaction_id).first():
                return False
            raise
        return True
