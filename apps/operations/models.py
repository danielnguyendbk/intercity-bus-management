from django.db import models

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
