from django.core.exceptions import ValidationError
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
        db_table = "stations"

    def __str__(self) -> str:
        return f"{self.station_code} - {self.name} ({self.province_city})"


class Route(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    route_code = models.CharField(max_length=20, unique=True)
    route_name = models.CharField(max_length=160)
    origin_station = models.ForeignKey(
        Station,
        on_delete=models.RESTRICT,
        related_name="origin_routes",
    )
    destination_station = models.ForeignKey(
        Station,
        on_delete=models.RESTRICT,
        related_name="destination_routes",
    )
    distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "routes"
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(origin_station=models.F("destination_station")),
                name="chk_routes_different_stations",
            ),
            models.CheckConstraint(
                condition=models.Q(base_price__gte=0),
                name="chk_routes_base_price",
            ),
        ]
        indexes = [
            models.Index(
                fields=["origin_station", "destination_station", "status"],
                name="idx_routes_origin_dest",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.origin_station_id and self.destination_station_id:
            if self.origin_station_id == self.destination_station_id:
                raise ValidationError("Origin station and destination station must be different.")
        if self.base_price is not None and self.base_price < 0:
            raise ValidationError("Base price must be greater than or equal to 0.")

    def __str__(self) -> str:
        return f"{self.route_code}: {self.route_name}"


class Bus(models.Model):
    class BusType(models.TextChoices):
        SEATER = "SEATER", "Seater"
        SLEEPER = "SLEEPER", "Sleeper"
        LIMOUSINE = "LIMOUSINE", "Limousine"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        INACTIVE = "INACTIVE", "Inactive"

    license_plate = models.CharField(max_length=20, unique=True)
    bus_name = models.CharField(max_length=100, null=True, blank=True)
    bus_type = models.CharField(max_length=20, choices=BusType)
    seat_capacity = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=Status, default=Status.ACTIVE)
    last_maintenance_date = models.DateField(null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "buses"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(seat_capacity__gt=0),
                name="chk_buses_capacity",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.seat_capacity is not None and self.seat_capacity <= 0:
            raise ValidationError("Seat capacity must be greater than 0.")

    def __str__(self) -> str:
        return f"{self.license_plate} ({self.bus_type} - {self.seat_capacity} seats)"


class BusSeat(models.Model):
    class SeatType(models.TextChoices):
        STANDARD = "STANDARD", "Standard"
        VIP = "VIP", "VIP"

    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.CharField(max_length=10)
    seat_type = models.CharField(max_length=20, choices=SeatType, default=SeatType.STANDARD)
    floor_number = models.PositiveSmallIntegerField(default=1)
    seat_row = models.PositiveSmallIntegerField(null=True, blank=True)
    column_number = models.PositiveSmallIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bus_seats"
        constraints = [
            models.UniqueConstraint(
                fields=["bus", "seat_number"],
                name="uq_bus_seat_number",
            ),
            models.CheckConstraint(
                condition=models.Q(floor_number__gte=1),
                name="chk_bus_seats_floor",
            ),
        ]
        indexes = [
            models.Index(fields=["bus", "is_active"], name="idx_bus_seats_bus_active"),
        ]

    def __str__(self) -> str:
        return f"{self.bus.license_plate} - Seat {self.seat_number}"


class Trip(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN_FOR_BOOKING = "OPEN_FOR_BOOKING", "Open for booking"
        BOARDING = "BOARDING", "Boarding"
        DEPARTED = "DEPARTED", "Departed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    trip_code = models.CharField(max_length=30, unique=True)
    route = models.ForeignKey(
        Route,
        on_delete=models.RESTRICT,
        related_name="trips",
    )
    bus = models.ForeignKey(
        Bus,
        on_delete=models.RESTRICT,
        related_name="trips",
        null=True,
        blank=True,
    )
    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    ticket_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=30,
        choices=Status,
        default=Status.OPEN_FOR_BOOKING,
    )
    notes = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trips"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(arrival_time__gt=models.F("departure_time")),
                name="chk_trips_time",
            ),
            models.CheckConstraint(
                condition=models.Q(ticket_price__gte=0),
                name="chk_trips_price",
            ),
        ]
        indexes = [
            models.Index(fields=["route", "departure_time", "status"], name="idx_trips_search"),
            models.Index(fields=["bus", "departure_time", "arrival_time", "status"], name="idx_trips_bus_sched"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.departure_time and self.arrival_time:
            if self.arrival_time <= self.departure_time:
                raise ValidationError("Thời gian đến phải lớn hơn thời gian khởi hành.")

        if self.ticket_price is not None and self.ticket_price < 0:
            raise ValidationError("Giá vé không được nhỏ hơn 0.")

        # BR-012: Bus overlap check (exclude CANCELLED trips and current trip)
        if self.bus and self.departure_time and self.arrival_time:
            overlapping = Trip.objects.filter(
                bus=self.bus,
                departure_time__lt=self.arrival_time,
                arrival_time__gt=self.departure_time,
            ).exclude(status=self.Status.CANCELLED)
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError("Xe đã được xếp cho một chuyến khác trong cùng khoảng thời gian này.")

    def __str__(self) -> str:
        return f"{self.trip_code} ({self.route.route_name}) - {self.departure_time}"


class TripStaffAssignment(models.Model):
    class Role(models.TextChoices):
        DRIVER = "DRIVER", "Driver"
        BUS_ATTENDANT = "BUS_ATTENDANT", "Bus Attendant"

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="staff_assignments",
    )
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.RESTRICT,
        related_name="trip_assignments",
    )
    assignment_role = models.CharField(max_length=20, choices=Role)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trip_staff_assignments"
        constraints = [
            models.UniqueConstraint(
                fields=["trip", "employee"],
                name="uq_trip_employee",
            ),
        ]
        indexes = [
            models.Index(fields=["employee", "trip"], name="idx_trip_staff_employee"),
        ]

    def clean(self) -> None:
        super().clean()
        # BR-014: assignment_role must match employee_type
        if self.employee and self.assignment_role:
            if self.assignment_role != self.employee.employee_type:
                raise ValidationError("Vai trò phân công phải khớp với loại nhân viên.")

        # BR-013: Employee overlap check
        if self.trip and self.employee:
            overlapping = TripStaffAssignment.objects.filter(
                employee=self.employee,
                trip__departure_time__lt=self.trip.arrival_time,
                trip__arrival_time__gt=self.trip.departure_time,
            ).exclude(trip__status=Trip.Status.CANCELLED)
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError("Nhân viên này đã được phân công cho một chuyến khác trong cùng khung giờ.")

    def __str__(self) -> str:
        return f"{self.trip.trip_code} - {self.employee.full_name} ({self.assignment_role})"

