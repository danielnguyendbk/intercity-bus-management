from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.bookings.models import Booking, Ticket
from apps.operations.models import Bus, BusSeat, Route, Station, Trip
from apps.payments.models import Payment


class CustomerBookingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="customer_test",
            email="cust@example.com",
            password="Password123!",
            first_name="Hanh",
            last_name="Khach",
            role=User.Role.CUSTOMER,
            phone="0911000111",
        )

        self.station_hn = Station.objects.create(
            station_code="BX-HN",
            name="Bến xe Mỹ Đình",
            province_city="Hà Nội",
        )
        self.station_dn = Station.objects.create(
            station_code="BX-DN",
            name="Bến xe Đà Nẵng",
            province_city="Đà Nẵng",
        )
        self.route = Route.objects.create(
            route_code="RT-HNDN",
            route_name="Hà Nội - Đà Nẵng",
            origin_station=self.station_hn,
            destination_station=self.station_dn,
            distance_km=Decimal("760.00"),
            estimated_duration_minutes=840,
            base_price=Decimal("450000.00"),
        )
        self.bus = Bus.objects.create(
            license_plate="29B-88888",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.ACTIVE,
        )
        self.seat1 = BusSeat.objects.create(
            bus=self.bus,
            seat_number="A01",
            floor_number=1,
            seat_row=1,
            column_number=1,
        )
        self.seat2 = BusSeat.objects.create(
            bus=self.bus,
            seat_number="A02",
            floor_number=1,
            seat_row=1,
            column_number=2,
        )

        now = timezone.now() + timedelta(days=2)
        self.dep = now.replace(hour=8, minute=0, second=0, microsecond=0)
        self.arr = now.replace(hour=18, minute=0, second=0, microsecond=0)

        self.trip = Trip.objects.create(
            trip_code="TRIP-BKG-01",
            route=self.route,
            bus=self.bus,
            departure_time=self.dep,
            arrival_time=self.arr,
            ticket_price=self.route.base_price,
            status=Trip.Status.OPEN_FOR_BOOKING,
        )

    def test_search_trips(self):
        response = self.client.get("/api/public/trips/search?origin=Hà Nội&destination=Đà Nẵng")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        trip_data = response.data[0]
        self.assertEqual(trip_data["origin"], "Hà Nội")
        self.assertEqual(trip_data["destination"], "Đà Nẵng")
        self.assertEqual(trip_data["totalSeats"], 40)
        self.assertEqual(trip_data["availableSeats"], 40)

        # Alias / abbreviation test
        res_alias = self.client.get("/api/public/trips/search?origin=HN&destination=DN")
        self.assertEqual(res_alias.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_alias.data), 1)

    def test_get_trip_seats(self):
        response = self.client.get(f"/api/public/trips/{self.trip.id}/seats")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        seat_data = response.data[0]
        self.assertEqual(seat_data["seatNumber"], "A01")
        self.assertFalse(seat_data["booked"])

    def test_book_ticket_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "tripId": self.trip.id,
            "seatId": self.seat1.id,
            "price": 450000,
            "passengerPhone": "0911000111",
        }
        response = self.client.post("/api/private/tickets", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["seatNumber"], "A01")
        self.assertEqual(response.data["status"], "HOLD")
        self.assertEqual(response.data["passengerPhone"], "0911000111")
        self.assertIn("qrUrl", response.data)
        self.assertIn("paymentCode", response.data)

        # Verify seat is now booked / held
        seat_res = self.client.get(f"/api/public/trips/{self.trip.id}/seats")
        seat1_info = next(s for s in seat_res.data if s["id"] == self.seat1.id)
        self.assertTrue(seat1_info["booked"])

        # Verify Payment and Booking created in DB
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.ticket_status, Ticket.Status.HELD)
        self.assertEqual(ticket.booking.booking_status, Booking.Status.PENDING)
        self.assertTrue(Payment.objects.filter(booking=ticket.booking).exists())

    def test_double_booking_rejected(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "tripId": self.trip.id,
            "seatId": self.seat1.id,
            "price": 450000,
            "passengerPhone": "0911000111",
        }
        res1 = self.client.post("/api/private/tickets", payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second attempt for the same seat on the same trip -> 409 Conflict
        res2 = self.client.post("/api/private/tickets", payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)

    def test_get_my_tickets(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "tripId": self.trip.id,
            "seatId": self.seat2.id,
            "price": 450000,
            "passengerPhone": "0911000111",
        }
        self.client.post("/api/private/tickets", payload, format="json")

        response = self.client.get("/api/private/tickets/my")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["seatNumber"], "A02")

    def test_cancel_ticket(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "tripId": self.trip.id,
            "seatId": self.seat1.id,
            "price": 450000,
            "passengerPhone": "0911000111",
        }
        res = self.client.post("/api/private/tickets", payload, format="json")
        ticket_id = res.data["id"]

        cancel_res = self.client.put(f"/api/private/tickets/{ticket_id}/cancel")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data["status"], "CANCELLED")

        # Seat should now be free again
        seat_res = self.client.get(f"/api/public/trips/{self.trip.id}/seats")
        seat1_info = next(s for s in seat_res.data if s["id"] == self.seat1.id)
        self.assertFalse(seat1_info["booked"])
