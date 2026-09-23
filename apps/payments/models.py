from django.db import models


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        SEPAY = "SEPAY", "SePay VietQR"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"
        REVIEW_REQUIRED = "REVIEW_REQUIRED", "Review required"

    payment_code = models.CharField(max_length=30, unique=True)
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.RESTRICT,
        related_name="payment",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Method,
        default=Method.SEPAY,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=Status,
        default=Status.PENDING,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="chk_payments_amount",
            ),
        ]
        indexes = [
            models.Index(fields=["payment_status", "created_at"], name="idx_pay_status_created"),
        ]

    def __str__(self) -> str:
        return f"{self.payment_code} - {self.amount} ({self.payment_status})"


class PaymentTransaction(models.Model):
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    sepay_transaction_id = models.CharField(max_length=100, unique=True)
    gateway = models.CharField(max_length=50, default="SEPAY")
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    amount_in = models.DecimalField(max_digits=12, decimal_places=2)
    raw_payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_transactions"

    def __str__(self) -> str:
        return f"{self.sepay_transaction_id} - {self.amount_in}"
