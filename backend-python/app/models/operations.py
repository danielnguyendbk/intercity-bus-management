from sqlalchemy import Column, BigInteger, String, Numeric, Integer, DateTime, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class CargoStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class EmployeeType(str, enum.Enum):
    DRIVER = "DRIVER"
    ASSISTANT = "ASSISTANT"
    TECHNICIAN = "TECHNICIAN"
    DISPATCHER = "DISPATCHER"
    MANAGER = "MANAGER"

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class AssignmentRole(str, enum.Enum):
    DRIVER = "DRIVER"
    ASSISTANT = "ASSISTANT"

class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class FeedbackCategory(str, enum.Enum):
    COMPLAINT = "COMPLAINT"
    SUGGESTION = "SUGGESTION"
    PRAISE = "PRAISE"
    QUESTION = "QUESTION"
    OTHER = "OTHER"

class FeedbackStatus(str, enum.Enum):
    NEW = "NEW"
    READ = "READ"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class FeedbackPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class AuthorRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"

class Cargo(Base):
    __tablename__ = "cargos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    trip_id = Column(BigInteger, ForeignKey("trips.id"), nullable=False)
    senderName = Column("sender_name", String(100), nullable=False)
    receiverName = Column("receiver_name", String(100), nullable=False)
    receiverPhone = Column("receiver_phone", String(20), nullable=False)
    cargoType = Column("cargo_type", String(100), nullable=True)
    weight = Column(Numeric(10, 2), nullable=True)
    fee = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(CargoStatus), default=CargoStatus.PENDING)
    createdAt = Column("created_at", DateTime, server_default=func.now())

    trip = relationship("Trip", back_populates="cargos")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    userId = Column("user_id", BigInteger, nullable=True)
    fullName = Column("full_name", String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    hometown = Column(String(100), nullable=True)
    experienceYears = Column("experience_years", Integer, nullable=True)
    joinDate = Column("join_date", Date, nullable=True)
    employeeType = Column("employee_type", SQLEnum(EmployeeType), nullable=False)
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)

class TripAssignment(Base):
    __tablename__ = "trip_assignments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tripId = Column("trip_id", BigInteger, ForeignKey("trips.id"), nullable=False)
    employeeId = Column("employee_id", BigInteger, ForeignKey("employees.id"), nullable=False)
    assignmentRole = Column("assignment_role", SQLEnum(AssignmentRole), nullable=False)

    trip = relationship("Trip", back_populates="assignments")
    employee = relationship("Employee")

class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_id = Column(BigInteger, ForeignKey("buses.id"), nullable=True)
    description = Column(Text, nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    maintenanceDate = Column("maintenance_date", Date, nullable=True)
    status = Column(SQLEnum(MaintenanceStatus), nullable=True)

    bus = relationship("Bus", back_populates="maintenances")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    category = Column(SQLEnum(FeedbackCategory), nullable=False)
    subject = Column(String(150), nullable=False)
    content = Column(Text, nullable=False)
    relatedTripId = Column("related_trip_id", BigInteger, nullable=True)
    rating = Column(Integer, nullable=True)
    status = Column(SQLEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.NEW)
    priority = Column(SQLEnum(FeedbackPriority), default=FeedbackPriority.MEDIUM)
    createdAt = Column("created_at", DateTime, server_default=func.now())
    updatedAt = Column("updated_at", DateTime, server_default=func.now(), onupdate=func.now())
    deletedAt = Column("deleted_at", DateTime, nullable=True)

    user = relationship("User")
    replies = relationship("FeedbackReply", back_populates="feedback", cascade="all, delete-orphan")

class FeedbackReply(Base):
    __tablename__ = "feedback_replies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    feedback_id = Column(BigInteger, ForeignKey("feedbacks.id"), nullable=False)
    author_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    authorRole = Column("author_role", SQLEnum(AuthorRole), nullable=False)
    content = Column(Text, nullable=False)
    createdAt = Column("created_at", DateTime, server_default=func.now())

    feedback = relationship("Feedback", back_populates="replies")
    author = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    userId = Column("user_id", BigInteger, nullable=True)
    action = Column(String(20), nullable=True)
    tableName = Column("table_name", String(50), nullable=True)
    recordId = Column("record_id", BigInteger, nullable=True)
    oldValues = Column("old_values", Text, nullable=True)
    newValues = Column("new_values", Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())
