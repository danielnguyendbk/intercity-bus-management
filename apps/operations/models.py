from django.db import models
from django.core.validators import MinValueValidator

class Station(models.Model):
    station_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    province_city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stations'

    def __str__(self):
        return f"{self.station_code} - {self.name}"

class Bus(models.Model):
    class BusType(models.TextChoices):
        SEATER = 'SEATER', 'SEATER'
        SLEEPER = 'SLEEPER', 'SLEEPER'
        LIMOUSINE = 'LIMOUSINE', 'LIMOUSINE'

    class BusStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'ACTIVE'
        MAINTENANCE = 'MAINTENANCE', 'MAINTENANCE'
        INACTIVE = 'INACTIVE', 'INACTIVE'

    license_plate = models.CharField(max_length=20, unique=True)
    bus_name = models.CharField(max_length=100, null=True, blank=True)
    bus_type = models.CharField(max_length=20, choices=BusType.choices)
    seat_capacity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=BusStatus.choices, default=BusStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'buses'

    def __str__(self):
        return f"{self.license_plate} - {self.bus_type}"
