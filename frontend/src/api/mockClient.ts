/**
 * mockClient.ts
 *
 * Drop-in mock cho toàn bộ API calls khi VITE_USE_MOCK=true.
 * Mọi hàm trả về Promise (giả lập độ trễ mạng ~300ms) để tương thích
 * hoàn toàn với cách gọi bất đồng bộ của các page component.
 */

import type { LoginRequest, RegisterRequest, LoginResponse } from "./auth";
import type {
  AdminDashboardData,
  AdminUser,
  AdminBus,
  AdminRoute,
  CreateUserPayload,
  UpdateUserPayload,
  CreateBusPayload,
  UpdateBusPayload,
  CreateRoutePayload,
  UpdateRoutePayload,
} from "./admin";
import type {
  TripSearchResult,
  SeatStatus,
  TicketRecord,
  BookTicketPayload,
  UpdateProfilePayload,
} from "./customer";
import type { TripFilter, CreateTripPayload, AssignTripPayload } from "./dispatcher";
import type { Trip, TripAssignment, Employee, User } from "../types";
import {
  MOCK_USERS,
  MOCK_BUSES,
  MOCK_ROUTES,
  MOCK_TRIPS,
  MOCK_EMPLOYEES,
  MOCK_SEATS,
  MOCK_TRIP_SEARCH_RESULTS,
  MOCK_TICKETS,
  MOCK_DASHBOARD,
} from "../mock/data";

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

let _users = [...MOCK_USERS];
let _buses = [...MOCK_BUSES];
let _routes = [...MOCK_ROUTES];
let _trips = [...MOCK_TRIPS];
let _tickets = [...MOCK_TICKETS];

// Lấy user đăng nhập hiện tại từ localStorage mock
function getCurrentUser(): User {
  const stored = localStorage.getItem("mock-user");
  if (stored) return JSON.parse(stored);
  return { id: 3, username: "customer01", fullName: "Lê Văn Khách", email: "customer01@gmail.com", role: "CUSTOMER", phone: "0912345678" };
}

// ======================== AUTH ========================

export async function mockLogin(payload: LoginRequest): Promise<LoginResponse> {
  await delay(null, 500);
  const user = _users.find(
    (u) => u.username === payload.username && u.role === payload.role
  );
  if (!user) throw new Error("Tài khoản hoặc mật khẩu không đúng");
  const mappedUser: User = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
  };
  localStorage.setItem("mock-user", JSON.stringify(mappedUser));
  return { token: "mock-token-" + user.id, user: mappedUser };
}

export async function mockRegister(payload: RegisterRequest): Promise<LoginResponse> {
  await delay(null, 500);
  const newUser: AdminUser = {
    id: _users.length + 1,
    username: payload.username,
    email: payload.email,
    phone: "",
    role: "CUSTOMER",
    status: "ACTIVE",
    fullName: payload.fullName,
    employeeType: "",
    createdAt: new Date().toISOString(),
  };
  _users.push(newUser);
  const mappedUser: User = {
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    email: newUser.email,
    role: newUser.role,
  };
  localStorage.setItem("mock-user", JSON.stringify(mappedUser));
  return { token: "mock-token-" + newUser.id, user: mappedUser };
}

// ======================== DASHBOARD ========================

export const mockGetAdminDashboard = (): Promise<AdminDashboardData> =>
  delay({ ...MOCK_DASHBOARD, totalUsers: _users.length, totalBuses: _buses.length, totalRoutes: _routes.length });

// ======================== USERS ========================

export const mockGetUsers = (params?: { keyword?: string; role?: string; status?: string }): Promise<AdminUser[]> => {
  let result = [..._users];
  if (params?.keyword) result = result.filter((u) => u.fullName.includes(params.keyword!) || u.username.includes(params.keyword!) || u.email.includes(params.keyword!));
  if (params?.role) result = result.filter((u) => u.role === params.role);
  if (params?.status) result = result.filter((u) => u.status === params.status);
  return delay(result);
};

export const mockGetUserById = (id: number): Promise<AdminUser> => {
  const u = _users.find((u) => u.id === id);
  if (!u) return Promise.reject(new Error("User not found"));
  return delay(u);
};

