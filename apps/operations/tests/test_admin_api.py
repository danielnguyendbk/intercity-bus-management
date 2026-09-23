from decimal import Decimal
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.operations.models import Bus, BusSeat, Route, Station


class AdminAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
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
            license_plate="29B-99999",
            bus_name="Xe Luxury",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=36,
            status=Bus.Status.ACTIVE,
        )

    def test_get_admin_routes(self):
        response = self.client.get("/api/admin/routes")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["origin"], "Hà Nội")
        self.assertEqual(response.data[0]["destination"], "Đà Nẵng")
        self.assertEqual(response.data[0]["basePrice"], 450000.0)

    def test_create_admin_route(self):
        payload = {
            "origin": "Hải Phòng",
            "destination": "Quảng Ninh",
            "distanceKm": 75,
            "estimatedDurationMin": 90,
            "basePrice": 120000,
        }
        response = self.client.post("/api/admin/routes", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["origin"], "Hải Phòng")
        self.assertEqual(response.data["destination"], "Quảng Ninh")
        self.assertEqual(response.data["basePrice"], 120000)

        # Verify Route created in DB
        self.assertTrue(Route.objects.filter(origin_station__province_city="Hải Phòng").exists())

    def test_update_admin_route(self):
        payload = {
            "basePrice": 480000,
            "isActive": False,
        }
        response = self.client.put(f"/api/admin/routes/{self.route.id}", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["basePrice"], 480000)
        self.assertEqual(response.data["isActive"], False)

    def test_get_admin_buses(self):
        response = self.client.get("/api/admin/buses")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["licensePlate"], "29B-99999")
        self.assertEqual(response.data[0]["status"], "AVAILABLE")

    def test_create_admin_bus_auto_generates_seats(self):
        payload = {
            "licensePlate": "51B-12345",
            "busType": "SLEEPER",
            "totalSeats": 40,
            "insuranceExpiry": "2028-12-31",
        }
        response = self.client.post("/api/admin/buses", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["licensePlate"], "51B-12345")
        self.assertEqual(response.data["totalSeats"], 40)

        # Verify seats were generated in DB
        bus = Bus.objects.get(license_plate="51B-12345")
        seats = BusSeat.objects.filter(bus=bus)
        self.assertEqual(seats.count(), 40)
        self.assertTrue(seats.filter(seat_number="A01").exists())
        self.assertTrue(seats.filter(seat_number="B01").exists())

    def test_update_admin_bus_status(self):
        payload = {"status": "MAINTENANCE"}
        response = self.client.put(f"/api/admin/buses/{self.bus.id}/status", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "MAINTENANCE")

        self.bus.refresh_from_db()
        self.assertEqual(self.bus.status, Bus.Status.MAINTENANCE)
