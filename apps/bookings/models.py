from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    booking_code = models.CharField(max_length=30, unique=True)
    trip = models.ForeignKey(
        "operations.Trip",
        on_delete=models.RESTRICT,
        related_name="bookings",
    )
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_bookings",
    )
    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_bookings",
    )
    contact_name = models.CharField(max_length=120)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField(max_length=255, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    booking_status = models.CharField(
        max_length=20,
        choices=Status,
        default=Status.PENDING,
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bookings"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_amount__gte=0),
                name="chk_bookings_total",
            ),
        ]
        indexes = [
            models.Index(fields=["customer_user", "created_at"], name="idx_bkg_cust_created"),
            models.Index(fields=["trip", "booking_status"], name="idx_bkg_trip_status"),
            models.Index(fields=["booking_status", "expires_at"], name="idx_bkg_expiry"),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at and self.booking_status == self.Status.PENDING:
            tentative_expiry = timezone.now() + timedelta(minutes=15)
            if self.trip and self.trip.departure_time:
                self.expires_at = min(tentative_expiry, self.trip.departure_time)
            else:
                self.expires_at = tentative_expiry
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.booking_code} ({self.booking_status}) - {self.total_amount}"


class Ticket(models.Model):
    class Status(models.TextChoices):
        HELD = "HELD", "Held"
        CONFIRMED = "CONFIRMED", "Confirmed"
        USED = "USED", "Used"
        CANCELLED = "CANCELLED", "Cancelled"

    ticket_code = models.CharField(max_length=30, unique=True)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="tickets",
    )
    trip = models.ForeignKey(
        "operations.Trip",
        on_delete=models.RESTRICT,
        related_name="tickets",
    )
    bus_seat = models.ForeignKey(
        "operations.BusSeat",
        on_delete=models.RESTRICT,
        related_name="tickets",
    )
    passenger_name = models.CharField(max_length=120)
    passenger_phone = models.CharField(max_length=20, null=True, blank=True)
    fare = models.DecimalField(max_digits=12, decimal_places=2)
    ticket_status = models.CharField(
        max_length=20,
        choices=Status,
        default=Status.HELD,
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tickets"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fare__gte=0),
                name="chk_tickets_fare",
            ),
        ]
        indexes = [
            models.Index(fields=["booking", "ticket_status"], name="idx_tkt_booking_status"),
            models.Index(fields=["trip", "ticket_status"], name="idx_tkt_trip_status"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.trip and self.trip.bus and self.bus_seat:
            if self.bus_seat.bus_id != self.trip.bus_id:
                raise ValidationError("Ghế đã chọn không thuộc về xe của chuyến này.")

        if self.trip and self.bus_seat and self.ticket_status in (
            self.Status.HELD,
            self.Status.CONFIRMED,
            self.Status.USED,
        ):
            overlapping = Ticket.objects.filter(
                trip=self.trip,
                bus_seat=self.bus_seat,
                ticket_status__in=[self.Status.HELD, self.Status.CONFIRMED, self.Status.USED],
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError("Ghế này đã có người giữ hoặc đặt trên chuyến đi.")

    def __str__(self) -> str:
        return f"{self.ticket_code} - Seat {self.bus_seat.seat_number} ({self.ticket_status})"
