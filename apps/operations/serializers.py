from datetime import date, timedelta
from django.db import models
from rest_framework import serializers

from apps.accounts.models import Employee
from apps.operations.models import Bus, BusSeat, Route, Station, Trip, TripStaffAssignment


class AdminRouteSerializer(serializers.ModelSerializer):
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()
    distanceKm = serializers.DecimalField(
        source="distance_km",
        max_digits=8,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
    )
    estimatedDurationMin = serializers.IntegerField(
        source="estimated_duration_minutes",
        allow_null=True,
    )
    basePrice = serializers.DecimalField(
        source="base_price",
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
    )
    isActive = serializers.SerializerMethodField()
    tripCount = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            "id",
            "origin",
            "destination",
            "distanceKm",
            "estimatedDurationMin",
            "basePrice",
            "isActive",
            "tripCount",
        ]

    def get_origin(self, obj) -> str:
        return obj.origin_station.province_city or obj.origin_station.name

    def get_destination(self, obj) -> str:
        return obj.destination_station.province_city or obj.destination_station.name

    def get_isActive(self, obj) -> bool:
        return obj.status == Route.Status.ACTIVE

    def get_tripCount(self, obj) -> int:
        return getattr(obj, "trip_count", 0)


class CreateOrUpdateRouteSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=150)
    destination = serializers.CharField(max_length=150)
    distanceKm = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    estimatedDurationMin = serializers.IntegerField(required=False, default=0)
    basePrice = serializers.DecimalField(max_digits=12, decimal_places=2)
    isActive = serializers.BooleanField(required=False, default=True)

    def _get_or_create_station(self, name_or_city: str) -> Station:
        name_or_city = name_or_city.strip()
        station = Station.objects.filter(
            models.Q(name__iexact=name_or_city) | models.Q(province_city__iexact=name_or_city)
        ).first()
        if not station:
            import hashlib
            code_hash = hashlib.md5(name_or_city.encode()).hexdigest()[:6].upper()
            station = Station.objects.create(
                station_code=f"BX-{code_hash}",
                name=f"Bến xe {name_or_city}",
                province_city=name_or_city,
            )
        return station

    def create(self, validated_data):
        origin_station = self._get_or_create_station(validated_data["origin"])
        dest_station = self._get_or_create_station(validated_data["destination"])

        if origin_station.pk == dest_station.pk:
            raise serializers.ValidationError({"destination": "Điểm đi và điểm đến phải khác nhau."})

        import hashlib
        pair = f"{origin_station.pk}-{dest_station.pk}"
        route_code = f"RT-{hashlib.md5(pair.encode()).hexdigest()[:8].upper()}"

        route, _ = Route.objects.update_or_create(
            origin_station=origin_station,
            destination_station=dest_station,
            defaults={
                "route_code": route_code,
                "route_name": f"{origin_station.province_city} - {dest_station.province_city}",
                "distance_km": validated_data.get("distanceKm"),
                "estimated_duration_minutes": validated_data.get("estimatedDurationMin"),
                "base_price": validated_data["basePrice"],
                "status": Route.Status.ACTIVE if validated_data.get("isActive", True) else Route.Status.INACTIVE,
            },
        )
        return route

    def update(self, instance, validated_data):
        if "origin" in validated_data:
            instance.origin_station = self._get_or_create_station(validated_data["origin"])
        if "destination" in validated_data:
            instance.destination_station = self._get_or_create_station(validated_data["destination"])

        if instance.origin_station_id == instance.destination_station_id:
            raise serializers.ValidationError({"destination": "Điểm đi và điểm đến phải khác nhau."})

        if "distanceKm" in validated_data:
            instance.distance_km = validated_data["distanceKm"]
        if "estimatedDurationMin" in validated_data:
            instance.estimated_duration_minutes = validated_data["estimatedDurationMin"]
        if "basePrice" in validated_data:
            instance.base_price = validated_data["basePrice"]
        if "isActive" in validated_data:
            instance.status = Route.Status.ACTIVE if validated_data["isActive"] else Route.Status.INACTIVE

        instance.route_name = f"{instance.origin_station.province_city} - {instance.destination_station.province_city}"
        instance.save()
        return instance


