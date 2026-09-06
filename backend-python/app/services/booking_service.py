import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.bus import Trip, Route, Bus, Seat, TripStatus, BusStatus
from app.models.ticket import Ticket, Payment, TicketStatus, PaymentMethod, PaymentStatus
from app.models.user import User, Passenger
from app.models.operations import TripAssignment, Employee
from app.schemas.trips_tickets import (
    TripSearchResponse, TripResponse, TripCreateRequest, SeatStatusResponse,
    BookTicketRequest, TicketResponse, PayTicketRequest, VnpayPaymentResponse
)
from app.services.sse_service import broker
from app.services.vnpay_util import build_payment_url, verify_secure_hash, format_vnp_datetime
from app.core.config import settings

class BookingService:
    @staticmethod
    def get_upcoming_trips(db: Session, target_date: Optional[date] = None) -> List[TripSearchResponse]:
        today = target_date or date.today()
        start_time = datetime.combine(today, datetime.min.time())
        end_time = datetime.combine(today + timedelta(days=30), datetime.max.time())

        trips = db.query(Trip).filter(
            Trip.departureTime >= start_time,
            Trip.departureTime <= end_time
        ).all()

        return [BookingService._to_trip_search_response(t, db) for t in trips]

    @staticmethod
    def search_trips(db: Session, origin: Optional[str], destination: Optional[str], target_date: Optional[date]) -> List[TripSearchResponse]:
        search_date = target_date or date.today()
        start_time = datetime.combine(search_date, datetime.min.time())
        end_time = datetime.combine(search_date, datetime.max.time())

        query = db.query(Trip).join(Route, Trip.route_id == Route.id).filter(
            Trip.departureTime >= start_time,
            Trip.departureTime <= end_time
        )

        if origin and origin.strip():
            query = query.filter(Route.origin.ilike(f"%{origin.strip()}%"))
        if destination and destination.strip():
            query = query.filter(Route.destination.ilike(f"%{destination.strip()}%"))

        trips = query.all()
        return [BookingService._to_trip_search_response(t, db) for t in trips]

    @staticmethod
    def _to_trip_search_response(trip: Trip, db: Session) -> TripSearchResponse:
        total_seats = trip.bus.totalSeats if trip.bus and trip.bus.totalSeats else 0
        booked_count = db.query(Ticket).filter(
            Ticket.trip_id == trip.id,
            Ticket.status.notin_([TicketStatus.CANCELLED, TicketStatus.REFUNDED])
        ).count()

        bus_label = f"{trip.bus.licensePlate} - {trip.bus.busType}" if trip.bus else ""
        price = trip.route.basePrice if trip.route else Decimal(0)
        origin = trip.route.origin if trip.route else ""
        dest = trip.route.destination if trip.route else ""

        return TripSearchResponse(
            id=trip.id,
            origin=origin,
            destination=dest,
            departureTime=trip.departureTime,
            arrivalTime=trip.arrivalTime,
            busLabel=bus_label,
            totalSeats=total_seats,
            availableSeats=max(0, total_seats - booked_count),
            basePrice=price,
            status=trip.status.value if trip.status else "SCHEDULED"
        )

    @staticmethod
    def get_trip_seats(trip_id: int, db: Session) -> List[SeatStatusResponse]:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if not trip.bus:
            raise HTTPException(status_code=400, detail="Chuyến này chưa được gán xe")

        bus = trip.bus
        total_seats = bus.totalSeats or 40

        # Auto ensure seats exist
        seats = db.query(Seat).filter(Seat.bus_id == bus.id).all()
        if not seats:
            seats = []
            seats_per_row = 10
            for i in range(total_seats):
                row = i // seats_per_row
                pos_in_row = i % seats_per_row
                x = 10 + pos_in_row * 20 if (pos_in_row < seats_per_row / 2) else 120 + (pos_in_row - seats_per_row // 2) * 20
                y = 10 + row * 35
                seat = Seat(
                    bus_id=bus.id,
                    seatNumber=str(i + 1),
                    positionX=x,
                    positionY=y
                )
                db.add(seat)
                seats.append(seat)
            db.commit()

        booked_seat_ids = set(
            row[0] for row in db.query(Ticket.seat_id).filter(
                Ticket.trip_id == trip.id,
                Ticket.status.notin_([TicketStatus.CANCELLED, TicketStatus.REFUNDED])
            ).all()
        )

        def extract_num(seat_num: str) -> int:
            num_str = "".join(filter(str.isdigit, seat_num or ""))
            return int(num_str) if num_str else 0

        seats_sorted = sorted(seats, key=lambda s: extract_num(s.seatNumber))

        return [
            SeatStatusResponse(
                id=s.id,
                seatNumber=s.seatNumber,
                positionX=s.positionX,
                positionY=s.positionY,
                booked=(s.id in booked_seat_ids)
            ) for s in seats_sorted
        ]

    @staticmethod
    def book_ticket(request: BookTicketRequest, current_user: User, db: Session) -> TicketResponse:
        trip = db.query(Trip).filter(Trip.id == request.tripId).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        if trip.status in [TripStatus.CANCELLED, TripStatus.COMPLETED, TripStatus.RUNNING, TripStatus.DELAYED]:
            raise HTTPException(status_code=400, detail="Không thể đặt vé cho chuyến này")

        if trip.departureTime and datetime.now() > trip.departureTime - timedelta(minutes=15):
            raise HTTPException(status_code=400, detail="Không thể đặt vé trong vòng 15 phút trước giờ khởi hành")

        seat = db.query(Seat).filter(Seat.id == request.seatId).first()
        if not seat or seat.bus_id != trip.bus_id:
            raise HTTPException(status_code=400, detail="Ghế không hợp lệ hoặc không thuộc xe của chuyến")

        # Check existing booking
        existing_ticket = db.query(Ticket).filter(
            Ticket.trip_id == trip.id,
            Ticket.seat_id == seat.id
        ).with_for_update().first()

        if existing_ticket:
            if existing_ticket.status not in [TicketStatus.CANCELLED, TicketStatus.REFUNDED, TicketStatus.HOLD]:
                raise HTTPException(status_code=400, detail="Ghế này đã được đặt cho chuyến này")
            ticket = existing_ticket
            ticket.price = request.price
            ticket.status = TicketStatus.HOLD
            ticket.bookedAt = datetime.now()
            ticket.paidAt = None
        else:
            ticket = Ticket(
                trip_id=trip.id,
                seat_id=seat.id,
                price=request.price,
                status=TicketStatus.HOLD,
                booked_by=current_user.id,
                bookedAt=datetime.now()
            )
            db.add(ticket)

        passenger = db.query(Passenger).filter(Passenger.user_id == current_user.id).first()
        if not passenger:
            passenger = Passenger(
                user_id=current_user.id,
                fullName=current_user.username,
                email=current_user.email,
                phone=request.passengerPhone
            )
            db.add(passenger)
            db.commit()
            db.refresh(passenger)
        else:
            passenger.phone = request.passengerPhone
            db.commit()

        ticket.passenger_id = passenger.id
        ticket.pickupPoint = request.pickupPoint
        ticket.dropoffPoint = request.dropoffPoint
        db.commit()
        db.refresh(ticket)

        # Trigger SSE notification
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(broker.broadcast("booking.created", {
                    "ticketId": ticket.id,
                    "tripId": trip.id,
                    "seatNumber": seat.seatNumber,
                    "passengerName": passenger.fullName,
                    "passengerPhone": passenger.phone,
                    "price": float(ticket.price),
                    "status": ticket.status.value,
                    "pickupPoint": ticket.pickupPoint,
                    "dropoffPoint": ticket.dropoffPoint,
                    "bookedAt": ticket.bookedAt.isoformat() if ticket.bookedAt else None
                }))
        except Exception:
            pass

        return BookingService._to_ticket_response(ticket)

    @staticmethod
    def get_my_tickets(current_user: User, db: Session) -> List[TicketResponse]:
        passenger = db.query(Passenger).filter(Passenger.user_id == current_user.id).first()
        if not passenger:
            return []
        tickets = db.query(Ticket).filter(Ticket.passenger_id == passenger.id).order_by(Ticket.id.desc()).all()
        return [BookingService._to_ticket_response(t) for t in tickets]

    @staticmethod
    def cancel_ticket(ticket_id: int, current_user: User, db: Session) -> TicketResponse:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if not ticket.passenger or ticket.passenger.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền hủy vé này")

        if ticket.status == TicketStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Vé đã bị hủy trước đó")
        if ticket.status in [TicketStatus.CONFIRMED, TicketStatus.PAID]:
            raise HTTPException(status_code=400, detail="Không thể hủy vé đã thanh toán/xác nhận. Vui lòng liên hệ hỗ trợ.")

        if ticket.trip and ticket.trip.departureTime and datetime.now() > ticket.trip.departureTime:
            raise HTTPException(status_code=400, detail="Không thể hủy vé vì chuyến xe đã khởi hành")

        ticket.status = TicketStatus.CANCELLED
        db.commit()
        db.refresh(ticket)
        return BookingService._to_ticket_response(ticket)

    @staticmethod
    def pay_ticket_offline(ticket_id: int, request: PayTicketRequest, current_user: User, db: Session) -> TicketResponse:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if not ticket.passenger or ticket.passenger.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thanh toán vé này")

        if ticket.status != TicketStatus.HOLD:
            raise HTTPException(status_code=400, detail="Chỉ vé đang chờ thanh toán (HOLD) mới có thể thanh toán")

        payment = Payment(
            ticket_id=ticket.id,
            amount=ticket.price,
            paymentMethod=request.paymentMethod,
            status=PaymentStatus.SUCCESS,
            transactionCode=f"{request.paymentMethod.value}-{int(datetime.now().timestamp() * 1000)}",
            paidAt=datetime.now()
        )
        db.add(payment)

        ticket.status = TicketStatus.PAID
        ticket.paidAt = datetime.now()
        db.commit()
        db.refresh(ticket)
        return BookingService._to_ticket_response(ticket)

    @staticmethod
    def _to_ticket_response(ticket: Ticket) -> TicketResponse:
        trip = ticket.trip
        route = trip.route if trip else None
        bus = trip.bus if trip else None
        payment = ticket.payment
        passenger = ticket.passenger

        bus_label = f"{bus.licensePlate} - {bus.busType.value}" if bus and bus.busType else (bus.licensePlate if bus else "")
        ticket_code = f"BUS-{ticket.bookedAt.strftime('%Y%m%d') if ticket.bookedAt else datetime.now().strftime('%Y%m%d')}-{ticket.id:05d}"

        return TicketResponse(
            id=ticket.id,
            tripId=trip.id if trip else None,
            origin=route.origin if route else "",
            destination=route.destination if route else "",
            departureTime=trip.departureTime if trip else None,
            arrivalTime=trip.arrivalTime if trip else None,
            busLicensePlate=bus.licensePlate if bus else "",
            busType=bus.busType.value if bus and bus.busType else "",
            busLabel=bus_label,
            seatNumber=ticket.seat.seatNumber if ticket.seat else "",
            passengerName=passenger.fullName if passenger else "",
            passengerPhone=passenger.phone if passenger else "",
            passengerEmail=passenger.email if passenger else "",
            price=ticket.price,
            status=ticket.status.value,
            bookedAt=ticket.bookedAt,
            paidAt=ticket.paidAt,
            paymentId=payment.id if payment else None,
            paymentMethod=payment.paymentMethod.value if payment and payment.paymentMethod else None,
            paymentStatus=payment.status.value if payment and payment.status else None,
            transactionCode=payment.transactionCode if payment else None,
            transactionTime=payment.paidAt if payment else None,
            ticketCode=ticket_code,
            pickupPoint=ticket.pickupPoint,
            dropoffPoint=ticket.dropoffPoint
        )
