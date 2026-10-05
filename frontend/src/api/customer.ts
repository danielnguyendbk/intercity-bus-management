// ============================================================================
// CUSTOMER API — Module: Đặt vé / Thanh toán / Profile (FE)
// Hàm chính:
//   - searchTrips / getAllUpcomingTrips / getTripSeats
//   - getMyTickets / cancelTicket / payTicket
//   - getProfile / updateProfile
// ============================================================================

import apiClient from "./apiClient";

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
  pickupPoint?: string;
  dropoffPoint?: string;
}

export interface TicketRecord {
  id: number;
  tripId: number;
  // Tuyến đường
  origin: string;
  destination: string;
  // Chuyến
  departureTime: string;
  arrivalTime: string;
  // Xe
  busLicensePlate: string;
  busType: string;
  busLabel: string;
  // Ghế
  seatNumber: string;
  // Hành khách
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  // Đặt vé
  price: number;
  status: string;
  bookedAt: string;
  paidAt: string;
  // Thanh toán / Hóa đơn
  paymentId: number | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  transactionCode: string | null;
  transactionTime: string | null;
  // Mã vé
  ticketCode: string;
  // SePay VietQR
  paymentCode?: string;
  qrUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  expiredAt?: string;
  // Điểm đón / điểm trả
  pickupPoint?: string;
  dropoffPoint?: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
}

export const searchTrips = (params: {
  origin: string;
  destination: string;
  date: string;
}): Promise<TripSearchResult[]> =>
  apiClient
    .get<TripSearchResult[]>("/public/trips/search", { params })
    .then((r) => r.data);

export const getAllUpcomingTrips = (params?: {
  date?: string;
}): Promise<TripSearchResult[]> =>
  apiClient
    .get<TripSearchResult[]>("/public/trips", { params })
    .then((r) => r.data);

export const getTripSeats = (tripId: number): Promise<SeatStatus[]> =>
  apiClient
    .get<SeatStatus[]>(`/public/trips/${tripId}/seats`)
    .then((r) => r.data);

export const bookTicket = (payload: BookTicketPayload): Promise<TicketRecord> =>
  apiClient.post<TicketRecord>("/private/tickets", payload).then((r) => r.data);

export const getMyTickets = (): Promise<TicketRecord[]> =>
  apiClient.get<TicketRecord[]>("/private/tickets/my").then((r) => r.data);

export const cancelTicket = (ticketId: number): Promise<TicketRecord> =>
  apiClient
    .put<TicketRecord>(`/private/tickets/${ticketId}/cancel`)
    .then((r) => r.data);

export const getProfile = (): Promise<{
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
}> => apiClient.get("/auth/profile").then((r) => r.data);

export const updateProfile = (payload: UpdateProfilePayload): Promise<void> =>
  apiClient.put("/auth/profile", payload).then((r) => r.data);

// ─── SePay VietQR ─────────────────────────────────────────────────────
export interface PaymentStatusResponse {
  paymentCode: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REVIEW_REQUIRED";
  amount: number;
  paidAt: string | null;
  ticketId: number | null;
  seatNumber: string | null;
}

export const getPaymentStatus = (paymentCode: string): Promise<PaymentStatusResponse> =>
  apiClient.get<PaymentStatusResponse>(`/private/payment/${encodeURIComponent(paymentCode)}/status`).then((r) => r.data);

export const createSepayPayment = (ticketId: number): Promise<TicketRecord> =>
  apiClient.post<TicketRecord>("/private/payment/sepay/create", { ticketId }).then((r) => r.data);

