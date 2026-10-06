// ============================================================================
// ADMIN REVENUE STATS — Biểu đồ & Thống kê doanh thu (Enterprise Dark)
// Thư viện recharts: AreaChart / BarChart
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Ban,
  Bus,
  UserCog,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminRevenueStats as AdminRevenueStatsType,
  getAdminRevenueStats,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import { formatMoney, formatPriceNumber } from "../../utils/format";

export type PeriodKey = "daily" | "weekly" | "monthly" | "yearly";

export const PERIODS: Array<{
  key: PeriodKey;
  label: string;
  shortLabel: string;
  scopeLabel: string;
}> = [
  { key: "daily", label: "7 ngày qua", shortLabel: "7 ngày", scopeLabel: "7 ngày gần nhất" },
  { key: "weekly", label: "12 tuần qua", shortLabel: "12 tuần", scopeLabel: "12 tuần gần nhất" },
  { key: "monthly", label: "12 tháng qua", shortLabel: "12 tháng", scopeLabel: "12 tháng gần nhất" },
  { key: "yearly", label: "5 năm qua", shortLabel: "5 năm", scopeLabel: "5 năm gần nhất" },
];

const formatVND = (value: number | string): string => {
  return formatMoney(value, true, "₫");
};

const formatVNDShort = (value: number | string): string => {
  return formatPriceNumber(value);
};

interface ChartPoint {
  label: string;
  doanhThu: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: string;
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1220]/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-emerald-400">
        {formatVND(val)}
      </p>
    </div>
  );
}

interface AdminRevenueStatsProps {
  variant?: "full" | "dashboard";
}

