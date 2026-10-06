// ============================================================================
// ADMIN BUSES PAGE — Quản lý xe (Admin)
// Hỗ trợ cấu hình số lượng ghế động (18, 20, 22, 24, 28, 32... ghế)
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Pencil, X, Bus as BusIcon, Info, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  getBuses,
  createBus,
  updateBus,
  updateBusStatus,
  AdminBus,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import Pagination from "../../components/ui/Pagination";
import PageHeader from "../../components/ui/PageHeader";
import Button, { IconButton } from "../../components/ui/Button";
import { Toolbar, SearchInput, SelectInput } from "../../components/ui/Toolbar";

const BUS_TYPE_OPTIONS = [
  { value: "LIMOUSINE", label: "Limousine VIP (2 ghế / hàng)" },
  { value: "SLEEPER", label: "Giường nằm (Sleeper)" },
  { value: "SEAT", label: "Ghế ngồi tiêu chuẩn (Seat)" },
];

const COMMON_SEAT_PRESETS = [18, 20, 22, 24, 28, 32];

const BUS_SEAT_SUGGESTIONS: Record<string, number> = {
  LIMOUSINE: 24,
  SLEEPER: 28,
  SEAT: 24,
};

const BUS_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "AVAILABLE", label: "Sẵn sàng" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "MAINTENANCE", label: "Bảo trì" },
];

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

