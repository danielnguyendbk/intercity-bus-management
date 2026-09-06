from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from app.models.bus import BusType, BusStatus, TripStatus
from app.models.ticket import TicketStatus, PaymentMethod, PaymentStatus

class RouteDto(BaseModel):
    id: int
    origin: str
    destination: str
    distanceKm: Decimal
    estimatedDurationMin: int
    basePrice: Decimal
    isActive: Optional[bool] = True

    class Config:
        from_attributes = True

class TripCreateRequest(BaseModel):
    routeId: Optional[int] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    basePrice: Optional[Decimal] = None
    distanceKm: Optional[Decimal] = None
    estimatedDurationMin: Optional[int] = None
    busId: int
    departureTime: datetime
    arrivalTime: datetime
    status: Optional[TripStatus] = TripStatus.SCHEDULED

class TripResponse(BaseModel):
    id: int
    routeId: Optional[int] = None
    routeName: Optional[str] = None
    busId: Optional[int] = None
    busLabel: Optional[str] = None
    departureTime: datetime
    arrivalTime: Optional[datetime] = None
    status: TripStatus
    totalSeats: Optional[int] = 0
    bookedSeats: Optional[int] = 0
    availableSeats: Optional[int] = 0

class TripSearchResponse(BaseModel):
    id: int
    origin: Optional[str] = None
    destination: Optional[str] = None
    departureTime: datetime
    arrivalTime: Optional[datetime] = None
    busLabel: Optional[str] = None
    totalSeats: Optional[int] = 0
    availableSeats: Optional[int] = 0
    basePrice: Optional[Decimal] = None
    status: Optional[str] = None

class SeatStatusResponse(BaseModel):
    id: int
    seatNumber: str
    positionX: Optional[int] = None
    positionY: Optional[int] = None
    booked: bool

class BookTicketRequest(BaseModel):
    tripId: int
    seatId: int
    price: Decimal
    passengerPhone: str
    pickupPoint: Optional[str] = None
    dropoffPoint: Optional[str] = None

class PayTicketRequest(BaseModel):
    paymentMethod: PaymentMethod = PaymentMethod.CASH

class TicketResponse(BaseModel):
    id: int
    tripId: Optional[int] = None
    origin: Optional[str] = ""
    destination: Optional[str] = ""
    departureTime: Optional[datetime] = None
    arrivalTime: Optional[datetime] = None
    busLicensePlate: Optional[str] = ""
    busType: Optional[str] = ""
    busLabel: Optional[str] = ""
    seatNumber: Optional[str] = ""
    passengerName: Optional[str] = ""
    passengerPhone: Optional[str] = ""
    passengerEmail: Optional[str] = ""
    price: Decimal
    status: str
    bookedAt: Optional[datetime] = None
    paidAt: Optional[datetime] = None
    paymentId: Optional[int] = None
    paymentMethod: Optional[str] = None
    paymentStatus: Optional[str] = None
    transactionCode: Optional[str] = None
    transactionTime: Optional[datetime] = None
    ticketCode: Optional[str] = None
    pickupPoint: Optional[str] = None
    dropoffPoint: Optional[str] = None

class VnpayCreatePaymentRequest(BaseModel):
    ticketId: int

class VnpayPaymentResponse(BaseModel):
    paymentUrl: str
    txnRef: str
    expireAt: str
