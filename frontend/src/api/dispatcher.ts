import apiClient from "./apiClient";
import { Employee, EmployeeRole, Trip, TripAssignment } from "../types";
import {
  mockGetTrips,
  mockCreateTrip,
  mockAssignTrip,
  mockGetAvailableEmployees,
} from "./mockClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export interface TripFilter {
  date?: string;
  routeId?: number;
  status?: string;
}

export interface CreateTripPayload {
  routeId: number;
  busId: number;
  departureTime: string;
  arrivalTime: string;
  status?: string;
}

export interface AssignTripPayload {
  tripId: number;
  employeeId: number;
  role: EmployeeRole;
}

async function _getTrips(filter?: TripFilter): Promise<Trip[]> {
  const response = await apiClient.get<Trip[]>("/trips", { params: filter });
  return response.data;
}

async function _createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await apiClient.post<Trip>("/trips", payload);
  return response.data;
}

async function _assignTripRequest(payload: AssignTripPayload): Promise<TripAssignment> {
  const response = await apiClient.post<TripAssignment>("/trip-assignments", payload);
  return response.data;
}

async function _getAvailableEmployees(params: { from: string; to: string; role: EmployeeRole }): Promise<Employee[]> {
  const response = await apiClient.get<Employee[]>("/employees/available", { params });
  return response.data;
}

export const getTrips = USE_MOCK ? mockGetTrips : _getTrips;
export const createTrip = USE_MOCK ? mockCreateTrip : _createTrip;
export const assignTripRequest = USE_MOCK ? mockAssignTrip : _assignTripRequest;
export const getAvailableEmployees = USE_MOCK ? mockGetAvailableEmployees : _getAvailableEmployees;