class AdminBusSerializer(serializers.ModelSerializer):
    licensePlate = serializers.CharField(source="license_plate")
    busType = serializers.CharField(source="bus_type")
    totalSeats = serializers.IntegerField(source="seat_capacity")
    status = serializers.SerializerMethodField()
    lastMaintenanceDate = serializers.DateField(source="last_maintenance_date", allow_null=True)
    insuranceExpiry = serializers.DateField(source="insurance_expiry", allow_null=True)
    insuranceExpired = serializers.SerializerMethodField()
    insuranceExpiringSoon = serializers.SerializerMethodField()
    assignedTripsCount = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = [
            "id",
            "licensePlate",
            "busType",
            "totalSeats",
            "status",
            "lastMaintenanceDate",
            "insuranceExpiry",
            "insuranceExpired",
            "insuranceExpiringSoon",
            "assignedTripsCount",
        ]

    def get_status(self, obj) -> str:
        if obj.status == Bus.Status.ACTIVE:
            return "AVAILABLE"
        elif obj.status == Bus.Status.MAINTENANCE:
            return "MAINTENANCE"
        return "AVAILABLE"

    def get_insuranceExpired(self, obj) -> bool:
        if not obj.insurance_expiry:
            return False
        return obj.insurance_expiry < date.today()

    def get_insuranceExpiringSoon(self, obj) -> bool:
        if not obj.insurance_expiry:
            return False
        today = date.today()
        return today <= obj.insurance_expiry <= today + timedelta(days=30)

    def get_assignedTripsCount(self, obj) -> int:
        return 0


