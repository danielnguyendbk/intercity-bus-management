import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, Request

from app.models.ticket import Ticket, Payment, TicketStatus, PaymentMethod, PaymentStatus
from app.models.user import User
from app.schemas.trips_tickets import VnpayPaymentResponse
from app.services.vnpay_util import build_payment_url, verify_secure_hash, format_vnp_datetime
from app.services.sse_service import broker
from app.core.config import settings

class VNPayService:
    @staticmethod
    def create_payment_url(ticket_id: int, current_user: User, db: Session, client_ip: str) -> VnpayPaymentResponse:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy vé #{ticket_id}")

        if not ticket.passenger or ticket.passenger.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thanh toán vé này")

        if ticket.status != TicketStatus.HOLD:
            raise HTTPException(status_code=400, detail=f"Chỉ vé ở trạng thái chờ thanh toán (HOLD) mới có thể thanh toán online. Hiện tại: {ticket.status}")

        existing_payment = db.query(Payment).filter(Payment.ticket_id == ticket.id).first()
        if existing_payment and existing_payment.status == PaymentStatus.SUCCESS:
            raise HTTPException(status_code=400, detail="Vé này đã được thanh toán thành công trước đó")

        txn_ref = f"TICKET{ticket.id}_{int(datetime.now().timestamp() * 1000)}"
        now = datetime.now()
        amount = int(ticket.price * 100)

        vnp_params = {
            "vnp_Version": settings.VNPAY_VERSION,
            "vnp_Command": settings.VNPAY_COMMAND,
            "vnp_TmnCode": settings.VNPAY_TMN_CODE,
            "vnp_Amount": str(amount),
            "vnp_CurrCode": settings.VNPAY_CURRENCY_CODE,
            "vnp_TxnRef": txn_ref,
            "vnp_OrderInfo": f"Thanh toan ve xe #{ticket.id}",
            "vnp_OrderType": settings.VNPAY_ORDER_TYPE,
            "vnp_Locale": settings.VNPAY_LOCALE,
            "vnp_ReturnUrl": settings.VNPAY_RETURN_URL,
            "vnp_IpAddr": client_ip or "127.0.0.1",
            "vnp_CreateDate": format_vnp_datetime(now),
            "vnp_ExpireDate": format_vnp_datetime(now + timedelta(minutes=settings.VNPAY_EXPIRE_MINUTES))
        }

        if not existing_payment:
            payment = Payment(
                ticket_id=ticket.id,
                amount=ticket.price,
                paymentMethod=PaymentMethod.VNPAY,
                status=PaymentStatus.PENDING,
                vnpTxnRef=txn_ref
            )
            db.add(payment)
        else:
            payment = existing_payment
            payment.amount = ticket.price
            payment.paymentMethod = PaymentMethod.VNPAY
            payment.status = PaymentStatus.PENDING
            payment.vnpTxnRef = txn_ref
            payment.transactionCode = None
            payment.paidAt = None

        db.commit()

        payment_url = build_payment_url(vnp_params)
        return VnpayPaymentResponse(
            paymentUrl=payment_url,
            txnRef=txn_ref,
            expireAt=vnp_params["vnp_ExpireDate"]
        )

    @staticmethod
    def process_ipn(params: Dict[str, str], db: Session) -> Dict[str, str]:
        txn_ref = params.get("vnp_TxnRef")
        response_code = params.get("vnp_ResponseCode")
        transaction_no = params.get("vnp_TransactionNo")
        secure_hash = params.get("vnp_SecureHash")

        if not txn_ref:
            return {"RspCode": "01", "Message": "Order not found"}

        incoming_tmn = params.get("vnp_TmnCode")
        if incoming_tmn != settings.VNPAY_TMN_CODE:
            return {"RspCode": "02", "Message": "Invalid TmnCode"}

        if not verify_secure_hash(params, secure_hash):
            return {"RspCode": "97", "Message": "Invalid signature"}

        payment = db.query(Payment).filter(Payment.vnpTxnRef == txn_ref).first()
        if not payment:
            return {"RspCode": "01", "Message": "Order not found"}

        if payment.status == PaymentStatus.SUCCESS:
            return {"RspCode": "00", "Message": "Confirm Success"}

        ticket = payment.ticket
        if not ticket:
            return {"RspCode": "99", "Message": "Unknown error"}

        amount_str = params.get("vnp_Amount")
        try:
            vnp_amount = int(amount_str)
            expected_amount = int(ticket.price * 100)
            if vnp_amount != expected_amount:
                return {"RspCode": "04", "Message": "Invalid amount"}
        except Exception:
            return {"RspCode": "04", "Message": "Invalid amount"}

        is_success = (response_code == "00")
        payment.vnpTransactionNo = transaction_no
        payment.vnpBankCode = params.get("vnp_BankCode")
        payment.vnpCardType = params.get("vnp_CardType")
        payment.vnpResponseCode = response_code
        payment.transactionCode = f"VNP{transaction_no}" if transaction_no else txn_ref

        if is_success:
            paid_at = datetime.now()
            payment.status = PaymentStatus.SUCCESS
            payment.paidAt = paid_at
            ticket.status = TicketStatus.PAID
            ticket.paidAt = paid_at

            # Send Realtime Notification to Admin
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(broker.broadcast("payment.vnpay.success", {
                        "ticketId": ticket.id,
                        "tripId": ticket.trip_id,
                        "seatNumber": ticket.seat.seatNumber if ticket.seat else "",
                        "passengerName": ticket.passenger.fullName if ticket.passenger else "",
                        "passengerPhone": ticket.passenger.phone if ticket.passenger else "",
                        "amount": float(payment.amount),
                        "vnpTxnRef": txn_ref,
                        "vnpTransactionNo": transaction_no,
                        "vnpBankCode": payment.vnpBankCode,
                        "paidAt": paid_at.isoformat()
                    }))
            except Exception:
                pass
        else:
            payment.status = PaymentStatus.FAILED

        db.commit()
        return {"RspCode": "00", "Message": "Confirm Success"}

    @staticmethod
    def verify_return(params: Dict[str, str], db: Session) -> Dict[str, Any]:
        secure_hash = params.get("vnp_SecureHash")
        is_valid = verify_secure_hash(params, secure_hash)
        if not is_valid:
            return {"success": False, "error": "Xác thực không hợp lệ"}

        # Local fallback execution
        try:
            VNPayService.process_ipn(params, db)
        except Exception:
            pass

        response_code = params.get("vnp_ResponseCode")
        amount = 0.0
        try:
            amount = float(Decimal(params.get("vnp_Amount", "0")) / 100)
        except Exception:
            pass

        return {
            "txnRef": params.get("vnp_TxnRef"),
            "responseCode": response_code,
            "transactionNo": params.get("vnp_TransactionNo"),
            "amount": amount,
            "bankCode": params.get("vnp_BankCode"),
            "cardType": params.get("vnp_CardType"),
            "payDate": params.get("vnp_PayDate"),
            "orderInfo": params.get("vnp_OrderInfo"),
            "success": (response_code == "00")
        }
