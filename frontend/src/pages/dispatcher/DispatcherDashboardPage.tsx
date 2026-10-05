// ============================================================================
// DISPATCHER DASHBOARD PAGE — Cổng điều phối & phân công chuyến xe
// Phân hệ dành riêng cho vai trò DISPATCHER
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ClipboardList, Bus, Users, Clock, AlertTriangle, CheckCircle2, ArrowRight, UserCheck } from "lucide-react";
import { useDispatcherStore } from "../../stores/dispatcherStore";
import StatusBadge from "../../components/ui/StatusBadge";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";

export default function DispatcherDashboardPage() {
  const trips = useDispatcherStore((state) => state.trips);
  const employees = useDispatcherStore((state) => state.employees);
  const loadTrips = useDispatcherStore((state) => state.loadTrips);
  const loadAvailableEmployees = useDispatcherStore(
    (state) => state.loadAvailableEmployees,
  );
  const getTripAssignments = useDispatcherStore(
    (state) => state.getTripAssignments,
  );
  const isEmployeeAvailable = useDispatcherStore(
    (state) => state.isEmployeeAvailable,
  );
  const assignTrip = useDispatcherStore((state) => state.assignTrip);
  const isLoading = useDispatcherStore((state) => state.isLoading);
  const isAssigning = useDispatcherStore((state) => state.isAssigning);

  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [role, setRole] = useState<"DRIVER" | "ASSISTANT">("DRIVER");

  useEffect(() => {
    loadTrips().catch(() => {
      toast.error("Không thể tải danh sách chuyến từ hệ thống.");
    });
  }, [loadTrips]);

  useEffect(() => {
    if (trips.length > 0 && selectedTrip === null) {
      setSelectedTrip(trips[0].id);
    }
  }, [trips, selectedTrip]);

  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTrip) ?? null,
    [selectedTrip, trips],
  );

  useEffect(() => {
    if (!currentTrip) {
      return;
    }

    loadAvailableEmployees(
      currentTrip.departureTime,
      currentTrip.arrivalTime,
      role,
    )
      .then(() => {
        setEmployeeId((prev) => {
          if (prev && isEmployeeAvailable(prev)) {
            return prev;
          }
          return useDispatcherStore.getState().employees[0]?.id ?? null;
        });
      })
      .catch(() => {
        toast.error("Không thể tải danh sách nhân sự khả dụng.");
      });
  }, [currentTrip, role, loadAvailableEmployees, isEmployeeAvailable]);

  const tripAssignments = currentTrip ? getTripAssignments(currentTrip.id) : [];
  const employeeAvailable = currentTrip
    ? employeeId !== null && isEmployeeAvailable(employeeId)
    : true;

  const roleOptions = employees.filter(
    (employee) => employee.employeeType === role,
  );

  const handleAssign = async () => {
    if (!currentTrip) {
      toast.error("Vui lòng chọn chuyến trước khi phân công.");
      return;
    }
    if (!employeeId) {
      toast.error("Vui lòng chọn nhân sự.");
      return;
    }
    if (!employeeAvailable) {
      toast.error(
        "Nhân sự này đang có chuyến xung đột thời gian. Chọn người khác hoặc chuyến khác.",
      );
      return;
    }

    try {
      await assignTrip(currentTrip.id, employeeId, role);
      toast.success("Đã phân công nhân sự cho chuyến.");
      await loadAvailableEmployees(
        currentTrip.departureTime,
        currentTrip.arrivalTime,
        role,
      );
    } catch (error) {
      const status = extractApiStatus(error);
      const backendMessage = extractApiErrorMessage(error);
      if (status === 409) {
        toast.error("Xung đột thời gian: Nhân sự đã được phân công cho chuyến khác.");
        return;
      }
      toast.error(backendMessage || "Không thể thực hiện phân công.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and KPI cards */}
      <section className="rounded-xl border border-white/10 bg-[#15264f] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Bảng điều phối vận tải
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Điều phối chuyến & Phân công nhân sự
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Kiểm tra xung đột lịch trình, phân công tài xế và phụ xe cho từng chuyến xe.
            </p>
          </div>

          {/* Quick KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3 text-center min-w-[100px]">
              <p className="text-[11px] font-semibold text-slate-400">Tổng chuyến</p>
              <p className="mt-1 text-2xl font-extrabold text-white">
                {isLoading ? "..." : trips.length}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3 text-center min-w-[100px]">
              <p className="text-[11px] font-semibold text-blue-400">Đã lên lịch</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-300">
                {trips.filter((t) => t.status === "SCHEDULED").length}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3 text-center min-w-[100px]">
              <p className="text-[11px] font-semibold text-amber-400">Trễ chuyến</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-300">
                {trips.filter((t) => t.status === "DELAYED").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trips table */}
      <section className="rounded-xl border border-white/10 bg-[#15264f] p-5 shadow-sm">
        <h2 className="text-base font-bold text-white mb-3">
          Danh sách chuyến xe đang điều hành
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold uppercase text-slate-400 bg-white/5">
                <th className="py-2.5 px-3">Mã</th>
                <th className="py-2.5 px-3">Tuyến đường</th>
                <th className="py-2.5 px-3">Xe</th>
                <th className="py-2.5 px-3">Khởi hành</th>
                <th className="py-2.5 px-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trips.map((trip) => {
                const isSelected = selectedTrip === trip.id;
                return (
                  <tr
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-white/15" : "hover:bg-white/5"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      #{trip.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {trip.routeName || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {trip.busLabel || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs">
                      {format(new Date(trip.departureTime), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={trip.status} isDark={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Details & Assignment columns */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Trip Details (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#15264f] p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
            Chi tiết chuyến đang chọn
          </h2>

          {!currentTrip ? (
            <p className="text-xs text-slate-400 italic">Vui lòng chọn chuyến xe ở bảng trên.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3">
                  <span className="text-slate-400 block mb-0.5">Tuyến:</span>
                  <span className="font-bold text-white text-sm">{currentTrip.routeName}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3">
                  <span className="text-slate-400 block mb-0.5">Xe:</span>
                  <span className="font-bold text-white text-sm">{currentTrip.busLabel}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3">
                  <span className="text-slate-400 block mb-0.5">Khởi hành:</span>
                  <span className="font-medium text-slate-200">
                    {format(new Date(currentTrip.departureTime), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0b1329] p-3">
                  <span className="text-slate-400 block mb-0.5">Dự kiến đến:</span>
                  <span className="font-medium text-slate-200">
                    {format(new Date(currentTrip.arrivalTime), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              </div>

              {/* Assignments list */}
              <div className="rounded-lg border border-white/10 bg-[#0b1329] p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Nhân sự đã phân công
                </div>
                {tripAssignments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có nhân sự được phân công cho chuyến này.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {tripAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">
                          {assignment.role === "DRIVER" ? "Tài xế lái chính:" : "Phụ xe hỗ trợ:"}
                        </span>
                        <span className="font-bold text-white">{assignment.employeeName ?? "Chưa gán"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assignment Action (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#15264f] p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
            Phân công nhân sự
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Vai trò phân công
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "DRIVER" | "ASSISTANT")}
                className="w-full rounded-lg border border-white/20 bg-[#0b1329] px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="DRIVER">Tài xế lái chính</option>
                <option value="ASSISTANT">Phụ xe / Tiếp viên</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Chọn nhân sự khả dụng
              </label>
              <select
                value={employeeId ?? ""}
                onChange={(e) => setEmployeeId(Number(e.target.value))}
                className="w-full rounded-lg border border-white/20 bg-[#0b1329] px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                {roleOptions.length === 0 && <option value="">Không có nhân sự khả dụng</option>}
                {roleOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Conflict Warning */}
            {currentTrip && !employeeAvailable && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/20 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Nhân sự này đang có lịch chạy trùng thời gian với chuyến đã chọn.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAssign}
              disabled={!currentTrip || !employeeAvailable || isAssigning}
              className="w-full rounded-lg bg-[#0f2849] hover:bg-[#1a3a6b] border border-amber-400/40 py-2.5 px-4 text-sm font-bold text-amber-300 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? "Đang phân công..." : "Lưu phân công nhân sự"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
