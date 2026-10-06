// ============================================================================
// FEEDBACK INBOX MODAL — Quản lý phản hồi khách hàng (Admin)
// Design System: Dark Enterprise SaaS (surface #172338 / #101c2d / border-white/10)
// Giữ nguyên business logic, API, SSE/realtime và state.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  Search,
  X,
  Send,
  Star,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Loader2,
  MessageSquare,
  MapPin,
  User,
  Mail,
  Hash,
  Calendar,
  ChevronLeft,
  AlertCircle,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  FeedbackItem,
  FeedbackStatus,
  FeedbackCategory,
  FeedbackPriority,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_CATEGORY_LABELS,
  getAdminFeedbacks,
  getAdminFeedbackById,
  replyAsAdmin,
  updateAdminFeedbackStatus,
  deleteAdminFeedback,
} from "../../api/feedback";
import { connectAdminNotifications } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import { Button, IconButton } from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";

const STATUS_OPTIONS: Array<{ value: FeedbackStatus | ""; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "NEW", label: "Mới" },
  { value: "READ", label: "Đã đọc" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã giải quyết" },
  { value: "CLOSED", label: "Đã đóng" },
];

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; variant: "info" | "neutral" | "warning" | "success" }
> = {
  NEW: { label: "Mới", variant: "info" },
  READ: { label: "Đã đọc", variant: "neutral" },
  IN_PROGRESS: { label: "Đang xử lý", variant: "warning" },
  RESOLVED: { label: "Đã giải quyết", variant: "success" },
  CLOSED: { label: "Đã đóng", variant: "neutral" },
};

