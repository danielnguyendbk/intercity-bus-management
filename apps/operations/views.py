from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Employee
from apps.operations.models import Bus, Route, Trip, TripStaffAssignment
from apps.operations.serializers import (
    AdminBusSerializer,
    AdminRouteSerializer,
    AssignTripSerializer,
    AvailableEmployeeSerializer,
    CreateBusSerializer,
    CreateOrUpdateRouteSerializer,
    CreateTripSerializer,
    TripAssignmentSerializer,
    TripSerializer,
    UpdateBusSerializer,
)


class AdminRouteListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        keyword = request.query_params.get("keyword", "").strip()
        active_only = request.query_params.get("activeOnly", "").lower() == "true"

        qs = Route.objects.select_related("origin_station", "destination_station").all()
        if keyword:
            qs = qs.filter(
                Q(route_name__icontains=keyword)
                | Q(origin_station__province_city__icontains=keyword)
                | Q(destination_station__province_city__icontains=keyword)
            )
        if active_only:
            qs = qs.filter(status=Route.Status.ACTIVE)

        serializer = AdminRouteSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateOrUpdateRouteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        route = serializer.save()
        return Response(AdminRouteSerializer(route).data, status=status.HTTP_201_CREATED)


class AdminRouteDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Route.objects.select_related("origin_station", "destination_station").get(pk=pk)
        except Route.DoesNotExist:
            return None

    def get(self, request, pk):
        route = self.get_object(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminRouteSerializer(route).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        route = self.get_object(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateOrUpdateRouteSerializer(instance=route, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        return Response(AdminRouteSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        route = self.get_object(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)
        route.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBusListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        keyword = request.query_params.get("keyword", "").strip()
        status_filter = request.query_params.get("status", "").strip()

        qs = Bus.objects.all()
        if keyword:
            qs = qs.filter(
                Q(license_plate__icontains=keyword) | Q(bus_name__icontains=keyword)
            )
        if status_filter:
            if status_filter.upper() == "AVAILABLE":
                qs = qs.filter(status=Bus.Status.ACTIVE)
            elif status_filter.upper() == "MAINTENANCE":
                qs = qs.filter(status=Bus.Status.MAINTENANCE)

        serializer = AdminBusSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateBusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        bus = serializer.save()
        return Response(AdminBusSerializer(bus).data, status=status.HTTP_201_CREATED)


class AdminBusDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Bus.objects.get(pk=pk)
        except Bus.DoesNotExist:
            return None

    def get(self, request, pk):
        bus = self.get_object(pk)
        if not bus:
            return Response({"detail": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminBusSerializer(bus).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        bus = self.get_object(pk)
        if not bus:
            return Response({"detail": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateBusSerializer(instance=bus, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        return Response(AdminBusSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        bus = self.get_object(pk)
        if not bus:
            return Response({"detail": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)
        bus.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBusStatusView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        try:
            bus = Bus.objects.get(pk=pk)
        except Bus.DoesNotExist:
            return Response({"detail": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status", "").upper()
        if new_status == "MAINTENANCE":
            bus.status = Bus.Status.MAINTENANCE
        elif new_status in ("AVAILABLE", "ACTIVE"):
            bus.status = Bus.Status.ACTIVE
        else:
            bus.status = Bus.Status.INACTIVE
        bus.save()
        return Response(AdminBusSerializer(bus).data, status=status.HTTP_200_OK)


class TripListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_param = request.query_params.get("date", "").strip()
        route_id = request.query_params.get("routeId", "").strip()
        status_param = request.query_params.get("status", "").strip()

        qs = Trip.objects.select_related("route", "bus").prefetch_related("staff_assignments__employee").all()

        if date_param:
            qs = qs.filter(departure_time__date=date_param)
        if route_id:
            qs = qs.filter(route_id=route_id)
        if status_param:
            if status_param.upper() == "SCHEDULED":
                qs = qs.filter(status__in=[Trip.Status.DRAFT, Trip.Status.OPEN_FOR_BOOKING])
            else:
                qs = qs.filter(status=status_param.upper())

        serializer = TripSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateTripSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        trip = serializer.save()
        return Response(TripSerializer(trip).data, status=status.HTTP_201_CREATED)


class AssignTripView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AssignTripSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        assignment = serializer.save()
        return Response(TripAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class AvailableEmployeesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from_time = request.query_params.get("from", "").strip()
        to_time = request.query_params.get("to", "").strip()
        role = request.query_params.get("role", "").strip().upper()

        qs = Employee.objects.filter(is_active=True)
        if role == "DRIVER":
            qs = qs.filter(employee_type=Employee.EmployeeType.DRIVER)
        elif role in ("ASSISTANT", "BUS_ATTENDANT"):
            qs = qs.filter(employee_type=Employee.EmployeeType.BUS_ATTENDANT)

        if from_time and to_time:
            from datetime import datetime
            if " " in from_time and "+" not in from_time:
                from_time = from_time.replace(" ", "+")
            if " " in to_time and "+" not in to_time:
                to_time = to_time.replace(" ", "+")
            try:
                from_dt = datetime.fromisoformat(from_time)
                to_dt = datetime.fromisoformat(to_time)
                busy_employee_ids = TripStaffAssignment.objects.filter(
                    trip__departure_time__lt=to_dt,
                    trip__arrival_time__gt=from_dt,
                ).exclude(trip__status=Trip.Status.CANCELLED).values_list("employee_id", flat=True)
                qs = qs.exclude(id__in=busy_employee_ids)
            except Exception:
                pass

        serializer = AvailableEmployeeSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from datetime import date, datetime, timedelta
        from django.utils import timezone
        from apps.accounts.models import User
        from apps.operations.models import Bus, Route, Trip

        today = timezone.localdate()
        start_of_today = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        end_of_today = timezone.make_aware(datetime.combine(today, datetime.max.time()))

        total_users = User.objects.count()
        total_buses = Bus.objects.count()
        total_routes = Route.objects.count()
        today_trips = Trip.objects.filter(
            departure_time__gte=start_of_today,
            departure_time__lte=end_of_today,
        ).count()

        admin_count = User.objects.filter(role=User.Role.ADMIN).count()
        staff_count = User.objects.filter(role__in=[User.Role.DISPATCHER, User.Role.TICKET_AGENT]).count()
        customer_count = User.objects.filter(role=User.Role.CUSTOMER).count()

        role_distribution = [
            {"role": "ADMIN", "count": admin_count},
            {"role": "STAFF", "count": staff_count},
            {"role": "CUSTOMER", "count": customer_count},
        ]

        maintenance_count = Bus.objects.filter(status=Bus.Status.MAINTENANCE).count()
        running_bus_ids = set(
            Trip.objects.filter(
                departure_time__gte=start_of_today,
                departure_time__lte=end_of_today,
                status__in=[Trip.Status.BOARDING, Trip.Status.DEPARTED],
                bus__isnull=False,
            ).values_list("bus_id", flat=True)
        )
        running_count = Bus.objects.filter(id__in=running_bus_ids).exclude(status=Bus.Status.MAINTENANCE).count()
        available_count = max(0, total_buses - maintenance_count - running_count)

        bus_status_distribution = [
            {"status": "AVAILABLE", "count": available_count},
            {"status": "RUNNING", "count": running_count},
            {"status": "MAINTENANCE", "count": maintenance_count},
        ]

        expiring_soon_threshold = today + timedelta(days=30)
        alert_buses = Bus.objects.filter(
            insurance_expiry__isnull=False,
            insurance_expiry__lte=expiring_soon_threshold,
        ).order_by("insurance_expiry")

        insurance_alerts = []
        for b in alert_buses:
            is_expired = b.insurance_expiry < today
            if b.status == Bus.Status.MAINTENANCE:
                bus_stat = "MAINTENANCE"
            elif b.id in running_bus_ids:
                bus_stat = "RUNNING"
            else:
                bus_stat = "AVAILABLE"

            insurance_alerts.append({
                "busId": b.id,
                "licensePlate": b.license_plate,
                "busType": b.get_bus_type_display() or b.bus_type,
                "status": bus_stat,
                "expiryDate": b.insurance_expiry.isoformat(),
                "alertType": "EXPIRED" if is_expired else "EXPIRING_SOON",
            })

        data = {
            "totalUsers": total_users,
            "totalBuses": total_buses,
            "totalRoutes": total_routes,
            "todayTrips": today_trips,
            "roleDistribution": role_distribution,
            "busStatusDistribution": bus_status_distribution,
            "insuranceAlerts": insurance_alerts,
        }
        return Response(data, status=status.HTTP_200_OK)


