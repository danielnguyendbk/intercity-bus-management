// ============================================================================
// MAIN LAYOUT (AppShell) — Khung điều hướng & layout chuẩn production
// - Sidebar thống nhất Navy (#0f2849) + Amber (#f59e0b)
// - Hỗ trợ đầy đủ roles: ADMIN, DISPATCHER, CUSTOMER
// - Responsive: Desktop (Full/Compact/Collapsible), Tablet/Mobile (Drawer)
// - Lucide icons chuẩn hóa (stroke 1.75, size 20), tuyệt đối không dùng emoji
// ============================================================================

import React, { useState, useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Users,
  UserRound,
  Bus,
  MapPin,
  Ticket,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { ROLE_LABELS } from "../../utils/constants";
import { UserRole } from "../../types";

// Page Components (Route-level Code Splitting)
const AdminDashboardPage = React.lazy(() => import("../../pages/admin/AdminDashboardPage"));
const AdminUsersPage = React.lazy(() => import("../../pages/admin/AdminUsersPage"));
const AdminBusesPage = React.lazy(() => import("../../pages/admin/AdminBusesPage"));
const AdminTripsPage = React.lazy(() => import("../../pages/admin/AdminTripsPage"));
const AdminTicketsPage = React.lazy(() => import("../../pages/admin/AdminTicketsPage"));
const AdminAssignmentsPage = React.lazy(() => import("../../pages/admin/AdminAssignmentsPage"));
const AdminRevenuePage = React.lazy(() => import("../../pages/admin/AdminRevenuePage"));

const DispatcherDashboardPage = React.lazy(() => import("../../pages/dispatcher/DispatcherDashboardPage"));

const CustomerBookingPage = React.lazy(() => import("../../pages/customer/CustomerBookingPage"));
const CustomerTicketsPage = React.lazy(() => import("../../pages/customer/CustomerTicketsPage"));
const CustomerProfilePage = React.lazy(() => import("../../pages/customer/CustomerProfilePage"));

interface MenuItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_CONFIG: Record<UserRole, MenuItem[]> = {
  ADMIN: [
    { label: "Tổng quan", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Doanh thu", to: "/admin/revenue", icon: Receipt },
    { label: "Quản lý tài khoản", to: "/admin/users", icon: Users },
    { label: "Phân công nhân sự", to: "/admin/assignments", icon: UserRound },
    { label: "Quản lý đoàn xe", to: "/admin/buses", icon: Bus },
    { label: "Chuyến & tuyến xe", to: "/admin/trips", icon: MapPin },
    { label: "Quản lý vé", to: "/admin/tickets", icon: Ticket },
  ],
  DISPATCHER: [
    { label: "Điều phối & Phân công", to: "/dispatcher/dashboard", icon: ClipboardList },
    { label: "Lịch trình chuyến", to: "/dispatcher/trips", icon: MapPin },
  ],
  CUSTOMER: [
    { label: "Đặt vé", to: "/customer/booking", icon: Ticket },
    { label: "Vé của tôi", to: "/customer/tickets", icon: ClipboardList },
    { label: "Hồ sơ cá nhân", to: "/customer/profile", icon: UserRound },
  ],
};

const DEFAULT_PATHS: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  DISPATCHER: "/dispatcher/dashboard",
  CUSTOMER: "/customer/booking",
};

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const role: UserRole = (user?.role ?? "CUSTOMER") as UserRole;
  const items = MENU_CONFIG[role] ?? MENU_CONFIG.CUSTOMER;
  const isCustomer = role === "CUSTOMER";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className={`min-h-screen flex ${isCustomer ? "customer-layout bg-slate-50 text-slate-900" : "admin-theme bg-[#0b1329] text-slate-100"}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0f2849] border-r border-[#1a3a6b]/50 text-white transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md">
              <Bus className="h-5 w-5 text-slate-950" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="text-base font-bold tracking-tight text-white">XeKhách Pro</span>
                <span className="block text-[11px] font-medium text-amber-300/90 tracking-wide uppercase">
                  {role === "ADMIN" ? "Quản trị hệ thống" : role === "DISPATCHER" ? "Cổng điều phối" : "Vận tải hành khách"}
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu điều hướng
            </div>
          )}

          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-white/10 text-white font-semibold shadow-sm border-l-4 border-amber-400"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`
                }
              >
                <Icon className="h-5 w-5 shrink-0 text-amber-400/90 transition-transform group-hover:scale-105" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Collapse Action */}
        <div className="border-t border-white/10 p-3 bg-black/15">
          {/* User profile row */}
          <div className={`flex items-center gap-3 p-2 rounded-lg ${isCollapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-slate-950 text-sm shadow">
              {user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white leading-tight">
                  {user?.fullName || user?.username || "Người dùng"}
                </p>
                <p className="truncate text-[11px] text-amber-300">
                  {ROLE_LABELS[role] || role}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition-colors ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Đăng xuất</span>}
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
              aria-label={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        }`}
      >
        {/* Top Header */}
        <header
          className={`sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-6 border-b backdrop-blur-md transition-colors ${
            isCustomer
              ? "bg-white/90 border-slate-200 text-slate-900"
              : "bg-[#0b1329]/90 border-white/10 text-white"
          }`}
        >
          {/* Left: Mobile hamburger & breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold tracking-tight">
                {isCustomer ? "Cổng thông tin vé xe" : role === "DISPATCHER" ? "Phân hệ Điều phối viên" : "Quản trị hệ thống"}
              </span>
            </div>
          </div>

          {/* Right: Date & Status indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                isCustomer
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0f2849] text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-400/40">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Body Pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <React.Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang tải phân hệ...</p>
                </div>
              </div>
            }
          >
            <Routes>
              {/* ADMIN ROUTES */}
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/revenue" element={<AdminRevenuePage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
              <Route path="/admin/buses" element={<AdminBusesPage />} />
              <Route path="/admin/trips" element={<AdminTripsPage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/routes" element={<Navigate to="/admin/trips" replace />} />

              {/* DISPATCHER ROUTES */}
              <Route path="/dispatcher/dashboard" element={<DispatcherDashboardPage />} />
              <Route path="/dispatcher/trips" element={<AdminTripsPage />} />

              {/* CUSTOMER ROUTES */}
              <Route path="/customer/booking" element={<CustomerBookingPage />} />
              <Route path="/customer/tickets" element={<CustomerTicketsPage />} />
              <Route path="/customer/profile" element={<CustomerProfilePage />} />

              {/* DEFAULT FALLBACK ROUTE */}
              <Route path="*" element={<NavigateToDefault role={role} />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}

function NavigateToDefault({ role }: { role: UserRole }) {
  const defaultPath = DEFAULT_PATHS[role] ?? "/customer/booking";
  return <Navigate to={defaultPath} replace />;
}
