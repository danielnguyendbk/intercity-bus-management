from django.test import TestCase
from django.db.utils import IntegrityError
from apps.operations.models import Station, Bus

class StationModelTests(TestCase):
    def test_create_station_successful(self):
        """Test creating a Station with valid data is successful."""
        station = Station.objects.create(
            station_code='SGN',
            name='Ben Xe Mien Dong',
            province_city='Ho Chi Minh',
            address='Dinh Bo Linh, Binh Thanh'
        )
        self.assertEqual(station.station_code, 'SGN')
        self.assertEqual(station.name, 'Ben Xe Mien Dong')
        self.assertTrue(station.is_active)
        self.assertIsNotNone(station.created_at)
        self.assertIsNotNone(station.updated_at)
        self.assertEqual(str(station), 'SGN - Ben Xe Mien Dong')

    def test_station_code_unique(self):
        """Test that station_code must be unique."""
        Station.objects.create(
            station_code='HAN',
            name='Ben Xe Giap Bat',
            province_city='Ha Noi'
        )
        
        with self.assertRaises(IntegrityError):
            Station.objects.create(
                station_code='HAN',
                name='Ben Xe Nuoc Ngam',
                province_city='Ha Noi'
            )

class BusModelTests(TestCase):
    def test_create_bus_successful(self):
        """Test creating a Bus with valid data is successful."""
        bus = Bus.objects.create(
            license_plate='51B-12345',
            bus_name='Chuyen Co Mat Dat',
            bus_type=Bus.BusType.SLEEPER,
            seat_capacity=40
        )
        self.assertEqual(bus.license_plate, '51B-12345')
        self.assertEqual(bus.bus_type, Bus.BusType.SLEEPER)
        self.assertEqual(bus.status, Bus.BusStatus.ACTIVE)
        self.assertEqual(str(bus), '51B-12345 - SLEEPER')

    def test_license_plate_unique(self):
        """Test that license_plate must be unique."""
        Bus.objects.create(
            license_plate='29B-56789',
            bus_type=Bus.BusType.SEATER,
            seat_capacity=30
        )
        
        with self.assertRaises(IntegrityError):
            Bus.objects.create(
                license_plate='29B-56789',
                bus_type=Bus.BusType.LIMOUSINE,
                seat_capacity=20
            )
