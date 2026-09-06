from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status

from app.models.user import User, Role, Passenger, UserStatus
from app.models.bus import Bus, Route, Trip, Seat, BusStatus, BusType, TripStatus
from app.models.ticket import Ticket, Payment, TicketStatus, PaymentStatus
from app.models.operations import Feedback, FeedbackReply, Employee, Cargo, Maintenance, AuditLog, TripAssignment, AssignmentRole
from app.schemas.admin import (
    AdminDashboardResponse, RoleCount, BusStatusCount, BusInsuranceAlert,
    RevenueStatsResponse, DailyRevenueDTO, WeeklyRevenueDTO, MonthlyRevenueDTO, YearlyRevenueDTO,
    TopBusRevenueDTO, TopDriverRevenueDTO,
    UserListResponse, UserDetailResponse,
    CreateUserRequest, UpdateUserRequest, BusListResponse, BusDetailResponse,
    CreateBusRequest, UpdateBusRequest, RouteListResponse, CreateRouteRequest,
    UpdateRouteRequest, AdminTicketDTO, FeedbackResponse, CreateFeedbackRequest, ReplyFeedbackRequest,
    EmployeeDTO, CargoDTO
)
from app.core.security import get_password_hash

class AdminService:
    @staticmethod
    def get_dashboard(db: Session) -> AdminDashboardResponse:
        total_users = db.query(User).filter(User.status != UserStatus.INACTIVE).count()
        total_buses = db.query(Bus).count()
        total_routes = db.query(Route).count()

        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        today_trips = db.query(Trip).filter(Trip.departureTime >= today_start, Trip.departureTime <= today_end).count()

        role_counts_raw = db.query(Role.name, func.count(User.id)).join(User, User.role_id == Role.id).filter(User.status != UserStatus.INACTIVE).group_by(Role.name).all()
        role_distribution = [
            RoleCount(role=r[0].replace("ROLE_", "") if r[0] else "", count=r[1])
            for r in role_counts_raw if r[1] > 0
        ]

        bus_status_raw = db.query(Bus.status, func.count(Bus.id)).group_by(Bus.status).all()
        bus_status_dist = [
            BusStatusCount(status=b[0].value if b[0] else "", count=b[1])
            for b in bus_status_raw
        ]

        today = date.today()
        thirty_days = today + timedelta(days=30)
        all_buses = db.query(Bus).all()
        alerts = []
        for b in all_buses:
            if b.insuranceExpiry:
                if b.insuranceExpiry < today:
                    alerts.append(BusInsuranceAlert(
                        busId=b.id,
                        licensePlate=b.licensePlate,
                        busType=b.busType.value if b.busType else "",
                        status=b.status.value if b.status else "",
                        insuranceExpiry=str(b.insuranceExpiry),
                        alertType="EXPIRED"
                    ))
                elif b.insuranceExpiry < thirty_days:
                    alerts.append(BusInsuranceAlert(
                        busId=b.id,
                        licensePlate=b.licensePlate,
                        busType=b.busType.value if b.busType else "",
                        status=b.status.value if b.status else "",
                        insuranceExpiry=str(b.insuranceExpiry),
                        alertType="EXPIRING_SOON"
                    ))

        return AdminDashboardResponse(
            totalUsers=total_users,
            totalBuses=total_buses,
            totalRoutes=total_routes,
            todayTrips=today_trips,
            roleDistribution=role_distribution,
            busStatusDistribution=bus_status_dist,
            insuranceAlerts=alerts
        )

    @staticmethod
    def get_revenue_stats(db: Session) -> RevenueStatsResponse:
        today = date.today()
        
        all_tickets = db.query(Ticket).all()
        confirmed_tickets = [t for t in all_tickets if t.status in [TicketStatus.CONFIRMED, TicketStatus.PAID]]
        pending_tickets = [t for t in all_tickets if t.status == TicketStatus.HOLD]
        cancelled_tickets = [t for t in all_tickets if t.status in [TicketStatus.CANCELLED, TicketStatus.REFUNDED]]

        total_revenue = sum((t.price for t in confirmed_tickets if t.price), Decimal(0))

        def resolve_revenue_date(t: Ticket) -> date:
            if t.paidAt:
                return t.paidAt.date()
            if t.bookedAt:
                return t.bookedAt.date()
            return today

        # 1. Daily Revenue (last 7 days)
        daily_revenue: List[DailyRevenueDTO] = []
        daily_amounts = defaultdict(lambda: Decimal(0))
        for t in confirmed_tickets:
            d = resolve_revenue_date(t)
            daily_amounts[d] += (t.price or Decimal(0))

        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            daily_revenue.append(DailyRevenueDTO(
                date=day.isoformat(),
                label=day.strftime("%d/%m"),
                amount=daily_amounts[day]
            ))

        # 2. Weekly Revenue (last 12 weeks)
        current_week_start = today - timedelta(days=today.weekday())
        weekly_revenue: List[WeeklyRevenueDTO] = []
        weekly_amounts = defaultdict(lambda: Decimal(0))
        for t in confirmed_tickets:
            d = resolve_revenue_date(t)
            ws = d - timedelta(days=d.weekday())
            weekly_amounts[ws] += (t.price or Decimal(0))

        for i in range(11, -1, -1):
            ws = current_week_start - timedelta(weeks=i)
            weekly_revenue.append(WeeklyRevenueDTO(
                weekStart=ws.isoformat(),
                label=f"Tuần {ws.isocalendar()[1]}",
                amount=weekly_amounts[ws]
            ))

        # 3. Monthly Revenue (last 12 months)
        monthly_revenue: List[MonthlyRevenueDTO] = []
        monthly_amounts = defaultdict(lambda: Decimal(0))
        for t in confirmed_tickets:
            d = resolve_revenue_date(t)
            m_key = d.strftime("%Y-%m")
            monthly_amounts[m_key] += (t.price or Decimal(0))

        for i in range(11, -1, -1):
            # Calculate month
            m_date = today.replace(day=1) - timedelta(days=i * 30)
            m_key = m_date.strftime("%Y-%m")
            monthly_revenue.append(MonthlyRevenueDTO(
                month=m_key,
                label=m_date.strftime("T%m/%Y"),
                amount=monthly_amounts[m_key]
            ))

        # 4. Yearly Revenue (last 5 years)
        yearly_revenue: List[YearlyRevenueDTO] = []
        yearly_amounts = defaultdict(lambda: Decimal(0))
        for t in confirmed_tickets:
            d = resolve_revenue_date(t)
            yearly_amounts[str(d.year)] += (t.price or Decimal(0))

        for i in range(4, -1, -1):
            y_str = str(today.year - i)
            yearly_revenue.append(YearlyRevenueDTO(
                year=y_str,
                label=y_str,
                amount=yearly_amounts[y_str]
            ))

        # 5. Top Buses
        bus_data = defaultdict(lambda: {"revenue": Decimal(0), "ticketCount": 0, "tripCount": 0})
        for t in confirmed_tickets:
            if t.trip and t.trip.bus_id:
                b_id = t.trip.bus_id
                bus_data[b_id]["revenue"] += (t.price or Decimal(0))
                bus_data[b_id]["ticketCount"] += 1

        for trip in db.query(Trip).all():
            if trip.bus_id:
                bus_data[trip.bus_id]["tripCount"] += 1

        top_buses: List[TopBusRevenueDTO] = []
        for b_id, stat in sorted(bus_data.items(), key=lambda item: item[1]["revenue"], reverse=True)[:10]:
            bus = db.query(Bus).filter(Bus.id == b_id).first()
            if bus:
                top_buses.append(TopBusRevenueDTO(
                    busId=bus.id,
                    licensePlate=bus.licensePlate,
                    busType=bus.busType.value if bus.busType else "",
                    tripCount=stat["tripCount"],
                    ticketCount=stat["ticketCount"],
                    revenue=stat["revenue"]
                ))

        # 6. Top Drivers
        assignments = db.query(TripAssignment).filter(TripAssignment.assignmentRole == AssignmentRole.DRIVER).all()
        driver_data = defaultdict(lambda: {"revenue": Decimal(0), "ticketCount": 0, "tripCount": 0})
        for a in assignments:
            driver_data[a.employeeId]["tripCount"] += 1
            trip_tickets = [t for t in confirmed_tickets if t.trip_id == a.tripId]
            trip_rev = sum((t.price for t in trip_tickets if t.price), Decimal(0))
            driver_data[a.employeeId]["revenue"] += trip_rev
            driver_data[a.employeeId]["ticketCount"] += len(trip_tickets)

        top_drivers: List[TopDriverRevenueDTO] = []
        for e_id, stat in sorted(driver_data.items(), key=lambda item: item[1]["revenue"], reverse=True)[:10]:
            emp = db.query(Employee).filter(Employee.id == e_id).first()
            if emp:
                top_drivers.append(TopDriverRevenueDTO(
                    employeeId=emp.id,
                    fullName=emp.fullName,
                    tripCount=stat["tripCount"],
                    ticketCount=stat["ticketCount"],
                    revenue=stat["revenue"]
                ))

        return RevenueStatsResponse(
            totalRevenue=total_revenue,
            dailyRevenue=daily_revenue,
            weeklyRevenue=weekly_revenue,
            monthlyRevenue=monthly_revenue,
            yearlyRevenue=yearly_revenue,
            topBuses=top_buses,
            topDrivers=top_drivers,
            confirmedTicketCount=len(confirmed_tickets),
            pendingTicketCount=len(pending_tickets),
            cancelledTicketCount=len(cancelled_tickets)
        )

    # ── User Management ──
    @staticmethod
    def get_users(db: Session, keyword: Optional[str], role: Optional[str], status_val: Optional[str]) -> List[UserListResponse]:
        query = db.query(User)
        if status_val and status_val.strip():
            query = query.filter(User.status == status_val.strip().upper())
        if keyword and keyword.strip():
            kw = f"%{keyword.strip()}%"
            query = query.outerjoin(Passenger, User.id == Passenger.user_id).filter(
                or_(User.username.ilike(kw), User.email.ilike(kw), Passenger.fullName.ilike(kw), Passenger.phone.ilike(kw))
            )
        users = query.all()
        result = []
        for u in users:
            role_name = u.role.name.replace("ROLE_", "") if u.role else ""
            if role and role.strip() and role.strip().upper() != role_name.upper():
                continue
            passenger = db.query(Passenger).filter(Passenger.user_id == u.id).first()
            result.append(UserListResponse(
                id=u.id,
                username=u.username,
                fullName=passenger.fullName if passenger else "",
                email=u.email or "",
                phone=passenger.phone if passenger else (u.phone or ""),
                role=role_name,
                status=u.status.value if u.status else "ACTIVE",
                createdAt=u.createdAt
            ))
        return result

    @staticmethod
    def get_user_by_id(user_id: int, db: Session) -> UserDetailResponse:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        passenger = db.query(Passenger).filter(Passenger.user_id == u.id).first()
        return UserDetailResponse(
            id=u.id,
            username=u.username,
            fullName=passenger.fullName if passenger else "",
            email=u.email or "",
            phone=passenger.phone if passenger else (u.phone or ""),
            role=u.role.name.replace("ROLE_", "") if u.role else "",
            status=u.status.value if u.status else "ACTIVE",
            createdAt=u.createdAt
        )

    @staticmethod
    def create_user(req: CreateUserRequest, db: Session) -> UserDetailResponse:
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(status_code=409, detail="Username already exists")
        role = db.query(Role).filter(Role.name.in_([req.role.upper(), f"ROLE_{req.role.upper()}"])).first()
        if not role:
            role = Role(name=req.role.upper(), description="Created by Admin")
            db.add(role)
            db.commit()
            db.refresh(role)

        user = User(
            username=req.username,
            passwordHash=get_password_hash(req.password),
            email=req.email,
            phone=req.phone,
            role_id=role.id,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        passenger = Passenger(
            user_id=user.id,
            fullName=req.fullName,
            email=req.email,
            phone=req.phone or ""
        )
        db.add(passenger)
        db.commit()

        return AdminService.get_user_by_id(user.id, db)

    @staticmethod
    def update_user(user_id: int, req: UpdateUserRequest, db: Session) -> UserDetailResponse:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        if req.email:
            u.email = req.email
        if req.status:
            u.status = UserStatus[req.status.upper()]
        if req.role:
            role = db.query(Role).filter(Role.name.in_([req.role.upper(), f"ROLE_{req.role.upper()}"])).first()
            if role:
                u.role_id = role.id

        passenger = db.query(Passenger).filter(Passenger.user_id == u.id).first()
        if passenger:
            if req.fullName:
                passenger.fullName = req.fullName
            if req.phone is not None:
                passenger.phone = req.phone
        db.commit()
        return AdminService.get_user_by_id(u.id, db)

    @staticmethod
    def lock_unlock_user(user_id: int, db: Session) -> UserDetailResponse:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        u.status = UserStatus.LOCKED if u.status == UserStatus.ACTIVE else UserStatus.ACTIVE
        db.commit()
        return AdminService.get_user_by_id(u.id, db)

    @staticmethod
    def reset_user_password(user_id: int, new_pass: str, db: Session):
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        u.passwordHash = get_password_hash(new_pass)
        db.commit()

    @staticmethod
    def delete_user(user_id: int, db: Session):
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        u.status = UserStatus.INACTIVE
        db.commit()

    # ── Bus Management ──
    @staticmethod
    def get_buses(db: Session, keyword: Optional[str], status_val: Optional[str]) -> List[BusListResponse]:
        query = db.query(Bus)
        if status_val and status_val.strip():
            query = query.filter(Bus.status == status_val.strip().upper())
        if keyword and keyword.strip():
            query = query.filter(Bus.licensePlate.ilike(f"%{keyword.strip()}%"))
        buses = query.all()
        return [
            BusListResponse(
                id=b.id,
                licensePlate=b.licensePlate,
                busType=b.busType.value if b.busType else "",
                totalSeats=b.totalSeats,
                status=b.status.value if b.status else "",
                lastMaintenanceDate=b.lastMaintenanceDate,
                insuranceExpiry=b.insuranceExpiry
            ) for b in buses
        ]

    @staticmethod
    def create_bus(req: CreateBusRequest, db: Session) -> BusDetailResponse:
        if db.query(Bus).filter(Bus.licensePlate == req.licensePlate).first():
            raise HTTPException(status_code=409, detail="License plate already exists")
        bus = Bus(
            licensePlate=req.licensePlate,
            busType=req.busType,
            totalSeats=req.totalSeats,
            status=req.status or BusStatus.AVAILABLE,
            lastMaintenanceDate=req.lastMaintenanceDate,
            insuranceExpiry=req.insuranceExpiry
        )
        db.add(bus)
        db.commit()
        db.refresh(bus)
        return BusDetailResponse(
            id=bus.id,
            licensePlate=bus.licensePlate,
            busType=bus.busType.value if bus.busType else "",
            totalSeats=bus.totalSeats,
            status=bus.status.value if bus.status else "",
            lastMaintenanceDate=bus.lastMaintenanceDate,
            insuranceExpiry=bus.insuranceExpiry
        )

    # ── Route Management ──
    @staticmethod
    def get_routes(db: Session) -> List[RouteListResponse]:
        routes = db.query(Route).all()
        return [
            RouteListResponse(
                id=r.id,
                origin=r.origin,
                destination=r.destination,
                distanceKm=r.distanceKm,
                estimatedDurationMin=r.estimatedDurationMin,
                basePrice=r.basePrice,
                isActive=r.isActive if r.isActive is not None else True
            ) for r in routes
        ]

    @staticmethod
    def create_route(req: CreateRouteRequest, db: Session) -> RouteListResponse:
        route = Route(
            origin=req.origin,
            destination=req.destination,
            distanceKm=req.distanceKm,
            estimatedDurationMin=req.estimatedDurationMin,
            basePrice=req.basePrice,
            isActive=req.isActive if req.isActive is not None else True
        )
        db.add(route)
        db.commit()
        db.refresh(route)
        return RouteListResponse(
            id=route.id,
            origin=route.origin,
            destination=route.destination,
            distanceKm=route.distanceKm,
            estimatedDurationMin=route.estimatedDurationMin,
            basePrice=route.basePrice,
            isActive=route.isActive
        )

    # ── Admin Ticket Management ──
    @staticmethod
    def get_admin_tickets(db: Session, status_val: Optional[str], keyword: Optional[str]) -> List[AdminTicketDTO]:
        query = db.query(Ticket).order_by(Ticket.id.desc())
        if status_val and status_val.strip():
            query = query.filter(Ticket.status == status_val.strip().upper())
        tickets = query.all()
        result = []
        for t in tickets:
            p = t.passenger
            r = t.trip.route if t.trip else None
            route_str = f"{r.origin} - {r.destination}" if r else ""
            t_code = f"BUS-{t.bookedAt.strftime('%Y%m%d') if t.bookedAt else '2026'}-{t.id:05d}"
            result.append(AdminTicketDTO(
                id=t.id,
                tripId=t.trip_id,
                route=route_str,
                departureTime=t.trip.departureTime if t.trip else None,
                seatNumber=t.seat.seatNumber if t.seat else "",
                passengerName=p.fullName if p else "",
                passengerPhone=p.phone if p else "",
                price=t.price,
                status=t.status.value if t.status else "",
                paymentMethod=t.payment.paymentMethod.value if t.payment and t.payment.paymentMethod else None,
                paymentStatus=t.payment.status.value if t.payment and t.payment.status else None,
                bookedAt=t.bookedAt,
                ticketCode=t_code,
                pickupPoint=t.pickupPoint,
                dropoffPoint=t.dropoffPoint
            ))
        return result

    @staticmethod
    def confirm_ticket(ticket_id: int, db: Session) -> AdminTicketDTO:
        t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Ticket not found")
        t.status = TicketStatus.CONFIRMED
        db.commit()
        db.refresh(t)
        return AdminService.get_admin_tickets(db, None, None)[0]