export default function AdminRevenueStats({ variant = "full" }: AdminRevenueStatsProps) {
  const [data, setData] = useState<AdminRevenueStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("weekly");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getAdminRevenueStats()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(extractApiErrorMessage(err) || "Không thể tải thống kê doanh thu");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data) return [];
    const parse = (arr?: Array<{ label: string; amount: number | string }>) =>
      (arr || []).map((p) => ({
        label: p.label,
        doanhThu: typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount)) || 0,
      }));
    switch (period) {
      case "daily":
        return parse(data.dailyRevenue);
      case "weekly":
        return parse(data.weeklyRevenue);
      case "monthly":
        return parse(data.monthlyRevenue);
      case "yearly":
        return parse(data.yearlyRevenue);
      default:
        return [];
    }
  }, [data, period]);

  const currentPeriodTotal = useMemo(() => {
    return chartData.reduce((sum, p) => sum + p.doanhThu, 0);
  }, [chartData]);

  const maxRevenue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map((p) => p.doanhThu));
  }, [chartData]);

  const avgRevenue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(currentPeriodTotal / chartData.length);
  }, [chartData, currentPeriodTotal]);

  const activePeriodObj = useMemo(() => {
    return PERIODS.find((p) => p.key === period) || PERIODS[1];
  }, [period]);

  if (isLoading) {
    return (
      <section className="admin-panel flex flex-col items-center justify-center p-10">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
        <p className="mt-2.5 text-xs text-slate-400">Đang tải dữ liệu doanh thu...</p>
      </section>
    );
  }

  if (!data) return null;

  // Segmented control component
  const periodSegmentedControl = (
    <div
      role="group"
      aria-label="Chọn khoảng thời gian"
      className="inline-flex h-9 items-center rounded-lg bg-[#111c2e] p-1 border border-white/[0.08]"
    >
      {PERIODS.map((p) => {
        const isActive = period === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-none"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            {p.shortLabel}
          </button>
        );
      })}
    </div>
  );

  // ==========================================================================
  // DASHBOARD COMPACT VARIANT (Embedded into Dashboard 60-65% Column)
  // ==========================================================================
  if (variant === "dashboard") {
    return (
      <div className="admin-panel p-5 bg-[#172238] rounded-xl border border-white/[0.08] flex flex-col justify-between h-full">
        {/* Card Header */}
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Tổng quan doanh thu</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Vé đã chốt & thanh toán • Kỳ: {activePeriodObj.scopeLabel}
              </p>
            </div>
            {periodSegmentedControl}
          </div>

          {/* Subheader Metric */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Doanh thu kỳ này
              </span>
              <p className="text-xl font-bold text-emerald-400">
                {formatVND(currentPeriodTotal)}
              </p>
            </div>
            <Link
              to="/admin/revenue"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <span>Xem báo cáo chi tiết</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Compact Chart */}
          <div className="mt-2 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatVNDShort(v)}
                  width={60}
                />
                <Tooltip
                  content={<RevenueTooltip />}
                  cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="doanhThu"
                  name="Doanh thu"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#dashRevenueGradient)"
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#0b1220" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inline Summary Row Footer */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Cao nhất:</span>
            <span className="font-semibold text-slate-200">{formatVND(maxRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Trung bình / kỳ:</span>
            <span className="font-semibold text-slate-200">{formatVND(avgRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Số kỳ:</span>
            <span className="font-semibold text-slate-200">{chartData.length}</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // FULL PAGE VARIANT (/admin/revenue)
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Page Header with Segmented Control */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Thống kê doanh thu
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Phân tích doanh thu từ các vé đã xác nhận hoặc thanh toán.
          </p>
        </div>
        <div>
          {periodSegmentedControl}
        </div>
      </div>

      {/* 4 KPI Cards (Compact, height ~96-104px, unified surface) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Tổng doanh thu toàn thời gian */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng doanh thu</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/[0.06] text-slate-300">
              Toàn thời gian
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">
            {formatVND(data.totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Từ {data.confirmedTicketCount.toLocaleString("vi-VN")} vé hoàn tất
          </p>
        </div>

        {/* KPI 2: Doanh thu kỳ chọn */}
        <div className="rounded-xl border border-emerald-500/20 bg-[#172238] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Doanh thu kỳ này</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {activePeriodObj.shortLabel}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">
            {formatVND(currentPeriodTotal)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {chartData.length} điểm dữ liệu trong kỳ
          </p>
        </div>

        {/* KPI 3: Vé đã xác nhận */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Đã xác nhận</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">
            {data.confirmedTicketCount.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400/90">
            Vé tính vào doanh thu
          </p>
        </div>

        {/* KPI 4: Chờ xác nhận & Đã hủy */}
        <div className="rounded-xl border border-white/[0.08] bg-[#172238] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Chờ duyệt / Hủy</span>
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <Ban className="h-3.5 w-3.5 text-rose-400" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">
            {data.pendingTicketCount} <span className="text-sm font-normal text-slate-500">/</span> {data.cancelledTicketCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {data.pendingTicketCount} chờ duyệt • {data.cancelledTicketCount} đã hủy
          </p>
        </div>
      </div>

      {/* Main Revenue Chart (Constrained height: 320-340px) */}
      <div className="admin-panel p-5 bg-[#172238] rounded-xl border border-white/[0.08]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Biểu đồ biến động doanh thu</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Theo dõi chu kỳ theo {activePeriodObj.label.toLowerCase()}
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Tổng kỳ: <span className="font-semibold text-emerald-400">{formatVND(currentPeriodTotal)}</span>
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="fullRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatVNDShort(v)}
                width={68}
              />
              <Tooltip
                content={<RevenueTooltip />}
                cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="doanhThu"
                name="Doanh thu"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#fullRevenueGradient)"
                activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#0b1220" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inline summary row at chart footer (No heavy cards) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Cao nhất:</span>
            <span className="font-semibold text-emerald-400">{formatVND(maxRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Trung bình / kỳ:</span>
            <span className="font-semibold text-slate-200">{formatVND(avgRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Số kỳ phân tích:</span>
            <span className="font-semibold text-slate-200">{chartData.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Trạng thái:</span>
            <span className="font-semibold text-emerald-400">Số liệu chuẩn hóa</span>
          </div>
        </div>
      </div>

      {/* Top Performers (2-Column Grid) */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top Buses */}
        <div className="admin-panel p-5 bg-[#172238] rounded-xl border border-white/[0.08]">
          <div className="mb-4 flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Top 5 xe doanh thu cao nhất</h3>
            </div>
            <span className="text-[11px] text-slate-400">Xếp hạng theo tổng thu</span>
          </div>

          {data.topBuses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu xe</div>
          ) : (
            <div className="space-y-2">
              {data.topBuses.slice(0, 5).map((bus, idx) => (
                <div
                  key={bus.busId}
                  className="flex items-center justify-between rounded-lg bg-[#111c2e]/60 px-3.5 py-2.5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{bus.licensePlate}</span>
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-400">
                          {bus.busType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {bus.tripCount} chuyến • {bus.ticketCount} vé
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">{formatVND(bus.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Drivers */}
        <div className="admin-panel p-5 bg-[#172238] rounded-xl border border-white/[0.08]">
          <div className="mb-4 flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Top 5 tài xế doanh thu cao nhất</h3>
            </div>
            <span className="text-[11px] text-slate-400">Theo chuyến phân công</span>
          </div>

          {data.topDrivers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu tài xế</div>
          ) : (
            <div className="space-y-2">
              {data.topDrivers.slice(0, 5).map((driver, idx) => (
                <div
                  key={driver.employeeId}
                  className="flex items-center justify-between rounded-lg bg-[#111c2e]/60 px-3.5 py-2.5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">{driver.fullName}</p>
                      <p className="text-[11px] text-slate-400">
                        {driver.tripCount} chuyến • {driver.ticketCount} vé
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">{formatVND(driver.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Yearly Revenue Comparison (Clean BarChart, compact height ~240px) */}
      <div className="admin-panel p-5 bg-[#172238] rounded-xl border border-white/[0.08]">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white">So sánh doanh thu theo năm</h3>
          <p className="text-xs text-slate-400">5 năm gần nhất</p>
        </div>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(data.yearlyRevenue || []).map((p) => ({
                ...p,
                amount: typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount)) || 0,
              }))}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatVNDShort(v)}
                width={65}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Bar dataKey="amount" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
