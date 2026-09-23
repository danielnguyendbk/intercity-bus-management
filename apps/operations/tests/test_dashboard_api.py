from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.operations.models import Bus, Route, Station, Trip

User = get_user_model()


class AdminDashboardApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Stations & Route
        self.st1 = Station.objects.create(
            station_code="BX-MD1",
            name="Bến xe Miền Đông",
            province_city="TP. Hồ Chí Minh",
        )
        self.st2 = Station.objects.create(
            station_code="BX-BD1",
            name="Bến xe Bình Dương",
            province_city="Bình Dương",
        )
        self.route = Route.objects.create(
            route_code="RT-SG-BD",
            route_name="TP. Hồ Chí Minh - Bình Dương",
            origin_station=self.st1,
            destination_station=self.st2,
            distance_km=35.0,
            estimated_duration_minutes=60,
            base_price=50000.0,
        )

    def test_get_dashboard_empty_or_base(self):
        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("totalUsers", data)
        self.assertIn("totalBuses", data)
        self.assertIn("totalRoutes", data)
        self.assertIn("todayTrips", data)
        self.assertIn("roleDistribution", data)
        self.assertIn("busStatusDistribution", data)
        self.assertIn("insuranceAlerts", data)
        self.assertEqual(data["totalRoutes"], 1)

    def test_get_dashboard_metrics_and_roles(self):
        User.objects.create_user(username="admin1", email="admin1@test.com", password="pwd", role=User.Role.ADMIN)
        User.objects.create_user(username="disp1", email="disp1@test.com", password="pwd", role=User.Role.DISPATCHER)
        User.objects.create_user(username="agent1", email="agent1@test.com", password="pwd", role=User.Role.TICKET_AGENT)
        User.objects.create_user(username="cust1", email="cust1@test.com", password="pwd", role=User.Role.CUSTOMER)
        User.objects.create_user(username="cust2", email="cust2@test.com", password="pwd", role=User.Role.CUSTOMER)

        res = self.client.get("/api/admin/dashboard/")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["totalUsers"], 5)
        role_map = {item["role"]: item["count"] for item in data["roleDistribution"]}
        self.assertEqual(role_map["ADMIN"], 1)
        self.assertEqual(role_map["STAFF"], 2)  # DISPATCHER + TICKET_AGENT
        self.assertEqual(role_map["CUSTOMER"], 2)

    def test_get_dashboard_bus_status_distribution(self):
        today = timezone.localdate()

        # Bus 1: AVAILABLE
        b1 = Bus.objects.create(
            license_plate="51B-00001",
            bus_type=Bus.BusType.SEATER,
            seat_capacity=30,
            status=Bus.Status.ACTIVE,
        )
        # Bus 2: MAINTENANCE
        b2 = Bus.objects.create(
            license_plate="51B-00002",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.MAINTENANCE,
        )
        # Bus 3: RUNNING (assigned to departed trip today)
        b3 = Bus.objects.create(
            license_plate="51B-00003",
            bus_type=Bus.BusType.LIMOUSINE,
            seat_capacity=20,
            status=Bus.Status.ACTIVE,
        )
        Trip.objects.create(
            trip_code="TRIP-TODAY-01",
            route=self.route,
            bus=b3,
            departure_time=timezone.now(),
            arrival_time=timezone.now() + timedelta(hours=2),
            ticket_price=60000,
            status=Trip.Status.DEPARTED,
        )

        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["totalBuses"], 3)
        self.assertEqual(data["todayTrips"], 1)

        bus_map = {item["status"]: item["count"] for item in data["busStatusDistribution"]}
        self.assertEqual(bus_map["AVAILABLE"], 1)
        self.assertEqual(bus_map["RUNNING"], 1)
        self.assertEqual(bus_map["MAINTENANCE"], 1)

    def test_get_dashboard_insurance_alerts(self):
        today = timezone.localdate()

        # Expired insurance (10 days ago)
        b_expired = Bus.objects.create(
            license_plate="51B-11111",
            bus_type=Bus.BusType.SEATER,
            seat_capacity=30,
            status=Bus.Status.MAINTENANCE,
            insurance_expiry=today - timedelta(days=10),
        )
        # Expiring soon (10 days from today)
        b_expiring = Bus.objects.create(
            license_plate="51B-22222",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.ACTIVE,
            insurance_expiry=today + timedelta(days=10),
        )
        # Safe insurance (60 days from today)
        b_safe = Bus.objects.create(
            license_plate="51B-33333",
            bus_type=Bus.BusType.LIMOUSINE,
            seat_capacity=20,
            status=Bus.Status.ACTIVE,
            insurance_expiry=today + timedelta(days=60),
        )
        # No insurance recorded
        b_none = Bus.objects.create(
            license_plate="51B-44444",
            bus_type=Bus.BusType.SEATER,
            seat_capacity=30,
            status=Bus.Status.ACTIVE,
            insurance_expiry=None,
        )

        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        alerts = data["insuranceAlerts"]
        self.assertEqual(len(alerts), 2)

        alert_plates = [a["licensePlate"] for a in alerts]
        self.assertIn("51B-11111", alert_plates)
        self.assertIn("51B-22222", alert_plates)
        self.assertNotIn("51B-33333", alert_plates)
        self.assertNotIn("51B-44444", alert_plates)

        expired_item = next(a for a in alerts if a["licensePlate"] == "51B-11111")
        self.assertEqual(expired_item["alertType"], "EXPIRED")
        self.assertEqual(expired_item["status"], "MAINTENANCE")

        expiring_item = next(a for a in alerts if a["licensePlate"] == "51B-22222")
        self.assertEqual(expiring_item["alertType"], "EXPIRING_SOON")
        self.assertEqual(expiring_item["status"], "AVAILABLE")
