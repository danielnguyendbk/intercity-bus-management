from rest_framework import serializers
from apps.bookings.models import Booking, Ticket
from apps.operations.models import BusSeat, Trip


class TripSearchSerializer(serializers.ModelSerializer):
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()
    departureTime = serializers.DateTimeField(source="departure_time", format="%Y-%m-%dT%H:%M:%S")
    arrivalTime = serializers.DateTimeField(source="arrival_time", format="%Y-%m-%dT%H:%M:%S")
    busLabel = serializers.SerializerMethodField()
    totalSeats = serializers.SerializerMethodField()
    availableSeats = serializers.SerializerMethodField()
    basePrice = serializers.DecimalField(source="ticket_price", max_digits=12, decimal_places=2, coerce_to_string=False)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "origin",
            "destination",
            "departureTime",
            "arrivalTime",
            "busLabel",
            "totalSeats",
            "availableSeats",
            "basePrice",
            "status",
        ]

    def get_origin(self, obj) -> str:
        return obj.route.origin_station.province_city or obj.route.origin_station.name

    def get_destination(self, obj) -> str:
        return obj.route.destination_station.province_city or obj.route.destination_station.name

    def get_busLabel(self, obj) -> str:
        if obj.bus:
            return f"{obj.bus.license_plate} ({obj.bus.bus_type})"
        return "Chưa gán xe"

    def get_totalSeats(self, obj) -> int:
        return obj.bus.seat_capacity if obj.bus else 0

    def get_availableSeats(self, obj) -> int:
        if not obj.bus:
            return 0
        total = obj.bus.seat_capacity
        occupied = Ticket.objects.filter(
            trip=obj,
            ticket_status__in=[Ticket.Status.HELD, Ticket.Status.CONFIRMED, Ticket.Status.USED],
        ).count()
        return max(0, total - occupied)

    def get_status(self, obj) -> str:
        return "SCHEDULED" if obj.status in (Trip.Status.DRAFT, Trip.Status.OPEN_FOR_BOOKING) else obj.status


class SeatStatusSerializer(serializers.ModelSerializer):
    seatNumber = serializers.CharField(source="seat_number")
    positionX = serializers.SerializerMethodField()
    positionY = serializers.SerializerMethodField()
    booked = serializers.SerializerMethodField()

    class Meta:
        model = BusSeat
        fields = ["id", "seatNumber", "positionX", "positionY", "booked"]

    def get_positionX(self, obj) -> int:
        return obj.seat_row or 1

    def get_positionY(self, obj) -> int:
        return obj.column_number or obj.floor_number

    def get_booked(self, obj) -> bool:
        trip = self.context.get("trip")
        if not trip:
            return False
        return Ticket.objects.filter(
            trip=trip,
            bus_seat=obj,
            ticket_status__in=[Ticket.Status.HELD, Ticket.Status.CONFIRMED, Ticket.Status.USED],
        ).exists()


class TicketRecordSerializer(serializers.ModelSerializer):
    tripId = serializers.IntegerField(source="trip_id")
    routeName = serializers.CharField(source="trip.route.route_name")
    departureTime = serializers.DateTimeField(source="trip.departure_time", format="%Y-%m-%dT%H:%M:%S")
    arrivalTime = serializers.DateTimeField(source="trip.arrival_time", format="%Y-%m-%dT%H:%M:%S")
    busLabel = serializers.SerializerMethodField()
    seatNumber = serializers.CharField(source="bus_seat.seat_number")
    passengerName = serializers.CharField(source="passenger_name")
    passengerPhone = serializers.CharField(source="passenger_phone")
    price = serializers.DecimalField(source="fare", max_digits=12, decimal_places=2, coerce_to_string=False)
    status = serializers.SerializerMethodField()
    bookedAt = serializers.DateTimeField(source="created_at", format="%Y-%m-%dT%H:%M:%S")

    class Meta:
        model = Ticket
        fields = [
            "id",
            "tripId",
            "routeName",
            "departureTime",
            "arrivalTime",
            "busLabel",
            "seatNumber",
            "passengerName",
            "passengerPhone",
            "price",
            "status",
            "bookedAt",
        ]

    def get_busLabel(self, obj) -> str:
        if obj.trip.bus:
            return f"{obj.trip.bus.license_plate} ({obj.trip.bus.bus_type})"
        return "Chưa gán xe"

    def get_status(self, obj) -> str:
        if obj.ticket_status == Ticket.Status.HELD:
            return "HOLD"
        elif obj.ticket_status == Ticket.Status.CONFIRMED:
            return "BOOKED"
        elif obj.ticket_status == Ticket.Status.USED:
            return "PAID"
        elif obj.ticket_status == Ticket.Status.CANCELLED:
            return "CANCELLED"
        return obj.ticket_status


class BookTicketSerializer(serializers.Serializer):
    tripId = serializers.IntegerField()
    seatId = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    passengerPhone = serializers.CharField(max_length=20)
