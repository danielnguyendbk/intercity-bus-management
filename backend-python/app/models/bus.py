from sqlalchemy import Column, BigInteger, String, Integer, Numeric, Boolean, DateTime, Date, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class BusType(str, enum.Enum):
    LIMOUSINE = "LIMOUSINE"
    SLEEPER = "SLEEPER"
    SEAT = "SEAT"

class BusStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RUNNING = "RUNNING"
    MAINTENANCE = "MAINTENANCE"

class TripStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DELAYED = "DELAYED"

class Bus(Base):
    __tablename__ = "buses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    licensePlate = Column("license_plate", String(50), nullable=False, unique=True)
    busType = Column("bus_type", SQLEnum(BusType), nullable=True)
    totalSeats = Column("total_seats", Integer, nullable=False)
    status = Column(SQLEnum(BusStatus), default=BusStatus.AVAILABLE)
    lastMaintenanceDate = Column("last_maintenance_date", Date, nullable=True)
    insuranceExpiry = Column("insurance_expiry", Date, nullable=True)

    seats = relationship("Seat", back_populates="bus", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="bus")
    maintenances = relationship("Maintenance", back_populates="bus")

class Route(Base):
    __tablename__ = "routes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    distanceKm = Column("distance_km", Numeric(10, 2), nullable=False)
    estimatedDurationMin = Column("estimated_duration_min", Integer, nullable=False)
    basePrice = Column("base_price", Numeric(10, 2), nullable=False)
    isActive = Column("is_active", Boolean, default=True)

    trips = relationship("Trip", back_populates="route")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    route_id = Column(BigInteger, ForeignKey("routes.id"), nullable=True)
    bus_id = Column(BigInteger, ForeignKey("buses.id"), nullable=True)
    departureTime = Column("departure_time", DateTime, nullable=False)
    arrivalTime = Column("arrival_time", DateTime, nullable=True)
    status = Column(SQLEnum(TripStatus), default=TripStatus.SCHEDULED)
    actualDeparture = Column("actual_departure", DateTime, nullable=True)
    actualArrival = Column("actual_arrival", DateTime, nullable=True)

    route = relationship("Route", back_populates="trips")
    bus = relationship("Bus", back_populates="trips")
    tickets = relationship("Ticket", back_populates="trip")
    cargos = relationship("Cargo", back_populates="trip")
    assignments = relationship("TripAssignment", back_populates="trip")

class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (UniqueConstraint("bus_id", "seat_number", name="uq_bus_seat"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_id = Column(BigInteger, ForeignKey("buses.id"), nullable=False)
    seatNumber = Column("seat_number", String(20), nullable=False)
    positionX = Column("position_x", Integer, nullable=True)
    positionY = Column("position_y", Integer, nullable=True)

    bus = relationship("Bus", back_populates="seats")
    tickets = relationship("Ticket", back_populates="seat")
