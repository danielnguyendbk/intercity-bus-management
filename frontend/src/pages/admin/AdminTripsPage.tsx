// ============================================================================
// ADMIN TRIPS PAGE — Quản lý chuyến xe (Admin)
// Tính năng: tạo/sửa/xóa chuyến, mở Feedback inbox, SSE subscribe notification
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, MapPin, Clock, Bus, Users, Search, RefreshCw, Armchair, Bell, BellRing, CreditCard, MessageCircle, MessageSquare, Calendar, CheckCircle2, Activity } from "lucide-react";
import toast from "react-hot-toast";
import StatusBadge from "../../components/ui/StatusBadge";
import PageHeader from "../../components/ui/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import KPICard from "../../components/ui/KPICard";
import FeedbackInboxModal from "../../components/admin/FeedbackInboxModal";
import {
  AdminBus,
  AdminRoute,
  AdminTrip,
  createAdminTrip,
  deleteAdminTrip,
  getAdminTrips,
  getBuses,
  getRoutes,
  updateAdminTrip,
  getEmployeesByType,
  assignStaffToTrip,
  getStaffByTrip,
  connectAdminNotifications,
  AdminBookingEvent,
  AdminPaymentEvent,
  AdminFeedbackEvent,
} from "../../api/admin";
import { getAdminFeedbackStats } from "../../api/feedback";
import TripSeatsModal from "./TripSeatsModal";
import Pagination from "../../components/ui/Pagination";
import { Employee, TripStatus } from "../../types";
import { extractApiErrorMessage } from "../../utils/apiError";

const LOCATIONS = [
  "Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế",
  "Nha Trang", "Vũng Tàu", "Đà Lạt", "Hải Phòng", "Quảng Ninh",
  "Bình Dương", "Cà Mau", "An Giang", "Kiên Giang", "Nghệ An"
];

const TRIP_STATUS_OPTIONS: { value: TripStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "DELAYED", label: "Trễ" },
];

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; bgClass: string }> = {
  SCHEDULED: { label: "Đã lên lịch", color: "text-blue-600", bgClass: "bg-blue-100" },
  RUNNING: { label: "Đang chạy", color: "text-emerald-600", bgClass: "bg-emerald-100" },
  COMPLETED: { label: "Hoàn thành", color: "text-slate-600", bgClass: "bg-slate-100" },
  CANCELLED: { label: "Đã hủy", color: "text-red-600", bgClass: "bg-red-100" },
  DELAYED: { label: "Trễ", color: "text-amber-600", bgClass: "bg-amber-100" },
};