const PRIORITY_BADGE_STYLES: Record<FeedbackPriority, string> = {
  LOW: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  MEDIUM: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  HIGH: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface FeedbackInboxModalProps {
  /** Optional filter theo trip — khi admin mở từ 1 chuyến cụ thể */
  initialTripId?: number | null;
  /** Pre-select feedback id (VD: từ SSE event) */
  initialFeedbackId?: number | null;
  onClose: () => void;
  onChanged?: () => void;
}

export default function FeedbackInboxModal({
  initialTripId,
  initialFeedbackId,
  onClose,
  onChanged,
}: FeedbackInboxModalProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(initialFeedbackId ?? null);
  const [selectedDetail, setSelectedDetail] = useState<FeedbackItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [flashItemId, setFlashItemId] = useState<number | null>(null);

  // Mobile view toggle (Master vs Detail)
  const [showMobileDetail, setShowMobileDetail] = useState(Boolean(initialFeedbackId));

  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "">("NEW");
  const [searchKw, setSearchKw] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminFeedbacks({
        status: filterStatus || undefined,
        tripId: initialTripId ?? undefined,
        keyword: searchKw.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được danh sách phản hồi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, initialTripId]);

  // Real-time SSE listener
  useEffect(() => {
    let isMounted = true;
    const es = connectAdminNotifications(
      () => {}, // ignore bookings
      () => {}, // ignore payments
      async (newFb) => {
        if (!isMounted) return;
        try {
          const fullItem = await getAdminFeedbackById(newFb.feedbackId);
          if (!isMounted) return;
          setItems((prev) => {
            if (prev.some((x) => x.id === fullItem.id)) return prev;
            return [fullItem, ...prev];
          });
          setFlashItemId(fullItem.id);
          setTimeout(() => {
            if (isMounted) setFlashItemId(null);
          }, 2000);
        } catch {
          // Fallback refresh list
          load();
        }
      },
      () => {} // silent error handler
    );

    return () => {
      isMounted = false;
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load detail khi chọn feedback
  useEffect(() => {
    if (selectedId === null) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getAdminFeedbackById(selectedId)
      .then((d) => {
        if (!cancelled) setSelectedDetail(d);
      })
      .catch((err) => toast.error(extractApiErrorMessage(err) || "Không tải được chi tiết"))
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const counts = useMemo(() => {
    const all = items;
    return {
      total: all.length,
      new: all.filter((f) => f.status === "NEW").length,
      inProgress: all.filter((f) => f.status === "IN_PROGRESS").length,
      read: all.filter((f) => f.status === "READ").length,
      resolved: all.filter((f) => f.status === "RESOLVED").length,
      closed: all.filter((f) => f.status === "CLOSED").length,
    };
  }, [items]);

  const handleReply = async () => {
    if (!selectedDetail || !replyText.trim()) return;
    setSending(true);
    try {
      const updated = await replyAsAdmin(selectedDetail.id, replyText.trim());
      setSelectedDetail(updated);
      setReplyText("");
      // Update item trong list
      setItems((prev) =>
        prev.map((it) =>
          it.id === updated.id
            ? { ...it, status: updated.status, replyCount: updated.replyCount }
            : it
        )
      );
      toast.success("Đã gửi phản hồi tới khách hàng");
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không gửi được phản hồi");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!selectedDetail || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const updated = await updateAdminFeedbackStatus(selectedDetail.id, {
        status: newStatus,
      });
      setSelectedDetail(updated);
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? { ...it, status: updated.status } : it))
      );
      toast.success(`Đã cập nhật trạng thái: ${FEEDBACK_STATUS_LABELS[newStatus]}`);
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không cập nhật được trạng thái");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: FeedbackPriority) => {
    if (!selectedDetail) return;
    try {
      const updated = await updateAdminFeedbackStatus(selectedDetail.id, {
        status: selectedDetail.status,
        priority: newPriority,
      });
      setSelectedDetail(updated);
      setItems((prev) =>
        prev.map((it) =>
          it.id === updated.id ? { ...it, priority: updated.priority } : it
        )
      );
      toast.success(`Đã cập nhật độ ưu tiên: ${FEEDBACK_PRIORITY_LABELS[newPriority]}`);
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không cập nhật được độ ưu tiên");
    }
  };

  const handleDelete = async () => {
    if (!selectedDetail) return;
    if (!window.confirm("Xóa phản hồi này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteAdminFeedback(selectedDetail.id);
      toast.success("Đã xóa phản hồi");
      setSelectedId(null);
      setSelectedDetail(null);
      setShowMobileDetail(false);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không xóa được");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[1440px] h-[86vh] rounded-2xl bg-[#172338] border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* ================================================================ */}
        {/* 1. HEADER (Height 76px, Surface-1, subtle border, no gradient)  */}
        {/* ================================================================ */}
        <header className="h-[76px] px-6 py-4 flex items-center justify-between border-b border-white/[0.08] bg-[#172338] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Phản hồi khách hàng
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>
                  {initialTripId
                    ? `Phản hồi liên quan đến chuyến #${initialTripId}`
                    : "Tất cả phản hồi từ khách hàng"}
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-medium text-slate-300">{counts.total} phản hồi</span>
                {counts.new > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {counts.new} mới
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              variant="default"
              size="md"
              onClick={load}
              disabled={loading}
              tooltip="Tải lại danh sách"
              title="Tải lại danh sách"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </IconButton>
            <IconButton
              variant="default"
              size="md"
              onClick={onClose}
              tooltip="Đóng hộp thoại"
              title="Đóng hộp thoại"
            >
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        {/* ================================================================ */}
        {/* 2. MASTER-DETAIL BODY (Left: ~36%, Right: ~64%)                  */}
        {/* ================================================================ */}
        <div className="flex-1 flex overflow-hidden">
          {/* ============================================================== */}
          {/* LEFT PANEL: Filters & Feedback List                            */}
          {/* ============================================================== */}
          <div
            className={`w-full md:w-[38%] lg:w-[400px] xl:w-[440px] shrink-0 border-r border-white/[0.08] flex flex-col bg-[#131d2e] ${
              showMobileDetail ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search & Filter Bar */}
            <div className="p-3.5 border-b border-white/[0.08] space-y-2.5 shrink-0 bg-[#172338]/60">
              {/* Search input: height 40px, padding 12px, radius 8px */}
              <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#101c2d] px-3.5 transition-colors focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Search phản hồi..."
                  className="w-full border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                />
              </div>

              {/* Filter tabs: height 34-36px, compact, horizontal scroll */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto py-0.5"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = filterStatus === opt.value;
                  const count =
                    opt.value === ""
                      ? counts.total
                      : opt.value === "NEW"
                      ? counts.new
                      : opt.value === "IN_PROGRESS"
                      ? counts.inProgress
                      : opt.value === "READ"
                      ? counts.read
                      : opt.value === "RESOLVED"
                      ? counts.resolved
                      : counts.closed;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilterStatus(opt.value)}
                      className={`h-[34px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {count !== undefined && count > 0 && (
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? "bg-emerald-500/25 text-emerald-200"
                              : "bg-white/[0.08] text-slate-400"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback List (Independent scroll) */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Đang tải danh sách...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-40 text-slate-500" />
                  <p className="text-sm font-medium text-slate-300">Không tìm thấy phản hồi nào</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                  </p>
                </div>
              ) : (
                items.map((fb) => {
                  const active = selectedId === fb.id;
                  const isNewFlash = flashItemId === fb.id;

                  return (
                    <div
                      key={fb.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedId(fb.id);
                        setShowMobileDetail(true);
                      }}
                      className={`group relative flex items-start gap-3 p-3.5 min-h-[92px] transition-colors cursor-pointer select-none ${
                        active
                          ? "bg-emerald-500/[0.08] border-l-[3px] border-l-emerald-400"
                          : "hover:bg-white/[0.03] border-l-[3px] border-l-transparent"
                      } ${isNewFlash ? "bg-emerald-500/20 ring-1 ring-emerald-500/40" : ""}`}
                    >
                      {/* Avatar: Neutral unified styling */}
                      <div className="h-9 w-9 rounded-lg bg-[#1c2a42] border border-white/[0.08] flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0 mt-0.5">
                        {(fb.userFullName || fb.username || "U").charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-semibold text-slate-100 truncate">
                            {fb.userFullName || fb.username}
                          </span>
                          <StatusBadge
                            variant={STATUS_CONFIG[fb.status]?.variant || "neutral"}
                            label={STATUS_CONFIG[fb.status]?.label || fb.statusLabel}
                            size="sm"
                            className="h-[22px] text-[11px] px-2 py-0 shrink-0"
                          />
                        </div>

                        {/* Row 2: Preview content */}
                        <p className="text-[13px] text-slate-400 truncate mt-1">
                          {fb.subject ? `${fb.subject}: ${fb.content}` : fb.content}
                        </p>

                        {/* Row 3: Rating, replies, timestamp */}
                        <div className="flex items-center gap-2.5 mt-2">
                          {fb.rating ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span>★ {fb.rating}</span>
                            </span>
                          ) : null}

                          {fb.replyCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <MessageSquare className="h-3 w-3 text-slate-500" />
                              <span>{fb.replyCount}</span>
                            </span>
                          )}

                          <span className="text-[12px] text-slate-500 ml-auto">
                            {fmtTime(fb.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT PANEL: Feedback Detail View                              */}
          {/* ============================================================== */}
          <div
            className={`flex-1 min-w-0 flex flex-col bg-[#172338] ${
              !showMobileDetail ? "hidden md:flex" : "flex"
            }`}
          >
            {!selectedDetail && !detailLoading ? (
              /* Empty state compact */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-3">
                  <Inbox className="h-6 w-6 text-slate-400" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Chọn một phản hồi</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Chọn phản hồi bên trái để xem nội dung và xử lý.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            ) : selectedDetail ? (
              <>
                {/* -------------------------------------------------------- */}
                {/* Detail Header (Sticky at top)                            */}
                {/* -------------------------------------------------------- */}
                <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#172338] shrink-0">
                  {/* Mobile Back Button */}
                  <div className="flex items-center justify-between mb-3 md:hidden">
                    <button
                      type="button"
                      onClick={() => setShowMobileDetail(false)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Quay lại danh sách</span>
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-[#1c2a42] border border-white/[0.08] flex items-center justify-center text-slate-200 font-bold text-sm shrink-0">
                        {(
                          selectedDetail.userFullName ||
                          selectedDetail.username ||
                          "U"
                        ).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                          {selectedDetail.userFullName || selectedDetail.username}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmtTime(selectedDetail.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Rating & Status & Non-destructive delete action */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {selectedDetail.rating ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`h-3.5 w-3.5 ${
                                  selectedDetail.rating! >= n
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-amber-300">
                            {selectedDetail.rating}/5
                          </span>
                        </div>
                      ) : null}

                      <StatusBadge
                        variant={STATUS_CONFIG[selectedDetail.status]?.variant || "neutral"}
                        label={
                          STATUS_CONFIG[selectedDetail.status]?.label ||
                          selectedDetail.statusLabel
                        }
                        size="md"
                        className="h-8 text-xs px-3"
                      />

                      <IconButton
                        variant="danger"
                        size="md"
                        onClick={handleDelete}
                        tooltip="Xóa phản hồi"
                        title="Xóa phản hồi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Quick Action Transitions */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium mr-1">Xử lý nhanh:</span>

                    {selectedDetail.status === "NEW" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange("READ")}
                        isLoading={statusUpdating}
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                      >
                        Đánh dấu đã đọc
                      </Button>
                    )}

                    {selectedDetail.status !== "IN_PROGRESS" && selectedDetail.status !== "CLOSED" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange("IN_PROGRESS")}
                        isLoading={statusUpdating}
                        leftIcon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
                      >
                        Chuyển sang đang xử lý
                      </Button>
                    )}

                    {selectedDetail.status !== "RESOLVED" && selectedDetail.status !== "CLOSED" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange("RESOLVED")}
                        isLoading={statusUpdating}
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        Đánh dấu đã giải quyết
                      </Button>
                    )}

                    {selectedDetail.status !== "CLOSED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange("CLOSED")}
                        isLoading={statusUpdating}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        Đóng phản hồi
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange("IN_PROGRESS")}
                        isLoading={statusUpdating}
                      >
                        Mở lại phản hồi
                      </Button>
                    )}
                  </div>
                </div>

                {/* -------------------------------------------------------- */}
                {/* Scrollable Detail Sections                               */}
                {/* -------------------------------------------------------- */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {/* Section 1: Nội dung phản hồi */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-semibold uppercase tracking-wider text-slate-300">
                        Nội dung phản hồi
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#1c2a42] text-slate-300 border border-white/[0.08]">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {FEEDBACK_CATEGORY_LABELS[selectedDetail.category]}
                        </span>
                        {selectedDetail.relatedTripLabel && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <MapPin className="h-3 w-3" />
                            {selectedDetail.relatedTripLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#101c2d] border border-white/[0.08] p-4 space-y-2">
                      <h5 className="text-sm font-semibold text-slate-100">
                        {selectedDetail.subject}
                      </h5>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {selectedDetail.content}
                      </p>
                    </div>
                  </section>

                  {/* Section 2: Thông tin chi tiết */}
                  <section className="space-y-3 pt-2 border-t border-white/[0.08]">
                    <h4 className="text-[13px] font-semibold uppercase tracking-wider text-slate-300">
                      Thông tin chi tiết
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">Người gửi</p>
                          <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">
                            {selectedDetail.userFullName || selectedDetail.username}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">Email / Liên hệ</p>
                          <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">
                            {selectedDetail.userEmail || "Chưa cập nhật"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <Hash className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">Mã phản hồi</p>
                          <p className="text-xs font-semibold text-slate-100 mt-0.5">
                            #{selectedDetail.id}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">Thời gian gửi</p>
                          <p className="text-xs font-semibold text-slate-100 mt-0.5">
                            {fmtTime(selectedDetail.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-400 font-medium">Độ ưu tiên</p>
                          <div className="mt-1 flex items-center gap-2">
                            <select
                              value={selectedDetail.priority}
                              onChange={(e) =>
                                handlePriorityChange(e.target.value as FeedbackPriority)
                              }
                              className="text-xs bg-[#172338] border border-white/[0.12] rounded-md px-2 py-0.5 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              {(Object.keys(FEEDBACK_PRIORITY_LABELS) as FeedbackPriority[]).map(
                                (p) => (
                                  <option key={p} value={p} className="bg-[#172338] text-slate-200">
                                    {FEEDBACK_PRIORITY_LABELS[p]}
                                  </option>
                                )
                              )}
                            </select>
                            <span
                              className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                PRIORITY_BADGE_STYLES[selectedDetail.priority]
                              }`}
                            >
                              {selectedDetail.priorityLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#101c2d] border border-white/[0.08] p-3 flex items-start gap-2.5">
                        <Star className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">Đánh giá sao</p>
                          <p className="text-xs font-semibold text-slate-100 mt-0.5">
                            {selectedDetail.rating ? `★ ${selectedDetail.rating} / 5 sao` : "Không đánh giá"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Lịch sử trao đổi / Phản hồi */}
                  <section className="space-y-3 pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-semibold uppercase tracking-wider text-slate-300">
                        Lịch sử trao đổi
                      </h4>
                      <span className="text-xs text-slate-500">
                        {selectedDetail.replies.length} phản hồi
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {/* Original customer message */}
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[#1c2a42] border border-white/[0.08] flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0 mt-0.5">
                          {(selectedDetail.userFullName || selectedDetail.username || "K").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 max-w-[85%]">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-slate-200">
                              {selectedDetail.userFullName || selectedDetail.username}
                            </span>
                            <span>(Khách hàng)</span>
                            <span className="text-slate-600">•</span>
                            <span>{fmtTime(selectedDetail.createdAt)}</span>
                          </div>
                          <div className="mt-1 rounded-xl rounded-tl-sm bg-[#1c2a42] border border-white/[0.08] p-3.5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {selectedDetail.content}
                          </div>
                        </div>
                      </div>

                      {/* Replies thread */}
                      {selectedDetail.replies.map((rep) => {
                        const isAdmin = rep.authorRole === "ADMIN";
                        return (
                          <div
                            key={rep.id}
                            className={`flex items-start gap-3 ${
                              isAdmin ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 border ${
                                isAdmin
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-[#1c2a42] text-slate-300 border-white/[0.08]"
                              }`}
                            >
                              {(rep.authorFullName || rep.authorUsername || "U").charAt(0).toUpperCase()}
                            </div>

                            <div
                              className={`flex-1 max-w-[85%] ${
                                isAdmin ? "text-right" : "text-left"
                              }`}
                            >
                              <div
                                className={`flex items-center gap-2 text-xs text-slate-400 ${
                                  isAdmin ? "justify-end" : "justify-start"
                                }`}
                              >
                                <span
                                  className={`font-semibold ${
                                    isAdmin ? "text-emerald-400" : "text-slate-200"
                                  }`}
                                >
                                  {rep.authorFullName || rep.authorUsername}
                                </span>
                                <span>{isAdmin ? "(Quản trị viên)" : "(Khách hàng)"}</span>
                                <span className="text-slate-600">•</span>
                                <span>{fmtTime(rep.createdAt)}</span>
                              </div>
                              <div
                                className={`mt-1 inline-block text-left p-3.5 text-sm leading-relaxed whitespace-pre-wrap rounded-xl border ${
                                  isAdmin
                                    ? "rounded-tr-sm bg-emerald-500/10 border-emerald-500/25 text-slate-100"
                                    : "rounded-tl-sm bg-[#1c2a42] border-white/[0.08] text-slate-200"
                                }`}
                              >
                                {rep.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* -------------------------------------------------------- */}
                {/* Reply Input Bar (Fixed bottom of detail panel)           */}
                {/* -------------------------------------------------------- */}
                <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#172338] shrink-0">
                  <div className="flex gap-2.5">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleReply();
                        }
                      }}
                      rows={2}
                      placeholder="Nhập phản hồi gửi đến khách hàng... (Cmd/Ctrl + Enter để gửi)"
                      className="flex-1 px-3.5 py-2.5 bg-[#101c2d] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none transition-colors"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      isLoading={sending}
                      leftIcon={<Send className="h-4 w-4" />}
                      className="self-end h-[42px] px-5"
                    >
                      <span className="hidden sm:inline">Gửi</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}