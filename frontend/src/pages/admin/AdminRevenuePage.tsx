// ============================================================================
// ADMIN REVENUE PAGE — Thống kê doanh thu (Admin)
// ============================================================================

import AdminRevenueStats from "./AdminRevenueStats";

export default function AdminRevenuePage() {
  return (
    <div className="space-y-6">
      <AdminRevenueStats variant="full" />
    </div>
  );
}
