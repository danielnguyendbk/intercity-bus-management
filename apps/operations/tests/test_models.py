from django.test import TestCase
from django.db.utils import IntegrityError
from apps.operations.models import Station

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
