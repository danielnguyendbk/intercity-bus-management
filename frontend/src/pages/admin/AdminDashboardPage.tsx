// ============================================================================
// ADMIN DASHBOARD PAGE — Trang tổng quan Admin (XeKhách Pro)
// Thiết kế: Enterprise SaaS Dark • Compact • Clean • Single Primary Accent
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Bus,
  Route,
  Calendar,
  AlertTriangle,
  Shield,
  RotateCw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdminDashboard, AdminDashboardData } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import AdminRevenueStats from "./AdminRevenueStats";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  CUSTOMER: "Khách hàng",
};

const BUS_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    getAdminDashboard()
      .then((res) => {
        setData(res);
      })
      .catch((error) => {
        const backendMessage = extractApiErrorMessage(error);
        setErrorMsg(backendMessage || "Không thể tải dữ liệu dashboard");
        toast.error(backendMessage || "Không thể tải dữ liệu dashboard");
      })
      .finally(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const insuranceAlerts = useMemo(() => data?.insuranceAlerts || [], [data]);
  const totalAlerts = insuranceAlerts.length;
  const expiredCount = useMemo(
    () => insuranceAlerts.filter((alert) => alert.alertType === "EXPIRED").length,
    [insuranceAlerts]
  );
  const expiringCount = useMemo(
    () => insuranceAlerts.filter((alert) => alert.alertType === "EXPIRING_SOON").length,
    [insuranceAlerts]
  );

  const availableBusesCount = useMemo(() => {
    if (!data) return 0;
    return data.busStatusDistribution.find((b) => b.status === "AVAILABLE")?.count ?? 0;
  }, [data]);

  const customerCount = useMemo(() => {
    if (!data) return 0;
    return data.roleDistribution.find((r) => r.role === "CUSTOMER")?.count ?? 0;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-white/[0.08] bg-[#172238]">
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Không thể tải dữ liệu Dashboard</h2>
        <p className="text-xs text-slate-400 max-w-md mb-5">
          {errorMsg || "Vui lòng kiểm tra lại quyền truy cập hoặc kết nối máy chủ."}
        </p>
        <button
          type="button"
          onClick={() => fetchData()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ==================== 1. HEADER ==================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Hệ thống điều hành và giám sát vận tải hành khách liên tỉnh XeKhách Pro
          </p>
        </div>

        {/* Right Status Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {totalAlerts > 0 && (
            <a
              href="#insurance-alerts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{totalAlerts} xe cần kiểm tra bảo hiểm</span>
            </a>
          )}

          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111c2e] px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vận hành ổn định</span>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center rounded-lg border border-white/[0.08] bg-[#111c2e] p-2 text-slate-400 hover:text-white hover:border-white/[0.14] transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ==================== 2. KPI GRID (4 cards ngang, h: 104-112px) ==================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Tổng người dùng */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <span className="text-xs font-medium text-slate-400">Tổng người dùng</span>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {data.totalUsers}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {customerCount} tài khoản khách hàng
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Tổng xe */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <span className="text-xs font-medium text-slate-400">Tổng đội xe</span>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {data.totalBuses}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-400">
              {availableBusesCount} xe đang sẵn sàng
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Bus className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Tổng tuyến */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <span className="text-xs font-medium text-slate-400">Tuyến đường</span>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {data.totalRoutes}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Tuyến liên tỉnh đang mở bán
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Route className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Chuyến hôm nay */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors">
          <div>
            <span className="text-xs font-medium text-slate-400">Chuyến hôm nay</span>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {data.todayTrips}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Khởi hành trong ngày
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ==================== 3. 2-COLUMN SECTION (62% LEFT / 38% RIGHT) ==================== */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* LEFT: 62% (lg:col-span-7 or 8) — Revenue overview chart */}
        <div className="lg:col-span-7 xl:col-span-8">
          <AdminRevenueStats variant="dashboard" />
        </div>

        {/* RIGHT: 38% (lg:col-span-5 or 4) — Fleet status & Role distribution */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Card: Trạng thái đội xe */}
          <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Trạng thái đội xe</h3>
              <span className="text-xs text-slate-400">{data.totalBuses} xe</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {data.busStatusDistribution.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có dữ liệu đội xe</p>
              ) : (
                data.busStatusDistribution.map((item) => {
                  const pct = data.totalBuses > 0 ? Math.round((item.count / data.totalBuses) * 100) : 0;
                  const label = BUS_STATUS_LABELS[item.status] ?? item.status;
                  const barColor =
                    item.status === "AVAILABLE"
                      ? "bg-emerald-400"
                      : item.status === "RUNNING"
                      ? "bg-blue-400"
                      : "bg-amber-400";
                  return (
                    <div key={item.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{label}</span>
                        <span className="text-slate-400">
                          <strong className="text-white">{item.count}</strong> xe ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Khả năng phục vụ:</span>
              <span className="font-semibold text-emerald-400">
                {data.totalBuses > 0
                  ? Math.round((availableBusesCount / data.totalBuses) * 100)
                  : 0}
                % sẵn sàng
              </span>
            </div>
          </div>

          {/* Card: Phân bổ tài khoản */}
          <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Phân bổ tài khoản</h3>
              <span className="text-xs text-slate-400">{data.totalUsers} người dùng</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {data.roleDistribution.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có dữ liệu tài khoản</p>
              ) : (
                data.roleDistribution.map((item) => {
                  const pct = data.totalUsers > 0 ? Math.round((item.count / data.totalUsers) * 100) : 0;
                  const label = ROLE_LABELS[item.role] ?? item.role;
                  const barColor = item.role === "ADMIN" ? "bg-indigo-400" : "bg-emerald-400";
                  return (
                    <div key={item.role} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{label}</span>
                        <span className="text-slate-400">
                          <strong className="text-white">{item.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <span>Quản lý người dùng</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 4. BOTTOM SECTION: CẢNH BÁO BẢO HIỂM XE ==================== */}
      <section
        id="insurance-alerts"
        className="rounded-xl border border-white/[0.08] bg-[#172238] overflow-hidden"
      >
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Cảnh báo bảo hiểm xe</h2>
              <p className="text-xs text-slate-400">
                Kiểm soát an toàn và tính pháp lý của phương tiện trước khi xếp chuyến
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalAlerts === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                100% xe an toàn
              </span>
            ) : (
              <>
                {expiredCount > 0 && (
                  <span className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-400">
                    {expiredCount} xe hết hạn
                  </span>
                )}
                {expiringCount > 0 && (
                  <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    {expiringCount} xe sắp hết hạn
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {insuranceAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-white">Tất cả xe đều có bảo hiểm hợp lệ</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Không có xe nào hết hạn hoặc cần gia hạn gấp.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111c2e]/70 text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3 font-medium">Biển số</th>
                  <th className="px-5 py-3 font-medium">Loại xe</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium">Ngày hết hạn</th>
                  <th className="px-5 py-3 font-medium">Mức độ cảnh báo</th>
                  <th className="px-5 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {insuranceAlerts.map((alert) => {
                  const expiry =
                    alert.expiryDate ||
                    (alert as unknown as { insuranceExpiry?: string }).insuranceExpiry;
                  const isExpired = alert.alertType === "EXPIRED";
                  return (
                    <tr
                      key={alert.busId}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-white">
                        {alert.licensePlate}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {alert.busType}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 text-[11px] text-slate-300">
                          {BUS_STATUS_LABELS[alert.status] ?? alert.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">
                        {expiry ? new Date(expiry).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                            Đã hết hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                            Sắp hết hạn
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to="/admin/buses"
                          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Chi tiết xe →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
