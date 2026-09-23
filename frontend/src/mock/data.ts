import type { AdminUser, AdminBus, AdminRoute, AdminDashboardData } from "../api/admin";
import type { TripSearchResult, SeatStatus, TicketRecord } from "../api/customer";
import type { Trip, Employee } from "../types";

// ==================== AUTH ====================

export const MOCK_USERS: AdminUser[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@busco.vn",
    phone: "0901000001",
    role: "ADMIN",
    status: "ACTIVE",
    fullName: "Nguyễn Văn Admin",
    employeeType: "",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    username: "staff01",
    email: "staff01@busco.vn",
    phone: "0901000002",
    role: "STAFF",
    status: "ACTIVE",
    fullName: "Trần Thị Điều Phối",
    employeeType: "DRIVER",
    createdAt: "2025-02-10T08:00:00Z",
  },
  {
    id: 3,
    username: "customer01",
    email: "customer01@gmail.com",
    phone: "0912345678",
    role: "CUSTOMER",
    status: "ACTIVE",
    fullName: "Lê Văn Khách",
    employeeType: "",
    createdAt: "2025-03-15T10:30:00Z",
  },
  {
    id: 4,
    username: "driver02",
    email: "driver02@busco.vn",
    phone: "0901000004",
    role: "STAFF",
    status: "ACTIVE",
    fullName: "Phạm Minh Tài Xế",
    employeeType: "DRIVER",
    createdAt: "2025-02-20T09:00:00Z",
  },
  {
    id: 5,
    username: "assistant01",
    email: "asst01@busco.vn",
    phone: "0901000005",
    role: "STAFF",
    status: "INACTIVE",
    fullName: "Đỗ Thị Phụ Xe",
    employeeType: "ASSISTANT",
    createdAt: "2025-02-25T09:00:00Z",
  },
];

// ==================== BUSES ====================

export const MOCK_BUSES: AdminBus[] = [
  {
    id: 1,
    licensePlate: "51B-12345",
    busType: "Sleeper 40",
    totalSeats: 40,
    status: "AVAILABLE",
    lastMaintenanceDate: "2025-08-01",
    insuranceExpiry: "2026-12-31",
    insuranceExpired: false,
    insuranceExpiringSoon: false,
    assignedTripsCount: 3,
  },
  {
    id: 2,
    licensePlate: "51C-67890",
    busType: "Limousine 20",
    totalSeats: 20,
    status: "RUNNING",
    lastMaintenanceDate: "2025-07-15",
    insuranceExpiry: "2026-03-15",
    insuranceExpired: false,
    insuranceExpiringSoon: true,
    assignedTripsCount: 1,
  },
  {
    id: 3,
    licensePlate: "51D-11111",
    busType: "Giường Nằm 44",
    totalSeats: 44,
    status: "MAINTENANCE",
    lastMaintenanceDate: "2025-09-01",
    insuranceExpiry: "2025-08-01",
    insuranceExpired: true,
    insuranceExpiringSoon: false,
    assignedTripsCount: 0,
  },
  {
    id: 4,
    licensePlate: "51E-22222",
    busType: "VIP Cabin 8",
    totalSeats: 8,
    status: "AVAILABLE",
    lastMaintenanceDate: "2025-06-20",
    insuranceExpiry: "2027-01-15",
    insuranceExpired: false,
    insuranceExpiringSoon: false,
    assignedTripsCount: 2,
  },
];

// ==================== ROUTES ====================

export const MOCK_ROUTES: AdminRoute[] = [
  {
    id: 1,
    origin: "TP. Hồ Chí Minh",
    destination: "Đà Lạt",
    distanceKm: 300,
    estimatedDurationMin: 360,
    basePrice: 280000,
    isActive: true,
    tripCount: 8,
  },
  {
    id: 2,
    origin: "TP. Hồ Chí Minh",
    destination: "Nha Trang",
    distanceKm: 450,
    estimatedDurationMin: 540,
    basePrice: 380000,
    isActive: true,
    tripCount: 5,
  },
  {
    id: 3,
    origin: "TP. Hồ Chí Minh",
    destination: "Phan Thiết",
    distanceKm: 200,
    estimatedDurationMin: 240,
    basePrice: 180000,
    isActive: true,
    tripCount: 12,
  },
  {
    id: 4,
    origin: "TP. Hồ Chí Minh",
    destination: "Cần Thơ",
    distanceKm: 170,
    estimatedDurationMin: 180,
    basePrice: 150000,
    isActive: false,
    tripCount: 0,
  },
];

// ==================== TRIPS ====================

