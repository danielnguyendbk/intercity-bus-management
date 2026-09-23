import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile } from "../../api/customer";
import { useAuthStore } from "../../stores/authStore";

export default function CustomerProfilePage() {
  const { setUser, user } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setFullName(profile.fullName ?? "");
        setPhone(profile.phone ?? user?.phone ?? "");
      })
      .catch(() => toast.error("Không tải được hồ sơ"))
      .finally(() => setLoading(false));
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

  if (loading)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
        Đang tải...
      </div>
    );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm max-w-md">
      <h1 className="text-base font-semibold text-slate-900 mb-5">
        Hồ sơ cá nhân
      </h1>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Tên đăng nhập
          <input
            value={user?.username ?? ""}
            disabled
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            value={user?.email ?? ""}
            disabled
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Họ và tên
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Số điện thoại mặc định
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhập số điện thoại"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
          />
          <span className="text-xs text-slate-400 mt-0.5 block">
            Sẽ được điền sẵn khi đặt vé lần sau.
          </span>
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[#0F2849] py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
