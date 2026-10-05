// ============================================================================
// CUSTOMER BOOKING PAGE — Trang đặt vé xe khách (Customer)
// Luồng 4 bước chuẩn production:
//   STEP 1: Tìm và chọn chuyến
//   STEP 2: Chọn ghế + Điểm đón + Điểm trả (Desktop 2 cột: Seat Map | Config)
//   STEP 3: Thông tin hành khách + Phương thức thanh toán (VietQR SePay / COD / VNPay)
//   STEP 4: Đặt vé thành công + Vé điện tử (Real QR code, SePay polling & simulation)
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  X,
  ChevronRight,
  Phone,
  User,
  MapPin,
  CreditCard,
  Smartphone,
  QrCode,
  Copy,
  Loader2,
  Sparkles,
  ArrowRight,
  Printer,
  Bus,
  Clock,
  Shield,
  Calendar,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../../stores/authStore";
import BookingHero from "../../components/customer/BookingHero";
import Pagination from "../../components/ui/Pagination";
import {
  searchTrips,
  getAllUpcomingTrips,
  getTripSeats,
  bookTicket,
  createVnpayPayment,
  getPaymentStatus,
  simulatePayment,
  TripSearchResult,
  SeatStatus,
  TicketRecord,
} from "../../api/customer";
import {
  LOCATION_DATA,
  LOCATIONS,
  getCityData,
  normalizeCityName,
  PickupPoint,
} from "../../utils/locations";
import { formatPrice } from "../../utils/format";

type Step = "search" | "seats" | "checkout" | "success";
type PaymentMethod = "SEPAY" | "COD" | "VNPAY";

const STEPS: Step[] = ["search", "seats", "checkout", "success"];
const STEP_LABELS: Record<Step, string> = {
  search: "1. Tìm & Chọn chuyến",
  seats: "2. Chọn ghế & Đón/Trả",
  checkout: "3. Thông tin & Thanh toán",
  success: "4. Hoàn tất & Vé điện tử",
};