export const MOCK_TRIPS: Trip[] = [
  {
    id: 1,
    routeId: 1,
    routeName: "TP. HCM → Đà Lạt",
    busId: 1,
    busLabel: "51B-12345 (Sleeper 40)",
    departureTime: "2026-09-08T07:00:00",
    arrivalTime: "2026-09-08T13:00:00",
    status: "SCHEDULED",
    assignments: [
      { id: 1, employeeId: 2, employeeName: "Trần Thị Điều Phối", role: "DRIVER" },
    ],
  },
  {
    id: 2,
    routeId: 2,
    routeName: "TP. HCM → Nha Trang",
    busId: 2,
    busLabel: "51C-67890 (Limousine 20)",
    departureTime: "2026-09-08T08:30:00",
    arrivalTime: "2026-09-08T17:30:00",
    status: "RUNNING",
    actualDepartureTime: "2026-09-08T08:35:00",
    assignments: [
      { id: 2, employeeId: 4, employeeName: "Phạm Minh Tài Xế", role: "DRIVER" },
      { id: 3, employeeId: 5, employeeName: "Đỗ Thị Phụ Xe", role: "ASSISTANT" },
    ],
  },
  {
    id: 3,
    routeId: 3,
    routeName: "TP. HCM → Phan Thiết",
    busId: 4,
    busLabel: "51E-22222 (VIP Cabin 8)",
    departureTime: "2026-09-09T06:00:00",
    arrivalTime: "2026-09-09T10:00:00",
    status: "SCHEDULED",
    assignments: [],
  },
];

// ==================== EMPLOYEES ====================

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 2, fullName: "Trần Thị Điều Phối", employeeType: "DRIVER" },
  { id: 4, fullName: "Phạm Minh Tài Xế", employeeType: "DRIVER" },
  { id: 5, fullName: "Đỗ Thị Phụ Xe", employeeType: "ASSISTANT" },
];

// ==================== SEATS ====================

export const MOCK_SEATS: Record<number, SeatStatus[]> = {
  1: Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    seatNumber: `A${String(i + 1).padStart(2, "0")}`,
    positionX: (i % 4),
    positionY: Math.floor(i / 4),
    booked: [2, 5, 9, 15, 23, 31].includes(i + 1),
  })),
  2: Array.from({ length: 20 }, (_, i) => ({
    id: i + 101,
    seatNumber: `B${String(i + 1).padStart(2, "0")}`,
    positionX: i % 2,
    positionY: Math.floor(i / 2),
    booked: [1, 3, 7].includes(i + 1),
  })),
  3: Array.from({ length: 8 }, (_, i) => ({
    id: i + 201,
    seatNumber: `VIP${i + 1}`,
    positionX: i % 2,
    positionY: Math.floor(i / 2),
    booked: false,
  })),
};

// ==================== TRIP SEARCH ====================

export const MOCK_TRIP_SEARCH_RESULTS: TripSearchResult[] = [
  {
    id: 1,
    origin: "TP. Hồ Chí Minh",
    destination: "Đà Lạt",
    departureTime: "2026-09-08T07:00:00",
    arrivalTime: "2026-09-08T13:00:00",
    busLabel: "51B-12345",
    totalSeats: 40,
    availableSeats: 34,
    basePrice: 280000,
    status: "SCHEDULED",
  },
  {
    id: 3,
    origin: "TP. Hồ Chí Minh",
    destination: "Đà Lạt",
    departureTime: "2026-09-08T22:00:00",
    arrivalTime: "2026-09-09T04:00:00",
    busLabel: "51D-11111",
    totalSeats: 44,
    availableSeats: 44,
    basePrice: 260000,
    status: "SCHEDULED",
  },
];

// ==================== TICKETS ====================

export const MOCK_TICKETS: TicketRecord[] = [
  {
    id: 101,
    tripId: 1,
    routeName: "TP. HCM → Đà Lạt",
    departureTime: "2026-09-08T07:00:00",
    arrivalTime: "2026-09-08T13:00:00",
    busLabel: "51B-12345",
    seatNumber: "A01",
    passengerName: "Lê Văn Khách",
    passengerPhone: "0912345678",
    price: 280000,
    status: "PAID",
    bookedAt: "2026-09-07T20:00:00",
  },
  {
    id: 102,
    tripId: 2,
    routeName: "TP. HCM → Nha Trang",
    departureTime: "2026-09-10T08:30:00",
    arrivalTime: "2026-09-10T17:30:00",
    busLabel: "51C-67890",
    seatNumber: "B04",
    passengerName: "Lê Văn Khách",
    passengerPhone: "0912345678",
    price: 380000,
    status: "BOOKED",
    bookedAt: "2026-09-07T21:00:00",
  },
];

// ==================== DASHBOARD ====================

export const MOCK_DASHBOARD: AdminDashboardData = {
  totalUsers: 5,
  totalBuses: 4,
  totalRoutes: 4,
  todayTrips: 3,
  roleDistribution: [
    { role: "ADMIN", count: 1 },
    { role: "STAFF", count: 2 },
    { role: "CUSTOMER", count: 2 },
  ],
  busStatusDistribution: [
    { status: "AVAILABLE", count: 2 },
    { status: "RUNNING", count: 1 },
    { status: "MAINTENANCE", count: 1 },
  ],
  insuranceAlerts: [
    {
      busId: 3,
      licensePlate: "51D-11111",
      busType: "Giường Nằm 44",
      status: "MAINTENANCE",
      expiryDate: "2025-08-01",
      alertType: "EXPIRED",
    },
    {
      busId: 2,
      licensePlate: "51C-67890",
      busType: "Limousine 20",
      status: "RUNNING",
      expiryDate: "2026-03-15",
      alertType: "EXPIRING_SOON",
    },
  ],
};
