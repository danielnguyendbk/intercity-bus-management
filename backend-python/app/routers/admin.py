from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from datetime import datetime
from decimal import Decimal
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.dependencies import require_admin, require_staff, get_current_user
from app.models.user import User
from app.models.bus import Trip, Route, Bus, TripStatus, BusStatus, BusType
from app.models.ticket import Ticket, TicketStatus, Payment, PaymentStatus
from app.schemas.admin import (
    AdminDashboardResponse, RevenueStatsResponse, UserListResponse,
    UserDetailResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest,
    BusListResponse, BusDetailResponse, CreateBusRequest, UpdateBusRequest,
    RouteListResponse, CreateRouteRequest, UpdateRouteRequest, AdminTicketDTO
)
from app.services.admin_service import AdminService
from app.services.sse_service import event_generator

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_staff)])

def validate_trip_schedule(bus_id: int, dep_time: datetime, arr_time: datetime, exclude_trip_id: Optional[int], db: Session):
    if dep_time >= arr_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Giờ đến dự kiến ({arr_time.strftime('%H:%M %d/%m/%Y')}) phải sau giờ khởi hành ({dep_time.strftime('%H:%M %d/%m/%Y')})"
        )

    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy xe được chỉ định"
        )

    if bus.status == BusStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Xe {bus.licensePlate} đang trong trạng thái bảo trì, không thể xếp lịch chuyến mới"
        )

    # Ràng buộc trùng lịch xe: dep_time < other.arrivalTime AND arr_time > other.departureTime
    conflict_query = db.query(Trip).filter(
        Trip.bus_id == bus_id,
        Trip.status != TripStatus.CANCELLED,
        Trip.departureTime < arr_time,
        Trip.arrivalTime > dep_time
    )
    if exclude_trip_id:
        conflict_query = conflict_query.filter(Trip.id != exclude_trip_id)

    conflict = conflict_query.first()
    if conflict:
        dep_str = conflict.departureTime.strftime("%d/%m/%Y %H:%M") if conflict.departureTime else ""
        arr_str = conflict.arrivalTime.strftime("%d/%m/%Y %H:%M") if conflict.arrivalTime else ""
        route_name = f"{conflict.route.origin} - {conflict.route.destination}" if conflict.route else f"Tuyến #{conflict.route_id}"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trùng lịch xe: Xe {bus.licensePlate} đã có lịch chạy cho chuyến #{conflict.id} ({route_name}) từ {dep_str} đến {arr_str}. Vui lòng chọn xe khác hoặc đổi khung giờ!"
        )


def _trip_response(trip: Trip) -> dict:
    route = trip.route
    bus = trip.bus
    assignments = [
        {
            "id": assignment.id,
            "employeeId": assignment.employeeId,
            "employeeName": assignment.employee.fullName if assignment.employee else None,
            "role": assignment.assignmentRole.value if assignment.assignmentRole else "",
        }
        for assignment in trip.assignments
    ]
    booked = sum(1 for ticket in trip.tickets if ticket.status.value not in {"CANCELLED", "REFUNDED", "EXPIRED"})
    return {
        "id": trip.id,
        "routeId": trip.route_id,
        "routeName": f"{route.origin} - {route.destination}" if route else "",
        "busId": trip.bus_id,
        "busLabel": bus.licensePlate if bus else "",
        "departureTime": trip.departureTime,
        "arrivalTime": trip.arrivalTime,
        "status": trip.status.value if trip.status else "SCHEDULED",
        "totalSeats": bus.totalSeats if bus else 0,
        "bookedSeats": booked,
        "availableSeats": max((bus.totalSeats if bus else 0) - booked, 0),
        "assignments": assignments,
    }

@router.get("/trips")
def get_trips(date: str | None = None, routeId: int | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Trip).order_by(Trip.departureTime.asc())
    if date:
        try:
            day = datetime.fromisoformat(date).date()
            query = query.filter(Trip.departureTime >= datetime.combine(day, datetime.min.time()), Trip.departureTime < datetime.combine(day, datetime.max.time()))
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be ISO-8601")
    if routeId is not None:
        query = query.filter(Trip.route_id == routeId)
    if status:
        try:
            query = query.filter(Trip.status == TripStatus[status.upper()])
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid trip status")
    return [_trip_response(trip) for trip in query.all()]

