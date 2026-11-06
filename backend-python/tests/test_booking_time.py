import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.timezone import VIETNAM_TIMEZONE, vietnam_now, with_vietnam_timezone
from app.dependencies import get_current_user, require_staff
from app.main import app
from app.models import Bus, Route, Seat, Ticket, TicketStatus, Trip, User


@compiles(BigInteger, "sqlite")
def sqlite_integer(element, compiler, **kw):
    return "INTEGER"


class BookingTimeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine, autoflush=False)()
        self.user = User(username="customer", passwordHash="unused")
        route = Route(origin="Hanoi", destination="Vinh", distanceKm=300,
                      estimatedDurationMin=300, basePrice=Decimal("250000"))
        bus = Bus(licensePlate="TEST-01", totalSeats=1)
        self.seat = Seat(bus=bus, seatNumber="A1")
        self.trip = Trip(route=route, bus=bus, departureTime=datetime.now() + timedelta(days=2))
        self.db.add_all([self.user, self.seat, self.trip])
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[require_staff] = lambda: self.user
        # Avoid application startup migrations against the configured database.
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def book(self):
        return self.client.post("/api/private/tickets", json={
            "tripId": self.trip.id, "seatId": self.seat.id,
            "price": 250000, "passengerPhone": "0901234567",
        })

    def test_clock_uses_vietnam_date_on_utc_server(self):
        instant = datetime(2026, 11, 6, 18, 30, tzinfo=timezone.utc)

        class FrozenDatetime(datetime):
            @classmethod
            def now(cls, tz=None):
                return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

        with patch("app.core.timezone.datetime", FrozenDatetime):
            self.assertEqual(vietnam_now(), datetime(2026, 11, 7, 1, 30))

    def test_existing_vietnam_times_are_preserved_and_offset_is_explicit(self):
        self.assertIsNone(with_vietnam_timezone(None))
        local = datetime(2026, 11, 7, 1, 30)
        self.assertEqual(with_vietnam_timezone(local).isoformat(), "2026-11-07T01:30:00+07:00")
        utc = datetime(2026, 11, 6, 18, 30, tzinfo=timezone.utc)
        self.assertEqual(with_vietnam_timezone(utc), local.replace(tzinfo=VIETNAM_TIMEZONE))

    def test_booking_time_matches_all_admin_views(self):
        local = datetime(2026, 11, 7, 1, 30)
        expected = "2026-11-07T01:30:00+07:00"
        with patch("app.services.booking_service.vietnam_now", return_value=local):
            response = self.book()
        self.assertEqual(response.status_code, 200, response.text)
        ticket_id = response.json()["id"]
        self.assertEqual(response.json()["bookedAt"], expected)
        self.assertEqual(self.db.query(Ticket).one().bookedAt, local)
        for path in ("/api/admin/tickets", "/api/admin/tickets/all", "/api/private/tickets/my"):
            result = self.client.get(path)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()[0]["bookedAt"], expected)
        self.assertEqual(self.client.get(f"/api/admin/tickets/{ticket_id}").json()["bookedAt"], expected)
        self.assertEqual(self.client.get(f"/api/admin/trips/{self.trip.id}").json()["tickets"][0]["bookedAt"], expected)
        self.assertIn("BUS-20261107-", response.json()["ticketCode"])

    def test_rebooking_cancelled_ticket_refreshes_vietnam_time(self):
        ticket = Ticket(trip=self.trip, seat=self.seat, price=250000,
                        status=TicketStatus.CANCELLED, bookedAt=datetime(2026, 1, 1))
        self.db.add(ticket)
        self.db.commit()
        local = datetime(2026, 11, 7, 1, 30)
        with patch("app.services.booking_service.vietnam_now", return_value=local):
            response = self.book()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["bookedAt"], "2026-11-07T01:30:00+07:00")
        self.assertEqual(self.db.query(Ticket).one().bookedAt, local)


if __name__ == "__main__":
    unittest.main()