class CreateBusSerializer(serializers.Serializer):
    licensePlate = serializers.CharField(max_length=20)
    busType = serializers.CharField(max_length=20)
    totalSeats = serializers.IntegerField(min_value=1)
    lastMaintenanceDate = serializers.DateField(required=False, allow_null=True)
    insuranceExpiry = serializers.DateField(required=False, allow_null=True)

    def validate_licensePlate(self, value):
        if Bus.objects.filter(license_plate=value).exists():
            raise serializers.ValidationError("Biển số xe đã tồn tại.")
        return value

    def create(self, validated_data):
        bus_type_raw = validated_data["busType"].upper()
        if bus_type_raw not in Bus.BusType.values:
            bus_type_raw = Bus.BusType.SLEEPER if "SLEEP" in bus_type_raw else Bus.BusType.SEATER

        bus = Bus.objects.create(
            license_plate=validated_data["licensePlate"],
            bus_type=bus_type_raw,
            seat_capacity=validated_data["totalSeats"],
            last_maintenance_date=validated_data.get("lastMaintenanceDate"),
            insurance_expiry=validated_data.get("insuranceExpiry"),
            status=Bus.Status.ACTIVE,
        )

        total = validated_data["totalSeats"]
        seats = []
        is_sleeper = bus.bus_type == Bus.BusType.SLEEPER
        half = max(1, total // 2)
        for i in range(1, total + 1):
            if is_sleeper:
                floor = 1 if i <= half else 2
                prefix = "A" if floor == 1 else "B"
                num = i if floor == 1 else i - half
                seat_num = f"{prefix}{num:02d}"
            else:
                floor = 1
                seat_num = f"S{i:02d}"
            seats.append(
                BusSeat(
                    bus=bus,
                    seat_number=seat_num,
                    floor_number=floor,
                    seat_type=BusSeat.SeatType.STANDARD,
                )
            )
        BusSeat.objects.bulk_create(seats)
        return bus


class UpdateBusSerializer(serializers.Serializer):
    busType = serializers.CharField(max_length=20, required=False)
    totalSeats = serializers.IntegerField(min_value=1, required=False)
    lastMaintenanceDate = serializers.DateField(required=False, allow_null=True)
    insuranceExpiry = serializers.DateField(required=False, allow_null=True)

    def update(self, instance, validated_data):
        if "busType" in validated_data:
            bus_type_raw = validated_data["busType"].upper()
            if bus_type_raw in Bus.BusType.values:
                instance.bus_type = bus_type_raw
        if "totalSeats" in validated_data:
            instance.seat_capacity = validated_data["totalSeats"]
        if "lastMaintenanceDate" in validated_data:
            instance.last_maintenance_date = validated_data["lastMaintenanceDate"]
        if "insuranceExpiry" in validated_data:
            instance.insurance_expiry = validated_data["insuranceExpiry"]

        instance.save()
        return instance


class TripAssignmentSerializer(serializers.ModelSerializer):
    employeeId = serializers.IntegerField(source="employee_id")
    employeeName = serializers.CharField(source="employee.full_name")
    role = serializers.SerializerMethodField()

    class Meta:
        model = TripStaffAssignment
        fields = ["id", "employeeId", "employeeName", "role"]

    def get_role(self, obj) -> str:
        return "DRIVER" if obj.assignment_role == TripStaffAssignment.Role.DRIVER else "ASSISTANT"


class TripSerializer(serializers.ModelSerializer):
    routeId = serializers.IntegerField(source="route_id")
    routeName = serializers.CharField(source="route.route_name")
    busId = serializers.SerializerMethodField()
    busLabel = serializers.SerializerMethodField()
    departureTime = serializers.DateTimeField(source="departure_time", format="%Y-%m-%dT%H:%M:%S")
    arrivalTime = serializers.DateTimeField(source="arrival_time", format="%Y-%m-%dT%H:%M:%S")
    status = serializers.SerializerMethodField()
    assignments = TripAssignmentSerializer(source="staff_assignments", many=True, read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "routeId",
            "routeName",
            "busId",
            "busLabel",
            "departureTime",
            "arrivalTime",
            "status",
            "assignments",
        ]

    def get_busId(self, obj):
        return obj.bus_id

    def get_busLabel(self, obj) -> str:
        if obj.bus:
            return f"{obj.bus.license_plate} ({obj.bus.bus_type})"
        return "Chưa gán xe"

    def get_status(self, obj) -> str:
        if obj.status in (Trip.Status.DRAFT, Trip.Status.OPEN_FOR_BOOKING):
            return "SCHEDULED"
        return obj.status


class CreateTripSerializer(serializers.Serializer):
    routeId = serializers.IntegerField()
    busId = serializers.IntegerField()
    departureTime = serializers.DateTimeField()
    arrivalTime = serializers.DateTimeField()
    status = serializers.CharField(required=False, default="SCHEDULED")

    def create(self, validated_data):
        route = Route.objects.get(pk=validated_data["routeId"])
        bus = Bus.objects.get(pk=validated_data["busId"])
        dep = validated_data["departureTime"]
        arr = validated_data["arrivalTime"]

        if arr <= dep:
            raise serializers.ValidationError({"arrivalTime": "Thời gian đến phải lớn hơn thời gian khởi hành."})

        overlapping = Trip.objects.filter(
            bus=bus,
            departure_time__lt=arr,
            arrival_time__gt=dep,
        ).exclude(status=Trip.Status.CANCELLED)
        if overlapping.exists():
            raise serializers.ValidationError({"busId": "Xe này đã có chuyến chạy trong khoảng thời gian này."})

        import hashlib
        code = f"TRIP-{hashlib.md5(f'{route.pk}-{bus.pk}-{dep.isoformat()}'.encode()).hexdigest()[:8].upper()}"

        trip = Trip.objects.create(
            trip_code=code,
            route=route,
            bus=bus,
            departure_time=dep,
            arrival_time=arr,
            ticket_price=route.base_price,
            status=Trip.Status.OPEN_FOR_BOOKING,
        )
        return trip


class AssignTripSerializer(serializers.Serializer):
    tripId = serializers.IntegerField()
    employeeId = serializers.IntegerField()
    role = serializers.CharField()

    def create(self, validated_data):
        trip = Trip.objects.get(pk=validated_data["tripId"])
        employee = Employee.objects.get(pk=validated_data["employeeId"])
        role_raw = validated_data["role"].upper()

        if role_raw == "DRIVER":
            assignment_role = TripStaffAssignment.Role.DRIVER
        else:
            assignment_role = TripStaffAssignment.Role.BUS_ATTENDANT

        overlapping = TripStaffAssignment.objects.filter(
            employee=employee,
            trip__departure_time__lt=trip.arrival_time,
            trip__arrival_time__gt=trip.departure_time,
        ).exclude(trip__status=Trip.Status.CANCELLED)
        if overlapping.exists():
            raise serializers.ValidationError("Nhân viên này đã được phân công cho chuyến khác trong khung giờ này.")

        assignment, _ = TripStaffAssignment.objects.update_or_create(
            trip=trip,
            employee=employee,
            defaults={"assignment_role": assignment_role},
        )
        return assignment


class AvailableEmployeeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    fullName = serializers.CharField(source="full_name")
    employeeType = serializers.SerializerMethodField()

    def get_employeeType(self, obj) -> str:
        return "DRIVER" if obj.employee_type == "DRIVER" else "ASSISTANT"

