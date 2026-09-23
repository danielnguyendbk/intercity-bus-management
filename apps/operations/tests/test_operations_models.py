from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from apps.operations.models import Bus, BusSeat, Route, Station


class OperationsModelTests(TestCase):
    def setUp(self):
        self.station_hn = Station.objects.create(
            station_code="BX-HN",
            name="Bến xe Mỹ Đình",
            province_city="Hà Nội",
        )
        self.station_dn = Station.objects.create(
            station_code="BX-DN",
            name="Bến xe Trung tâm Đà Nẵng",
            province_city="Đà Nẵng",
        )

    def test_station_creation(self):
        self.assertEqual(str(self.station_hn), "BX-HN - Bến xe Mỹ Đình")
        with self.assertRaises(IntegrityError):
            Station.objects.create(
                station_code="BX-HN",
                name="Trùng mã",
                province_city="Hà Nội",
            )

    def test_route_creation(self):
        route = Route.objects.create(
            route_code="RT-HNDN",
            route_name="Hà Nội - Đà Nẵng",
            origin_station=self.station_hn,
            destination_station=self.station_dn,
            distance_km=Decimal("760.00"),
            estimated_duration_minutes=840,
            base_price=Decimal("450000.00"),
        )
        self.assertEqual(route.status, Route.Status.ACTIVE)
        self.assertEqual(str(route), "RT-HNDN: Hà Nội - Đà Nẵng")

    def test_route_same_origin_destination_validation(self):
        route = Route(
            route_code="RT-SAME",
            route_name="Hà Nội - Hà Nội",
            origin_station=self.station_hn,
            destination_station=self.station_hn,
            base_price=Decimal("100000.00"),
        )
        with self.assertRaises(ValidationError):
            route.clean()

    def test_route_negative_price_validation(self):
        route = Route(
            route_code="RT-NEG",
            route_name="Hà Nội - Đà Nẵng",
            origin_station=self.station_hn,
            destination_station=self.station_dn,
            base_price=Decimal("-1000.00"),
        )
        with self.assertRaises(ValidationError):
            route.clean()

    def test_bus_creation_and_seats(self):
        bus = Bus.objects.create(
            license_plate="29B-12345",
            bus_name="Xe Vip 01",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.ACTIVE,
        )
        self.assertEqual(str(bus), "29B-12345 - SLEEPER")

        seat = BusSeat.objects.create(
            bus=bus,
            seat_number="A01",
            floor_number=1,
            seat_type=BusSeat.SeatType.STANDARD,
        )
        self.assertEqual(str(seat), "29B-12345 - Seat A01")

        # Duplicate seat number for the same bus should fail
        with self.assertRaises(IntegrityError):
            BusSeat.objects.create(
                bus=bus,
                seat_number="A01",
                floor_number=1,
            )
