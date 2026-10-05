from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.trips_tickets import (
    TripSearchResponse, SeatStatusResponse, BookTicketRequest,
    TicketResponse, SePayCreatePaymentRequest
)
from app.services.booking_service import BookingService
from app.services.sepay_service import SePayService
from app.services.sse_service import broker

router = APIRouter(tags=["Trips & Bookings"])

# Public endpoints
@router.get("/api/public/trips", response_model=List[TripSearchResponse])
def get_upcoming_trips(date: Optional[date] = None, db: Session = Depends(get_db)):
    return BookingService.get_upcoming_trips(db, date)

@router.get("/api/public/trips/search", response_model=List[TripSearchResponse])
def search_trips(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    return BookingService.search_trips(db, origin, destination, date)

@router.get("/api/public/trips/{trip_id}/seats", response_model=List[SeatStatusResponse])
def get_trip_seats(trip_id: int, db: Session = Depends(get_db)):
    return BookingService.get_trip_seats(trip_id, db)

# Private Customer booking endpoints
@router.post("/api/private/tickets", response_model=TicketResponse)
def book_ticket(
    request: BookTicketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BookingService.book_ticket(request, current_user, db)

@router.get("/api/private/tickets/my", response_model=List[TicketResponse])
def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BookingService.get_my_tickets(current_user, db)

@router.put("/api/private/tickets/{ticket_id}/cancel", response_model=TicketResponse)
def cancel_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BookingService.cancel_ticket(ticket_id, current_user, db)

@router.post("/api/private/payment/sepay/create", response_model=TicketResponse)
def create_sepay_payment(
    request: SePayCreatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = SePayService.create_payment(request.ticketId, current_user, db)
    return BookingService._to_ticket_response(ticket)


@router.get("/api/private/payment/{payment_code}/status")
def payment_status(
    payment_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SePayService.get_status(payment_code, current_user, db)


@router.post("/api/public/payment/sepay/webhook")
@router.post("/api/payments/webhook/sepay/", include_in_schema=False)
@router.post("/api/payments/webhook/sepay", include_in_schema=False)
async def sepay_webhook(request: Request, db: Session = Depends(get_db)):
    SePayService.authenticate_webhook(request.headers.get("authorization", ""))
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    transaction = await SePayService.verify_transaction(payload)
    event = SePayService.settle(transaction, db)
    if event:
        await broker.broadcast("payment.sepay.success", event)
    return {"success": True}
