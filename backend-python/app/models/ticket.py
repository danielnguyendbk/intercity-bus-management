from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class TicketStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    HOLD = "HOLD"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"

class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    MOMO = "MOMO"
    BANK = "BANK"
    VNPAY = "VNPAY"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (UniqueConstraint("trip_id", "seat_id", name="uq_trip_seat"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    trip_id = Column(BigInteger, ForeignKey("trips.id"), nullable=True)
    seat_id = Column(BigInteger, ForeignKey("seats.id"), nullable=True)
    passenger_id = Column(BigInteger, ForeignKey("passengers.id"), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.BOOKED)
    booked_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    bookedAt = Column("booked_at", DateTime, server_default=func.now())
    paidAt = Column("paid_at", DateTime, nullable=True)
    pickupPoint = Column("pickup_point", String(500), nullable=True)
    dropoffPoint = Column("dropoff_point", String(500), nullable=True)

    trip = relationship("Trip", back_populates="tickets")
    seat = relationship("Seat", back_populates="tickets")
    passenger = relationship("Passenger", back_populates="tickets")
    user = relationship("User", back_populates="tickets")
    payment = relationship("Payment", back_populates="ticket", uselist=False, cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), unique=True, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    paymentMethod = Column("payment_method", SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    transactionCode = Column("transaction_code", String(100), nullable=True)
    paidAt = Column("paid_at", DateTime, nullable=True)

    # VNPay specific fields
    vnpTxnRef = Column("vnp_txn_ref", String(100), nullable=True)
    vnpTransactionNo = Column("vnp_transaction_no", String(50), nullable=True)
    vnpBankCode = Column("vnp_bank_code", String(20), nullable=True)
    vnpCardType = Column("vnp_card_type", String(20), nullable=True)
    vnpResponseCode = Column("vnp_response_code", String(10), nullable=True)

    ticket = relationship("Ticket", back_populates="payment")
