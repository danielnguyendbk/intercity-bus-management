import apiClient from "./apiClient";
import {
  mockSearchTrips,
  mockGetTripSeats,
  mockBookTicket,
  mockGetMyTickets,
  mockCancelTicket,
  mockGetProfile,
  mockUpdateProfile,
} from "./mockClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export interface TripSearchResult {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  busLabel: string;
  totalSeats: number;
  availableSeats: number;
  basePrice: number;
  status: string;
}

export interface SeatStatus {
  id: number;
  seatNumber: string;
  positionX: number | null;
  positionY: number | null;
  booked: boolean;
}

export interface BookTicketPayload {
  tripId: number;
  seatId: number;
  price: number;
  passengerPhone: string;
}

export interface PaymentStatusData {
  paymentCode: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REVIEW_REQUIRED";
  bookingStatus: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  amount: number;
  paidAt: string | null;
  expiresAt: string | null;
}

export interface TicketRecord {
  id: number;
  tripId: number;
  routeName: string;
  departureTime: string;
  arrivalTime: string;
  busLabel: string;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  price: number;
  status: string;
  bookedAt: string;
  paymentCode?: string;
  qrUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  expiresAt?: string;
  paymentStatus?: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
}

const _searchTrips = (params: { origin: string; destination: string; date: string }): Promise<TripSearchResult[]> =>
  apiClient.get<TripSearchResult[]>("/public/trips/search", { params }).then((r) => r.data);

const _getTripSeats = (tripId: number): Promise<SeatStatus[]> =>
  apiClient.get<SeatStatus[]>(`/public/trips/${tripId}/seats`).then((r) => r.data);

const _bookTicket = (payload: BookTicketPayload): Promise<TicketRecord> =>
  apiClient.post<TicketRecord>("/private/tickets", payload).then((r) => r.data);

const _getMyTickets = (): Promise<TicketRecord[]> =>
  apiClient.get<TicketRecord[]>("/private/tickets/my").then((r) => r.data);

const _cancelTicket = (ticketId: number): Promise<TicketRecord> =>
  apiClient.put<TicketRecord>(`/private/tickets/${ticketId}/cancel`).then((r) => r.data);

const _getProfile = (): Promise<{ id: number; username: string; fullName: string; email: string; role: string; phone?: string }> =>
  apiClient.get("/auth/profile").then((r) => r.data);

const _updateProfile = (payload: UpdateProfilePayload): Promise<void> =>
  apiClient.put("/auth/profile", payload).then((r) => r.data);

const _getPaymentStatus = (paymentCode: string): Promise<PaymentStatusData> =>
  apiClient.get<PaymentStatusData>(`/payments/${paymentCode}/status`).then((r) => r.data);

const _simulatePayment = (paymentCode: string): Promise<{ success: boolean }> =>
  apiClient.post<{ success: boolean }>("/payments/simulate", { paymentCode }).then((r) => r.data);

export const searchTrips = USE_MOCK ? mockSearchTrips : _searchTrips;
export const getTripSeats = USE_MOCK ? mockGetTripSeats : _getTripSeats;
export const bookTicket = USE_MOCK ? mockBookTicket : _bookTicket;
export const getMyTickets = USE_MOCK ? mockGetMyTickets : _getMyTickets;
export const cancelTicket = USE_MOCK ? mockCancelTicket : _cancelTicket;
export const getProfile = USE_MOCK ? mockGetProfile : _getProfile;
export const updateProfile = USE_MOCK ? mockUpdateProfile : _updateProfile;
export const getPaymentStatus = _getPaymentStatus;
export const simulatePayment = _simulatePayment;

