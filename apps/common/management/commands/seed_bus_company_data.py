from datetime import date, datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Employee, User
from apps.bookings.models import Booking, Ticket
from apps.operations.models import Bus, BusSeat, Route, Station, Trip, TripStaffAssignment
from apps.payments.models import Payment


class Command(BaseCommand):
    help = "Nap bo du lieu thuc te cho he thong Nha xe Lien tinh (Intercity Bus Management)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Bat dau nap du lieu nha xe thuc te..."))

        with transaction.atomic():
            self._seed_users()
            self._seed_employees()
            stations = self._seed_stations()
            routes = self._seed_routes(stations)
            buses = self._seed_buses_and_seats()
            self._seed_trips_and_bookings(routes, buses)

        self.stdout.write(self.style.SUCCESS("==> Nap du lieu hoan tat 100%!"))
        self.stdout.write(self.style.SUCCESS("""
Tai khoan dang nhap he thong:
  - ADMIN:       username='admin'       | password='123456'
  - DIEU HANH:   username='staff01'     | password='123456'
  - KHACH HANG:  username='customer01'  | password='123456'
"""))

    def _seed_users(self):
        self.stdout.write("- Khoi tao nguoi dung he thong (Admin, Staff, Khach hang)...")
        users_data = [
            {
                "username": "admin",
                "email": "admin@busco.vn",
                "phone": "0901000001",
                "role": User.Role.ADMIN,
                "first_name": "Văn Admin",
                "last_name": "Nguyễn",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "username": "staff01",
                "email": "staff01@busco.vn",
                "phone": "0901000002",
                "role": User.Role.DISPATCHER,
                "first_name": "Thị Điều Phối",
                "last_name": "Trần",
                "is_staff": False,
            },
            {
                "username": "agent01",
                "email": "agent01@busco.vn",
                "phone": "0901000003",
                "role": User.Role.TICKET_AGENT,
                "first_name": "Thị Bán Vé",
                "last_name": "Lê",
                "is_staff": False,
            },
            {
                "username": "customer01",
                "email": "customer01@gmail.com",
                "phone": "0912345678",
                "role": User.Role.CUSTOMER,
                "first_name": "Văn Khách",
                "last_name": "Lê",
                "is_staff": False,
            },
            {
                "username": "customer02",
                "email": "nguyenvanan@gmail.com",
                "phone": "0987654321",
                "role": User.Role.CUSTOMER,
                "first_name": "Văn An",
                "last_name": "Nguyễn",
                "is_staff": False,
            },
        ]

        for u in users_data:
            user, created = User.objects.update_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "phone": u["phone"],
                    "role": u["role"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "is_active": True,
                    "is_staff": u.get("is_staff", False),
                    "is_superuser": u.get("is_superuser", False),
                },
            )
            user.set_password("123456")
            user.save()

    def _seed_employees(self):
        self.stdout.write("- Khoi tao danh sach tai xe va phu xe...")
        employees_data = [
            {
                "employee_code": "TX-001",
                "full_name": "Nguyễn Văn Hùng",
                "phone": "0911223344",
                "employee_type": Employee.EmployeeType.DRIVER,
                "license_number": "790158829102",
                "license_class": "FC",
                "license_expiry": date.today() + timedelta(days=365 * 3),
            },
            {
                "employee_code": "TX-002",
                "full_name": "Lê Hoàng Nam",
                "phone": "0922334455",
                "employee_type": Employee.EmployeeType.DRIVER,
                "license_number": "520183920194",
                "license_class": "E",
                "license_expiry": date.today() + timedelta(days=365 * 2),
            },
            {
                "employee_code": "TX-003",
                "full_name": "Phạm Minh Tài Xế",
                "phone": "0901000004",
                "employee_type": Employee.EmployeeType.DRIVER,
                "license_number": "490192837465",
                "license_class": "E",
                "license_expiry": date.today() + timedelta(days=365 * 4),
            },
            {
                "employee_code": "PX-001",
                "full_name": "Đỗ Thị Phụ Xe",
                "phone": "0901000005",
                "employee_type": Employee.EmployeeType.BUS_ATTENDANT,
            },
            {
                "employee_code": "PX-002",
                "full_name": "Trần Văn Bình",
                "phone": "0933445566",
                "employee_type": Employee.EmployeeType.BUS_ATTENDANT,
            },
        ]

        for e in employees_data:
            Employee.objects.update_or_create(
                employee_code=e["employee_code"],
                defaults=e,
            )

    def _seed_stations(self):
        self.stdout.write("- Khoi tao cac ben xe lon tren toan quoc...")
        stations_data = [
            {
                "station_code": "BX-MD-MOI",
                "name": "Bến xe Miền Đông Mới",
                "province_city": "TP. Hồ Chí Minh",
                "address": "501 Hoàng Hữu Nam, P. Long Bình, TP. Thủ Đức, TP. HCM",
            },
            {
                "station_code": "BX-MIEN-TAY",
                "name": "Bến xe Miền Tây",
                "province_city": "TP. Hồ Chí Minh",
                "address": "395 Kinh Dương Vương, P. An Lạc, Q. Bình Tân, TP. HCM",
            },
            {
                "station_code": "BX-DA-LAT",
                "name": "Bến xe Liên tỉnh Đà Lạt",
                "province_city": "Đà Lạt",
                "address": "01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Lâm Đồng",
            },
            {
                "station_code": "BX-NHA-TRANG",
                "name": "Bến xe Phía Nam Nha Trang",
                "province_city": "Nha Trang",
                "address": "Đường 23/10, Vĩnh Trung, TP. Nha Trang, Khánh Hòa",
            },
            {
                "station_code": "BX-VUNG-TAU",
                "name": "Bến xe Vũng Tàu",
                "province_city": "Vũng Tàu",
                "address": "192 Nam Kỳ Khởi Nghĩa, Phường 3, TP. Vũng Tàu",
            },
            {
                "station_code": "BX-CAN-THO",
                "name": "Bến xe Trung tâm Cần Thơ",
                "province_city": "Cần Thơ",
                "address": "QL1A, P. Hưng Thạnh, Q. Cái Răng, TP. Cần Thơ",
            },
            {
                "station_code": "BX-PHAN-THIET",
                "name": "Bến xe Phan Thiết",
                "province_city": "Phan Thiết",
                "address": "01 Từ Văn Tư, P. Phú Trinh, TP. Phan Thiết, Bình Thuận",
            },
            {
                "station_code": "BX-DA-NANG",
                "name": "Bến xe Trung tâm Đà Nẵng",
                "province_city": "Đà Nẵng",
                "address": "201 Tôn Đức Thắng, P. Hòa Minh, Q. Liên Chiểu, TP. Đà Nẵng",
            },
            {
                "station_code": "BX-MY-DINH",
                "name": "Bến xe Mỹ Đình",
                "province_city": "Hà Nội",
                "address": "20 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm, Hà Nội",
            },
        ]

        saved_stations = {}
        for s in stations_data:
            st, _ = Station.objects.update_or_create(
                station_code=s["station_code"],
                defaults=s,
            )
            saved_stations[s["station_code"]] = st
        return saved_stations

    def _seed_routes(self, stations):
        self.stdout.write("- Khoi tao cac tuyen duong lien tinh hot...")
        routes_data = [
            {
                "route_code": "RT-SG-DL",
                "route_name": "TP. Hồ Chí Minh - Đà Lạt",
                "origin": stations["BX-MD-MOI"],
                "dest": stations["BX-DA-LAT"],
                "distance_km": Decimal("305.0"),
                "duration": 360,
                "base_price": Decimal("280000"),
            },
            {
                "route_code": "RT-DL-SG",
                "route_name": "Đà Lạt - TP. Hồ Chí Minh",
                "origin": stations["BX-DA-LAT"],
                "dest": stations["BX-MD-MOI"],
                "distance_km": Decimal("305.0"),
                "duration": 360,
                "base_price": Decimal("280000"),
            },
            {
                "route_code": "RT-SG-NT",
                "route_name": "TP. Hồ Chí Minh - Nha Trang",
                "origin": stations["BX-MD-MOI"],
                "dest": stations["BX-NHA-TRANG"],
                "distance_km": Decimal("430.0"),
                "duration": 480,
                "base_price": Decimal("380000"),
            },
            {
                "route_code": "RT-SG-PT",
                "route_name": "TP. Hồ Chí Minh - Phan Thiết",
                "origin": stations["BX-MD-MOI"],
                "dest": stations["BX-PHAN-THIET"],
                "distance_km": Decimal("200.0"),
                "duration": 210,
                "base_price": Decimal("180000"),
            },
            {
                "route_code": "RT-SG-CT",
                "route_name": "TP. Hồ Chí Minh - Cần Thơ",
                "origin": stations["BX-MIEN-TAY"],
                "dest": stations["BX-CAN-THO"],
                "distance_km": Decimal("165.0"),
                "duration": 180,
                "base_price": Decimal("150000"),
            },
            {
                "route_code": "RT-SG-VT",
                "route_name": "TP. Hồ Chí Minh - Vũng Tàu",
                "origin": stations["BX-MIEN-TAY"],
                "dest": stations["BX-VUNG-TAU"],
                "distance_km": Decimal("105.0"),
                "duration": 120,
                "base_price": Decimal("160000"),
            },
            {
                "route_code": "RT-SG-DN",
                "route_name": "TP. Hồ Chí Minh - Đà Nẵng",
                "origin": stations["BX-MD-MOI"],
                "dest": stations["BX-DA-NANG"],
                "distance_km": Decimal("960.0"),
                "duration": 1080,
                "base_price": Decimal("520000"),
            },
        ]

        saved_routes = {}
        for r in routes_data:
            route, _ = Route.objects.update_or_create(
                route_code=r["route_code"],
                defaults={
                    "route_name": r["route_name"],
                    "origin_station": r["origin"],
                    "destination_station": r["dest"],
                    "distance_km": r["distance_km"],
                    "estimated_duration_minutes": r["duration"],
                    "base_price": r["base_price"],
                    "status": Route.Status.ACTIVE,
                },
            )
            saved_routes[r["route_code"]] = route
        return saved_routes

    def _seed_buses_and_seats(self):
        self.stdout.write("- Khoi tao doi xe (Giuong nam, Limousine VIP, Ghe ngoi)...")
        today = date.today()
        buses_data = [
            {
                "license_plate": "51B-123.45",
                "bus_name": "FUTA Express VIP 01",
                "bus_type": Bus.BusType.SLEEPER,
                "seat_capacity": 40,
                "status": Bus.Status.ACTIVE,
                "last_maintenance_date": today - timedelta(days=20),
                "insurance_expiry": today + timedelta(days=180),
            },
            {
                "license_plate": "51C-678.90",
                "bus_name": "Limousine Cung Điện Di Động 02",
                "bus_type": Bus.BusType.LIMOUSINE,
                "seat_capacity": 22,
                "status": Bus.Status.ACTIVE,
                "last_maintenance_date": today - timedelta(days=10),
                "insurance_expiry": today + timedelta(days=15),  # Sắp hết hạn trong 15 ngày -> EXPIRING_SOON alert
            },
            {
                "license_plate": "51D-111.11",
                "bus_name": "Xe Giường Nằm 03",
                "bus_type": Bus.BusType.SLEEPER,
                "seat_capacity": 44,
                "status": Bus.Status.MAINTENANCE,  # Đang bảo trì
                "last_maintenance_date": today - timedelta(days=45),
                "insurance_expiry": today - timedelta(days=10),  # Đã quá hạn -> EXPIRED alert
            },
            {
                "license_plate": "51E-222.22",
                "bus_name": "VIP Cabin Riêng Biệt 04",
                "bus_type": Bus.BusType.LIMOUSINE,
                "seat_capacity": 20,
                "status": Bus.Status.ACTIVE,
                "last_maintenance_date": today - timedelta(days=5),
                "insurance_expiry": today + timedelta(days=300),
            },
            {
                "license_plate": "51F-333.33",
                "bus_name": "Xe Ghế Ngồi Cao Cấp 05",
                "bus_type": Bus.BusType.SEATER,
                "seat_capacity": 29,
                "status": Bus.Status.ACTIVE,
                "last_maintenance_date": today - timedelta(days=15),
                "insurance_expiry": today + timedelta(days=200),
            },
        ]

        saved_buses = {}
        for b in buses_data:
            bus, _ = Bus.objects.update_or_create(
                license_plate=b["license_plate"],
                defaults=b,
            )
            saved_buses[b["license_plate"]] = bus

            # Sinh ma trận ghế nếu chưa có
            if bus.seats.count() == 0:
                seats_to_create = []
                cap = bus.seat_capacity
                half = cap // 2
                # Tầng 1: A01.. A{half}
                for i in range(1, half + 1):
                    col = (i - 1) % 3 + 1
                    row = (i - 1) // 3 + 1
                    seats_to_create.append(
                        BusSeat(
                            bus=bus,
                            seat_number=f"A{str(i).zfill(2)}",
                            seat_type=BusSeat.SeatType.VIP if i <= 6 else BusSeat.SeatType.STANDARD,
                            floor_number=1,
                            seat_row=row,
                            column_number=col,
                            is_active=True,
                        )
                    )
                # Tầng 2: B01.. B{cap - half}
                for i in range(1, (cap - half) + 1):
                    col = (i - 1) % 3 + 1
                    row = (i - 1) // 3 + 1
                    seats_to_create.append(
                        BusSeat(
                            bus=bus,
                            seat_number=f"B{str(i).zfill(2)}",
                            seat_type=BusSeat.SeatType.STANDARD,
                            floor_number=2,
                            seat_row=row,
                            column_number=col,
                            is_active=True,
                        )
                    )
                BusSeat.objects.bulk_create(seats_to_create)

        return saved_buses

    def _seed_trips_and_bookings(self, routes, buses):
        self.stdout.write("- Khoi tao cac chuyen xe hom nay va tuan nay...")
        now = timezone.now()
        today = timezone.localdate()

        tx1 = Employee.objects.filter(employee_type=Employee.EmployeeType.DRIVER).first()
        tx2 = Employee.objects.filter(employee_type=Employee.EmployeeType.DRIVER).last()
        px1 = Employee.objects.filter(employee_type=Employee.EmployeeType.BUS_ATTENDANT).first()
        customer = User.objects.filter(role=User.Role.CUSTOMER).first()

        # 1. Chuyến hôm nay Sài Gòn -> Đà Lạt sáng sớm (Đang chạy - DEPARTED)
        t1_dep = timezone.make_aware(datetime.combine(today, datetime.min.time())) + timedelta(hours=6)
        t1_arr = t1_dep + timedelta(hours=6)
        trip1, _ = Trip.objects.update_or_create(
            trip_code="TRIP-TODAY-01",
            defaults={
                "route": routes["RT-SG-DL"],
                "bus": buses["51B-123.45"],
                "departure_time": t1_dep,
                "arrival_time": t1_arr,
                "ticket_price": Decimal("280000"),
                "status": Trip.Status.DEPARTED,
                "notes": "Chuyến xe khởi hành đúng giờ, có đón khách dọc đường theo điểm hẹn.",
            },
        )
        if tx1:
            TripStaffAssignment.objects.get_or_create(
                trip=trip1,
                employee=tx1,
                defaults={"assignment_role": TripStaffAssignment.Role.DRIVER},
            )
        if px1:
            TripStaffAssignment.objects.get_or_create(
                trip=trip1,
                employee=px1,
                defaults={"assignment_role": TripStaffAssignment.Role.BUS_ATTENDANT},
            )

        # 2. Chuyến hôm nay Sài Gòn -> Nha Trang (OPEN_FOR_BOOKING - Limousine)
        t2_dep = timezone.make_aware(datetime.combine(today, datetime.min.time())) + timedelta(hours=14)
        t2_arr = t2_dep + timedelta(hours=8)
        trip2, _ = Trip.objects.update_or_create(
            trip_code="TRIP-TODAY-02",
            defaults={
                "route": routes["RT-SG-NT"],
                "bus": buses["51C-678.90"],
                "departure_time": t2_dep,
                "arrival_time": t2_arr,
                "ticket_price": Decimal("380000"),
                "status": Trip.Status.OPEN_FOR_BOOKING,
                "notes": "Xe Limousine cung điện có massage, wifi tốc độ cao, nước uống miễn phí.",
            },
        )
        if tx2:
            TripStaffAssignment.objects.get_or_create(
                trip=trip2,
                employee=tx2,
                defaults={"assignment_role": TripStaffAssignment.Role.DRIVER},
            )

        # 3. Chuyến hôm nay Sài Gòn -> Phan Thiết chiều tối
        t3_dep = timezone.make_aware(datetime.combine(today, datetime.min.time())) + timedelta(hours=18)
        t3_arr = t3_dep + timedelta(hours=3, minutes=30)
        Trip.objects.update_or_create(
            trip_code="TRIP-TODAY-03",
            defaults={
                "route": routes["RT-SG-PT"],
                "bus": buses["51E-222.22"],
                "departure_time": t3_dep,
                "arrival_time": t3_arr,
                "ticket_price": Decimal("180000"),
                "status": Trip.Status.OPEN_FOR_BOOKING,
                "notes": "Xe chạy đường cao tốc Dầu Giây - Phan Thiết, êm ái, nhanh chóng.",
            },
        )

        # 4. Chuyến ngày mai Sài Gòn -> Đà Lạt
        tomorrow = today + timedelta(days=1)
        t4_dep = timezone.make_aware(datetime.combine(tomorrow, datetime.min.time())) + timedelta(hours=8)
        t4_arr = t4_dep + timedelta(hours=6)
        Trip.objects.update_or_create(
            trip_code="TRIP-TOMORROW-01",
            defaults={
                "route": routes["RT-SG-DL"],
                "bus": buses["51B-123.45"],
                "departure_time": t4_dep,
                "arrival_time": t4_arr,
                "ticket_price": Decimal("280000"),
                "status": Trip.Status.OPEN_FOR_BOOKING,
                "notes": "Chuyến sáng mát mẻ đi Đà Lạt săn mây.",
            },
        )

        # 5. Chuyến ngày mai Sài Gòn -> Nha Trang
        Trip.objects.update_or_create(
            trip_code="TRIP-TOMORROW-02",
            defaults={
                "route": routes["RT-SG-NT"],
                "bus": buses["51C-678.90"],
                "departure_time": t4_dep + timedelta(hours=1),
                "arrival_time": t4_dep + timedelta(hours=9),
                "ticket_price": Decimal("380000"),
                "status": Trip.Status.OPEN_FOR_BOOKING,
                "notes": "Chuyến đi Nha Trang biển xanh cát trắng.",
            },
        )

        # Đặt trước một vài ghế mẫu trên chuyến trip2 để sơ đồ ghế có ghế ĐÃ ĐẶT (Đỏ) và ghế TRỐNG (Xanh)
        seats_trip2 = list(trip2.bus.seats.order_by("seat_number")[:4])
        if len(seats_trip2) >= 2 and customer:
            # Tạo Booking 1 (Đã thanh toán vé A01, A02)
            b1, _ = Booking.objects.get_or_create(
                booking_code="BK-DEMO-001",
                defaults={
                    "trip": trip2,
                    "customer_user": customer,
                    "contact_name": "Lê Văn Khách",
                    "contact_phone": "0912345678",
                    "contact_email": "customer01@gmail.com",
                    "total_amount": Decimal("760000"),
                    "booking_status": Booking.Status.CONFIRMED,
                    "expires_at": now + timedelta(days=1),
                },
            )
            Ticket.objects.get_or_create(
                ticket_code="TK-DEMO-001",
                defaults={
                    "booking": b1,
                    "trip": trip2,
                    "bus_seat": seats_trip2[0],
                    "passenger_name": "Lê Văn Khách",
                    "passenger_phone": "0912345678",
                    "fare": Decimal("380000"),
                    "ticket_status": Ticket.Status.CONFIRMED,
                },
            )
            Ticket.objects.get_or_create(
                ticket_code="TK-DEMO-002",
                defaults={
                    "booking": b1,
                    "trip": trip2,
                    "bus_seat": seats_trip2[1],
                    "passenger_name": "Nguyễn Thị Hoa",
                    "passenger_phone": "0912345679",
                    "fare": Decimal("380000"),
                    "ticket_status": Ticket.Status.CONFIRMED,
                },
            )
            Payment.objects.get_or_create(
                booking=b1,
                defaults={
                    "amount": Decimal("760000"),
                    "payment_method": Payment.Method.SEPAY,
                    "payment_code": "PAY-DEMO-001",
                    "payment_status": Payment.Status.SUCCESS,
                    "paid_at": now,
                },
            )