const fmtDateTime = (dt: string) => new Date(dt).toLocaleString("vi-VN", {
  hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
});

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [assistants, setAssistants] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TripStatus | "">("");
  const [filterRouteId, setFilterRouteId] = useState<number | "">("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<null | any>(null);
  const [seatsTripId, setSeatsTripId] = useState<number | null>(null);
  const [pendingBookings, setPendingBookings] = useState<AdminBookingEvent[]>([]);
  const [pendingPayments, setPendingPayments] = useState<AdminPaymentEvent[]>([]);
  const [pendingFeedbacks, setPendingFeedbacks] = useState<AdminFeedbackEvent[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{ newCount: number } | null>(null);
  const [showFeedbackInbox, setShowFeedbackInbox] = useState(false);
  const [feedbackFilterTripId, setFeedbackFilterTripId] = useState<number | null>(null);
  const [initialFeedbackId, setInitialFeedbackId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminTrips({
        routeId: filterRouteId || undefined,
        status: filterStatus || undefined,
      });
      setTrips(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải danh sách chuyến");
    } finally {
      setIsLoading(false);
    }
  }, [filterRouteId, filterStatus]);

  const loadFormData = useCallback(async () => {
    try {
      const [routeData, busData, driverData, assistantData] = await Promise.all([
        getRoutes({ activeOnly: true }),
        getBuses(),
        getEmployeesByType("DRIVER"),
        getEmployeesByType("ASSISTANT"),
      ]);
      setRoutes(routeData);
      setBuses(busData);
      setDrivers(driverData);
      setAssistants(assistantData);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải dữ liệu form");
    }
  }, []);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Load feedback stats (để hiển thị badge)
  const loadFeedbackStats = useCallback(async () => {
    try {
      const stats = await getAdminFeedbackStats();
      setFeedbackStats({ newCount: stats.newCount });
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    loadFeedbackStats();
  }, [loadFeedbackStats]);

  // ─── SSE subscription: nhận notification booking mới + payment SePay + feedback ───
  useEffect(() => {
    let cancelled = false;

    const setup = () => {
      const es = connectAdminNotifications(
        (booking) => {
          if (cancelled) return;
          console.debug("[SSE] booking.created", booking);
          setPendingBookings((prev) => [booking, ...prev].slice(0, 50));
          toast(
            `🆕 Vé mới #${booking.ticketId} · Ghế ${booking.seatNumber} · ${booking.passengerName || "Khách"}`,
            { duration: 6000 }
          );
          loadTrips();
        },
        (payment) => {
          if (cancelled) return;
          console.debug("[SSE] payment.sepay.success", payment);
          setPendingPayments((prev) => [payment, ...prev].slice(0, 50));
          toast.success(
            `💳 SePay thành công · Vé #${payment.ticketId} · Ghế ${payment.seatNumber} · ${payment.passengerName || "Khách"}`,
            { duration: 8000 }
          );
          loadTrips();
        },
        (feedback) => {
          if (cancelled) return;
          console.debug("[SSE] feedback.created", feedback);
          setPendingFeedbacks((prev) => [feedback, ...prev].slice(0, 50));
          toast(
            `📬 Phản hồi mới từ ${feedback.userFullName || feedback.username}: "${feedback.subject}"`,
            { duration: 8000 }
          );
          loadFeedbackStats();
        },
        (err) => {
          // Tự reconnect sau 3s — không log noise ra console production
          setTimeout(() => { if (!cancelled) setup(); }, 3000);
        }
      );
      eventSourceRef.current = es;
    };

    setup();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTrips = trips.filter((trip) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      trip.routeName.toLowerCase().includes(kw) ||
      trip.busLabel.toLowerCase().includes(kw) ||
      `#${trip.id}`.includes(kw)
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterStatus, filterRouteId]);

  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTrips = filteredTrips.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const handleSaveTrip = async (form: TripFormValues) => {
    setIsSaving(true);
    try {
      let currentTripId = editingTrip?.id;

      const payload: any = {
        busId: form.busId,
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime,
        status: form.status,
      };

      if (form.useExistingRoute && form.routeId) {
        payload.routeId = form.routeId;
      } else {
        payload.origin = form.origin;
        payload.destination = form.destination;
        payload.basePrice = form.basePrice || 250000;
        payload.distanceKm = form.distanceKm || 100;
        payload.estimatedDurationMin = form.estimatedDurationMin || 120;
      }

      if (editingTrip) {
        await updateAdminTrip(currentTripId, payload);
      } else {
        const newTrip: any = await createAdminTrip(payload);
        currentTripId = newTrip?.id || newTrip?.data?.id;
      }

      if (currentTripId) {
        await assignStaffToTrip(
          currentTripId,
          form.driverId ? Number(form.driverId) : null,
          form.assistantId ? Number(form.assistantId) : null
        );
      }

      toast.success(editingTrip ? "Cập nhật chuyến thành công" : "Tạo chuyến mới thành công");
      setShowModal(false);
      setEditingTrip(null);
      await loadTrips();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể lưu chuyến");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    if (!window.confirm("Bạn có chắc muốn xoá chuyến này?")) return;
    try {
      await deleteAdminTrip(tripId);
      toast.success("Đã xoá chuyến");
      await loadTrips();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể xoá chuyến");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        eyebrow="Trip Management"
        title="Quản lý chuyến xe"
        subtitle="Tạo và quản lý chuyến xe với tuyến đường linh hoạt"
        actions={
          <>
            {(pendingBookings.length > 0 || pendingPayments.length > 0) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <BellRing className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                {pendingBookings.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300" />
                    {pendingBookings.length} booking mới
                  </span>
                )}
                {pendingBookings.length > 0 && pendingPayments.length > 0 && (
                  <span className="text-amber-400">·</span>
                )}
                {pendingPayments.length > 0 && (
                  <span className="flex items-center gap-1 font-mono">
                    <CreditCard className="w-3 h-3" />
                    {pendingPayments.length} SePay
                  </span>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              leftIcon={<MessageSquare className="w-4 h-4" />}
              onClick={() => {
                setFeedbackFilterTripId(null);
                setInitialFeedbackId(null);
                setShowFeedbackInbox(true);
              }}
              className="relative"
            >
              Phản hồi
              {(feedbackStats?.newCount ?? 0) > 0 && (
                <span className="ml-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold inline-flex items-center justify-center">
                  {feedbackStats!.newCount}
                </span>
              )}
            </Button>

            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingTrip(null);
                setShowModal(true);
              }}
            >
              Tạo chuyến mới
            </Button>
          </>
        }
      />

      {/* 2. KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Tổng chuyến"
          value={trips.length}
          icon={Bus}
          variant="amber"
          description="Toàn bộ lịch trình"
        />
        <KPICard
          label="Đang chạy"
          value={trips.filter((t) => t.status === "RUNNING").length}
          icon={Activity}
          variant="emerald"
          description="Chuyến xe trên đường"
        />
        <KPICard
          label="Đã lên lịch"
          value={trips.filter((t) => t.status === "SCHEDULED").length}
          icon={Calendar}
          variant="blue"
          description="Chuẩn bị khởi hành"
        />
        <KPICard
          label="Hoàn thành"
          value={trips.filter((t) => t.status === "COMPLETED").length}
          icon={CheckCircle2}
          variant="slate"
          description="Đã kết thúc hành trình"
        />
      </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm chuyến xe..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterRouteId}
            onChange={(e) => setFilterRouteId(Number(e.target.value) || "")}
            className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option className="bg-slate-800 text-white" value="">Tất cả tuyến</option>
            {routes.map((route) => (
              <option className="bg-slate-800 text-white" key={route.id} value={route.id}>
                {route.origin} → {route.destination}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TripStatus | "")}
            className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option className="bg-slate-800 text-white" value="">Tất cả trạng thái</option>
            {TRIP_STATUS_OPTIONS.map((item) => (
              <option className="bg-slate-800 text-white" key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <button
            onClick={loadTrips}
            className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Trips Table */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/10 border-b border-white/20">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Chuyến</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Tuyến đường</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Xe</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Khởi hành</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Đến</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Ghế</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Nhân sự</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-slate-400">Đang tải dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                      Không tìm thấy chuyến nào phù hợp
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#1c2a42] border border-white/10 text-emerald-400 font-bold text-xs">
                          #{trip.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="text-white font-medium">{trip.routeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-cyan-400" />
                          <span className="text-slate-300">{trip.busLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-slate-300 text-sm">{fmtDateTime(trip.departureTime)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 text-sm">{fmtDateTime(trip.arrivalTime)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={trip.status} isDark={true} />
                      </td>
                      <td className="px-6 py-4">
                        {trip.totalSeats != null && trip.totalSeats > 0 ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden max-w-[80px]">
                                <div
                                  className={`h-full rounded-full ${
                                    (trip.bookedSeats ?? 0) / trip.totalSeats >= 0.9
                                      ? "bg-red-400"
                                      : (trip.bookedSeats ?? 0) / trip.totalSeats >= 0.6
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                  }`}
                                  style={{ width: `${Math.min(100, ((trip.bookedSeats ?? 0) / trip.totalSeats) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-300">
                                {trip.availableSeats ?? 0}/{trip.totalSeats}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {(trip.bookedSeats ?? 0) >= trip.totalSeats
                                ? "✗ Đã đầy"
                                : `${trip.availableSeats ?? 0} ghế trống`
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Chưa có ghế</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {trip.assignments?.some((a: any) => (a.assignmentRole ?? a.role) === "DRIVER") ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-slate-300">Tài xế: {trip.assignments.find((a: any) => (a.assignmentRole ?? a.role) === "DRIVER")?.employeeName}</span>
                            </div>
                          ) : null}
                          {trip.assignments?.some((a: any) => (a.assignmentRole ?? a.role) === "ASSISTANT") ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              <span className="text-slate-300">Phụ xe: {trip.assignments.find((a: any) => (a.assignmentRole ?? a.role) === "ASSISTANT")?.employeeName}</span>
                            </div>
                          ) : null}
                          {!trip.assignments?.length && (
                            <div className="text-xs text-slate-500 italic">Chưa phân công nhân sự</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSeatsTripId(trip.id)}
                            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-xl transition-all"
                            title="Xem sơ đồ ghế & chi tiết vé"
                          >
                            <Armchair className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackFilterTripId(trip.id);
                              setInitialFeedbackId(null);
                              setShowFeedbackInbox(true);
                            }}
                            className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-xl transition-all"
                            title={`Xem phản hồi liên quan đến chuyến #${trip.id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const assignments = await getStaffByTrip(trip.id);
                                const driver = assignments.find((a: any) => a.assignmentRole === "DRIVER");
                                const assistant = assignments.find((a: any) => a.assignmentRole === "ASSISTANT");
                                setEditingTrip({
                                  ...trip,
                                  driverId: driver?.employeeId || "",
                                  assistantId: assistant?.employeeId || "",
                                });
                                setShowModal(true);
                              } catch {
                                setEditingTrip(trip);
                                setShowModal(true);
                              }
                            }}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-xl transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="border-t border-white/20 bg-white/5 p-4">
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </div>
          )}
        </div>

      {showModal && (
        <TripModal
          onClose={() => { setShowModal(false); setEditingTrip(null); }}
          onSubmit={handleSaveTrip}
          isSaving={isSaving}
          routes={routes}
          buses={buses}
          drivers={drivers}
          assistants={assistants}
          initialData={editingTrip}
        />
      )}

      {seatsTripId !== null && (
        <TripSeatsModal
          tripId={seatsTripId}
          tripLabel={(() => {
            const t = trips.find((x) => x.id === seatsTripId);
            return t ? `${t.routeName} · ${fmtDateTime(t.departureTime)} · ${t.busLabel}` : `Chuyến #${seatsTripId}`;
          })()}
          onClose={() => setSeatsTripId(null)}
          onChanged={() => {
            // Reload trips để cập nhật số ghế trống/đã đặt
            loadTrips();
            // Xóa pending notification cho trip này
            setPendingBookings((prev) => prev.filter((b) => b.tripId !== seatsTripId));
            setPendingPayments((prev) => prev.filter((p) => p.tripId !== seatsTripId));
          }}
        />
      )}

      {/* Feedback Inbox Modal */}
      {showFeedbackInbox && (
        <FeedbackInboxModal
          initialTripId={feedbackFilterTripId}
          initialFeedbackId={initialFeedbackId}
          onClose={() => {
            setShowFeedbackInbox(false);
            setFeedbackFilterTripId(null);
            setInitialFeedbackId(null);
          }}
          onChanged={() => {
            loadFeedbackStats();
          }}
        />
      )}
    </div>
  );
}

interface TripFormValues {
  useExistingRoute: boolean;
  routeId?: number;
  origin: string;
  destination: string;
  basePrice?: number;
  distanceKm?: number;
  estimatedDurationMin?: number;
  busId: number;
  departureTime: string;
  arrivalTime: string;
  status: string;
  driverId: number | "";
  assistantId: number | "";
}

function TripModal({
  onClose, onSubmit, isSaving, routes, buses, drivers, assistants, initialData,
}: {
  onClose: () => void;
  onSubmit: (form: TripFormValues) => void;
  isSaving: boolean;
  routes: AdminRoute[];
  buses: AdminBus[];
  drivers: Employee[];
  assistants: Employee[];
  initialData: any;
}) {
  const isExistingDefault = initialData ? !!initialData?.routeId : (routes.length > 0);
  const [useExistingRoute, setUseExistingRoute] = useState(isExistingDefault);

  const [form, setForm] = useState<TripFormValues>({
    useExistingRoute: isExistingDefault,
    routeId: initialData?.routeId || routes[0]?.id || undefined,
    origin: initialData?.routeName?.split(" -> ")[0] || "",
    destination: initialData?.routeName?.split(" -> ")[1] || "",
    basePrice: initialData?.basePrice || undefined,
    distanceKm: initialData?.distanceKm || undefined,
    estimatedDurationMin: initialData?.estimatedDurationMin || undefined,
    busId: initialData?.busId || buses[0]?.id || 0,
    departureTime: initialData?.departureTime?.slice(0, 16) || "",
    arrivalTime: initialData?.arrivalTime?.slice(0, 16) || "",
    status: initialData?.status || "SCHEDULED",
    driverId: initialData?.driverId || "",
    assistantId: initialData?.assistantId || "",
  });

  useEffect(() => {
    const isExist = initialData ? !!initialData?.routeId : (routes.length > 0);
    setUseExistingRoute(isExist);
    setForm({
      useExistingRoute: isExist,
      routeId: initialData?.routeId || routes[0]?.id || undefined,
      origin: initialData?.routeName?.split(" -> ")[0] || "",
      destination: initialData?.routeName?.split(" -> ")[1] || "",
      basePrice: initialData?.basePrice || undefined,
      distanceKm: initialData?.distanceKm || undefined,
      estimatedDurationMin: initialData?.estimatedDurationMin || undefined,
      busId: initialData?.busId || buses[0]?.id || 0,
      departureTime: initialData?.departureTime?.slice(0, 16) || "",
      arrivalTime: initialData?.arrivalTime?.slice(0, 16) || "",
      status: initialData?.status || "SCHEDULED",
      driverId: initialData?.driverId || "",
      assistantId: initialData?.assistantId || "",
    });
  }, [initialData, routes, buses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useExistingRoute && !form.routeId) {
      toast.error("Vui lòng chọn tuyến đường có sẵn");
      return;
    }
    if (!useExistingRoute) {
      if (!form.origin) {
        toast.error("Vui lòng chọn điểm đi");
        return;
      }
      if (!form.destination) {
        toast.error("Vui lòng chọn điểm đến");
        return;
      }
      if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
        toast.error("Điểm đi và điểm đến không được trùng nhau");
        return;
      }
    }
    if (!form.busId) {
      toast.error("Vui lòng chọn xe vận hành");
      return;
    }
    if (!form.departureTime) {
      toast.error("Vui lòng chọn giờ khởi hành");
      return;
    }
    if (!form.arrivalTime) {
      toast.error("Vui lòng chọn giờ đến dự kiến");
      return;
    }
    if (new Date(form.departureTime) >= new Date(form.arrivalTime)) {
      toast.error("Giờ đến dự kiến phải sau giờ khởi hành");
      return;
    }
    if (form.driverId && form.assistantId && form.driverId === form.assistantId) {
      toast.error("Tài xế và phụ xe không thể là cùng một người");
      return;
    }
    onSubmit({ ...form, useExistingRoute });
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#172338] rounded-2xl shadow-2xl border border-white/[0.08] flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-[#101c2d] border-b border-white/[0.08] p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                {initialData ? "Cập nhật chuyến xe" : "Tạo chuyến mới"}
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
                {initialData ? `Chỉnh sửa chuyến #${initialData.id}` : "Tạo chuyến xe mới"}
              </h2>
            </div>
            <IconButton
              variant="default"
              size="md"
              onClick={onClose}
              tooltip="Đóng"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Route Toggle */}
          <div className="flex gap-1.5 p-1 bg-[#101c2d] rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setUseExistingRoute(true);
                setForm((prev) => ({ ...prev, useExistingRoute: true }));
              }}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                useExistingRoute
                  ? "bg-[#1c2a42] text-emerald-400 font-semibold border border-white/[0.08] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              Chọn tuyến có sẵn
            </button>
            <button
              type="button"
              onClick={() => {
                setUseExistingRoute(false);
                setForm((prev) => ({ ...prev, useExistingRoute: false }));
              }}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                !useExistingRoute
                  ? "bg-[#1c2a42] text-emerald-400 font-semibold border border-white/[0.08] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              Tạo tuyến mới
            </button>
          </div>

          {/* Existing Route */}
          {useExistingRoute && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tuyến đường <span className="text-rose-400">*</span>
              </label>
              <select
                value={form.routeId || ""}
                onChange={(e) => setForm({ ...form, routeId: Number(e.target.value) || undefined })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
              >
                {routes.map((route) => (
                  <option key={route.id} value={route.id} className="bg-[#101c2d] text-slate-200">
                    {route.origin} → {route.destination}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Route */}
          {!useExistingRoute && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Điểm đi <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                    <select
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#101c2d] text-slate-200">-- Chọn điểm đi --</option>
                      {LOCATIONS.filter(l => l !== form.destination).map((l) => (
                        <option key={l} value={l} className="bg-[#101c2d] text-slate-200">{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Điểm đến <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
                    <select
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#101c2d] text-slate-200">-- Chọn điểm đến --</option>
                      {LOCATIONS.filter(l => l !== form.origin).map((l) => (
                        <option key={l} value={l} className="bg-[#101c2d] text-slate-200">{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Giá vé (VND)</label>
                  <input
                    type="number"
                    value={form.basePrice || ""}
                    onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) || undefined })}
                    placeholder="VD: 350000"
                    className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Khoảng cách (km)</label>
                  <input
                    type="number"
                    value={form.distanceKm || ""}
                    onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) || undefined })}
                    placeholder="VD: 120"
                    className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Thời gian (phút)</label>
                  <input
                    type="number"
                    value={form.estimatedDurationMin || ""}
                    onChange={(e) => setForm({ ...form, estimatedDurationMin: Number(e.target.value) || undefined })}
                    placeholder="VD: 180"
                    className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* Bus & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Xe vận hành <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                <select
                  value={form.busId || ""}
                  onChange={(e) => setForm({ ...form, busId: Number(e.target.value) })}
                  className="w-full h-10 pl-9 pr-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#101c2d] text-slate-200">-- Chọn xe --</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id} className="bg-[#101c2d] text-slate-200">
                      {bus.licensePlate} · {bus.busType} ({bus.totalSeats} ghế)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trạng thái chuyến</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
              >
                <option value="SCHEDULED" className="bg-[#101c2d] text-slate-200">Đã lên lịch (SCHEDULED)</option>
                <option value="RUNNING" className="bg-[#101c2d] text-slate-200">Đang chạy (RUNNING)</option>
                <option value="COMPLETED" className="bg-[#101c2d] text-slate-200">Hoàn thành (COMPLETED)</option>
                <option value="CANCELLED" className="bg-[#101c2d] text-slate-200">Đã hủy (CANCELLED)</option>
                <option value="DELAYED" className="bg-[#101c2d] text-slate-200">Trễ giờ (DELAYED)</option>
              </select>
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giờ khởi hành <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giờ đến dự kiến <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.arrivalTime}
                onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Staff Assignment */}
          <div className="p-4 bg-[#101c2d] rounded-xl border border-white/[0.08] space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Phân công nhân sự
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tài xế (Lái xe)</label>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value ? Number(e.target.value) : "" })}
                  className="w-full h-10 px-3 bg-[#172338] border border-white/[0.08] rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
                >
                  <option value="" className="bg-[#172338] text-slate-200">-- Bỏ trống (Phân công sau) --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#172338] text-slate-200">
                      {d.fullName} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Phụ xe (Lơ xe)</label>
                <select
                  value={form.assistantId}
                  onChange={(e) => setForm({ ...form, assistantId: e.target.value ? Number(e.target.value) : "" })}
                  className="w-full h-10 px-3 bg-[#172338] border border-white/[0.08] rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
                >
                  <option value="" className="bg-[#172338] text-slate-200">-- Bỏ trống (Phân công sau) --</option>
                  {assistants.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#172338] text-slate-200">
                      {a.fullName} ({a.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
            >
              {isSaving ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Tạo chuyến mới"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
