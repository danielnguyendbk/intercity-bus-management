from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LOCKED = "LOCKED"

class Role(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, unique=True)
    passwordHash = Column("password_hash", String(255), nullable=False)
    email = Column(String(150), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    role_id = Column(BigInteger, ForeignKey("roles.id"), nullable=True)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    createdAt = Column("created_at", DateTime, server_default=func.now())

    role = relationship("Role", back_populates="users")
    passengers = relationship("Passenger", back_populates="user")
    tickets = relationship("Ticket", back_populates="user")

class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    fullName = Column("full_name", String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(150), nullable=True)
    idCard = Column("id_card", String(50), nullable=True)

    user = relationship("User", back_populates="passengers")
    tickets = relationship("Ticket", back_populates="passenger")
