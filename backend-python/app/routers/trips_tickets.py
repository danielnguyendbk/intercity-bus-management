from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.trips_tickets import (
    TripSearchResponse, SeatStatusResponse, BookTicketRequest,
    TicketResponse, PayTicketRequest, VnpayCreatePaymentRequest, VnpayPaymentResponse
)
from app.services.booking_service import BookingService
from app.services.vnpay_service import VNPayService

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

@router.put("/api/private/tickets/{ticket_id}/pay", response_model=TicketResponse)
def pay_ticket(
    ticket_id: int,
    request: PayTicketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BookingService.pay_ticket_offline(ticket_id, request, current_user, db)

# VNPay Payment endpoints
@router.post("/api/private/payment/vnpay/create", response_model=VnpayPaymentResponse)
def create_vnpay_payment(
    request: VnpayCreatePaymentRequest,
    http_req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = http_req.headers.get("x-forwarded-for") or http_req.client.host
    return VNPayService.create_payment_url(request.ticketId, current_user, db, client_ip)

@router.get("/api/public/payment/vnpay/return")
def vnpay_return(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    return VNPayService.verify_return(params, db)

@router.post("/api/public/payment/vnpay/ipn")
async def vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    # Support form urlencoded or query params
    form_data = await request.form()
    params = dict(form_data) if form_data else dict(request.query_params)
    return VNPayService.process_ipn(params, db)
