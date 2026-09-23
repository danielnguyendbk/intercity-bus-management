from datetime import datetime
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Employee
from apps.operations.models import Bus, Route, Station, Trip, TripStaffAssignment


class DispatcherAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
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
        self.bus1 = Bus.objects.create(
            license_plate="29B-11111",
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40,
            status=Bus.Status.ACTIVE,
        )
        self.bus2 = Bus.objects.create(
            license_plate="29B-22222",
            bus_type=Bus.BusType.SEATER,
            seat_capacity=30,
            status=Bus.Status.ACTIVE,
        )
        self.driver = Employee.objects.create(
            employee_code="DRV-001",
            full_name="Nguyen Van Lai",
            phone="0911223344",
            employee_type=Employee.EmployeeType.DRIVER,
            license_number="GPLX-12345",
            license_expiry="2030-01-01",
        )
        self.attendant = Employee.objects.create(
            employee_code="ATT-001",
            full_name="Tran Thi Phu",
            phone="0911223355",
            employee_type=Employee.EmployeeType.BUS_ATTENDANT,
        )

        now = timezone.now()
        self.dep1 = now.replace(hour=8, minute=0, second=0, microsecond=0)
        self.arr1 = now.replace(hour=16, minute=0, second=0, microsecond=0)

        self.trip = Trip.objects.create(
            trip_code="TRIP-001",
            route=self.route,
            bus=self.bus1,
            departure_time=self.dep1,
            arrival_time=self.arr1,
            ticket_price=self.route.base_price,
            status=Trip.Status.OPEN_FOR_BOOKING,
        )

    def test_get_trips_list(self):
        response = self.client.get("/api/trips")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        trip_data = response.data[0]
        self.assertEqual(trip_data["routeName"], "Hà Nội - Đà Nẵng")
        self.assertEqual(trip_data["status"], "SCHEDULED")
        self.assertIn("assignments", trip_data)

    def test_create_trip_success(self):
        now = timezone.now()
        dep = now.replace(hour=18, minute=0, second=0, microsecond=0)
        arr = now.replace(hour=23, minute=59, second=0, microsecond=0)

        payload = {
            "routeId": self.route.id,
            "busId": self.bus2.id,
            "departureTime": dep.isoformat(),
            "arrivalTime": arr.isoformat(),
        }
        response = self.client.post("/api/trips", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["routeId"], self.route.id)
        self.assertEqual(response.data["busId"], self.bus2.id)

    def test_create_trip_bus_overlap_rejected(self):
        # Trying to schedule bus1 during [dep1, arr1] should be rejected
        payload = {
            "routeId": self.route.id,
            "busId": self.bus1.id,
            "departureTime": self.dep1.isoformat(),
            "arrivalTime": self.arr1.isoformat(),
        }
        response = self.client.post("/api/trips", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("busId", response.data)

    def test_assign_staff_to_trip(self):
        payload = {
            "tripId": self.trip.id,
            "employeeId": self.driver.id,
            "role": "DRIVER",
        }
        response = self.client.post("/api/trip-assignments", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["employeeId"], self.driver.id)
        self.assertEqual(response.data["role"], "DRIVER")

        # Verify DB
        self.assertTrue(TripStaffAssignment.objects.filter(trip=self.trip, employee=self.driver).exists())

    def test_assign_staff_overlap_rejected(self):
        # First assign driver to trip 1
        TripStaffAssignment.objects.create(
            trip=self.trip,
            employee=self.driver,
            assignment_role=TripStaffAssignment.Role.DRIVER,
        )

        # Create another trip 2 overlapping with trip 1
        trip2 = Trip.objects.create(
            trip_code="TRIP-002",
            route=self.route,
            bus=self.bus2,
            departure_time=self.dep1,
            arrival_time=self.arr1,
            ticket_price=self.route.base_price,
            status=Trip.Status.OPEN_FOR_BOOKING,
        )

        # Try to assign the same driver to trip 2 during the same time
        payload = {
            "tripId": trip2.id,
            "employeeId": self.driver.id,
            "role": "DRIVER",
        }
        response = self.client.post("/api/trip-assignments", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_available_employees(self):
        # Driver is assigned to trip
        TripStaffAssignment.objects.create(
            trip=self.trip,
            employee=self.driver,
            assignment_role=TripStaffAssignment.Role.DRIVER,
        )

        # Query available drivers during the trip's window -> self.driver must be excluded
        from_str = self.dep1.isoformat()
        to_str = self.arr1.isoformat()
        response = self.client.get(f"/api/employees/available?from={from_str}&to={to_str}&role=DRIVER")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        driver_ids = [d["id"] for d in response.data]
        self.assertNotIn(self.driver.id, driver_ids)

        # Query available attendants during the trip's window -> self.attendant must be included
        response_att = self.client.get(f"/api/employees/available?from={from_str}&to={to_str}&role=ASSISTANT")
        self.assertEqual(response_att.status_code, status.HTTP_200_OK)
        attendant_ids = [a["id"] for a in response_att.data]
        self.assertIn(self.attendant.id, attendant_ids)
