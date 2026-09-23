from decimal import Decimal
import hashlib
from datetime import datetime, timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking, Ticket
from apps.bookings.serializers import (
    BookTicketSerializer,
    SeatStatusSerializer,
    TicketRecordSerializer,
    TripSearchSerializer,
)
from apps.operations.models import BusSeat, Trip
from apps.payments.models import Payment


def _build_station_filter(field_prefix: str, term: str) -> Q:
    terms = [term]
    cleaned = term.lower().replace(".", "").replace(" ", "").replace("-", "")
    if cleaned in ["tphcm", "hcm", "saigon", "tphochiminh", "hochiminh"]:
        terms.extend(["Hồ Chí Minh", "TP.HCM", "Sài Gòn", "Miền Đông", "Miền Tây"])
    elif cleaned in ["hanoi", "hn"]:
        terms.extend(["Hà Nội", "Mỹ Đình", "Giáp Bát"])
    elif cleaned in ["dalat", "dl"]:
        terms.extend(["Đà Lạt", "Lâm Đồng"])
    elif cleaned in ["danang", "dn"]:
        terms.extend(["Đà Nẵng"])
    elif cleaned in ["nhatrang", "nt"]:
        terms.extend(["Nha Trang", "Khánh Hòa"])
    elif cleaned in ["cantho", "ct"]:
        terms.extend(["Cần Thơ"])
    elif cleaned in ["vungtau", "vt"]:
        terms.extend(["Vũng Tàu", "Bà Rịa"])
    elif cleaned in ["phanthiet", "pt"]:
        terms.extend(["Phan Thiết", "Bình Thuận"])

    cond = Q()
    for t in terms:
        cond |= Q(**{f"{field_prefix}__province_city__icontains": t})
        cond |= Q(**{f"{field_prefix}__name__icontains": t})
    return cond


class TripSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        origin = request.query_params.get("origin", "").strip()
        destination = request.query_params.get("destination", "").strip()
        date_str = request.query_params.get("date", "").strip()

        qs = Trip.objects.select_related(
            "route__origin_station",
            "route__destination_station",
            "bus",
        ).filter(
            status__in=[Trip.Status.DRAFT, Trip.Status.OPEN_FOR_BOOKING],
        )

        if origin:
            qs = qs.filter(_build_station_filter("route__origin_station", origin))
        if destination:
            qs = qs.filter(_build_station_filter("route__destination_station", destination))
        if date_str:
            try:
                date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
                tz = timezone.get_current_timezone()
                start_dt = timezone.make_aware(datetime.combine(date_val, datetime.min.time()), tz)
                end_dt = timezone.make_aware(datetime.combine(date_val, datetime.max.time()), tz)
                qs = qs.filter(departure_time__gte=start_dt, departure_time__lte=end_dt)
            except ValueError:
                pass

        serializer = TripSearchSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TripSeatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.select_related("bus").get(pk=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Chuyến không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        if not trip.bus:
            return Response([], status=status.HTTP_200_OK)

        seats = BusSeat.objects.filter(bus=trip.bus, is_active=True).order_by("floor_number", "seat_number")
        serializer = SeatStatusSerializer(seats, many=True, context={"trip": trip})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookTicketSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        trip_id = serializer.validated_data["tripId"]
        seat_id = serializer.validated_data["seatId"]
        phone = serializer.validated_data["passengerPhone"]

        try:
            trip = Trip.objects.select_related("route", "bus").get(pk=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Chuyến không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        try:
            seat = BusSeat.objects.get(pk=seat_id, bus=trip.bus, is_active=True)
        except BusSeat.DoesNotExist:
            return Response({"detail": "Ghế không tồn tại trên xe của chuyến này."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            is_occupied = Ticket.objects.filter(
                trip=trip,
                bus_seat=seat,
                ticket_status__in=[Ticket.Status.HELD, Ticket.Status.CONFIRMED, Ticket.Status.USED],
            ).exists()
            if is_occupied:
                return Response(
                    {"detail": "Ghế này đã có người đặt hoặc đang giữ chỗ."},
                    status=status.HTTP_409_CONFLICT,
                )

            user = request.user
            passenger_name = f"{user.first_name} {user.last_name}".strip() or user.username
            now_ts = timezone.now().strftime("%Y%m%d%H%M%S")
            token_hex = hashlib.md5(f"{user.pk}-{trip.pk}-{seat.pk}-{now_ts}".encode()).hexdigest()[:6].upper()

            booking_code = f"BKG-{now_ts[-8:]}-{token_hex[:4]}"
            ticket_code = f"TKT-{now_ts[-8:]}-{token_hex[-4:]}"
            fare = Decimal("3000")

            expires_at = timezone.now() + timedelta(minutes=15)
            if trip.departure_time:
                expires_at = min(expires_at, trip.departure_time)

            booking = Booking.objects.create(
                booking_code=booking_code,
                trip=trip,
                customer_user=user,
                created_by_user=user,
                contact_name=passenger_name,
                contact_phone=phone,
                contact_email=user.email,
                total_amount=fare,
                booking_status=Booking.Status.PENDING,
                expires_at=expires_at,
            )

            ticket = Ticket.objects.create(
                ticket_code=ticket_code,
                booking=booking,
                trip=trip,
                bus_seat=seat,
                passenger_name=passenger_name,
                passenger_phone=phone,
                fare=fare,
                ticket_status=Ticket.Status.HELD,
            )

            payment_code = f"PAY-{booking_code[4:]}"
            payment = Payment.objects.create(
                payment_code=payment_code,
                booking=booking,
                payment_method=Payment.Method.SEPAY,
                amount=fare,
                payment_status=Payment.Status.PENDING,
            )

        from apps.payments.integrations.sepay import build_vietqr_url, get_sepay_config

        cfg = get_sepay_config()
        qr_url = build_vietqr_url(fare, payment_code)

        ticket_data = TicketRecordSerializer(ticket).data
        ticket_data["paymentCode"] = payment_code
        ticket_data["qrUrl"] = qr_url
        ticket_data["bankName"] = cfg["bank_code"]
        ticket_data["accountNumber"] = cfg["account_number"]
        ticket_data["accountName"] = cfg["account_name"]
        ticket_data["expiresAt"] = expires_at.isoformat()
        ticket_data["paymentStatus"] = payment.payment_status

        return Response(ticket_data, status=status.HTTP_201_CREATED)



class MyTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = Ticket.objects.filter(
            booking__customer_user=request.user
        ).select_related("trip__route", "trip__bus", "bus_seat").order_by("-created_at")
        serializer = TicketRecordSerializer(tickets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CancelTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, ticket_id):
        try:
            ticket = Ticket.objects.select_related("booking", "trip__route", "trip__bus", "bus_seat").get(
                pk=ticket_id,
                booking__customer_user=request.user,
            )
        except Ticket.DoesNotExist:
            return Response({"detail": "Vé không tồn tại hoặc không thuộc về bạn."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.ticket_status == Ticket.Status.CANCELLED:
            return Response(TicketRecordSerializer(ticket).data, status=status.HTTP_200_OK)

        ticket.ticket_status = Ticket.Status.CANCELLED
        ticket.save()

        booking = ticket.booking
        if not booking.tickets.exclude(ticket_status=Ticket.Status.CANCELLED).exists():
            booking.booking_status = Booking.Status.CANCELLED
            booking.cancelled_at = timezone.now()
            booking.cancellation_reason = "Customer cancelled ticket"
            booking.save()

        return Response(TicketRecordSerializer(ticket).data, status=status.HTTP_200_OK)
