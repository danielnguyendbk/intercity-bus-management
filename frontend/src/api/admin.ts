/**
 * admin.ts – API layer cho Admin.
 * Khi VITE_USE_MOCK=true, mọi gọi API sẽ được chuyển sang mockClient.
 */
import apiClient from "./apiClient";
import { UserRole } from "../types";
import {
  mockGetAdminDashboard,
  mockGetUsers,
  mockGetUserById,
  mockCreateUser,
  mockUpdateUser,
  mockLockUnlockUser,
  mockResetUserPassword,
  mockGetBuses,
  mockGetBusById,
  mockCreateBus,
  mockUpdateBus,
  mockUpdateBusStatus,
  mockGetRoutes,
  mockGetRouteById,
  mockCreateRoute,
  mockUpdateRoute,
} from "./mockClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ==================== DASHBOARD ====================

export interface RoleCount {
  role: string;
  count: number;
}

export interface BusStatusCount {
  status: string;
  count: number;
}

export interface BusInsuranceAlert {
  busId: number;
  licensePlate: string;
  busType: string;
  status: string;
  expiryDate: string;
  alertType: "EXPIRED" | "EXPIRING_SOON";
}

export interface AdminDashboardData {
  totalUsers: number;
  totalBuses: number;
  totalRoutes: number;
  todayTrips: number;
  roleDistribution: RoleCount[];
  busStatusDistribution: BusStatusCount[];
  insuranceAlerts: BusInsuranceAlert[];
}

async function _getAdminDashboard(): Promise<AdminDashboardData> {
  const res = await apiClient.get<AdminDashboardData>("/admin/dashboard");
  return res.data;
}

export const getAdminDashboard = USE_MOCK ? mockGetAdminDashboard : _getAdminDashboard;

// ==================== USER MANAGEMENT ====================

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  fullName: string;
  employeeType: string;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  phone?: string;
  fullName?: string;
  employeeType?: string;
}

async function _getUsers(params?: { keyword?: string; role?: string; status?: string }): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>("/admin/users", { params });
  return res.data;
}
async function _getUserById(id: number): Promise<AdminUser> {
  const res = await apiClient.get<AdminUser>(`/admin/users/${id}`);
  return res.data;
}
async function _createUser(payload: CreateUserPayload): Promise<AdminUser> {
  const res = await apiClient.post<AdminUser>("/admin/users", payload);
  return res.data;
}
async function _updateUser(id: number, payload: UpdateUserPayload): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload);
  return res.data;
}
async function _lockUnlockUser(id: number): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}/lock`);
  return res.data;
}
async function _resetUserPassword(id: number, newPassword: string): Promise<void> {
  await apiClient.put(`/admin/users/${id}/password`, { newPassword });
}

export const getUsers = USE_MOCK ? mockGetUsers : _getUsers;
export const getUserById = USE_MOCK ? mockGetUserById : _getUserById;
export const createUser = USE_MOCK ? mockCreateUser : _createUser;
export const updateUser = USE_MOCK ? mockUpdateUser : _updateUser;
export const lockUnlockUser = USE_MOCK ? mockLockUnlockUser : _lockUnlockUser;
export const resetUserPassword = USE_MOCK ? mockResetUserPassword : _resetUserPassword;

// ==================== BUS MANAGEMENT ====================

export interface AdminBus {
  id: number;
  licensePlate: string;
  busType: string;
  totalSeats: number;
  status: "AVAILABLE" | "RUNNING" | "MAINTENANCE";
  lastMaintenanceDate: string | null;
  insuranceExpiry: string | null;
  insuranceExpired: boolean;
  insuranceExpiringSoon: boolean;
  assignedTripsCount?: number;
}

export interface CreateBusPayload {
  licensePlate: string;
  busType: string;
  totalSeats: number;
  lastMaintenanceDate?: string;
  insuranceExpiry?: string;
}

export interface UpdateBusPayload {
  busType?: string;
  totalSeats?: number;
  lastMaintenanceDate?: string;
  insuranceExpiry?: string;
}

async function _getBuses(params?: { keyword?: string; status?: string }): Promise<AdminBus[]> {
  const res = await apiClient.get<AdminBus[]>("/admin/buses", { params });
  return res.data;
}
async function _getBusById(id: number): Promise<AdminBus> {
  const res = await apiClient.get<AdminBus>(`/admin/buses/${id}`);
  return res.data;
}
async function _createBus(payload: CreateBusPayload): Promise<AdminBus> {
  const res = await apiClient.post<AdminBus>("/admin/buses", payload);
  return res.data;
}
async function _updateBus(id: number, payload: UpdateBusPayload): Promise<AdminBus> {
  const res = await apiClient.put<AdminBus>(`/admin/buses/${id}`, payload);
  return res.data;
}
async function _updateBusStatus(id: number, status: string): Promise<AdminBus> {
  const res = await apiClient.put<AdminBus>(`/admin/buses/${id}/status`, { status });
  return res.data;
}

export const getBuses = USE_MOCK ? mockGetBuses : _getBuses;
export const getBusById = USE_MOCK ? mockGetBusById : _getBusById;
export const createBus = USE_MOCK ? mockCreateBus : _createBus;
export const updateBus = USE_MOCK ? mockUpdateBus : _updateBus;
export const updateBusStatus = USE_MOCK ? mockUpdateBusStatus : _updateBusStatus;

// ==================== ROUTE MANAGEMENT ====================

export interface AdminRoute {
  id: number;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
  isActive: boolean;
  tripCount?: number;
}

export interface CreateRoutePayload {
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
}

export interface UpdateRoutePayload {
  origin?: string;
  destination?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
  basePrice?: number;
  isActive?: boolean;
}

async function _getRoutes(params?: { keyword?: string; activeOnly?: boolean }): Promise<AdminRoute[]> {
  const res = await apiClient.get<AdminRoute[]>("/admin/routes", { params });
  return res.data;
}
async function _getRouteById(id: number): Promise<AdminRoute> {
  const res = await apiClient.get<AdminRoute>(`/admin/routes/${id}`);
  return res.data;
}
async function _createRoute(payload: CreateRoutePayload): Promise<AdminRoute> {
  const res = await apiClient.post<AdminRoute>("/admin/routes", payload);
  return res.data;
}
async function _updateRoute(id: number, payload: UpdateRoutePayload): Promise<AdminRoute> {
  const res = await apiClient.put<AdminRoute>(`/admin/routes/${id}`, payload);
  return res.data;
}

export const getRoutes = USE_MOCK ? mockGetRoutes : _getRoutes;
export const getRouteById = USE_MOCK ? mockGetRouteById : _getRouteById;
export const createRoute = USE_MOCK ? mockCreateRoute : _createRoute;
export const updateRoute = USE_MOCK ? mockUpdateRoute : _updateRoute;
