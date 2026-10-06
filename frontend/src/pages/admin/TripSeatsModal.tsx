import { useEffect, useState, useMemo } from "react";
import {
  X, MapPin, Phone, User, Check, XCircle, CreditCard, Wallet,
  Calendar, Hash, Bus, RefreshCw, ArrowUp, Compass
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminTripById,
  confirmTicket,
  cancelTicketByAdmin,
  AdminTripDetail,
  AdminTripSeat,
  getAdminTicketById,
} from "../../api/admin";
import type { AdminTicketDetail, AdminTripTicket } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import { formatPrice } from "../../utils/format";
import Button from "../../components/ui/Button";

interface Props {
  tripId: number;
  tripLabel: string;
  onClose: () => void;
  onChanged?: () => void;
}

const fmtPrice = (n: number | string | null | undefined) => formatPrice(n);

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  BOOKED:    { label: "Đã đặt",         color: "text-blue-300",     bg: "bg-blue-500/15 border-blue-500/30"    },
  HOLD:      { label: "Chờ xác nhận",   color: "text-amber-300",    bg: "bg-amber-500/15 border-amber-500/30"   },
  CONFIRMED: { label: "Đã xác nhận",    color: "text-emerald-300",  bg: "bg-emerald-500/15 border-emerald-500/30" },
  PAID:      { label: "Đã thanh toán",  color: "text-emerald-300",  bg: "bg-emerald-500/15 border-emerald-500/30" },
  CANCELLED: { label: "Đã hủy",         color: "text-rose-300",     bg: "bg-rose-500/15 border-rose-500/30"    },
  REFUNDED:  { label: "Đã hoàn tiền",   color: "text-slate-300",    bg: "bg-slate-500/15 border-slate-500/30"   },
  EXPIRED:   { label: "Hết hạn",        color: "text-slate-400",    bg: "bg-slate-500/15 border-slate-500/30"   },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CASH:   { label: "Tiền mặt (COD)",  color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30" },
  SEPAY:  { label: "VietQR (SePay)",  color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/30"    },
  VNPAY:  { label: "VNPay",           color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/30"    },
  CARD:   { label: "Thẻ ngân hàng",   color: "text-indigo-300",  bg: "bg-indigo-500/15 border-indigo-500/30"  },
  MOMO:   { label: "MoMo",            color: "text-pink-300",    bg: "bg-pink-500/15 border-pink-500/30"    },
  BANK:   { label: "Chuyển khoản",    color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/30"   },
};

const ONLINE_PAYMENT_METHODS = new Set(["SEPAY", "VNPAY", "CARD", "MOMO", "BANK"]);
const isOnlinePayment = (m?: string | null) => !!m && ONLINE_PAYMENT_METHODS.has(m);

export interface DynamicCabinSeat {
  id?: number;
  seatNumber: string; // "A1", "A2", "B1", ...
  rowLetter: string;  // "A", "B", ...
  rowIndex: number;   // 0, 1, 2...
  colNumber: number;  // 1 (Trái), 2 (Phải)
  colIndex: number;   // 0 (Trái), 1 (Phải)
  booked: boolean;
  passengerName?: string;
  bookedBy?: string;
  ticketId?: number;
}

export default function TripSeatsModal({ tripId, tripLabel, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AdminTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{
    detail: AdminTicketDetail;
    pickup: string | null;
    dropoff: string | null;
  } | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [acting, setActing] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await getAdminTripById(tripId);
      setDetail(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được sơ đồ ghế");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [tripId]);

  // Cấu hình ghế động theo xe:
  // Lấy tổng số ghế từ dữ liệu xe (totalSeats), mặc định 2 ghế/hàng
  const seatsPerRow = 2;
  const configuredCapacity = detail?.totalSeats || detail?.bus?.totalSeats || detail?.seats?.length || 24;

  const {
    dynamicSeats,
    rowLetters,
    totalSeatsCount,
    bookedSeatsCount,
    availableSeatsCount,
  } = useMemo(() => {
    const capacity = configuredCapacity;
    const backendSeats = detail?.seats || [];
    const tickets = detail?.tickets || [];

    // Map tra cứu nhanh từ backendSeats và tickets
    const backendSeatMap = new Map<string, AdminTripSeat>();
    backendSeats.forEach((s) => backendSeatMap.set(s.seatNumber.toUpperCase(), s));

    const ticketMap = new Map<string, AdminTripTicket>();
    tickets.forEach((t) => ticketMap.set(t.seatNumber.toUpperCase(), t));

    const generated: DynamicCabinSeat[] = [];
    const rowsSet = new Set<string>();

    for (let i = 0; i < capacity; i++) {
      const rowIndex = Math.floor(i / seatsPerRow);
      const colIndex = i % seatsPerRow;
      const colNumber = colIndex + 1; // 1 (trái) hoặc 2 (phải)

      const rowLetter = String.fromCharCode(65 + Math.min(rowIndex, 25));
      rowsSet.add(rowLetter);

      const seatNumber = `${rowLetter}${colNumber}`;
      const backendSeat = backendSeatMap.get(seatNumber);
      const ticket = ticketMap.get(seatNumber);

      const isBooked = !!ticket || !!backendSeat?.booked;
      const passengerName = ticket?.passengerName || backendSeat?.passengerName || "";
      const bookedBy = ticket?.passengerPhone || backendSeat?.bookedBy || "";
      const id = backendSeat?.id ?? (i + 1);
      const ticketId = ticket?.id;

      generated.push({
        id,
        seatNumber,
        rowLetter,
        rowIndex,
        colNumber,
        colIndex,
        booked: isBooked,
        passengerName,
        bookedBy,
        ticketId,
      });
    }

    const sortedRows = Array.from(rowsSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    const bookedCount = generated.filter((s) => s.booked).length;

    return {
      dynamicSeats: generated,
      rowLetters: sortedRows,
      totalSeatsCount: generated.length,
      bookedSeatsCount: bookedCount,
      availableSeatsCount: generated.length - bookedCount,
    };
  }, [configuredCapacity, detail?.seats, detail?.tickets]);

  const selectedSeat = useMemo(() => {
    if (!selectedSeatNumber) return null;
    return dynamicSeats.find((s) => s.seatNumber === selectedSeatNumber) || null;
  }, [selectedSeatNumber, dynamicSeats]);

  const handleSeatClick = async (seat: DynamicCabinSeat) => {
    setSelectedSeatNumber(seat.seatNumber);

    if (!seat.booked) {
      setSelectedTicket(null);
      return;
    }

    const ticketSummary = detail?.tickets.find(
      (t) => t.seatNumber.toUpperCase() === seat.seatNumber.toUpperCase()
    );

    setSelectedTicket(null);
    setLoadingTicket(true);
    try {
      if (ticketSummary) {
        const full = await getAdminTicketById(ticketSummary.id);
        setSelectedTicket({
          detail: full,
          pickup: ticketSummary.pickupPoint,
          dropoff: ticketSummary.dropoffPoint,
        });
      } else {
        toast.error("Không tìm thấy thông tin vé chi tiết cho ghế này");
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được chi tiết vé");
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTicket) return;
    setActing(true);
    try {
      await confirmTicket(selectedTicket.detail.id);
      toast.success("Đã xác nhận vé thành công");
      setSelectedTicket(null);
      setSelectedSeatNumber(null);
      await loadDetail();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể xác nhận vé");
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    if (!window.confirm("Bạn chắc chắn muốn hủy vé này?")) return;
    setActing(true);
    try {
      await cancelTicketByAdmin(selectedTicket.detail.id);
      toast.success("Đã hủy vé");
      setSelectedTicket(null);
      setSelectedSeatNumber(null);
      await loadDetail();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể hủy vé");
    } finally {
      setActing(false);
    }
  };

  // Thông tin hành trình hiển thị ở Header
  const departureDateStr = detail?.departureTime
    ? new Date(detail.departureTime).toLocaleDateString("vi-VN")
    : "";
  const departureTimeStr = detail?.departureTime
    ? new Date(detail.departureTime).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const routeDisplay = detail?.route ? `${detail.route.origin} → ${detail.route.destination}` : "";
  const busPlateDisplay = detail?.bus?.licensePlate || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden bg-[#172338] rounded-2xl shadow-2xl border border-white/10 flex flex-col">
        {/* Header với đầy đủ thông tin: Tuyến, Giờ, Ngày, Biển số xe */}
        <div className="sticky top-0 z-10 bg-[#101c2d] border-b border-white/10 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <span>Sơ đồ ghế xe</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                Cấu hình: {totalSeatsCount} ghế ({rowLetters.length} hàng · 2 ghế/hàng)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-white">
              <h2 className="text-lg sm:text-xl font-bold">{routeDisplay || tripLabel}</h2>
              {departureTimeStr && departureDateStr && (
                <span className="px-2.5 py-0.5 rounded-md bg-[#1c2a42] border border-white/10 text-xs font-medium text-emerald-300">
                  {departureTimeStr} · {departureDateStr}
                </span>
              )}
              {busPlateDisplay && (
                <span className="px-2.5 py-0.5 rounded-md bg-[#1c2a42] border border-white/10 text-xs font-semibold text-slate-200">
                  Xe: {busPlateDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDetail}
              className="p-2 bg-[#1c2a42] hover:bg-[#202e48] border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-[#1c2a42] hover:bg-[#202e48] border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Đóng sơ đồ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Sơ đồ khoang xe động (2 ghế/hàng) */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-16 text-center text-slate-400 bg-[#101c2d] rounded-xl border border-white/10">
                <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
                Đang dựng sơ đồ ghế theo cấu hình xe...
              </div>
            ) : !detail ? (
              <div className="p-16 text-center text-rose-400 bg-[#101c2d] rounded-xl border border-white/10">
                Không tải được dữ liệu chuyến xe
              </div>
            ) : (
              <CabinSeatMap
                dynamicSeats={dynamicSeats}
                rowLetters={rowLetters}
                selectedSeatNumber={selectedSeatNumber}
                onSeatClick={handleSeatClick}
                busType={detail.bus?.busType}
                availableCount={availableSeatsCount}
                bookedCount={bookedSeatsCount}
              />
            )}
          </div>

          {/* Cột phải: Chi tiết ghế đang chọn & Tóm tắt vé đã đặt */}
          <div className="space-y-4">
            {selectedSeat ? (
              selectedTicket ? (
                <SeatInfoPanel
                  seat={selectedSeat}
                  ticket={selectedTicket}
                  loading={loadingTicket}
                  acting={acting}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                />
              ) : (
                <div className="rounded-xl bg-[#101c2d] border border-white/10 p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">Ghế {selectedSeat.seatNumber}</h4>
                      <p className="text-xs text-slate-400">
                        Hàng {selectedSeat.rowLetter} · {selectedSeat.colNumber === 1 ? "Bên trái lối đi (#1)" : "Bên phải lối đi (#2)"}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold border bg-teal-500/15 border-teal-500/30 text-teal-300">
                      Ghế trống
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#172338] border border-white/5 text-xs text-slate-300 space-y-2">
                    <p className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Check className="w-4 h-4" /> Vị trí này đang trống, sẵn sàng mở bán
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Chưa có hành khách nào đặt chỗ tại ghế {selectedSeat.seatNumber}. Hành khách có thể đặt trực tuyến hoặc admin có thể điều phối vé tại quầy.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-6 rounded-xl bg-[#101c2d] border border-white/10 text-center text-slate-400">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-emerald-400/50" />
                <p className="text-sm font-medium text-slate-200">Click vào một ghế để xem chi tiết</p>
                <p className="text-xs mt-1 text-slate-400">
                  Ghế xanh = trống · Ghế đỏ = đã đặt
                </p>
              </div>
            )}

            {/* Danh sách tóm tắt vé đã đặt */}
            {detail && detail.tickets.length > 0 && (
              <div className="rounded-xl bg-[#101c2d] border border-white/10 p-4">
                <h4 className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
                  Tóm tắt vé đã đặt ({bookedSeatsCount}/{totalSeatsCount})
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {[...detail.tickets]
                    .sort((a, b) => {
                      const aOnline = isOnlinePayment(a.paymentMethod) ? 0 : 1;
                      const bOnline = isOnlinePayment(b.paymentMethod) ? 0 : 1;
                      if (aOnline !== bOnline) return aOnline - bOnline;
                      return a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true });
                    })
                    .map((t) => {
                      const online = isOnlinePayment(t.paymentMethod);
                      const methodInfo = t.paymentMethod ? PAYMENT_LABELS[t.paymentMethod] : null;
                      const statusInfo = STATUS_LABELS[t.status];
                      const isSelected = selectedSeatNumber === t.seatNumber;

                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            const dynamicSeat = dynamicSeats.find(
                              (s) => s.seatNumber.toUpperCase() === t.seatNumber.toUpperCase()
                            );
                            if (dynamicSeat) handleSeatClick(dynamicSeat);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors border ${
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30"
                              : "bg-[#172338] hover:bg-[#1c2a42] border-white/5"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold shrink-0 border ${
                              isSelected
                                ? "bg-emerald-500 text-slate-950 border-white/50"
                                : "bg-[#202e48] text-slate-200 border-white/10"
                            }`}
                          >
                            {t.seatNumber}
                          </span>
                          <span className="flex-1 truncate text-slate-200 font-medium">
                            {t.passengerName || "—"}
                          </span>
                          {online && methodInfo && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${methodInfo.bg} ${methodInfo.color}`}
                            >
                              {methodInfo.label}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              statusInfo?.bg ?? "bg-slate-500/15 border-slate-500/30"
                            } ${statusInfo?.color ?? "text-slate-300"}`}
                          >
                            {statusInfo?.label ?? t.status}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// CABIN SEAT MAP — 2 GHẾ / HÀNG ĐỘNG
// Cột trái: Seat #1 | Cột giữa: Lối đi | Cột phải: Seat #2
// ───────────────────────────────────────────────────────────────────

function CabinSeatMap({
  dynamicSeats,
  rowLetters,
  selectedSeatNumber,
  onSeatClick,
  busType,
  availableCount,
  bookedCount,
}: {
  dynamicSeats: DynamicCabinSeat[];
  rowLetters: string[];
  selectedSeatNumber: string | null;
  onSeatClick: (seat: DynamicCabinSeat) => void;
  busType?: string;
  availableCount: number;
  bookedCount: number;
}) {
  const renderSeat = (seat?: DynamicCabinSeat) => {
    if (!seat) {
      // Vị trí không có ghế (ví dụ số ghế lẻ ở hàng cuối)
      return <div className="w-[56px] sm:w-[60px] h-[68px] sm:h-[72px]" />;
    }

    const isSelected = seat.seatNumber === selectedSeatNumber;
    let stateClasses = "";

    if (isSelected) {
      // Selected: primary emerald + white outline
      stateClasses =
        "bg-emerald-500 text-slate-950 font-bold border-2 border-white ring-2 ring-emerald-400/50 shadow-md scale-105 z-10";
    } else if (seat.booked) {
      // Booked: dark red surface + red border
      stateClasses =
        "bg-[#2d1218] hover:bg-[#3d1822] text-rose-300 border border-rose-500/40 hover:border-rose-400 shadow-xs";
    } else {
      // Available: dark teal surface + teal border
      stateClasses =
        "bg-[#0d282a] hover:bg-[#12383b] text-teal-300 border border-teal-500/40 hover:border-teal-400 shadow-xs";
    }

    return (
      <button
        key={seat.seatNumber}
        type="button"
        onClick={() => onSeatClick(seat)}
        title={`Ghế ${seat.seatNumber} · ${seat.booked ? (seat.passengerName || "Đã đặt") : "Trống"}`}
        className={`w-[56px] sm:w-[60px] h-[68px] sm:h-[72px] rounded-[10px] text-sm font-bold transition-all flex flex-col items-center justify-center cursor-pointer select-none ${stateClasses}`}
      >
        <span className="text-base font-bold leading-tight">{seat.seatNumber}</span>
        <span className="text-[10px] font-normal opacity-80 mt-1">
          {seat.booked ? "Đã đặt" : "Trống"}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Khung thân xe (Cabin Chassis) */}
      <div className="w-full max-w-sm sm:max-w-md bg-[#0b1322] border-2 border-slate-700/60 rounded-t-[40px] rounded-b-2xl p-4 sm:p-5 shadow-2xl">
        {/* MŨI XE INDICATOR */}
        <div className="flex flex-col items-center justify-center pb-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#172338] border border-white/10 text-emerald-400 text-xs font-bold tracking-widest uppercase">
            <ArrowUp className="w-3.5 h-3.5 animate-pulse" />
            <span>MŨI XE</span>
          </div>
        </div>

        {/* KHOANG LÁI / CABIN BÁC TÀI */}
        <div className="mx-1 mb-4 p-3 rounded-xl bg-[#172338] border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1c2a42] border border-white/10 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Khoang lái / Bác tài</div>
              <div className="text-[10px] text-slate-400">{busType || "Xe Limousine 2 ghế/hàng"}</div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#101c2d] px-2.5 py-1 rounded-md border border-white/5 font-medium">
            Cửa lên xuống
          </span>
        </div>

        {/* VẠCH CHỈ DẪN LỐI ĐI Ở ĐẦU KHOANG */}
        <div className="flex items-center justify-center mb-3">
          <span className="w-12 sm:w-16 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-dashed border-slate-700 pb-1">
            LỐI ĐI
          </span>
        </div>

        {/* DANH SÁCH CÁC HÀNG GHẾ (MỖI HÀNG 2 GHẾ) */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {rowLetters.map((rowLetter) => {
            const leftSeat = dynamicSeats.find(
              (s) => s.rowLetter === rowLetter && s.colNumber === 1
            );
            const rightSeat = dynamicSeats.find(
              (s) => s.rowLetter === rowLetter && s.colNumber === 2
            );

            return (
              <div key={rowLetter} className="flex items-center justify-center gap-2 sm:gap-3">
                {/* Nhãn hàng (A, B, C...) */}
                <span className="w-5 text-xs font-bold text-slate-500 text-center select-none">
                  {rowLetter}
                </span>

                {/* Ghế #1 bên trái */}
                <div>{renderSeat(leftSeat)}</div>

                {/* Khoảng trống LỐI ĐI ở giữa */}
                <div className="w-12 sm:w-16 h-12 flex items-center justify-center select-none">
                  <div className="w-px h-8 border-l border-dashed border-slate-700/50" />
                </div>

                {/* Ghế #2 bên phải */}
                <div>{renderSeat(rightSeat)}</div>
              </div>
            );
          })}
        </div>

        {/* ĐUÔI XE BUMPER */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-center text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          ĐUÔI XE
        </div>
      </div>

      {/* LEGEND CHÚ THÍCH */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs text-slate-300">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-[#0d282a] border border-teal-500/50" />
          Trống ({availableCount})
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-[#2d1218] border border-rose-500/50" />
          Đã đặt ({bookedCount})
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-emerald-500 border border-white/80 shadow-xs" />
          Đang chọn
        </span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// PANEL CHI TIẾT GHẾ BÊN PHẢI (KHI CHỌN GHẾ ĐÃ ĐẶT)
// ───────────────────────────────────────────────────────────────────

function SeatInfoPanel({
  seat,
  ticket,
  loading,
  acting,
  onConfirm,
  onCancel,
}: {
  seat: DynamicCabinSeat;
  ticket: { detail: AdminTicketDetail; pickup: string | null; dropoff: string | null };
  loading: boolean;
  acting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl bg-[#101c2d] border border-white/10 p-6 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Đang tải chi tiết vé...</p>
      </div>
    );
  }

  const t = ticket.detail;
  const status = STATUS_LABELS[t.status] ?? {
    label: t.status,
    color: "text-slate-300",
    bg: "bg-slate-500/15 border-slate-500/30",
  };
  const isConfirmable = t.status === "HOLD";
  const isCancellable = t.status === "HOLD" || t.status === "CONFIRMED" || t.status === "BOOKED";

  return (
    <div className="rounded-xl bg-[#101c2d] border border-white/10 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Ghế {seat.seatNumber}</h4>
          <p className="text-xs text-slate-400">
            Hàng {seat.rowLetter} · {seat.colNumber === 1 ? "Bên trái" : "Bên phải"} lối đi
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Thông tin hành khách */}
      <div className="space-y-2 text-xs">
        {t.passenger ? (
          <>
            <InfoRow icon={<User className="w-3.5 h-3.5 text-slate-400" />} label="Hành khách" value={t.passenger.fullName} />
            <InfoRow icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} label="SĐT" value={t.passenger.phone || "—"} />
            {t.passenger.email && (
              <InfoRow icon={<Hash className="w-3.5 h-3.5 text-slate-400" />} label="Email" value={t.passenger.email} />
            )}
          </>
        ) : (
          <InfoRow icon={<User className="w-3.5 h-3.5 text-slate-400" />} label="Hành khách" value="(không có)" />
        )}
      </div>

      {/* Điểm đón / trả */}
      <div className="space-y-2 text-xs pt-2.5 border-t border-white/10">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Điểm đón</div>
            <div className="text-emerald-300 font-medium break-words">
              {ticket.pickup || "—"}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Điểm trả</div>
            <div className="text-amber-300 font-medium break-words">
              {ticket.dropoff || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh toán */}
      <div className="space-y-2 text-xs pt-2.5 border-t border-white/10 bg-[#172338] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            {t.payment?.paymentMethod === "SEPAY"
              ? <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              : <Wallet className="w-3.5 h-3.5 text-slate-400" />}
            Phương thức
          </span>
          <span className="font-semibold text-slate-200">
            {t.payment?.paymentMethod
              ? (PAYMENT_LABELS[t.payment.paymentMethod]?.label ?? t.payment.paymentMethod)
              : <span className="text-slate-400 italic">Chưa thanh toán</span>}
          </span>
        </div>
        {t.payment && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Trạng thái TT</span>
            <span className={`font-semibold ${
              t.payment.status === "SUCCESS" ? "text-emerald-400" :
              t.payment.status === "FAILED"  ? "text-rose-400"     :
                                              "text-amber-400"
            }`}>
              {t.payment.status}
            </span>
          </div>
        )}
        <InfoRow icon={<Hash className="w-3.5 h-3.5 text-slate-400" />} label="Mã GD" value={t.payment?.transactionCode || "—"} />
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Giá vé</span>
          <span className="font-bold text-emerald-400">{fmtPrice(t.price)}</span>
        </div>
        {t.bookedAt && (
          <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} label="Đặt lúc" value={new Date(t.bookedAt).toLocaleString("vi-VN")} />
        )}
        {t.paidAt && (
          <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} label="Thanh toán lúc" value={new Date(t.paidAt).toLocaleString("vi-VN")} />
        )}
      </div>

      {/* Nút hành động */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={!isConfirmable || acting}
          className="w-full text-xs font-semibold justify-center"
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          {acting ? "..." : "Xác nhận"}
        </Button>
        <Button
          variant="danger"
          onClick={onCancel}
          disabled={!isCancellable || acting}
          className="w-full text-xs font-semibold justify-center"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          {acting ? "..." : "Hủy vé"}
        </Button>
      </div>

      {isConfirmable && (
        <p className="text-[10px] text-slate-400 italic text-center pt-1">
          Vé chờ admin xác nhận điểm đón/trả rồi bấm Xác nhận.
        </p>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400 flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium text-slate-200 text-right truncate">{value}</span>
    </div>
  );
}
