// ============================================================================
// CUSTOMER PROFILE PAGE — Trang hồ sơ cá nhân
// Chuẩn hóa Navy (#0f2849) + Slate palette, hỗ trợ sửa thông tin & xem lịch sử
// ============================================================================

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { User, Phone, Mail, UserCheck, Clock, CheckCircle2 } from "lucide-react";
import { getProfile, updateProfile, getMyTickets, TicketRecord } from "../../api/customer";
import { useAuthStore } from "../../stores/authStore";
import { formatPrice } from "../../utils/format";

const fmtDateTime = (dt: string) =>
  new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtPrice = (p: number | string | null | undefined) => formatPrice(p);

export default function CustomerProfilePage() {
  const { setUser, user } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tripHistory, setTripHistory] = useState<TicketRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setFullName(profile.fullName ?? "");
        setPhone(profile.phone ?? user?.phone ?? "");
      })
      .catch(() => toast.error("Không tải được hồ sơ"))
      .finally(() => setLoading(false));

    getMyTickets()
      .then((tickets) => {
        const confirmedTickets = tickets.filter((t) => t.status === "CONFIRMED" || t.status === "PAID");
        setTripHistory(confirmedTickets);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [user?.phone]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Họ tên không được để trống");
      return;
    }
    if (!phone.trim()) {
      toast.error("Số điện thoại không được để trống");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (user) {
        setUser({
          ...user,
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
      }
      toast.success("Cập nhật hồ sơ thành công");
    } catch {
      toast.error("Cập nhật thất bại, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ===== HỒ SƠ CÁ NHÂN ===== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2849] text-amber-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Hồ sơ cá nhân</h1>
            <p className="text-xs text-slate-500">Quản lý thông tin tài khoản và thông tin liên hệ khi đặt vé</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đăng nhập
            </label>
            <div className="relative">
              <input
                value={user?.username ?? ""}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <input
                value={user?.email ?? ""}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Họ và tên
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên đầy đủ"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f2849] focus:ring-2 focus:ring-[#0f2849]/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Số điện thoại mặc định
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f2849] focus:ring-2 focus:ring-[#0f2849]/10"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Sẽ được tự động điền sẵn cho các lần đặt vé tiếp theo.
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#0f2849] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a3a6b] disabled:opacity-60 transition-colors"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* ===== LỊCH SỬ CHUYẾN ĐI ===== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lịch sử chuyến đi</h2>
            <p className="text-xs text-slate-500">Các chuyến xe bạn đã đặt và được xác nhận thành công</p>
          </div>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-sm text-slate-500">Đang tải lịch sử chuyến đi...</div>
        ) : tripHistory.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Bạn chưa có chuyến đi nào hoàn thành.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Mã vé</th>
                  <th className="py-3 px-4">Tuyến đường</th>
                  <th className="py-3 px-4">Khởi hành</th>
                  <th className="py-3 px-4">Ghế</th>
                  <th className="py-3 px-4">Giá vé</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tripHistory.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {ticket.ticketCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {ticket.origin} → {ticket.destination}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {fmtDateTime(ticket.departureTime)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0f2849]">
                      {ticket.seatNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {fmtPrice(ticket.price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Đã xác nhận
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
