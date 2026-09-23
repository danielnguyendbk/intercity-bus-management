from django.urls import path

from apps.payments.views import (
    PaymentStatusView,
    SepayWebhookView,
    SimulateSepayPaymentView,
)

app_name = "payments"

urlpatterns = [
    path("webhook/sepay/", SepayWebhookView.as_view(), name="sepay-webhook"),
    path("webhook/sepay", SepayWebhookView.as_view(), name="sepay-webhook-no-slash"),
    path("status/", PaymentStatusView.as_view(), name="payment-status-query"),
    path("status", PaymentStatusView.as_view(), name="payment-status-query-no-slash"),
    path("<str:payment_code>/status/", PaymentStatusView.as_view(), name="payment-status"),
    path("<str:payment_code>/status", PaymentStatusView.as_view(), name="payment-status-no-slash"),
    path("simulate/", SimulateSepayPaymentView.as_view(), name="payment-simulate"),
    path("simulate", SimulateSepayPaymentView.as_view(), name="payment-simulate-no-slash"),
]
