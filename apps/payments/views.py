import time
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.integrations.sepay import verify_sepay_auth
from apps.payments.models import Payment
from apps.payments.services import process_sepay_webhook


class SepayWebhookView(APIView):
    """
    Endpoint tiếp nhận thông báo biến động số dư từ cổng SePay (BR-026, BR-038).
    POST /api/payments/webhook/sepay/
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if not verify_sepay_auth(request):
            return Response(
                {"error": "Xác thực Webhook không hợp lệ (Unauthorized)"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        result = process_sepay_webhook(request.data)
        return Response(result, status=status.HTTP_200_OK)


class PaymentStatusView(APIView):
    """
    Endpoint kiểm tra trạng thái thanh toán theo payment_code phục vụ Polling từ màn hình giao diện.
    GET /api/payments/<payment_code>/status/
    GET /api/payments/status?code=PAY-XXXX
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, payment_code=None):
        code = (
            payment_code
            or request.query_params.get("code")
            or request.query_params.get("paymentCode")
        )
        if not code:
            return Response(
                {"error": "Vui lòng cung cấp mã payment_code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = (
            Payment.objects.select_related("booking")
            .filter(payment_code=code.strip())
            .first()
        )
        if not payment:
            return Response(
                {"error": "Không tìm thấy thông tin thanh toán."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "paymentCode": payment.payment_code,
            "paymentStatus": payment.payment_status,
            "bookingStatus": payment.booking.booking_status,
            "amount": float(payment.amount),
            "paidAt": payment.paid_at.isoformat() if payment.paid_at else None,
            "expiresAt": (
                payment.booking.expires_at.isoformat()
                if payment.booking.expires_at
                else None
            ),
        }
        return Response(data, status=status.HTTP_200_OK)


class SimulateSepayPaymentView(APIView):
    """
    Endpoint mô phỏng thanh toán thành công (dành cho demo / chấm đồ án mà không cần chuyển khoản thật).
    POST /api/payments/simulate/
    Body: { "paymentCode": "PAY-XXXXXX", "amount": 280000 }
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payment_code = request.data.get("paymentCode", "").strip()
        if not payment_code:
            return Response(
                {"error": "Thiếu paymentCode"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(payment_code=payment_code).first()
        if not payment:
            return Response(
                {"error": "Không tìm thấy giao dịch thanh toán này."},
                status=status.HTTP_404_NOT_FOUND,
            )

        amount = float(request.data.get("amount") or payment.amount)
        sim_payload = {
            "id": f"sim-{int(time.time() * 1000)}",
            "gateway": "SEPAY_SIMULATOR",
            "transactionDate": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
            "accountNumber": "0901000001",
            "transferType": "in",
            "transferAmount": amount,
            "content": f"Chuyen khoan {payment_code}",
            "referenceCode": f"SIM-{int(time.time())}",
            "description": f"Chuyen khoan ve xe {payment_code}",
        }

        result = process_sepay_webhook(sim_payload)
        return Response(result, status=status.HTTP_200_OK)