export const mockCreateUser = (payload: CreateUserPayload): Promise<AdminUser> => {
  const newUser: AdminUser = {
    id: _users.length + 1,
    ...payload,
    phone: payload.phone ?? "",
    status: "ACTIVE",
    fullName: payload.username,
    employeeType: "",
    createdAt: new Date().toISOString(),
  };
  _users.push(newUser);
  return delay(newUser);
};

export const mockUpdateUser = (id: number, payload: UpdateUserPayload): Promise<AdminUser> => {
  const idx = _users.findIndex((u) => u.id === id);
  if (idx === -1) return Promise.reject(new Error("User not found"));
  _users[idx] = { ..._users[idx], ...payload };
  return delay(_users[idx]);
};

export const mockLockUnlockUser = (id: number): Promise<AdminUser> => {
  const idx = _users.findIndex((u) => u.id === id);
  if (idx === -1) return Promise.reject(new Error("User not found"));
  _users[idx].status = _users[idx].status === "LOCKED" ? "ACTIVE" : "LOCKED";
  return delay(_users[idx]);
};

export const mockResetUserPassword = (_id: number, _newPassword: string): Promise<void> =>
  delay(undefined as unknown as void);

// ======================== BUSES ========================

export const mockGetBuses = (params?: { keyword?: string; status?: string }): Promise<AdminBus[]> => {
  let result = [..._buses];
  if (params?.keyword) result = result.filter((b) => b.licensePlate.includes(params.keyword!) || b.busType.includes(params.keyword!));
  if (params?.status) result = result.filter((b) => b.status === params.status);
  return delay(result);
};

export const mockGetBusById = (id: number): Promise<AdminBus> => {
  const b = _buses.find((b) => b.id === id);
  if (!b) return Promise.reject(new Error("Bus not found"));
  return delay(b);
};

export const mockCreateBus = (payload: CreateBusPayload): Promise<AdminBus> => {
  const newBus: AdminBus = {
    id: _buses.length + 1,
    ...payload,
    lastMaintenanceDate: payload.lastMaintenanceDate ?? null,
    insuranceExpiry: payload.insuranceExpiry ?? null,
    insuranceExpired: false,
    insuranceExpiringSoon: false,
    status: "AVAILABLE",
    assignedTripsCount: 0,
  };
  _buses.push(newBus);
  return delay(newBus);
};

export const mockUpdateBus = (id: number, payload: UpdateBusPayload): Promise<AdminBus> => {
  const idx = _buses.findIndex((b) => b.id === id);
  if (idx === -1) return Promise.reject(new Error("Bus not found"));
  _buses[idx] = { ..._buses[idx], ...payload };
  return delay(_buses[idx]);
};

export const mockUpdateBusStatus = (id: number, status: string): Promise<AdminBus> => {
  const idx = _buses.findIndex((b) => b.id === id);
  if (idx === -1) return Promise.reject(new Error("Bus not found"));
  _buses[idx].status = status as AdminBus["status"];
  return delay(_buses[idx]);
};

// ======================== ROUTES ========================

export const mockGetRoutes = (params?: { keyword?: string; activeOnly?: boolean }): Promise<AdminRoute[]> => {
  let result = [..._routes];
  if (params?.keyword) result = result.filter((r) => r.origin.includes(params.keyword!) || r.destination.includes(params.keyword!));
  if (params?.activeOnly) result = result.filter((r) => r.isActive);
  return delay(result);
};

export const mockGetRouteById = (id: number): Promise<AdminRoute> => {
  const r = _routes.find((r) => r.id === id);
  if (!r) return Promise.reject(new Error("Route not found"));
  return delay(r);
};

export const mockCreateRoute = (payload: CreateRoutePayload): Promise<AdminRoute> => {
  const newRoute: AdminRoute = { id: _routes.length + 1, ...payload, isActive: true, tripCount: 0 };
  _routes.push(newRoute);
  return delay(newRoute);
};

export const mockUpdateRoute = (id: number, payload: UpdateRoutePayload): Promise<AdminRoute> => {
  const idx = _routes.findIndex((r) => r.id === id);
  if (idx === -1) return Promise.reject(new Error("Route not found"));
  _routes[idx] = { ..._routes[idx], ...payload };
  return delay(_routes[idx]);
};

