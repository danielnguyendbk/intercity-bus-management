// ============================================================================
// CUSTOMER TICKETS PAGE — Trang "Vé của tôi"
// Tính năng:
//   - Xem DS vé đã đặt + phân trang
//   - Hủy vé (chỉ HOLD/BOOKED)
//   - Mở modal khiếu nại (FeedbackModal) cho admin
//   - Mã QR vé thật (QRCodeSVG từ qrcode.react) có thể quét bằng camera điện thoại
//   - QR thanh toán VietQR
// ============================================================================

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { MessageCircle, X, Ticket, ArrowRight, ArrowLeft, Printer, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getMyTickets, cancelTicket, TicketRecord } from "../../api/customer";
import { getMyFeedbacks } from "../../api/feedback";
import FeedbackModal from "../../components/feedback/FeedbackModal";
import Pagination from "../../components/ui/Pagination";
import SePayCheckout from "../../components/customer/SePayCheckout";
import { formatPrice } from "../../utils/format";

// ─── Status & payment config ──────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; style: string; dot: string }> = {
  CONFIRMED: { label: "Đã xác nhận", style: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  PAID:      { label: "Đã xác nhận", style: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  BOOKED:    { label: "Chờ xác nhận", style: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500"   },
  HOLD:      { label: "Chờ xác nhận", style: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500"   },
  CANCELLED: { label: "Đã hủy",       style: "bg-rose-50 text-rose-700 border-rose-200",       dot: "bg-rose-500"     },
  REFUNDED:  { label: "Đã hoàn tiền", style: "bg-slate-100 text-slate-600 border-slate-200",    dot: "bg-slate-400"   },
  EXPIRED:   { label: "Hết hạn",      style: "bg-slate-100 text-slate-500 border-slate-200",    dot: "bg-slate-400"   },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH:  "Tiền mặt",
  CARD:  "Thẻ ngân hàng",
  MOMO:  "MoMo",
  BANK:  "Chuyển khoản QR",
  SEPAY: "VietQR (SePay)",
  VNPAY: "VNPay",
};

// ─── Helpers ────────────────────────────────────────────────────────
const fmtDateTime = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtDate = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const fmtTime = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtPrice = (p: number | string | null | undefined) => formatPrice(p);

// ─── QR Payment Modal (VietQR) ───────────────────────────────────────
function QRCodePaymentModal({ ticket, onClose, onConfirm }: {
  ticket: TicketRecord;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Thanh toán SePay" className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4">
        <button type="button" onClick={onClose} className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          <ArrowLeft size={16} aria-hidden="true" /> Trở lại chi tiết vé
        </button>
        <SePayCheckout ticketId={ticket.id} onPaid={onConfirm} />
        <p className="mt-3 text-xs text-slate-600">Trở lại không hủy giao dịch. Nếu đã chuyển tiền, vui lòng không chuyển lại.</p>
      </div>
    </div>
  );
}

// ─── Invoice Modal ───────────────────────────────────────────────────
interface InvoiceModalProps {
  ticket: TicketRecord;
  hasFeedback: boolean;
  onClose: () => void;
  onCancel: (id: number) => Promise<void>;
  onPay: (ticket: TicketRecord) => void;
  onOpenFeedback: (t: TicketRecord) => void;
  cancellingId: number | null;
}

function InvoiceModal({
  ticket,
  hasFeedback,
  onClose,
  onCancel,
  onPay,
  onOpenFeedback,
  cancellingId,
}: InvoiceModalProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50", dot: "bg-slate-400" };
  const canCancel = ticket.status === "BOOKED" || ticket.status === "HOLD";
  const isPayable = ticket.status === "BOOKED" || ticket.status === "HOLD";
  const isCancelling = cancellingId === ticket.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        id="invoice-print-area"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="bg-[#0f2849] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider">Vé điện tử</div>
              <div className="text-lg font-bold font-mono tracking-wide">{ticket.ticketCode}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.style}`}>
              {s.label}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 space-y-5">
          <button type="button" onClick={onClose} disabled={isCancelling} className="print:hidden inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50">
            <ArrowLeft size={16} aria-hidden="true" /> Trở lại danh sách vé
          </button>
          {/* Route info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tuyến đường</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">{ticket.origin || "—"}</div>
                <div className="text-xs text-slate-500">Điểm đi</div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
              <div className="text-right">
                <div className="text-base font-bold text-slate-900">{ticket.destination || "—"}</div>
                <div className="text-xs text-slate-500">Điểm đến</div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-0.5">Khởi hành</div>
              <div className="font-semibold text-slate-900">{fmtTime(ticket.departureTime)}</div>
              <div className="text-xs text-slate-600">{fmtDate(ticket.departureTime)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-0.5">Dự kiến đến</div>
              <div className="font-semibold text-slate-900">{fmtTime(ticket.arrivalTime)}</div>
              <div className="text-xs text-slate-600">{fmtDate(ticket.arrivalTime)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-0.5">Xe vận chuyển</div>
              <div className="font-semibold text-slate-900">{ticket.busLicensePlate || "—"}</div>
              <div className="text-xs text-slate-600">{ticket.busType || ""}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="text-xs text-amber-700 font-medium mb-0.5">Vị trí ghế</div>
              <div className="text-xl font-extrabold text-[#0f2849]">{ticket.seatNumber || "—"}</div>
            </div>
          </div>

          {/* Pickup & Dropoff */}
          {(ticket.pickupPoint || ticket.dropoffPoint) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
              {ticket.pickupPoint && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700 shrink-0">Điểm đón:</span>
                  <span className="text-slate-600">{ticket.pickupPoint}</span>
                </div>
              )}
              {ticket.dropoffPoint && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700 shrink-0">Điểm trả:</span>
                  <span className="text-slate-600">{ticket.dropoffPoint}</span>
                </div>
              )}
            </div>
          )}

          {/* QR Code Check-in (REAL QR) */}
          <div className="rounded-xl border border-slate-200 p-4 text-center bg-white flex flex-col items-center">
            <div className="text-xs font-semibold text-slate-700 mb-2">Mã QR lên xe (Check-in)</div>
            <div className="p-2 border border-slate-200 rounded-lg inline-block bg-white shadow-xs">
              <QRCodeSVG
                value={`XEKHACHPRO:${ticket.ticketCode}`}
                size={128}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Xuất trình mã này cho nhân viên khi lên xe. Có thể quét trực tiếp bằng camera điện thoại.
            </p>
          </div>

          {/* Fare & Payment */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div>
              <div className="text-xs text-slate-500">Giá vé</div>
              <div className="text-xl font-bold text-[#0f2849]">{fmtPrice(ticket.price)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Hình thức thanh toán</div>
              <div className="text-sm font-semibold text-slate-800">
                {PAYMENT_METHOD_LABEL[ticket.paymentMethod ?? ""] || ticket.paymentMethod || "Chưa xác định"}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              In vé
            </button>
            <button
              onClick={() => onOpenFeedback(ticket)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
              Khiếu nại / Góp ý
            </button>
          </div>

          <div className="flex gap-2">
            {isPayable && (
              <button
                onClick={() => onPay(ticket)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 transition-colors shadow-xs"
              >
                Thanh toán QR
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel(ticket.id)}
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? "Đang hủy..." : "Hủy vé"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card ────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: TicketRecord;
  hasFeedback: boolean;
  onViewDetail: (t: TicketRecord) => void;
  onOpenFeedback: (t: TicketRecord) => void;
}

function TicketCard({ ticket, hasFeedback, onViewDetail, onOpenFeedback }: TicketCardProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  const isCancelled = ticket.status === "CANCELLED";

  return (
    <div
      onClick={() => onViewDetail(ticket)}
      className={`cursor-pointer rounded-xl border bg-white transition-all hover:shadow-md hover:border-slate-300 ${
        isCancelled ? "border-slate-200 opacity-60" : "border-slate-200"
      }`}
    >
      <div className={`h-1.5 rounded-t-xl ${isCancelled ? "bg-slate-300" : "bg-[#0f2849]"}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-xs font-bold text-[#0f2849] tracking-wider">
            {ticket.ticketCode}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${s.style}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-bold text-slate-900 truncate">{ticket.origin}</div>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="text-sm font-bold text-slate-900 truncate">{ticket.destination}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
            <div className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">Khởi hành</div>
            <div className="text-xs font-bold text-slate-800">{fmtTime(ticket.departureTime)}</div>
            <div className="text-[10px] text-slate-500">{fmtDate(ticket.departureTime)}</div>
          </div>
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-2 text-center">
            <div className="text-[10px] uppercase font-semibold text-amber-800 mb-0.5">Ghế ngồi</div>
            <div className="text-base font-extrabold text-[#0f2849]">{ticket.seatNumber || "—"}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-sm font-bold text-[#0f2849]">{fmtPrice(ticket.price)}</div>
          <span className="text-xs font-semibold text-slate-500 hover:text-[#0f2849] flex items-center gap-1">
            Xem vé →
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main CustomerTicketsPage ─────────────────────────────────────────
const ITEMS_PER_PAGE = 9;

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketRecord | null>(null);
  const [feedbackModalTarget, setFeedbackModalTarget] = useState<TicketRecord | null | undefined>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [feedbackTripIds, setFeedbackTripIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterTab, setFilterTab] = useState<"ALL" | "CONFIRMED" | "PENDING" | "CANCELLED">("ALL");

  const loadFeedbackMap = useCallback(async () => {
    try {
      const fbList = await getMyFeedbacks();
      setFeedbackTripIds(new Set(fbList.map((f) => f.relatedTripId).filter((id): id is number => id !== null)));
    } catch {
      // Ignore if feedback list fails
    }
  }, []);

  const load = useCallback(() => {
    getMyTickets()
      .then((data) => {
        setTickets(data);
        setCurrentPage(1);
      })
      .catch(() => toast.error("Không tải được danh sách vé"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFeedbackMap(); }, [loadFeedbackMap]);

  const handleCancel = async (id: number) => {
    if (!window.confirm("Bạn chắc chắn muốn hủy vé này?")) return;
    setCancellingId(id);
    try {
      const updated = await cancelTicket(id);
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status: updated.status });
      toast.success("Hủy vé thành công");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hủy vé thất bại");
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmTransfer = () => {
    setQrTicket(null);
    setSelectedTicket(null);
    load();
    toast.success("SePay đã xác nhận thanh toán thành công.");
  };

  const ticketHasFeedback = (t: TicketRecord) => feedbackTripIds.has(t.tripId);

  // Filter tab logic
  const filteredTickets = tickets.filter((t) => {
    if (filterTab === "CONFIRMED") return t.status === "CONFIRMED" || t.status === "PAID";
    if (filterTab === "PENDING") return t.status === "BOOKED" || t.status === "HOLD";
    if (filterTab === "CANCELLED") return t.status === "CANCELLED";
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTickets = filteredTickets.slice(
    (validCurrentPage - 1) * ITEMS_PER_PAGE,
    validCurrentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
        Đang tải danh sách vé...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <Link to="/customer/booking" className="print:hidden inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          <ArrowLeft size={16} aria-hidden="true" /> Trở lại tìm chuyến
        </Link>
        {/* Header & Filter Tabs */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Vé của tôi</h1>
              <p className="text-xs text-slate-500">Quản lý và theo dõi danh sách vé xe đã đặt</p>
            </div>
            <button
              onClick={() => setFeedbackModalTarget(undefined)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
            >
              <MessageCircle className="h-4 w-4 text-amber-500" />
              Gửi khiếu nại / Góp ý
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { key: "ALL", label: "Tất cả", count: tickets.length },
                {
                  key: "CONFIRMED",
                  label: "Đã xác nhận",
                  count: tickets.filter((t) => t.status === "CONFIRMED" || t.status === "PAID").length,
                },
                {
                  key: "PENDING",
                  label: "Chờ xác nhận",
                  count: tickets.filter((t) => t.status === "BOOKED" || t.status === "HOLD").length,
                },
                {
                  key: "CANCELLED",
                  label: "Đã hủy",
                  count: tickets.filter((t) => t.status === "CANCELLED").length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setFilterTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  filterTab === tab.key
                    ? "bg-[#0f2849] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    filterTab === tab.key ? "bg-amber-400 text-slate-950 font-bold" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Grid or Empty State */}
        {filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Ticket className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">Không tìm thấy vé xe nào</p>
            <p className="text-xs text-slate-400 mb-4">Bạn chưa có vé xe trong mục này hoặc chưa đặt chuyến mới.</p>
            <Link
              to="/customer/booking"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f2849] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1a3a6b] transition-colors shadow-sm"
            >
              Đặt vé xe ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  hasFeedback={ticketHasFeedback(ticket)}
                  onViewDetail={setSelectedTicket}
                  onOpenFeedback={setFeedbackModalTarget}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <Pagination
                  currentPage={validCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal (Chi tiết vé) */}
      {selectedTicket && (
        <InvoiceModal
          ticket={selectedTicket}
          hasFeedback={ticketHasFeedback(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          onCancel={handleCancel}
          onPay={(t) => setQrTicket(t)}
          onOpenFeedback={(t) => {
            setSelectedTicket(null);
            setFeedbackModalTarget(t);
          }}
          cancellingId={cancellingId}
        />
      )}

      {/* QR Code Payment Modal */}
      {qrTicket && (
        <QRCodePaymentModal
          ticket={qrTicket}
          onClose={() => setQrTicket(null)}
          onConfirm={handleConfirmTransfer}
        />
      )}

      {/* Feedback Modal */}
      {feedbackModalTarget !== null && (
        <FeedbackModal
          tickets={tickets}
          initialTicket={feedbackModalTarget ?? undefined}
          onClose={() => setFeedbackModalTarget(null)}
          onCreated={() => {
            loadFeedbackMap();
            load();
          }}
        />
      )}
    </>
  );
}