const fmtTime = (dt: string) =>
  new Date(dt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDate = (dt: string) =>
  new Date(dt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const fmtPrice = (p: number | string | null | undefined) => formatPrice(p);

export default function CustomerBookingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<Step>("search");

  // Search parameters
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  // Data
  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [seats, setSeats] = useState<SeatStatus[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SeatStatus | null>(null);
  const [activeDeck, setActiveDeck] = useState<"DECK1" | "DECK2">("DECK1");

  // Locations (Pickup / Dropoff)
  const [pickupCity, setPickupCity] = useState("");
  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffPoint, setDropoffPoint] = useState<PickupPoint | null>(null);

  // Passenger & Payment Info
  const [passengerName, setPassengerName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [passengerNote, setPassengerNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("SEPAY");

  // Booking Result & SePay Polling
  const [bookedTicket, setBookedTicket] = useState<TicketRecord | null>(null);
  const [sepayStatus, setSepayStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">("PENDING");
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Pagination & Available Trips Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const TRIPS_PER_PAGE = 4;

  const filteredTrips = useMemo(() => {
    if (onlyAvailable) {
      return trips.filter((t) => (t.availableSeats ?? 0) > 0);
    }
    return trips;
  }, [trips, onlyAvailable]);

  const totalPages = Math.ceil(filteredTrips.length / TRIPS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTrips = useMemo(() => {
    const start = (validCurrentPage - 1) * TRIPS_PER_PAGE;
    return filteredTrips.slice(start, start + TRIPS_PER_PAGE);
  }, [filteredTrips, validCurrentPage]);

  // Load initial trips
  const loadTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await getAllUpcomingTrips();
      setTrips(data);
    } catch {
      toast.error("Không thể tải danh sách chuyến xe");
    } finally {
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // Update profile defaults
  useEffect(() => {
    if (user?.fullName && !passengerName) setPassengerName(user.fullName);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]);

  // SePay Polling (every 3s when waiting for payment)
  useEffect(() => {
    if (step !== "success" || !bookedTicket || paymentMethod !== "SEPAY" || sepayStatus === "SUCCESS") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const code = bookedTicket.paymentCode || `PAY-${bookedTicket.id}`;
        const res = await getPaymentStatus(code);
        if (res.paymentStatus === "SUCCESS") {
          setSepayStatus("SUCCESS");
          toast.success("Thanh toán thành công! Vé đã được xác nhận.");
          clearInterval(interval);
        }
      } catch {
        // Polling silent catch
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, bookedTicket, paymentMethod, sepayStatus]);

  // Handlers
  const handleSearch = async () => {
    if (origin && destination && origin === destination) {
      toast.error("Điểm đi và điểm đến không được trùng nhau");
      return;
    }
    setLoadingTrips(true);
    setCurrentPage(1);
    try {
      const data = await searchTrips({ origin, destination, date });
      setTrips(data);
    } catch {
      toast.error("Không tìm được chuyến, vui lòng thử lại");
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleSelectTrip = async (trip: TripSearchResult) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setSeats([]);

    // Auto-select origin & destination pickup points with clean normalization
    const originCityClean = normalizeCityName(trip.origin);
    const destCityClean = normalizeCityName(trip.destination);
    const originData = getCityData(trip.origin) || getCityData(originCityClean);
    const destData = getCityData(trip.destination) || getCityData(destCityClean);

    const defaultOrigin: PickupPoint = originData?.pickupPoints[0] || {
      id: "default-origin-1",
      name: `Bến xe trung tâm ${originCityClean || "Hà Nội"}`,
      address: `Khu vực sảnh đón khách xe liên tỉnh, ${originCityClean || "Hà Nội"}`,
    };
    const defaultDest: PickupPoint = destData?.pickupPoints[0] || {
      id: "default-dest-1",
      name: `Bến xe trung tâm ${destCityClean || "TP.HCM"}`,
      address: `Khu vực sảnh trả khách xe liên tỉnh, ${destCityClean || "TP.HCM"}`,
    };

    setPickupCity(trip.origin);
    setPickupPoint(defaultOrigin);

    setDropoffCity(trip.destination);
    setDropoffPoint(defaultDest);

    setLoadingSeats(true);
    try {
      const seatData = await getTripSeats(trip.id);
      setSeats(seatData);
      setStep("seats");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "";
      toast.error(msg || "Không thể tải sơ đồ ghế của chuyến");
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSelectSeat = (seat: SeatStatus) => {
    if (seat.booked) return;
    setSelectedSeat(seat);
  };

  const handleProceedToCheckout = () => {
    if (!selectedSeat) {
      toast.error("Vui lòng chọn ghế ngồi trên sơ đồ");
      return;
    }
    const finalPickup = pickupPoint || originPoints[0];
    const finalDropoff = dropoffPoint || destPoints[0];
    if (!finalPickup || !finalDropoff) {
      toast.error("Vui lòng xác nhận điểm đón và điểm trả");
      return;
    }
    setPickupPoint(finalPickup);
    setDropoffPoint(finalDropoff);
    setStep("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmBooking = async () => {
    if (!selectedTrip || !selectedSeat) {
      toast.error("Vui lòng chọn chuyến và ghế");
      return;
    }
    if (!pickupPoint || !dropoffPoint) {
      toast.error("Vui lòng chọn điểm đón và điểm trả");
      return;
    }
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại liên hệ");
      return;
    }

    setConfirming(true);
    try {
      const ticket = await bookTicket({
        tripId: selectedTrip.id,
        seatId: selectedSeat.id,
        price: selectedTrip.basePrice,
        passengerPhone: phone.trim(),
        pickupPoint: `${pickupPoint.name} - ${pickupPoint.address}`,
        dropoffPoint: `${dropoffPoint.name} - ${dropoffPoint.address}`,
      });
      setBookedTicket(ticket);

      if (paymentMethod === "SEPAY") {
        setSepayStatus("PENDING");
        setStep("success");
        toast.success("Đặt vé thành công! Quý khách quét mã VietQR bên dưới để hoàn tất thanh toán.");
        return;
      }

      if (paymentMethod === "VNPAY") {
        try {
          const vnpayRes = await createVnpayPayment(ticket.id);
          sessionStorage.setItem("pendingVnpayTicketId", String(ticket.id));
          window.location.href = vnpayRes.paymentUrl;
          return;
        } catch (err: any) {
          toast.error("Không thể khởi tạo cổng thanh toán VNPay. Vui lòng thanh toán qua VietQR.");
        }
      }

      // COD payment
      setStep("success");
      toast.success("Đặt vé thành công! Quý khách sẽ thanh toán tiền mặt khi lên xe.");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Đặt vé thất bại, vui lòng thử lại";
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setStep("search");
    setSelectedTrip(null);
    setSelectedSeat(null);
    setSeats([]);
    setBookedTicket(null);
    setCurrentPage(1);
    loadTrips();
  };

  // Seat partitioning: Deck 1 (Floor 1) vs Deck 2 (Floor 2)
  const { deck1Seats, deck2Seats, hasMultipleDecks } = useMemo(() => {
    const d1 = seats.filter((s) => s.seatNumber.startsWith("A") || !s.seatNumber.startsWith("B"));
    const d2 = seats.filter((s) => s.seatNumber.startsWith("B"));
    return {
      deck1Seats: d2.length > 0 ? d1 : seats,
      deck2Seats: d2,
      hasMultipleDecks: d2.length > 0,
    };
  }, [seats]);

  const displayedSeats = activeDeck === "DECK1" || !hasMultipleDecks ? deck1Seats : deck2Seats;

  // Available pickup & dropoff points based on current cities
  const originPoints = useMemo(() => {
    const list = (pickupCity ? getCityData(pickupCity)?.pickupPoints : undefined) || [];
    if (list.length > 0) return list;
    const cleanCity = normalizeCityName(selectedTrip?.origin || pickupCity || "Khởi hành");
    const fallbackList = getCityData(cleanCity)?.pickupPoints;
    if (fallbackList && fallbackList.length > 0) return fallbackList;
    return [
      {
        id: "default-origin-1",
        name: `Bến xe trung tâm ${cleanCity}`,
        address: `Khu vực sảnh đón khách xe liên tỉnh, ${cleanCity}`,
      },
    ];
  }, [pickupCity, selectedTrip?.origin]);

  const destPoints = useMemo(() => {
    const list = (dropoffCity ? getCityData(dropoffCity)?.pickupPoints : undefined) || [];
    if (list.length > 0) return list;
    const cleanCity = normalizeCityName(selectedTrip?.destination || dropoffCity || "Đến");
    const fallbackList = getCityData(cleanCity)?.pickupPoints;
    if (fallbackList && fallbackList.length > 0) return fallbackList;
    return [
      {
        id: "default-dest-1",
        name: `Bến xe trung tâm ${cleanCity}`,
        address: `Khu vực sảnh trả khách xe liên tỉnh, ${cleanCity}`,
      },
    ];
  }, [dropoffCity, selectedTrip?.destination]);

  // Ensure pickupPoint and dropoffPoint always have a valid selected item
  useEffect(() => {
    if ((!pickupPoint || !originPoints.some((p) => p.name === pickupPoint.name)) && originPoints.length > 0) {
      setPickupPoint(originPoints[0]);
    }
  }, [originPoints, pickupPoint]);

  useEffect(() => {
    if ((!dropoffPoint || !destPoints.some((p) => p.name === dropoffPoint.name)) && destPoints.length > 0) {
      setDropoffPoint(destPoints[0]);
    }
  }, [destPoints, dropoffPoint]);

  return (
    <div className="space-y-6">
      {/* ── STEPPER HEADER ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
          {STEPS.map((s, idx) => {
            const isActive = s === step;
            const isCompleted = STEPS.indexOf(step) > idx;
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-[#0f2849] text-amber-400 ring-2 ring-amber-400/40"
                      : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isActive ? "text-[#0f2849]" : isCompleted ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
                {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          STEP 1: TÌM & CHỌN CHUYẾN
      ══════════════════════════════════════════════════════ */}
      {step === "search" && (
        <div className="space-y-6">
          <BookingHero>
            <div className="rounded-xl bg-white p-5 shadow-md border border-slate-200 text-slate-900">
              <h2 className="text-base font-bold text-[#0f2849] mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-500" />
                Tìm kiếm chuyến xe liên tỉnh
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Nơi đi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Điểm đi</label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                  >
                    <option value="">— Tất cả điểm đi —</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nơi đến */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Điểm đến</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                  >
                    <option value="">— Tất cả điểm đến —</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ngày đi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ngày khởi hành</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                  />
                </div>
              </div>

              {/* Quick tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span>Gợi ý:</span>
                {["Hà Nội", "TP.HCM", "Đà Nẵng", "Đà Lạt", "Nha Trang"].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      if (!origin) setOrigin(city);
                      else setDestination(city);
                    }}
                    className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-0.5 transition"
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Search button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loadingTrips}
                  className="flex items-center gap-2 rounded-lg bg-[#0f2849] hover:bg-[#1a3a6b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
                >
                  <Search className="h-4 w-4 text-amber-400" />
                  {loadingTrips ? "Đang tìm..." : "Tìm chuyến xe"}
                </button>
              </div>
            </div>
          </BookingHero>

          {/* Trips list */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Danh sách chuyến & vé xe khả dụng ({filteredTrips.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Các chuyến xe đang mở bán vé trực tuyến trong hệ thống
                </p>
              </div>

              {/* Filter toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => {
                      setOnlyAvailable(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 h-4 w-4"
                  />
                  <span>Chỉ hiện chuyến còn vé trống</span>
                </label>
              </div>
            </div>

            {loadingTrips ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Đang tìm kiếm chuyến xe phù hợp...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Không tìm thấy chuyến xe nào phù hợp với yêu cầu tìm kiếm.
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {paginatedTrips.map((trip) => {
                    const isSoldOut = trip.availableSeats === 0;
                    return (
                      <div
                        key={trip.id}
                        onClick={() => !isSoldOut && handleSelectTrip(trip)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all ${
                          isSoldOut ? "opacity-60 bg-slate-50" : "hover:border-slate-300 hover:shadow-md cursor-pointer"
                        }`}
                      >
                        {/* Left: Route and times */}
                        <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <span>{trip.origin}</span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <span>{trip.destination}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              {fmtTime(trip.departureTime)} → {fmtTime(trip.arrivalTime)}
                            </span>
                            <span>·</span>
                            <span>{fmtDate(trip.departureTime)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Bus className="h-3.5 w-3.5 text-blue-600" />
                              {trip.busLabel || "Xe giường nằm"}
                            </span>
                          </div>

                          {/* Seat occupancy bar */}
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            {isSoldOut ? (
                              <span className="font-semibold text-rose-600">Hết chỗ</span>
                            ) : (
                              <>
                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        ((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-emerald-700 font-medium">
                                  Còn <strong>{trip.availableSeats}</strong>/{trip.totalSeats} vé khả dụng
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Price & CTA */}
                        <div className="mt-3 sm:mt-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                          <div className="text-base font-extrabold text-[#0f2849]">
                            {fmtPrice(trip.basePrice)}
                          </div>
                          <button
                            type="button"
                            disabled={isSoldOut}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSoldOut) handleSelectTrip(trip);
                            }}
                            className={`mt-1 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition ${
                              isSoldOut
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-[#0f2849] hover:bg-[#1a3a6b] text-white"
                            }`}
                          >
                            {isSoldOut ? "Hết vé" : "Chọn chuyến"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={validCurrentPage}
                      totalPages={totalPages}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 380, behavior: "smooth" });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2: CHỌN GHẾ + ĐIỂM ĐÓN + ĐIỂM TRẢ (2 CỘT)
      ══════════════════════════════════════════════════════ */}
      {step === "seats" && selectedTrip && (
        <div className="space-y-4">
          {/* Trip overview header */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chuyến xe đang chọn</div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{normalizeCityName(selectedTrip.origin)}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span>{normalizeCityName(selectedTrip.destination)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Khởi hành: {fmtTime(selectedTrip.departureTime)} - {fmtDate(selectedTrip.departureTime)} · {selectedTrip.busLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep("search")}
              className="text-xs font-semibold text-slate-600 hover:text-[#0f2849] border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
            >
              ← Đổi chuyến khác
            </button>
          </div>

          {/* 2-COLUMN LAYOUT: Left = Seat Map | Right = Booking Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: SEAT MAP (7 cols) */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Sơ đồ ghế ngồi</h3>

                {/* Deck switcher if 2 floors */}
                {hasMultipleDecks && (
                  <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveDeck("DECK1")}
                      className={`rounded-md px-3 py-1 transition ${
                        activeDeck === "DECK1" ? "bg-white text-[#0f2849] shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Tầng 1 (Dưới)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDeck("DECK2")}
                      className={`rounded-md px-3 py-1 transition ${
                        activeDeck === "DECK2" ? "bg-white text-[#0f2849] shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Tầng 2 (Trên)
                    </button>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-slate-600 mb-4 pb-3 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-emerald-300 bg-emerald-50" />
                  Trống
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-amber-500 bg-amber-400" />
                  Đang chọn
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-slate-300 bg-slate-200" />
                  Đã bán
                </span>
              </div>

              {/* Seats Grid */}
              {loadingSeats ? (
                <div className="py-12 text-center text-sm text-slate-500">Đang tải sơ đồ ghế...</div>
              ) : displayedSeats.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">Chưa có ghế trên tầng này.</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {displayedSeats.map((seat) => {
                    const isSelected = selectedSeat?.id === seat.id;
                    const isBooked = seat.booked;

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSelectSeat(seat)}
                        disabled={isBooked}
                        className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                          isBooked
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : isSelected
                              ? "border-amber-500 bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-400/40"
                              : "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 cursor-pointer"
                        }`}
                      >
                        <span>{seat.seatNumber}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          {isBooked ? "Đã bán" : isSelected ? "Đã chọn" : "Trống"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: BOOKING CONFIGURATION (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                  Cấu hình điểm đón & trả
                </h3>

                {/* Pickup selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Điểm đón tại {normalizeCityName(selectedTrip.origin)}
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {originPoints.map((point) => {
                      const isSelected = pickupPoint?.name === point.name;
                      return (
                        <div
                          key={point.name}
                          onClick={() => setPickupPoint(point)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? "border-[#0f2849] bg-slate-50 font-medium ring-1 ring-[#0f2849]/20"
                              : "border-slate-200 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{point.name}</span>
                            {isSelected && <span className="text-xs text-[#0f2849] font-bold">✓</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{point.address}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dropoff selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Điểm trả tại {normalizeCityName(selectedTrip.destination)}
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {destPoints.map((point) => {
                      const isSelected = dropoffPoint?.name === point.name;
                      return (
                        <div
                          key={point.name}
                          onClick={() => setDropoffPoint(point)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? "border-[#0f2849] bg-slate-50 font-medium ring-1 ring-[#0f2849]/20"
                              : "border-slate-200 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{point.name}</span>
                            {isSelected && <span className="text-xs text-[#0f2849] font-bold">✓</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{point.address}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected seat & Fare summary */}
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ghế đã chọn:</span>
                    <span className="font-bold text-slate-900">
                      {selectedSeat ? selectedSeat.seatNumber : "Chưa chọn ghế"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giá vé đơn vị:</span>
                    <span className="font-semibold text-slate-700">{fmtPrice(selectedTrip.basePrice)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm">
                    <span className="font-bold text-slate-900">Tổng tiền tạm tính:</span>
                    <span className="font-extrabold text-[#0f2849]">
                      {fmtPrice(selectedSeat ? selectedTrip.basePrice : 0)}
                    </span>
                  </div>
                </div>

                {/* Continue button */}
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={!selectedSeat}
                  className="w-full rounded-lg bg-[#0f2849] hover:bg-[#1a3a6b] py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedSeat ? "Tiếp tục nhập thông tin & thanh toán →" : "Vui lòng chọn 1 ghế trên sơ đồ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 3: THÔNG TIN HÀNH KHÁCH & THANH TOÁN
      ══════════════════════════════════════════════════════ */}
      {step === "checkout" && selectedTrip && selectedSeat && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: PASSENGER & PAYMENT FORM (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Passenger details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Thông tin hành khách
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Họ và tên hành khách
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0987654321"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ghi chú cho nhà xe (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={passengerNote}
                  onChange={(e) => setPassengerNote(e.target.value)}
                  placeholder="Ví dụ: Đón tại cổng phụ bến xe..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f2849]"
                />
              </div>
            </div>

            {/* Payment method selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Phương thức thanh toán
              </h3>

              <div className="space-y-2">
                {/* SePay VietQR Card */}
                <div
                  onClick={() => setPaymentMethod("SEPAY")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "SEPAY"
                      ? "border-[#0f2849] bg-slate-50/80 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">Quét mã VietQR SePay</span>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          Tự động 24/7
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Xác nhận vé tức thì qua ứng dụng Mobile Banking của mọi ngân hàng
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "SEPAY" ? "border-[#0f2849] bg-[#0f2849]" : "border-slate-300"
                    }`}
                  >
                    {paymentMethod === "SEPAY" && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>

                {/* COD Card */}
                <div
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "COD"
                      ? "border-[#0f2849] bg-slate-50/80 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900">Thanh toán khi lên xe</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thanh toán tiền mặt cho phụ xe hoặc tài xế trước khi khởi hành
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "COD" ? "border-[#0f2849] bg-[#0f2849]" : "border-slate-300"
                    }`}
                  >
                    {paymentMethod === "COD" && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>

                {/* VNPay Card */}
                <div
                  onClick={() => setPaymentMethod("VNPAY")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "VNPAY"
                      ? "border-[#0f2849] bg-slate-50/80 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900">Cổng thanh toán VNPay</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thẻ ATM nội địa, Internet Banking, Thẻ quốc tế Visa/Mastercard
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "VNPAY" ? "border-[#0f2849] bg-[#0f2849]" : "border-slate-300"
                    }`}
                  >
                    {paymentMethod === "VNPAY" && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TICKET SUMMARY & CONFIRM (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Chi tiết chuyến đi
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tuyến đường:</span>
                  <span className="font-bold text-slate-900">
                    {selectedTrip.origin} → {selectedTrip.destination}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khởi hành:</span>
                  <span className="font-semibold text-slate-800">
                    {fmtTime(selectedTrip.departureTime)} - {fmtDate(selectedTrip.departureTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Xe vận chuyển:</span>
                  <span className="font-semibold text-slate-800">{selectedTrip.busLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số ghế đã chọn:</span>
                  <span className="font-extrabold text-[#0f2849] bg-amber-100 px-2 py-0.5 rounded">
                    Ghế {selectedSeat.seatNumber}
                  </span>
                </div>
                {pickupPoint && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Điểm đón:</span>
                    <span className="font-medium text-slate-800 block">{pickupPoint.name}</span>
                    <span className="text-[11px] text-slate-400 block">{pickupPoint.address}</span>
                  </div>
                )}
                {dropoffPoint && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Điểm trả:</span>
                    <span className="font-medium text-slate-800 block">{dropoffPoint.name}</span>
                    <span className="text-[11px] text-slate-400 block">{dropoffPoint.address}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-[#0f2849]">
                    {fmtPrice(selectedTrip.basePrice)}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={confirming}
                  className="w-full rounded-lg bg-[#0f2849] hover:bg-[#1a3a6b] py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  {confirming ? "Đang xử lý..." : "Xác nhận đặt vé & Thanh toán"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("seats")}
                  className="w-full rounded-lg border border-slate-300 hover:bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition"
                >
                  ← Quay lại chọn ghế
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 4: ĐẶT VÉ THÀNH CÔNG & VÉ ĐIỆN TỬ
      ══════════════════════════════════════════════════════ */}
      {step === "success" && bookedTicket && selectedTrip && selectedSeat && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center shadow-xs">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-emerald-950">Đặt vé thành công!</h2>
            <p className="text-xs text-emerald-800 mt-1">
              Mã vé của bạn là <strong className="font-mono text-sm">#{bookedTicket.ticketCode || bookedTicket.id}</strong>.
              Vé đã được lưu vào danh sách "Vé của tôi".
            </p>
          </div>

          {/* SePay VietQR Card if SePay */}
          {paymentMethod === "SEPAY" && (
            <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Quét mã VietQR thanh toán tự động</h3>
              </div>

              {sepayStatus === "SUCCESS" ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-700 mb-1">
                    <Check className="h-5 w-5" />
                    Đã nhận được tiền thanh toán!
                  </div>
                  <p className="text-xs text-emerald-600">
                    Giao dịch đã được SePay xác thực thành công. Vé của bạn đã chuyển sang trạng thái ĐÃ XÁC NHẬN (PAID).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Mở ứng dụng ngân hàng bất kỳ để quét mã VietQR. Nội dung và số tiền đã được điền tự động.
                  </p>

                  {/* QR Image */}
                  <div className="mx-auto w-56 h-56 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                    {bookedTicket.qrUrl ? (
                      <img
                        src={bookedTicket.qrUrl}
                        alt="VietQR SePay"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">Đang khởi tạo mã VietQR...</div>
                    )}
                  </div>

                  {/* Bank info box */}
                  <div className="space-y-1.5 text-xs text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 max-w-sm mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngân hàng:</span>
                      <span className="font-bold text-slate-800">BIDV</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số tài khoản:</span>
                      <span className="font-mono font-bold text-slate-900">96247NQT001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-900">NGUYEN QUOC THAI</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số tiền:</span>
                      <span className="font-bold text-blue-600 text-sm">
                        {fmtPrice(selectedTrip.basePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Nội dung chuyển:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0f2849] bg-white px-2 py-0.5 rounded border border-slate-300">
                          {bookedTicket.paymentCode || `PAY-${bookedTicket.id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (bookedTicket.paymentCode) {
                              navigator.clipboard.writeText(bookedTicket.paymentCode);
                              setCopiedCode(true);
                              toast.success("Đã copy nội dung chuyển khoản!");
                              setTimeout(() => setCopiedCode(false), 2000);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded"
                          title="Copy nội dung"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Polling Indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Hệ thống tự động kiểm tra số dư mỗi 3 giây...</span>
                  </div>

                  {/* Demo Simulate Button */}
                  <div className="pt-3 border-t border-slate-100 max-w-sm mx-auto">
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={async () => {
                        if (!bookedTicket.paymentCode) return;
                        setSimulating(true);
                        try {
                          await simulatePayment(bookedTicket.paymentCode);
                          setSepayStatus("SUCCESS");
                          toast.success("Mô phỏng thanh toán SePay thành công!");
                        } catch {
                          toast.error("Không thể mô phỏng thanh toán");
                        } finally {
                          setSimulating(false);
                        }
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 py-2.5 px-4 text-xs font-bold text-slate-950 transition shadow-xs disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {simulating ? "Đang xử lý..." : "Mô phỏng thanh toán SePay thành công (Demo)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Electronic Ticket Details Card (REAL QR CODE) */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thông tin vé xe</span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedTrip.origin} → {selectedTrip.destination}
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                {paymentMethod === "SEPAY" && sepayStatus === "SUCCESS"
                  ? "ĐÃ THANH TOÁN"
                  : paymentMethod === "COD"
                    ? "THANH TOÁN TRÊN XE"
                    : "CHỜ XÁC NHẬN"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Khởi hành:</span>
                <span className="font-semibold text-slate-800">
                  {fmtTime(selectedTrip.departureTime)} - {fmtDate(selectedTrip.departureTime)}
                </span>
              </div>
              <div className="rounded-lg bg-amber-50/60 p-2.5 border border-amber-200">
                <span className="text-amber-800 block mb-0.5 font-medium">Vị trí ghế:</span>
                <span className="text-base font-extrabold text-[#0f2849]">
                  Ghế {selectedSeat.seatNumber}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Xe vận chuyển:</span>
                <span className="font-semibold text-slate-800">{selectedTrip.busLabel}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Hình thức:</span>
                <span className="font-semibold text-slate-800">
                  {paymentMethod === "SEPAY" ? "VietQR (SePay)" : paymentMethod === "VNPAY" ? "VNPay" : "Tiền mặt (COD)"}
                </span>
              </div>
            </div>

            {/* REAL QR Check-in */}
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="p-2 border border-slate-200 rounded-lg inline-block bg-white shadow-xs">
                <QRCodeSVG
                  value={`XEKHACHPRO:${bookedTicket.ticketCode || bookedTicket.id}`}
                  size={120}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                Mã tra cứu: {bookedTicket.ticketCode || `TICKET-${bookedTicket.id}`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Xuất trình mã này cho nhân viên khi lên xe. Có thể quét trực tiếp bằng camera điện thoại.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                In vé
              </button>

              <div className="flex gap-2">
                <Link
                  to="/customer/tickets"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Xem vé của tôi
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg bg-[#0f2849] hover:bg-[#1a3a6b] px-4 py-2 text-xs font-semibold text-white transition shadow-xs"
                >
                  Đặt vé chuyến khác
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
