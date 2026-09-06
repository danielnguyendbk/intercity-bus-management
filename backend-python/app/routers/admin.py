from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from datetime import datetime
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
    route_id = payload.get("routeId")
    if not route_id:
        required = ("origin", "destination", "basePrice", "distanceKm", "estimatedDurationMin")
        if any(payload.get(key) is None for key in required):
            raise HTTPException(status_code=400, detail="routeId or complete inline route data is required")
        route = Route(origin=payload["origin"], destination=payload["destination"], basePrice=payload["basePrice"], distanceKm=payload["distanceKm"], estimatedDurationMin=payload["estimatedDurationMin"])
        db.add(route)
        db.flush()
        route_id = route.id
    trip = Trip(route_id=route_id, bus_id=payload.get("busId"), departureTime=datetime.fromisoformat(payload["departureTime"]), arrivalTime=datetime.fromisoformat(payload["arrivalTime"]), status=TripStatus[payload.get("status", "SCHEDULED").upper()])
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return _trip_response(trip)

@router.put("/trips/{trip_id}")
def update_trip(trip_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    for field, column in (("routeId", "route_id"), ("busId", "bus_id")):
        if field in payload:
            setattr(trip, column, payload[field])
    if payload.get("departureTime"):
        trip.departureTime = datetime.fromisoformat(payload["departureTime"])
    if payload.get("arrivalTime"):
        trip.arrivalTime = datetime.fromisoformat(payload["arrivalTime"])
    if payload.get("status"):
        try:
            trip.status = TripStatus[payload["status"].upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid trip status")
    db.commit()
    db.refresh(trip)
    return _trip_response(trip)

@router.get("/trips/{trip_id}")
def get_trip_detail(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    seats = []
    tickets = []
    active_statuses = {TicketStatus.CANCELLED, TicketStatus.REFUNDED, TicketStatus.EXPIRED}
    for seat in trip.bus.seats if trip.bus else []:
        ticket = next((item for item in trip.tickets if item.seat_id == seat.id and item.status not in active_statuses), None)
        passenger = ticket.passenger if ticket else None
        seats.append({"id": seat.id, "seatNumber": seat.seatNumber, "positionX": seat.positionX, "positionY": seat.positionY, "booked": ticket is not None, "bookedBy": passenger.phone if passenger else "", "passengerName": passenger.fullName if passenger else ""})
        if ticket:
            tickets.append({"id": ticket.id, "seatNumber": seat.seatNumber, "passengerName": passenger.fullName if passenger else "", "passengerPhone": passenger.phone if passenger else "", "price": ticket.price, "status": ticket.status.value, "bookedAt": ticket.bookedAt, "pickupPoint": ticket.pickupPoint, "dropoffPoint": ticket.dropoffPoint, "paymentMethod": ticket.payment.paymentMethod.value if ticket.payment else None, "paymentStatus": ticket.payment.status.value if ticket.payment else None, "paidAt": ticket.paidAt})
    route = trip.route
    bus = trip.bus
    return {**_trip_response(trip), "route": {"id": route.id, "origin": route.origin, "destination": route.destination, "distanceKm": route.distanceKm, "estimatedDurationMin": route.estimatedDurationMin, "basePrice": route.basePrice} if route else None, "bus": {"id": bus.id, "licensePlate": bus.licensePlate, "busType": bus.busType.value if bus.busType else "", "totalSeats": bus.totalSeats, "status": bus.status.value if bus.status else ""} if bus else None, "seats": seats, "tickets": tickets, "estimatedRevenue": sum((ticket.price or 0) for ticket in trip.tickets if ticket.status not in active_statuses), "actualRevenue": sum((ticket.price or 0) for ticket in trip.tickets if ticket.status == TicketStatus.PAID)}

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
        "payment": {"id": payment.id, "amount": payment.amount, "paymentMethod": payment.paymentMethod.value, "status": payment.status.value, "transactionCode": payment.transactionCode, "paidAt": payment.paidAt} if payment else None,
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
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
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