// ======================== TRIPS (Dispatcher) ========================

export const mockGetTrips = (filter?: TripFilter): Promise<Trip[]> => {
  let result = [..._trips];
  if (filter?.status) result = result.filter((t) => t.status === filter.status);
  if (filter?.routeId) result = result.filter((t) => t.routeId === filter.routeId);
  if (filter?.date) result = result.filter((t) => t.departureTime.startsWith(filter.date!));
  return delay(result);
};

export const mockCreateTrip = (payload: CreateTripPayload): Promise<Trip> => {
  const route = _routes.find((r) => r.id === payload.routeId);
  const bus = _buses.find((b) => b.id === payload.busId);
  const newTrip: Trip = {
    id: _trips.length + 1,
    routeId: payload.routeId,
    routeName: route ? `${route.origin} → ${route.destination}` : "Tuyến mới",
    busId: payload.busId,
    busLabel: bus ? `${bus.licensePlate} (${bus.busType})` : "Xe mới",
    departureTime: payload.departureTime,
    arrivalTime: payload.arrivalTime,
    status: (payload.status as Trip["status"]) ?? "SCHEDULED",
    assignments: [],
  };
  _trips.push(newTrip);
  return delay(newTrip);
};

export const mockAssignTrip = (payload: AssignTripPayload): Promise<TripAssignment> => {
  const emp = MOCK_EMPLOYEES.find((e) => e.id === payload.employeeId);
  const assignment: TripAssignment = {
    id: Date.now(),
    employeeId: payload.employeeId,
    employeeName: emp?.fullName ?? "Nhân viên",
    role: payload.role,
  };
  const tripIdx = _trips.findIndex((t) => t.id === payload.tripId);
  if (tripIdx !== -1) _trips[tripIdx].assignments.push(assignment);
  return delay(assignment);
};

export const mockGetAvailableEmployees = (params: { from: string; to: string; role: string }): Promise<Employee[]> =>
  delay(MOCK_EMPLOYEES.filter((e) => e.employeeType === params.role));

// ======================== CUSTOMER ========================

export const mockSearchTrips = (_params: { origin: string; destination: string; date: string }): Promise<TripSearchResult[]> =>
  delay(MOCK_TRIP_SEARCH_RESULTS, 400);

export const mockGetTripSeats = (tripId: number): Promise<SeatStatus[]> =>
  delay(MOCK_SEATS[tripId] ?? MOCK_SEATS[1], 300);

export const mockBookTicket = (payload: BookTicketPayload): Promise<TicketRecord> => {
  const user = getCurrentUser();
  const trip = _trips.find((t) => t.id === payload.tripId);
  const newTicket: TicketRecord = {
    id: Date.now(),
    tripId: payload.tripId,
    routeName: trip?.routeName ?? "Tuyến xe",
    departureTime: trip?.departureTime ?? "",
    arrivalTime: trip?.arrivalTime ?? "",
    busLabel: trip?.busLabel ?? "",
    seatNumber: `S${payload.seatId}`,
    passengerName: user.fullName,
    passengerPhone: payload.passengerPhone,
    price: payload.price,
    status: "BOOKED",
    bookedAt: new Date().toISOString(),
  };
  _tickets.push(newTicket);
  return delay(newTicket, 500);
};

export const mockGetMyTickets = (): Promise<TicketRecord[]> =>
  delay([..._tickets]);

export const mockCancelTicket = (ticketId: number): Promise<TicketRecord> => {
  const idx = _tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return Promise.reject(new Error("Ticket not found"));
  _tickets[idx].status = "CANCELLED";
  return delay(_tickets[idx]);
};

export const mockGetProfile = () =>
  delay({ ...getCurrentUser() });

export const mockUpdateProfile = (payload: UpdateProfilePayload): Promise<void> => {
  const user = getCurrentUser();
  const updated = { ...user, ...payload };
  localStorage.setItem("mock-user", JSON.stringify(updated));
  return delay(undefined as unknown as void);
};