@router.post("/trips", status_code=status.HTTP_201_CREATED)
def create_trip(payload: Dict[str, Any], db: Session = Depends(get_db)):
    bus_id = payload.get("busId")
    if not bus_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn xe vận hành")

    try:
        dep_time = datetime.fromisoformat(str(payload["departureTime"]))
        arr_time = datetime.fromisoformat(str(payload["arrivalTime"]))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Thời gian khởi hành hoặc đến dự kiến không hợp lệ")

    # Kiểm tra ràng buộc thời gian & không trùng lịch xe
    validate_trip_schedule(int(bus_id), dep_time, arr_time, exclude_trip_id=None, db=db)

    route_id = payload.get("routeId")
    if route_id:
        route = db.query(Route).filter(Route.id == route_id).first()
        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến đường đã chọn")
    else:
        origin = (payload.get("origin") or "").strip()
        destination = (payload.get("destination") or "").strip()
        if not origin or not destination:
            raise HTTPException(status_code=400, detail="Vui lòng chọn tuyến đường có sẵn hoặc nhập điểm đi và điểm đến")
        if origin.lower() == destination.lower():
            raise HTTPException(status_code=400, detail="Điểm đi và điểm đến không được trùng nhau")

        base_price = Decimal(str(payload.get("basePrice") or 250000))
        distance_km = int(payload.get("distanceKm") or 100)
        est_min = int(payload.get("estimatedDurationMin") or max(int((arr_time - dep_time).total_seconds() / 60), 60))

        # Tái sử dụng tuyến nếu đã có sẵn
        existing_route = db.query(Route).filter(
            Route.origin.ilike(origin),
            Route.destination.ilike(destination),
            Route.isActive == True
        ).first()
        if existing_route:
            route_id = existing_route.id
        else:
            route = Route(
                origin=origin,
                destination=destination,
                basePrice=base_price,
                distanceKm=distance_km,
                estimatedDurationMin=est_min
            )
            db.add(route)
            db.flush()
            route_id = route.id

    trip_status_val = str(payload.get("status", "SCHEDULED")).upper()
    try:
        trip_status = TripStatus[trip_status_val]
    except KeyError:
        raise HTTPException(status_code=400, detail="Trạng thái chuyến không hợp lệ")

    trip = Trip(
        route_id=route_id,
        bus_id=int(bus_id),
        departureTime=dep_time,
        arrivalTime=arr_time,
        status=trip_status
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return _trip_response(trip)

@router.put("/trips/{trip_id}")
def update_trip(trip_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_bus_id = payload.get("busId", trip.bus_id)
    if "departureTime" in payload and payload["departureTime"]:
        try:
            new_dep = datetime.fromisoformat(str(payload["departureTime"]))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Thời gian khởi hành không hợp lệ")
    else:
        new_dep = trip.departureTime

    if "arrivalTime" in payload and payload["arrivalTime"]:
        try:
            new_arr = datetime.fromisoformat(str(payload["arrivalTime"]))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Thời gian đến dự kiến không hợp lệ")
    else:
        new_arr = trip.arrivalTime

    # Kiểm tra ràng buộc lịch trình nếu thay đổi thời gian hoặc xe
    if new_dep and new_arr and new_bus_id:
        validate_trip_schedule(int(new_bus_id), new_dep, new_arr, exclude_trip_id=trip_id, db=db)

    if "routeId" in payload and payload["routeId"]:
        route = db.query(Route).filter(Route.id == payload["routeId"]).first()
        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến đường đã chọn")
        trip.route_id = payload["routeId"]

    if new_bus_id:
        trip.bus_id = int(new_bus_id)
    trip.departureTime = new_dep
    trip.arrivalTime = new_arr

    if payload.get("status"):
        try:
            trip.status = TripStatus[str(payload["status"]).upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail="Trạng thái chuyến không hợp lệ")

    db.commit()
    db.refresh(trip)
    return _trip_response(trip)


@router.get("/trips/{trip_id}")
def get_trip_detail(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.bus and trip.bus.totalSeats and len(trip.bus.seats) != trip.bus.totalSeats:
        AdminService.sync_bus_seats(trip.bus.id, trip.bus.totalSeats, db)
        db.refresh(trip.bus)
    seats = []
    tickets = []
    active_statuses = {TicketStatus.CANCELLED, TicketStatus.REFUNDED, TicketStatus.EXPIRED}
    for seat in trip.bus.seats if trip.bus else []:
        ticket = next((item for item in trip.tickets if item.seat_id == seat.id and item.status not in active_statuses), None)
        passenger = ticket.passenger if ticket else None
        seats.append({"id": seat.id, "seatNumber": seat.seatNumber, "positionX": seat.positionX, "positionY": seat.positionY, "booked": ticket is not None, "bookedBy": passenger.phone if passenger else "", "passengerName": passenger.fullName if passenger else ""})
        if ticket:
            tickets.append({"id": ticket.id, "seatNumber": seat.seatNumber, "passengerName": passenger.fullName if passenger else "", "passengerPhone": passenger.phone if passenger else "", "price": ticket.price, "status": ticket.status.value, "bookedAt": ticket.bookedAt, "pickupPoint": ticket.pickupPoint, "dropoffPoint": ticket.dropoffPoint, "paymentMethod": ticket.payment.paymentMethod.value if ticket.payment and hasattr(ticket.payment.paymentMethod, "value") else (ticket.payment.paymentMethod if ticket.payment else None), "paymentStatus": ticket.payment.status.value if ticket.payment else None, "paidAt": ticket.paidAt})
    route = trip.route
    bus = trip.bus
    trip_data = _trip_response(trip)
    actual_total = len(seats) if seats else (bus.totalSeats if bus else 0)
    actual_booked = len(tickets)
    trip_data["totalSeats"] = actual_total
    trip_data["bookedSeats"] = actual_booked
    trip_data["availableSeats"] = max(actual_total - actual_booked, 0)
    return {**trip_data, "route": {"id": route.id, "origin": route.origin, "destination": route.destination, "distanceKm": route.distanceKm, "estimatedDurationMin": route.estimatedDurationMin, "basePrice": route.basePrice} if route else None, "bus": {"id": bus.id, "licensePlate": bus.licensePlate, "busType": bus.busType.value if bus.busType else "", "totalSeats": bus.totalSeats, "status": bus.status.value if bus.status else ""} if bus else None, "seats": seats, "tickets": tickets, "estimatedRevenue": sum((ticket.price or 0) for ticket in trip.tickets if ticket.status not in active_statuses), "actualRevenue": sum((ticket.price or 0) for ticket in trip.tickets if ticket.status == TicketStatus.PAID)}

@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.tickets:
        raise HTTPException(status_code=409, detail="Cannot delete a trip with tickets")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}

@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    return AdminService.get_dashboard(db)

@router.get("/revenue", response_model=RevenueStatsResponse)
def get_revenue(db: Session = Depends(get_db)):
    return AdminService.get_revenue_stats(db)

@router.get("/users", response_model=List[UserListResponse])
def get_users(
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return AdminService.get_users(db, keyword, role, status)

@router.get("/users/{user_id}", response_model=UserDetailResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    return AdminService.get_user_by_id(user_id, db)

@router.post("/users", response_model=UserDetailResponse, status_code=status.HTTP_201_CREATED)
def create_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    return AdminService.create_user(req, db)

@router.put("/users/{user_id}", response_model=UserDetailResponse)
def update_user(user_id: int, req: UpdateUserRequest, db: Session = Depends(get_db)):
    return AdminService.update_user(user_id, req, db)

@router.put("/users/{user_id}/lock", response_model=UserDetailResponse)
def lock_unlock_user(user_id: int, db: Session = Depends(get_db)):
    return AdminService.lock_unlock_user(user_id, db)

@router.put("/users/{user_id}/password")
def reset_password(user_id: int, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    AdminService.reset_user_password(user_id, req.newPassword, db)
    return {"message": "Password updated successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    AdminService.delete_user(user_id, db)
    return {"message": "User deleted successfully"}

# Buses
@router.get("/buses", response_model=List[BusListResponse])
def get_buses(
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return AdminService.get_buses(db, keyword, status)

@router.post("/buses", response_model=BusDetailResponse, status_code=status.HTTP_201_CREATED)
def create_bus(req: CreateBusRequest, db: Session = Depends(get_db)):
    return AdminService.create_bus(req, db)

@router.get("/buses/{bus_id}", response_model=BusDetailResponse)
def get_bus(bus_id: int, db: Session = Depends(get_db)):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus

@router.put("/buses/{bus_id}", response_model=BusDetailResponse)
def update_bus(bus_id: int, payload: UpdateBusRequest, db: Session = Depends(get_db)):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    for field in ("licensePlate", "busType", "totalSeats", "status", "lastMaintenanceDate", "insuranceExpiry"):
        value = getattr(payload, field)
        if value is not None:
            setattr(bus, field, value)
    db.commit()
    db.refresh(bus)
    if payload.totalSeats is not None:
        AdminService.sync_bus_seats(bus.id, bus.totalSeats, db)
    return bus

@router.put("/buses/{bus_id}/status", response_model=BusDetailResponse)
def update_bus_status(bus_id: int, payload: Dict[str, str], db: Session = Depends(get_db)):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    try:
        bus.status = BusStatus[payload["status"].upper()]
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid bus status")
    db.commit()
    db.refresh(bus)
    return bus

# Routes
@router.get("/routes", response_model=List[RouteListResponse])
def get_routes(db: Session = Depends(get_db)):
    return AdminService.get_routes(db)

@router.post("/routes", response_model=RouteListResponse, status_code=status.HTTP_201_CREATED)
def create_route(req: CreateRouteRequest, db: Session = Depends(get_db)):
    return AdminService.create_route(req, db)

@router.get("/routes/{route_id}", response_model=RouteListResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.put("/routes/{route_id}", response_model=RouteListResponse)
def update_route(route_id: int, payload: UpdateRouteRequest, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    for field in ("origin", "destination", "distanceKm", "estimatedDurationMin", "basePrice", "isActive"):
        value = getattr(payload, field)
        if value is not None:
            setattr(route, field, value)
    db.commit()
    db.refresh(route)
    return route

# Admin Tickets
@router.get("/tickets", response_model=List[AdminTicketDTO])
def get_admin_tickets(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return AdminService.get_admin_tickets(db, status, keyword)

@router.get("/tickets/all", response_model=List[AdminTicketDTO])
def get_all_admin_tickets(db: Session = Depends(get_db)):
    return AdminService.get_admin_tickets(db, None, None)

@router.get("/tickets/{ticket_id}")
def get_ticket_detail(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    trip = ticket.trip
    route = trip.route if trip else None
    bus = trip.bus if trip else None
    passenger = ticket.passenger
    payment = ticket.payment
    return {
        "id": ticket.id,
        "trip": {"id": trip.id, "routeId": trip.route_id, "routeName": f"{route.origin} - {route.destination}" if route else "", "busId": trip.bus_id, "busLabel": bus.licensePlate if bus else "", "departureTime": trip.departureTime, "arrivalTime": trip.arrivalTime, "tripStatus": trip.status.value if trip.status else ""} if trip else None,
        "seat": {"id": ticket.seat.id, "seatNumber": ticket.seat.seatNumber, "positionX": ticket.seat.positionX, "positionY": ticket.seat.positionY} if ticket.seat else None,
        "passenger": {"id": passenger.id, "fullName": passenger.fullName, "phone": passenger.phone, "email": passenger.email or "", "idCard": passenger.idCard or ""} if passenger else None,
        "price": ticket.price, "status": ticket.status.value if ticket.status else "", "user": {"id": ticket.user.id, "username": ticket.user.username, "role": ticket.user.role.name if ticket.user and ticket.user.role else ""} if ticket.user else None,
        "bookedAt": ticket.bookedAt, "paidAt": ticket.paidAt,
        "payment": {"id": payment.id, "amount": payment.amount, "paymentMethod": payment.paymentMethod.value if hasattr(payment.paymentMethod, "value") else payment.paymentMethod, "status": payment.status.value, "transactionCode": payment.transactionCode, "paidAt": payment.paidAt} if payment else None,
    }

@router.put("/tickets/{ticket_id}/confirm")
def confirm_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return AdminService.confirm_ticket(ticket_id, db)

def _set_ticket_status(ticket_id: int, ticket_status: TicketStatus, db: Session):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = ticket_status
    db.commit()
    return {"message": "Ticket status updated successfully", "id": ticket_id, "status": ticket_status.value}

@router.put("/tickets/{ticket_id}/mark-paid")
def mark_ticket_paid(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).with_for_update().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.payment and ticket.payment.paymentMethod == "SEPAY":
        raise HTTPException(status_code=409, detail="Vé SePay chỉ được cập nhật thanh toán từ giao dịch SePay đã xác minh, không xác nhận thủ công.")
    ticket.status = TicketStatus.PAID
    ticket.paidAt = datetime.now()
    if not ticket.payment:
        ticket.payment = Payment(amount=ticket.price, paymentMethod="CASH", status=PaymentStatus.SUCCESS, paidAt=datetime.now())
    else:
        ticket.payment.status = PaymentStatus.SUCCESS
        ticket.payment.paidAt = datetime.now()
    db.commit()
    return {"message": "Ticket marked as paid successfully", "id": ticket_id, "status": TicketStatus.PAID.value}

@router.put("/tickets/{ticket_id}/admin-cancel")
def cancel_ticket_by_admin(ticket_id: int, db: Session = Depends(get_db)):
    return _set_ticket_status(ticket_id, TicketStatus.CANCELLED, db)

# Realtime SSE notifications
@router.get("/notifications/stream")
async def notifications_stream(request: Request):
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
