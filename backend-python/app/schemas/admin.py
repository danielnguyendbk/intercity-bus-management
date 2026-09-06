from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from app.models.bus import BusType, BusStatus
from app.models.user import UserStatus
from app.models.operations import EmployeeType, EmployeeStatus, AssignmentRole, MaintenanceStatus, FeedbackCategory, FeedbackStatus, FeedbackPriority, AuthorRole

# Dashboard
class RoleCount(BaseModel):
    role: str
    count: int

class BusStatusCount(BaseModel):
    status: str
    count: int

class BusInsuranceAlert(BaseModel):
    busId: int
    licensePlate: str
    busType: str
    status: str
    insuranceExpiry: str
    alertType: str

class AdminDashboardResponse(BaseModel):
    totalUsers: int
    totalBuses: int
    totalRoutes: int
    todayTrips: int
    roleDistribution: List[RoleCount]
    busStatusDistribution: List[BusStatusCount]
    insuranceAlerts: List[BusInsuranceAlert]

# Revenue Sub-DTOs
class DailyRevenueDTO(BaseModel):
    date: str
    label: str
    amount: Decimal

class WeeklyRevenueDTO(BaseModel):
    weekStart: str
    label: str
    amount: Decimal

class MonthlyRevenueDTO(BaseModel):
    month: str
    label: str
    amount: Decimal

class YearlyRevenueDTO(BaseModel):
    year: str
    label: str
    amount: Decimal

class TopBusRevenueDTO(BaseModel):
    busId: int
    licensePlate: str
    busType: str
    tripCount: int
    ticketCount: int
    revenue: Decimal

class TopDriverRevenueDTO(BaseModel):
    employeeId: int
    fullName: str
    tripCount: int
    ticketCount: int
    revenue: Decimal

class RevenueStatsResponse(BaseModel):
    totalRevenue: Decimal
    dailyRevenue: List[DailyRevenueDTO] = []
    weeklyRevenue: List[WeeklyRevenueDTO] = []
    monthlyRevenue: List[MonthlyRevenueDTO] = []
    yearlyRevenue: List[YearlyRevenueDTO] = []
    topBuses: List[TopBusRevenueDTO] = []
    topDrivers: List[TopDriverRevenueDTO] = []
    confirmedTicketCount: int = 0
    pendingTicketCount: int = 0
    cancelledTicketCount: int = 0

# User Admin DTOs
class UserListResponse(BaseModel):
    id: int
    username: str
    fullName: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    role: Optional[str] = ""
    status: str
    createdAt: Optional[datetime] = None

class UserDetailResponse(BaseModel):
    id: int
    username: str
    fullName: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    role: Optional[str] = ""
    status: str
    createdAt: Optional[datetime] = None

class CreateUserRequest(BaseModel):
    username: str
    password: str
    fullName: str
    email: EmailStr
    phone: Optional[str] = ""
    role: str = "CUSTOMER"

class UpdateUserRequest(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    newPassword: str

# Bus Admin DTOs
class BusListResponse(BaseModel):
    id: int
    licensePlate: str
    busType: Optional[str] = ""
    totalSeats: int
    status: str
    lastMaintenanceDate: Optional[date] = None
    insuranceExpiry: Optional[date] = None

class BusDetailResponse(BaseModel):
    id: int
    licensePlate: str
    busType: Optional[str] = ""
    totalSeats: int
    status: str
    lastMaintenanceDate: Optional[date] = None
    insuranceExpiry: Optional[date] = None

class CreateBusRequest(BaseModel):
    licensePlate: str
    busType: BusType
    totalSeats: int
    status: Optional[BusStatus] = BusStatus.AVAILABLE
    lastMaintenanceDate: Optional[date] = None
    insuranceExpiry: Optional[date] = None

class UpdateBusRequest(BaseModel):
    licensePlate: Optional[str] = None
    busType: Optional[BusType] = None
    totalSeats: Optional[int] = None
    status: Optional[BusStatus] = None
    lastMaintenanceDate: Optional[date] = None
    insuranceExpiry: Optional[date] = None

# Route Admin DTOs
class RouteListResponse(BaseModel):
    id: int
    origin: str
    destination: str
    distanceKm: Decimal
    estimatedDurationMin: int
    basePrice: Decimal
    isActive: bool

class CreateRouteRequest(BaseModel):
    origin: str
    destination: str
    distanceKm: Decimal
    estimatedDurationMin: int
    basePrice: Decimal
    isActive: Optional[bool] = True

class UpdateRouteRequest(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    distanceKm: Optional[Decimal] = None
    estimatedDurationMin: Optional[int] = None
    basePrice: Optional[Decimal] = None
    isActive: Optional[bool] = None

# Admin Ticket
class AdminTicketDTO(BaseModel):
    id: int
    tripId: Optional[int] = None
    route: Optional[str] = ""
    departureTime: Optional[datetime] = None
    seatNumber: Optional[str] = ""
    passengerName: Optional[str] = ""
    passengerPhone: Optional[str] = ""
    price: Decimal
    status: str
    paymentMethod: Optional[str] = None
    paymentStatus: Optional[str] = None
    bookedAt: Optional[datetime] = None
    ticketCode: Optional[str] = None
    pickupPoint: Optional[str] = None
    dropoffPoint: Optional[str] = None

# Feedback DTOs
class CreateFeedbackRequest(BaseModel):
    category: FeedbackCategory
    subject: str
    content: str
    relatedTripId: Optional[int] = None
    rating: Optional[int] = None

class ReplyFeedbackRequest(BaseModel):
    content: str

class FeedbackResponse(BaseModel):
    id: int
    category: str
    subject: str
    content: str
    rating: Optional[int] = None
    status: str
    priority: Optional[str] = None
    createdAt: datetime
    userName: Optional[str] = ""
    userEmail: Optional[str] = ""
    replies: Optional[List[Dict[str, Any]]] = []

# Employee DTOs
class EmployeeDTO(BaseModel):
    id: int
    userId: Optional[int] = None
    fullName: str
    phone: Optional[str] = ""
    hometown: Optional[str] = ""
    experienceYears: Optional[int] = 0
    joinDate: Optional[date] = None
    employeeType: str
    status: str

# Cargo DTOs
class CargoDTO(BaseModel):
    id: int
    tripId: int
    senderName: str
    receiverName: str
    receiverPhone: str
    cargoType: Optional[str] = ""
    weight: Optional[Decimal] = None
    fee: Decimal
    status: str
    createdAt: Optional[datetime] = None