const BUS_TYPE_LABELS: Record<string, string> = {
  SLEEPER: "Giường nằm",
  SEAT: "Ghế ngồi",
  LIMOUSINE: "Limousine",
};

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<AdminBus | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadBuses = useCallback(() => {
    setIsLoading(true);

    getBuses({
      keyword: keyword || undefined,
      status: filterStatus || undefined,
    })
      .then((data) => {
        setBuses(data);
        setCurrentPage(1);
      })
      .catch(() => toast.error("Không thể tải danh sách xe"))
      .finally(() => setIsLoading(false));
  }, [keyword, filterStatus]);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const totalPages = Math.ceil(buses.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedBuses = buses.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const handleCreate = async (form: CreateForm) => {
    setIsSaving(true);

    try {
      await createBus({
        licensePlate: form.licensePlate,
        busType: form.busType,
        totalSeats: form.totalSeats,
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
      });

      toast.success("Thêm xe mới và khởi tạo sơ đồ ghế thành công");
      setShowCreateModal(false);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (form: EditForm) => {
    if (!selectedBus) return;

    setIsSaving(true);

    try {
      await updateBus(selectedBus.id, {
        busType: form.busType,
        totalSeats: form.totalSeats,
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
      });

      toast.success("Cập nhật cấu hình xe và đồng bộ sơ đồ ghế thành công");
      setShowEditModal(false);
      setSelectedBus(null);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (bus: AdminBus, newStatus: string) => {
    try {
      await updateBusStatus(bus.id, newStatus);
      toast.success(`Đã cập nhật trạng thái xe thành "${STATUS_LABELS[newStatus] ?? newStatus}"`);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="FLEET MANAGEMENT"
        title="Quản lý đoàn xe"
        subtitle="Quản lý thông tin xe, cấu hình số lượng ghế động (2 ghế/hàng) và trạng thái hoạt động."
        actions={
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm xe mới
          </Button>
        }
      />

      {/* Toolbar lọc / tìm kiếm */}
      <Toolbar>
        <SearchInput
          placeholder="Tìm theo biển số, ID xe..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <SelectInput
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={BUS_STATUS_OPTIONS}
          className="w-48"
        />
      </Toolbar>

      {/* Bảng danh sách xe */}
      <div className="rounded-xl border border-white/10 bg-[#172338] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#101c2d] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Biển số xe</th>
                <th className="px-5 py-3.5">Loại xe</th>
                <th className="px-5 py-3.5">Cấu hình ghế</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5">Bảo hiểm</th>
                <th className="px-5 py-3.5">Bảo trì gần nhất</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
                    Đang tải danh sách xe...
                  </td>
                </tr>
              ) : paginatedBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không tìm thấy xe nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedBuses.map((bus) => {
                  const rowCount = Math.ceil(bus.totalSeats / 2);
                  const lastRowChar = String.fromCharCode(64 + rowCount);

                  return (
                    <tr key={bus.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a42] border border-white/10 text-emerald-400 font-bold">
                            <BusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{bus.licensePlate}</p>
                            <p className="text-xs text-slate-400">Mã xe: #{bus.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-300 font-medium">
                        {BUS_TYPE_LABELS[bus.busType] ?? bus.busType}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-400">
                            {bus.totalSeats} chỗ
                          </span>
                          <span className="text-xs text-slate-400">
                            {rowCount} hàng (A1 → {lastRowChar}2) · 2 ghế/hàng
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={bus.status}
                          onChange={(e) => handleStatusChange(bus, e.target.value)}
                          className="bg-[#101c2d] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
                        >
                          <option value="AVAILABLE">Sẵn sàng</option>
                          <option value="RUNNING">Đang chạy</option>
                          <option value="MAINTENANCE">Bảo trì</option>
                        </select>
                      </td>

                      <td className="px-5 py-4 text-slate-300 text-xs">
                        {bus.insuranceExpiry ? (
                          new Date(bus.insuranceExpiry).toLocaleDateString("vi-VN")
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-300 text-xs">
                        {bus.lastMaintenanceDate ? (
                          new Date(bus.lastMaintenanceDate).toLocaleDateString("vi-VN")
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <IconButton
                          tooltip="Chỉnh sửa cấu hình xe"
                          onClick={() => {
                            setSelectedBus(bus);
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-white/10 bg-[#101c2d] p-3">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <BusModal
          title="Thêm xe mới vào hệ thống"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(form) => handleCreate(form as CreateForm)}
          isSaving={isSaving}
        />
      )}

      {showEditModal && selectedBus && (
        <BusModal
          title={`Cấu hình xe: ${selectedBus.licensePlate}`}
          initialData={selectedBus}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBus(null);
          }}
          onSubmit={(form) => handleEdit(form as EditForm)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

interface CreateForm {
  licensePlate: string;
  busType: string;
  totalSeats: number;
  seatsPerRow: number;
  layoutType: string;
  lastMaintenanceDate: string;
  insuranceExpiry: string;
}

interface EditForm {
  busType: string;
  totalSeats: number;
  seatsPerRow: number;
  layoutType: string;
  lastMaintenanceDate: string;
  insuranceExpiry: string;
}

function BusModal({
  title,
  initialData,
  onClose,
  onSubmit,
  isSaving,
}: {
  title: string;
  initialData?: AdminBus;
  onClose: () => void;
  onSubmit: (form: CreateForm | EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    licensePlate: initialData?.licensePlate ?? "",
    busType: initialData?.busType ?? "LIMOUSINE",
    totalSeats: initialData?.totalSeats ?? 24,
    seatsPerRow: 2,
    layoutType: "2-seat-row",
    lastMaintenanceDate: initialData?.lastMaintenanceDate ?? "",
    insuranceExpiry: initialData?.insuranceExpiry ?? "",
  });

  const rowCount = Math.ceil(form.totalSeats / form.seatsPerRow);
  const isOddSeats = form.totalSeats % form.seatsPerRow !== 0;
  const lastRowChar = String.fromCharCode(64 + Math.min(rowCount, 26));

  const handleBusTypeChange = (newBusType: string) => {
    const suggestedSeats = BUS_SEAT_SUGGESTIONS[newBusType] ?? 24;
    setForm((prev) => ({
      ...prev,
      busType: newBusType,
      totalSeats: suggestedSeats,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.totalSeats <= 0) {
      toast.error("Số lượng ghế phải lớn hơn 0");
      return;
    }

    if (initialData) {
      const editForm: EditForm = {
        busType: form.busType,
        totalSeats: form.totalSeats,
        seatsPerRow: form.seatsPerRow,
        layoutType: form.layoutType,
        lastMaintenanceDate: form.lastMaintenanceDate,
        insuranceExpiry: form.insuranceExpiry,
      };
      onSubmit(editForm);
    } else {
      onSubmit(form);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#172338] border border-white/[0.08] rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Cấu hình xe & sơ đồ ghế</p>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">{title}</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Biển số xe <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                placeholder="VD: 29B-888.88"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Loại xe <span className="text-rose-400">*</span>
            </label>
            <select
              value={form.busType}
              onChange={(e) => handleBusTypeChange(e.target.value)}
              className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
            >
              {BUS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#101c2d] text-slate-200">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cấu hình bố cục ghế */}
          <div className="p-3.5 rounded-xl bg-[#101c2d] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Bố cục hàng ghế
              </label>
              <span className="text-xs font-medium text-slate-300">
                2 ghế / hàng · Lối đi ở giữa
              </span>
            </div>

            {/* Quick seat presets */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1.5">Chọn nhanh số ghế phổ biến:</div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SEAT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, totalSeats: preset })}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                      form.totalSeats === preset
                        ? "bg-emerald-600 text-white border-emerald-500/40 font-semibold shadow-sm"
                        : "bg-[#1c2a42] text-slate-300 border-white/[0.08] hover:bg-[#202e48]"
                    }`}
                  >
                    {preset} ghế
                  </button>
                ))}
              </div>
            </div>

            {/* Custom seats input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Số lượng ghế thực tế <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={form.totalSeats}
                onChange={(e) => setForm({ ...form, totalSeats: Number(e.target.value) })}
                className="w-full h-10 px-3 bg-[#172338] border border-white/[0.08] rounded-lg text-sm text-slate-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 font-semibold transition-colors"
                required
                min={2}
                max={52}
                step={1}
              />
            </div>

            {/* Preview Banner */}
            <div className="p-2.5 rounded-lg bg-[#172338] border border-white/[0.06] text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Sơ đồ sẽ sinh {rowCount} hàng ghế ({form.totalSeats} ghế: từ A1 đến {lastRowChar}2)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Mỗi hàng có 2 ghế: cột trái (#1) — lối đi — cột phải (#2).
              </div>
              {isOddSeats && (
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Số ghế lẻ ({form.totalSeats}), hàng {lastRowChar} chỉ có 1 ghế bên trái.</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ngày bảo trì gần nhất
              </label>
              <input
                type="date"
                value={form.lastMaintenanceDate}
                onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ngày hết hạn bảo hiểm
              </label>
              <input
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                className="w-full h-10 px-3 bg-[#101c2d] border border-white/[0.08] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {isSaving ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm xe mới"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}