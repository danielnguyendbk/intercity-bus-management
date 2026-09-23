import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Phone, Copy, Clock, QrCode, CheckCircle2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  searchTrips,
  getTripSeats,
  bookTicket,
  getPaymentStatus,
  simulatePayment,
  TripSearchResult,
  SeatStatus,
  TicketRecord,
} from "../../api/customer";

type Step = "search" | "seats" | "confirm" | "payment" | "success";

const LOCATIONS = [
  "TP.HCM",
  "Nha Trang",
  "Đà Lạt",
  "Phan Thiết",
  "Cần Thơ",
  "Vũng Tàu",
  "Đà Nẵng",
  "Hà Nội",
  "Huế",
];

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

const fmtPrice = (p: number) =>
  p.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const STEP_LABELS: Record<Step, string> = {
  search: "Tìm chuyến",
  seats: "Chọn ghế",
  confirm: "Xác nhận",
  payment: "Thanh toán VietQR",
  success: "Hoàn tất",
};
const STEPS: Step[] = ["search", "seats", "confirm", "payment", "success"];

export default function CustomerBookingPage() {
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState<Step>("search");
  const [origin, setOrigin] = useState("TP.HCM");
  const [destination, setDestination] = useState("Nha Trang");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [seats, setSeats] = useState<SeatStatus[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(
    null,
  );
  const [selectedSeat, setSelectedSeat] = useState<SeatStatus | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bookedTicket, setBookedTicket] = useState<TicketRecord | null>(null);
  const [timeLeft, setTimeLeft] = useState(900);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (step !== "payment" || !bookedTicket?.paymentCode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("Hết thời gian giữ chỗ 15 phút. Ghế đã được giải phóng.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const poller = setInterval(async () => {
      try {
        const data = await getPaymentStatus(bookedTicket.paymentCode!);
        if (data.paymentStatus === "SUCCESS" || data.bookingStatus === "CONFIRMED") {
          clearInterval(poller);
          clearInterval(timer);
          setBookedTicket((prev) => (prev ? { ...prev, status: "BOOKED", paymentStatus: "SUCCESS" } : null));
          toast.success("Thanh toán thành công! Chỗ ngồi của bạn đã được xác nhận.");
          setStep("success");
        }
      } catch {
        // ignore network error during polling
      }
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [step, bookedTicket?.paymentCode]);

  const availableSeats = useMemo(
    () => seats.filter((seat) => !seat.booked).length,
    [seats],
  );

  const canGoToStep = (target: Step) => {
    if (target === "search") return true;
    if (target === "seats") return !!selectedTrip;
    if (target === "confirm") return !!selectedTrip && !!selectedSeat;
    if (target === "payment") return !!bookedTicket;
    if (target === "success") return !!bookedTicket && (bookedTicket.status === "BOOKED" || bookedTicket.paymentStatus === "SUCCESS");
    return false;
  };

  const handleStepClick = (target: Step) => {
    if (!canGoToStep(target)) {
      if (target === "seats") {
        toast("Hãy tìm chuyến và bấm Chọn/Xem ghế để mở bước này.");
      }
      return;
    }

    setStep(target);
  };

  const handleSearch = async () => {
    if (!origin || !destination || !date) {
      toast.error("Vui lòng nhập đầy đủ thông tin tìm kiếm");
      return;
    }

    if (origin === destination) {
      toast.error("Điểm đi và điểm đến không được trùng nhau");
      return;
    }

    setSearching(true);
    setSearched(true);
    setTrips([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setBookedTicket(null);
    setStep("search");

    try {
      const data = await searchTrips({ origin, destination, date });
      setTrips(data);
    } catch {
      toast.error("Không thể tìm chuyến, vui lòng thử lại");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTrip = async (trip: TripSearchResult) => {
    if (trip.availableSeats === 0) {
      toast("Chuyến này đã hết ghế, bạn có thể xem sơ đồ để kiểm tra lại.");
    }

    setSelectedTrip(trip);
    setSelectedSeat(null);
    setSeats([]);
    setLoadingSeats(true);

    try {
      const data = await getTripSeats(trip.id);
      setSeats(data);
      setStep("seats");
    } catch {
      toast.error("Không tải được sơ đồ ghế");
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSelectSeat = (seat: SeatStatus) => {
    if (seat.booked) return;
    setSelectedSeat(seat);
  };

  const handleConfirm = async () => {
    if (!selectedTrip || !selectedSeat) {
      toast.error("Vui lòng chọn chuyến và ghế");
      return;
    }

    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    setConfirming(true);
    try {
      const ticket = await bookTicket({
        tripId: selectedTrip.id,
        seatId: selectedSeat.id,
        price: 3000, // 👉 Sửa selectedTrip.basePrice thành 3000 nếu muốn set cứng ở frontend
        passengerPhone: phone.trim(),
      });

      setBookedTicket(ticket);
      setTimeLeft(900);
      setStep("payment");
      toast.success("Giữ chỗ thành công! Vui lòng quét mã VietQR để hoàn tất thanh toán.");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error("Ghế này vừa có người đặt hoặc đang giữ chỗ. Vui lòng chọn ghế khác.");
        setStep("seats");
      } else {
        toast.error("Đặt vé thất bại, vui lòng thử lại");
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!bookedTicket?.paymentCode) return;
    setSimulating(true);
    try {
      await simulatePayment(bookedTicket.paymentCode);
      toast.success("Đã gửi mô phỏng chuyển khoản thành công từ ngân hàng!");
    } catch {
      toast.error("Lỗi khi mô phỏng thanh toán");
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const fmtTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };


  const handleReset = () => {
    setStep("search");
    setSearched(false);
    setTrips([]);
    setSeats([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setBookedTicket(null);
    setPhone(user?.phone ?? "");
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-sm">
        {STEPS.map((s, i) => {
          const stepIndex = STEPS.indexOf(step);
          const isActive = s === step;
          const isDone = i < stepIndex;
          const isEnabled = canGoToStep(s);
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                disabled={!isEnabled}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isActive
                    ? "bg-[#0F2849] text-white"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </button>
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                disabled={!isEnabled}
                className={`text-xs ${isActive ? "font-semibold text-slate-900" : "text-slate-400"} ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {STEP_LABELS[s]}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {step === "search" && (
        <p className="text-xs text-slate-500">
          Bước 2 sẽ mở sau khi bạn chọn một chuyến trong danh sách kết quả.
        </p>
      )}

      {/* ===== BƯỚC 1: TÌM CHUYẾN ===== */}
      {step === "search" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Tìm chuyến xe
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                Điểm đi
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                >
                  <option value="">-- Chọn --</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Điểm đến
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                >
                  <option value="">-- Chọn --</option>
                  {LOCATIONS.filter((l) => l !== origin).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Ngày đi
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                />
              </label>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="mt-4 w-full rounded-xl bg-[#0F2849] py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60"
            >
              {searching ? "Đang tìm..." : "Tìm chuyến"}
            </button>
          </div>

          {/* Kết quả tìm kiếm */}
          {searched && trips.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-slate-500">
                Không tìm thấy chuyến nào cho hành trình này.
              </p>
            </div>
          )}

          {trips.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Tìm thấy {trips.length} chuyến
              </p>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <span>{fmtTime(trip.departureTime)}</span>
                      <span className="text-slate-300">→</span>
                      <span>{fmtTime(trip.arrivalTime)}</span>
                      <span className="text-xs font-normal text-slate-400">
                        {fmtDate(trip.departureTime)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {trip.busLabel} ·{" "}
                      <span
                        className={
                          trip.availableSeats <= 3 && trip.availableSeats > 0
                            ? "font-semibold text-amber-600"
                            : ""
                        }
                      >
                        Còn {trip.availableSeats}/{trip.totalSeats} ghế
                        {trip.availableSeats <= 3 &&
                          trip.availableSeats > 0 &&
                          " — Sắp hết!"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-[#0F2849]">
                      {fmtPrice(trip.basePrice)}
                    </span>
                    <button
                      onClick={() => handleSelectTrip(trip)}
                      className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3a6b]"
                    >
                      {trip.availableSeats === 0 ? "Xem ghế" : "Chọn"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BƯỚC 2: CHỌN GHẾ ===== */}
      {step === "seats" && selectedTrip && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Chọn ghế ngồi
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {selectedTrip.origin} → {selectedTrip.destination} ·{" "}
                {fmtTime(selectedTrip.departureTime)} · {selectedTrip.busLabel}
              </p>
            </div>
            <button
              onClick={() => setStep("search")}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Quay lại
            </button>
          </div>

          <div className="mb-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-emerald-300 bg-emerald-100" />
              Còn trống
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-red-200 bg-red-50" />
              Đã đặt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-blue-700 bg-blue-700" />
              Đang chọn
            </span>
          </div>

          {loadingSeats ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Đang tải sơ đồ ghế...
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat)}
                  disabled={seat.booked}
                  className={`rounded-lg border py-2 text-xs font-medium transition ${seat.booked
                      ? "cursor-not-allowed border-red-200 bg-red-50 text-red-300"
                      : selectedSeat?.id === seat.id
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400"
                    }`}
                >
                  {seat.seatNumber}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Đã chọn:{" "}
              <strong>{selectedSeat?.seatNumber ?? "Chưa chọn"}</strong>
              {" · "}
              Còn <strong>{availableSeats}</strong>/{seats.length} ghế
            </p>
            <button
              onClick={() => setStep("confirm")}
              disabled={!selectedSeat}
              className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Tiếp tục xác nhận
            </button>
          </div>
        </div>
      )}

      {/* ===== BƯỚC 3: XÁC NHẬN ===== */}
      {step === "confirm" && selectedTrip && selectedSeat && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Xác nhận đặt vé
            </h2>
            <button
              onClick={() => setStep("seats")}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Quay lại
            </button>
          </div>

          {/* Tóm tắt thông tin chuyến */}
          <div className="mb-5 rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
            {[
              ["Tuyến", `${selectedTrip.origin} → ${selectedTrip.destination}`],
              ["Ngày đi", fmtDate(selectedTrip.departureTime)],
              ["Giờ khởi hành", fmtTime(selectedTrip.departureTime)],
              ["Xe", selectedTrip.busLabel],
              ["Số ghế", selectedSeat.seatNumber],
              ["Hành khách", user?.fullName ?? ""],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500">Giá vé</span>
              <span className="font-bold text-[#0F2849] text-base">
                {fmtPrice(selectedTrip.basePrice)}
              </span>
            </div>
          </div>

          {/* Nhập SĐT — quan trọng, Admin sẽ gọi xác nhận */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Số điện thoại liên hệ
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-[#0F2849]">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại để Admin xác nhận vé"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Nhân viên sẽ gọi vào số này để xác nhận chỗ ngồi của bạn.
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-xl bg-[#0F2849] py-3 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60"
          >
            {confirming ? "Đang xử lý..." : "Xác nhận & Giữ chỗ"}
          </button>
        </div>
      )}

      {/* ===== BƯỚC 4: THANH TOÁN SEPAY VIETQR ===== */}
      {step === "payment" && bookedTicket && selectedTrip && selectedSeat && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 p-1.5 text-blue-700">
                  <QrCode className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Thanh toán vé xe qua SePay VietQR
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTrip.origin} → {selectedTrip.destination} · Ghế{" "}
                <strong className="text-slate-900">{selectedSeat.seatNumber}</strong> ·{" "}
                {fmtTime(selectedTrip.departureTime)} ({fmtDate(selectedTrip.departureTime)})
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200">
              <Clock className="h-4 w-4" />
              <span>Thời gian giữ chỗ: {fmtTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-12 items-center">
            {/* Cột trái: Ảnh VietQR SePay */}
            <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/40 p-6 border border-slate-200">
              <div className="relative group">
                <img
                  src={
                    bookedTicket.qrUrl ||
                    `https://qr.sepay.vn/img?acc=0901000001&bank=MBBank&amount=${bookedTicket.price}&des=${bookedTicket.paymentCode || ""}`
                  }
                  alt="SePay VietQR"
                  className="h-56 w-56 rounded-2xl border-4 border-white bg-white p-2 shadow-md transition transform group-hover:scale-105"
                />
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-full bg-blue-100/80 px-3.5 py-1.5 text-xs font-semibold text-blue-800">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                <span>Chờ xác nhận chuyển khoản tự động...</span>
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                Mở ứng dụng ngân hàng bất kỳ để quét mã QR
              </p>
            </div>

            {/* Cột phải: Thông tin chuyển khoản chi tiết */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ngân hàng</span>
                  <span className="font-bold text-slate-800">
                    {bookedTicket.bankName || "MBBank"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Chủ tài khoản</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {bookedTicket.accountName || "NHA XE LIEN TINH PRO"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-base">
                      {bookedTicket.accountNumber || "0901000001"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          bookedTicket.accountNumber || "0901000001",
                          "Số tài khoản",
                        )
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-blue-600 shadow-xs"
                      title="Sao chép số tài khoản"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số tiền</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 text-lg">
                      {fmtPrice(bookedTicket.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(String(bookedTicket.price), "Số tiền")
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-emerald-600 shadow-xs"
                      title="Sao chép số tiền"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <div>
                    <span className="text-slate-500">Nội dung chuyển khoản</span>
                    <p className="text-[11px] text-amber-600 font-medium">
                      * Bắt buộc giữ nguyên để hệ thống tự động duyệt vé tức thì
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[#0F2849] text-base bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300">
                      {bookedTicket.paymentCode || `PAY-${bookedTicket.id}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          bookedTicket.paymentCode || `PAY-${bookedTicket.id}`,
                          "Nội dung chuyển khoản",
                        )
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-[#0F2849] shadow-xs"
                      title="Sao chép nội dung"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nút mô phỏng thanh toán SePay dành cho Demo */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition transform hover:-translate-y-0.5"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  <span>
                    {simulating
                      ? "Đang gửi webhook SePay..."
                      : "⚡ Mô phỏng chuyển khoản thành công (Dành cho Demo/Chấm đồ án)"}
                  </span>
                </button>
                <p className="mt-1.5 text-center text-xs text-slate-400">
                  Sau khi bấm, SePay webhook sẽ kích hoạt trên Backend và màn hình này sẽ tự động chuyển sang vé đã xác nhận tức thì!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BƯỚC 5: HOÀN TẤT & VÉ ĐÃ XÁC NHẬN ===== */}
      {step === "success" && bookedTicket && selectedTrip && selectedSeat && (
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Thanh toán & Đặt vé thành công!
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>ĐÃ XÁC NHẬN QUA SEPAY VIETQR</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Mã vé:{" "}
              <span className="font-semibold text-slate-800">
                #{bookedTicket.id}
              </span>{" "}
              · Mã giao dịch:{" "}
              <span className="font-mono font-bold text-blue-700">
                {bookedTicket.paymentCode || "SEPAY"}
              </span>
            </p>
          </div>

          {/* Ticket card */}
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 space-y-3 text-sm">
            <div className="text-center font-bold text-[#0F2849] text-base">
              {selectedTrip.origin} → {selectedTrip.destination}
            </div>
            {[
              ["Ngày đi", fmtDate(selectedTrip.departureTime)],
              ["Giờ khởi hành", fmtTime(selectedTrip.departureTime)],
              ["Xe", selectedTrip.busLabel],
              ["Ghế số", selectedSeat.seatNumber],
              ["Hành khách", bookedTicket.passengerName],
              ["Liên hệ", bookedTicket.passengerPhone],
              ["Giá vé", fmtPrice(selectedTrip.basePrice)],
              ["Trạng thái", "ĐÃ THANH TOÁN"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <Link
              to="/customer/tickets"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem vé của tôi
            </Link>
            <button
              onClick={handleReset}
              className="rounded-xl bg-[#0F2849] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b]"
            >
              Đặt vé khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
