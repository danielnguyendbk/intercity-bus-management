from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking, Ticket
from apps.operations.models import Bus, BusSeat, Route, Station, Trip
from apps.payments.integrations.sepay import get_sepay_config
from apps.payments.models import Payment, PaymentTransaction

User = get_user_model()


class SepayWebhookTestCase(TestCase):
    def setUp(self):
        self.client = APIClient(SERVER_NAME="localhost")
        self.api_key = get_sepay_config()["api_key"]
        self.auth_header = f"Apikey {self.api_key}"

        # Create base data
        self.user = User.objects.create_user(
            username="khach01",
            email="khach01@test.com",
            password="pwd",
            role=User.Role.CUSTOMER,
        )
        self.st1 = Station.objects.create(
            station_code="BX-1",
            name="Ben Xe 1",
            province_city="TP. HCM",
        )
        self.st2 = Station.objects.create(
            station_code="BX-2",
            name="Ben Xe 2",
            province_city="Da Lat",
        )
        self.route = Route.objects.create(
            route_code="RT-1",
            route_name="TP. HCM - Da Lat",
            origin_station=self.st1,
            destination_station=self.st2,
            distance_km=300,
            estimated_duration_minutes=360,
            base_price=280000,
        )
        self.bus = Bus.objects.create(
            license_plate="51B-999.99",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.ACTIVE,
        )
        self.seat = BusSeat.objects.create(
            bus=self.bus,
            seat_number="A01",
            floor_number=1,
            seat_row=1,
            column_number=1,
        )
        self.trip = Trip.objects.create(
            trip_code="TRIP-TEST-01",
            route=self.route,
            bus=self.bus,
            departure_time=timezone.now() + timedelta(days=1),
            arrival_time=timezone.now() + timedelta(days=1, hours=6),
            ticket_price=280000,
            status=Trip.Status.OPEN_FOR_BOOKING,
        )

        # Create Booking & Payment
        self.booking = Booking.objects.create(
            booking_code="BKG-TEST-001",
            trip=self.trip,
            customer_user=self.user,
            contact_name="Khach Test",
            contact_phone="0912345678",
            total_amount=Decimal("280000"),
            booking_status=Booking.Status.PENDING,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        self.ticket = Ticket.objects.create(
            ticket_code="TKT-TEST-001",
            booking=self.booking,
            trip=self.trip,
            bus_seat=self.seat,
            passenger_name="Khach Test",
            fare=Decimal("280000"),
            ticket_status=Ticket.Status.HELD,
        )
        self.payment = Payment.objects.create(
            payment_code="PAY-TEST-001",
            booking=self.booking,
            payment_method=Payment.Method.SEPAY,
            amount=Decimal("280000"),
            payment_status=Payment.Status.PENDING,
        )

    def test_sepay_webhook_success(self):
        payload = {
            "id": 999901,
            "gateway": "MBBank",
            "transactionDate": "2026-09-13 02:00:00",
            "accountNumber": "0901000001",
            "transferType": "in",
            "transferAmount": 280000,
            "content": "Thanh toan ve xe PAY-TEST-001",
            "referenceCode": "FT260913999",
        }

        res = self.client.post(
            "/api/payments/webhook/sepay/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "SUCCESS")

        # Verify DB changes
        self.payment.refresh_from_db()
        self.booking.refresh_from_db()
        self.ticket.refresh_from_db()

        self.assertEqual(self.payment.payment_status, Payment.Status.SUCCESS)
        self.assertIsNotNone(self.payment.paid_at)
        self.assertEqual(self.booking.booking_status, Booking.Status.CONFIRMED)
        self.assertEqual(self.ticket.ticket_status, Ticket.Status.CONFIRMED)

        # Verify audit transaction log
        tx = PaymentTransaction.objects.filter(sepay_transaction_id="999901").first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount_in, Decimal("280000"))

    def test_sepay_webhook_idempotency(self):
        payload = {
            "id": 999902,
            "gateway": "MBBank",
            "transferType": "in",
            "transferAmount": 280000,
            "content": "Thanh toan PAY-TEST-001",
        }

        # First call
        res1 = self.client.post(
            "/api/payments/webhook/sepay/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(res1.status_code, 200)

        # Second call with same id
        res2 = self.client.post(
            "/api/payments/webhook/sepay/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["status"], "ALREADY_PROCESSED")

        # Total transaction count for this id should be exactly 1
        count = PaymentTransaction.objects.filter(sepay_transaction_id="999902").count()
        self.assertEqual(count, 1)

    def test_sepay_webhook_unauthorized(self):
        payload = {"id": 999903, "transferAmount": 280000}
        res = self.client.post(
            "/api/payments/webhook/sepay/",
            payload,
            format="json",
            HTTP_AUTHORIZATION="Apikey wrong_secret_key",
        )
        self.assertEqual(res.status_code, 401)

    def test_sepay_webhook_late_payment(self):
        # Set booking expired in the past
        self.booking.expires_at = timezone.now() - timedelta(minutes=5)
        self.booking.save()

        payload = {
            "id": 999904,
            "gateway": "MBBank",
            "transferType": "in",
            "transferAmount": 280000,
            "content": "Thanh toan PAY-TEST-001",
        }

        res = self.client.post(
            "/api/payments/webhook/sepay/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=self.auth_header,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "REVIEW_REQUIRED")

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, Payment.Status.REVIEW_REQUIRED)

    def test_payment_status_polling(self):
        res = self.client.get("/api/payments/PAY-TEST-001/status/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["paymentCode"], "PAY-TEST-001")
        self.assertEqual(data["paymentStatus"], "PENDING")
        self.assertEqual(data["bookingStatus"], "PENDING")

    def test_simulate_payment_endpoint(self):
        res = self.client.post(
            "/api/payments/simulate/",
            {"paymentCode": "PAY-TEST-001"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, Payment.Status.SUCCESS)
