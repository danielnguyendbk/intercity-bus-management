// ============================================================================
// ADMIN ASSIGNMENTS PAGE — Phân công nhân sự (Admin)
// Tính năng: gán tài xế + phụ xe cho từng chuyến, quản lý DS nhân viên
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import {
  AdminTrip,
  getAdminTrips,
  getAllEmployees,
  assignStaffToTrip,
  createEmployee,
  updateEmployee,
  getStaffByTrip,
} from "../../api/admin";
import { Employee } from "../../types";
import Pagination from "../../components/ui/Pagination";
import { extractApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";
import {
  Users,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Phone,
  Award,
  Star,
  MapPin,
  Calendar,
  Briefcase,
  Mail,
  FileText,
  Plus,
  X,
  TrendingUp,
  CheckSquare,
  UserCheck,
  Pencil,
} from "lucide-react";

const STAFF_BADGES: Record<string, {
  licenseType: string;
  birthday: string;
  address: string;
  email: string;
  achievements: string[];
  totalTrips: number;
}> = {
  "Nguyễn Văn Minh": { licenseType: "GPLX hạng E", birthday: "15/03/1978", address: "Hà Nội", email: "minh.nguyen@bus.com", achievements: ["An toàn 15 năm", "1250+ chuyến"], totalTrips: 1250 },
  "Trần Đình Cường": { licenseType: "GPLX hạng E", birthday: "20/06/1979", address: "TP.HCM", email: "cuong.tran@bus.com", achievements: ["An toàn 14 năm", "980+ chuyến"], totalTrips: 980 },
  "Lê Hồng Sơn": { licenseType: "GPLX hạng E", birthday: "10/01/1980", address: "Đà Nẵng", email: "son.le@bus.com", achievements: ["An toàn 13 năm", "920+ chuyến"], totalTrips: 920 },
  "Phạm Quốc Việt": { licenseType: "GPLX hạng E", birthday: "05/09/1981", address: "Hải Phòng", email: "viet.pham@bus.com", achievements: ["An toàn 12 năm", "880+ chuyến"], totalTrips: 880 },
  "Hoàng Minh Tuấn": { licenseType: "GPLX hạng E", birthday: "25/04/1982", address: "Cần Thơ", email: "tuan.hoang@bus.com", achievements: ["An toàn 11 năm", "850+ chuyến"], totalTrips: 850 },
  "Nguyễn Thị Lan": { licenseType: "GPLX hạng D", birthday: "18/08/1990", address: "Nam Định", email: "lan.nguyen@bus.com", achievements: ["10 năm kinh nghiệm", "520+ chuyến"], totalTrips: 520 },
  "Trần Thị Hương": { licenseType: "GPLX hạng D", birthday: "12/05/1991", address: "Thái Bình", email: "huong.tran@bus.com", achievements: ["8 năm kinh nghiệm", "450+ chuyến"], totalTrips: 450 },
  "Lê Thị Mai": { licenseType: "GPLX hạng D", birthday: "20/11/1992", address: "Hưng Yên", email: "mai.le@bus.com", achievements: ["7 năm kinh nghiệm", "400+ chuyến"], totalTrips: 400 },
  "Phạm Thị Oanh": { licenseType: "GPLX hạng D", birthday: "08/03/1993", address: "Bắc Ninh", email: "oanh.pham@bus.com", achievements: ["6 năm kinh nghiệm", "380+ chuyến"], totalTrips: 380 },
  "Hoàng Thị Ngọc": { licenseType: "GPLX hạng D", birthday: "15/07/1994", address: "Vĩnh Phúc", email: "ngoc.hoang@bus.com", achievements: ["5 năm kinh nghiệm", "350+ chuyến"], totalTrips: 350 },
};

export default function AdminAssignmentsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [assistants, setAssistants] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"drivers" | "assistants">("drivers");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTripAssignments, setSelectedTripAssignments] = useState<Record<number, { driverId: string; assistantId: string }>>({});
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form thêm nhân sự (từ AdminEmployeesPage)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    hometown: "",
    experienceYears: "",
    employeeType: "DRIVER" as "DRIVER" | "ASSISTANT",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tripsData, employeesData] = await Promise.all([
        getAdminTrips(),
        getAllEmployees(),
      ]);
      setTrips(tripsData);
      setDrivers(employeesData.filter((e: Employee) => e.employeeType === "DRIVER"));
      setAssistants(employeesData.filter((e: Employee) => e.employeeType === "ASSISTANT"));
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTrips = trips.filter((t) => t.status === "SCHEDULED" || t.status === "RUNNING");
  const staffList = activeTab === "drivers" ? drivers : assistants;

  const [currentTripPage, setCurrentTripPage] = useState(1);
  const TRIPS_PER_PAGE = 5;
  const totalTripPages = Math.ceil(activeTrips.length / TRIPS_PER_PAGE);
  const validTripPage = Math.min(currentTripPage, Math.max(1, totalTripPages));
  const paginatedActiveTrips = activeTrips.slice((validTripPage - 1) * TRIPS_PER_PAGE, validTripPage * TRIPS_PER_PAGE);

  useEffect(() => {
    setCurrentTripPage(1);
  }, [trips]);

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp);
  };

  const handleAssignmentChange = (tripId: number, type: "driverId" | "assistantId", value: string) => {
    setSelectedTripAssignments((prev) => ({
      ...prev,
      [tripId]: { ...prev[tripId], [type]: value },
    }));
  };

  const handleAssign = async (tripId: number) => {
    const assignment = selectedTripAssignments[tripId];
    if (!assignment) return;
    setIsSaving(tripId);
    try {
      await assignStaffToTrip(
        tripId,
        assignment.driverId ? Number(assignment.driverId) : null,
        assignment.assistantId ? Number(assignment.assistantId) : null
      );
      toast.success("Phân công thành công!");
      await loadData();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể phân công");
    } finally {
      setIsSaving(null);
    }
  };

  // Mở modal ở chế độ Thêm (reset editingEmployee + formData)
  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ fullName: "", phone: "", hometown: "", experienceYears: "", employeeType: "DRIVER", status: "ACTIVE" });
    setShowAddModal(true);
  };

  // Mở modal ở chế độ Sửa (prefill formData từ nhân viên đang chọn)
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName ?? "",
      phone: emp.phone ?? "",
      hometown: emp.hometown ?? "",
      experienceYears: emp.experienceYears != null ? String(emp.experienceYears) : "",
      employeeType: (emp.employeeType === "ASSISTANT" ? "ASSISTANT" : "DRIVER") as "DRIVER" | "ASSISTANT",
      status: (emp.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
    });
    setShowAddModal(true);
  };

  // Đóng modal — reset cả editingEmployee để lần mở sau không bị dính chế độ Sửa
  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
  };

  // Xử lý Thêm / Cập nhật nhân sự (cùng 1 form, phân biệt qua editingEmployee)
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      toast.error("Vui lòng nhập họ tên và số điện thoại!");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        fullName: formData.fullName,
        phone: formData.phone,
        employeeType: formData.employeeType,
        status: formData.status,
      };
      if (formData.hometown) payload.hometown = formData.hometown;
      if (formData.experienceYears) payload.experienceYears = Number(formData.experienceYears);

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, payload);
        toast.success("Cập nhật nhân sự thành công!");
      } else {
        await createEmployee(payload);
        toast.success("Thêm nhân sự thành công!");
      }
      closeAddModal();
      setFormData({ fullName: "", phone: "", hometown: "", experienceYears: "", employeeType: "DRIVER", status: "ACTIVE" });
      await loadData();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || (editingEmployee ? "Có lỗi khi cập nhật nhân sự!" : "Có lỗi khi thêm nhân sự!"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lấy chuyến hiện tại của nhân viên
  const getEmployeeCurrentTrip = (emp: Employee): string | null => {
    for (const trip of activeTrips) {
      const hasDriver = trip.assignments?.some((a) => a.employeeId === emp.id && a.role === "DRIVER");
      const hasAssistant = trip.assignments?.some((a) => a.employeeId === emp.id && a.role === "ASSISTANT");
      if (hasDriver || hasAssistant) {
        return `Chuyến #${trip.id} — ${trip.routeName}`;
      }
    }
    return null;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getBadgeInfo = (name: string) => {
    return STAFF_BADGES[name] || {
      licenseType: "GPLX hạng D",
      birthday: "—",
      address: "—",
      email: "—",
      achievements: ["Kinh nghiệm tốt"],
      totalTrips: 0,
    };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      SCHEDULED: "badge badge-info",
      RUNNING: "badge badge-success",
      COMPLETED: "badge badge-neutral",
      CANCELLED: "badge badge-error",
      DELAYED: "badge badge-warning",
    };
    return <span className={badges[status] || "badge"}>{status}</span>;
  };

  const totalStaff = drivers.length + assistants.length;
  const assignedCount = activeTrips.filter((t) =>
    t.assignments?.some((a) => a.role === "DRIVER" && a.employeeId)
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="ml-4 text-slate-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50/80 to-purple-50">
      <div className="relative z-10 space-y-6 p-6">
        {/* Header — gradient xanh tím sáng, đồng bộ với AdminTicketsPage */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-7 shadow-xl shadow-indigo-200/40">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" />
            </svg>
          </div>
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Staff Management</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Phân công &amp; Quản lý Nhân sự</h1>
              <p className="text-blue-50/90 text-sm mt-2">
                Thêm mới, quản lý nhân sự và gán Tài xế / Phụ xe cho các chuyến xe đang hoạt động.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-2xl backdrop-blur-sm transition-colors"
              >
                <CheckCircle className="h-4 w-4" /> Làm mới
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Plus className="h-4 w-4" /> Thêm nhân sự
              </button>
            </div>
          </div>
        </section>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 p-3"><Truck className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeTrips.length}</p>
              <p className="text-xs text-slate-500">Chuyến đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-3"><Shield className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
              <p className="text-xs text-slate-500">Tài xế</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 p-3"><Users className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{assistants.length}</p>
              <p className="text-xs text-slate-500">Phụ xe</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 p-3"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeTrips.length - assignedCount}</p>
              <p className="text-xs text-slate-500">Chưa phân công đủ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Staff List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Staff List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="mb-2 flex rounded-xl bg-white p-1.5 shadow-md border border-indigo-100">
            <button
              onClick={() => { setActiveTab("drivers"); setSelectedEmployee(null); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                activeTab === "drivers"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "text-slate-600 hover:bg-indigo-50"
              }`}
            >
              <Shield className="h-5 w-5" /> Tài xế ({drivers.length})
            </button>
            <button
              onClick={() => { setActiveTab("assistants"); setSelectedEmployee(null); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                activeTab === "assistants"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "text-slate-600 hover:bg-indigo-50"
              }`}
            >
              <Users className="h-5 w-5" /> Phụ xe ({assistants.length})
            </button>
          </div>

          {/* Staff List */}
          <div className="space-y-2">
            {staffList.length === 0 ? (
              <div className="rounded-2xl bg-white border border-indigo-100 p-8 text-center text-slate-500 shadow-sm">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-indigo-300" />
                <p>Chưa có {activeTab === "drivers" ? "tài xế" : "phụ xe"} nào.</p>
                <button onClick={openAddModal} className="mt-3 text-sm text-indigo-600 underline hover:text-indigo-700">
                  + Thêm nhân sự mới
                </button>
              </div>
            ) : staffList.map((emp) => {
              const currentTrip = getEmployeeCurrentTrip(emp);
              return (
                <div
                  key={emp.id}
                  onClick={() => handleEmployeeClick(emp)}
                  className={`group cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
                    selectedEmployee?.id === emp.id
                      ? "border-indigo-400 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
                      : "border-indigo-100 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${
                        emp.employeeType === "DRIVER"
                          ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                          : "bg-gradient-to-br from-indigo-500 to-purple-500"
                      } h-12 w-12 rounded-full flex items-center justify-center shadow-md`}>
                        <span className="text-lg font-bold text-white">
                          {emp.fullName.split(" ").pop()?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-700">{emp.fullName}</h4>
                          {emp.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              <CheckSquare className="h-2.5 w-2.5" /> ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />{emp.phone}
                        </p>
                        {currentTrip && (
                          <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                            <Truck className="h-2.5 w-2.5" />{currentTrip}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {emp.experienceYears ? (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                          <Award className="h-3 w-3" />{emp.experienceYears} năm KN
                        </span>
                      ) : null}
                      <ChevronRight className={`h-5 w-5 text-indigo-400 transition-transform ${selectedEmployee?.id === emp.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trips Table Below */}
          <div className="mt-6 rounded-2xl bg-white border border-indigo-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                    <th className="px-5 py-4 font-semibold text-indigo-700">Chuyến</th>
                    <th className="px-5 py-4 font-semibold text-indigo-700">Tuyến</th>
                    <th className="px-5 py-4 font-semibold text-indigo-700">Giờ khởi hành</th>
                    <th className="px-5 py-4 font-semibold text-indigo-700">Trạng thái</th>
                    <th className="px-5 py-4 text-right font-semibold text-indigo-700">Phân công</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedActiveTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center text-slate-400">Không có chuyến nào đang hoạt động</td>
                    </tr>
                  ) : paginatedActiveTrips.map((trip) => {
                    const driverAssignment = trip.assignments?.find((a) => a.role === "DRIVER");
                    const assistantAssignment = trip.assignments?.find((a) => a.role === "ASSISTANT");
                    return (
                      <tr key={trip.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">#{trip.id}</div>
                          <div className="text-xs text-slate-400">{trip.busLabel}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-slate-700 font-medium">{trip.routeName}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {new Date(trip.departureTime).toLocaleString("vi-VN", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(trip.status)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2 items-center">
                            {/* Hiển thị TX đã gán */}
                            {driverAssignment?.employeeName ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-200 max-w-[120px] truncate" title={driverAssignment.employeeName}>
                                <Shield className="h-3 w-3 flex-shrink-0" />{driverAssignment.employeeName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Chưa có TX</span>
                            )}
                            {/* Hiển thị PX đã gán */}
                            {assistantAssignment?.employeeName ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 border border-purple-200 max-w-[120px] truncate" title={assistantAssignment.employeeName}>
                                <Users className="h-3 w-3 flex-shrink-0" />{assistantAssignment.employeeName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Chưa có PX</span>
                            )}
                            <select
                              value={selectedTripAssignments[trip.id]?.driverId || ""}
                              onChange={(e) => handleAssignmentChange(trip.id, "driverId", e.target.value)}
                              className="text-xs px-2 py-1 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">TX</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>{d.fullName}</option>
                              ))}
                            </select>
                            <select
                              value={selectedTripAssignments[trip.id]?.assistantId || ""}
                              onChange={(e) => handleAssignmentChange(trip.id, "assistantId", e.target.value)}
                              className="text-xs px-2 py-1 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">PX</option>
                              {assistants.map((a) => (
                                <option key={a.id} value={a.id}>{a.fullName}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssign(trip.id)}
                              disabled={isSaving === trip.id}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm disabled:opacity-60 transition-all"
                            >
                              {isSaving === trip.id ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}{" "}
                              Lưu
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {totalTripPages > 1 && (
              <div className="border-t border-slate-100 bg-slate-50/50">
                <Pagination 
                  currentPage={validTripPage} 
                  totalPages={totalTripPages} 
                  onPageChange={setCurrentTripPage} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Employee Detail Panel */}
        <div className="lg:col-span-1">
          {selectedEmployee ? (() => {
            const badge = getBadgeInfo(selectedEmployee.fullName);
            const currentTrip = getEmployeeCurrentTrip(selectedEmployee);
            const isDriver = selectedEmployee.employeeType === "DRIVER";

            return (
              <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-white via-indigo-50 to-purple-50 p-6 shadow-xl border border-indigo-200">
                {/* Avatar & Name */}
                <div className="text-center mb-5">
                  <div className={`mx-auto mb-3 h-20 w-20 rounded-full flex items-center justify-center shadow-lg ${
                    isDriver ? "bg-gradient-to-br from-blue-500 to-indigo-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                  }`}>
                    <span className="text-2xl font-bold text-white">
                      {selectedEmployee.fullName.split(" ").pop()?.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedEmployee.fullName}</h3>
                  <p className="text-sm text-indigo-600 flex items-center justify-center gap-1 mt-1">
                    <Phone className="h-3.5 w-3.5" />{selectedEmployee.phone}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                      isDriver
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-purple-100 text-purple-700 border-purple-200"
                    }`}>
                      {isDriver ? "Tài xế" : "Phụ xe"}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      selectedEmployee.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      <UserCheck className="h-3 w-3" />
                      {selectedEmployee.status === "ACTIVE" ? "Đang hoạt động" : "Nghỉ việc"}
                    </span>
                  </div>
                </div>

                {/* Email */}
                {badge.email && badge.email !== "—" && (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                    <div className="rounded-full bg-blue-100 p-2 flex-shrink-0"><Mail className="h-4 w-4 text-blue-600" /></div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="font-semibold text-slate-800 text-sm truncate">{badge.email}</p>
                    </div>
                  </div>
                )}

                {/* Chuyến hiện tại */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-amber-100 p-2 flex-shrink-0"><Truck className="h-4 w-4 text-amber-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Chuyến hiện tại</p>
                    <p className={`font-semibold text-sm ${currentTrip ? "text-amber-700" : "text-slate-400"}`}>
                      {currentTrip || "Đang rảnh rỗi"}
                    </p>
                  </div>
                </div>

                {/* Địa chỉ / Quê quán */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-rose-100 p-2 flex-shrink-0"><MapPin className="h-4 w-4 text-rose-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Địa chỉ / Quê quán</p>
                    <p className="font-semibold text-slate-800 text-sm">{selectedEmployee.hometown || badge.address}</p>
                  </div>
                </div>

                {/* Giấy phép */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-blue-100 p-2 flex-shrink-0"><FileText className="h-4 w-4 text-blue-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Giấy phép lái xe</p>
                    <p className="font-semibold text-slate-800 text-sm">{badge.licenseType}</p>
                  </div>
                </div>

                {/* Ngày sinh */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-emerald-100 p-2 flex-shrink-0"><Calendar className="h-4 w-4 text-emerald-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Ngày sinh</p>
                    <p className="font-semibold text-slate-800 text-sm">{badge.birthday}</p>
                  </div>
                </div>

                {/* Ngày gia nhập */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-purple-100 p-2 flex-shrink-0"><Briefcase className="h-4 w-4 text-purple-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Ngày gia nhập</p>
                    <p className="font-semibold text-slate-800 text-sm">{formatDate(selectedEmployee.joinDate)}</p>
                  </div>
                </div>

                {/* Kinh nghiệm */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-amber-100 p-2 flex-shrink-0"><Award className="h-4 w-4 text-amber-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Kinh nghiệm</p>
                    <p className="font-semibold text-slate-800 text-sm">
                      {selectedEmployee.experienceYears || 0} năm
                    </p>
                  </div>
                </div>

                {/* Tổng chuyến */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-indigo-100 mb-3 shadow-sm">
                  <div className="rounded-full bg-cyan-100 p-2 flex-shrink-0"><TrendingUp className="h-4 w-4 text-cyan-600" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Tổng chuyến đã hoàn thành</p>
                    <p className="font-semibold text-slate-800 text-sm">{badge.totalTrips} chuyến</p>
                  </div>
                </div>

                {/* Thành tích */}
                <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border border-indigo-200">
                  <p className="text-xs font-medium text-indigo-700 mb-2 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />Thành tích nổi bật
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {badge.achievements.map((ach, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200"
                      >
                        <Star className="h-3 w-3 text-amber-400" />{ach}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Nút Cập nhật thông tin nhân sự */}
                <button
                  type="button"
                  onClick={() => openEditModal(selectedEmployee)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300"
                >
                  <Pencil className="h-4 w-4" />
                  Cập nhật thông tin
                </button>
              </div>
            );
          })() : (
            <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-white to-indigo-50 p-8 text-center border border-indigo-200 shadow-lg">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-indigo-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-700 mb-2">Chọn nhân viên</h4>
              <p className="text-sm text-slate-500 mb-4">Click vào tên bên trái để xem thông tin chi tiết</p>
              <button
                onClick={openAddModal}
                className="mx-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md transition-all"
              >
                <Plus className="h-4 w-4" /> Thêm nhân sự mới
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm / Cập nhật Nhân Sự */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/50 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className={`w-full max-w-lg rounded-3xl shadow-2xl border-2 overflow-hidden max-h-[90vh] flex flex-col ${
            editingEmployee
              ? "border-amber-200 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40"
              : "border-indigo-200 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/40"
          }`}>
            {/* Header gradient — đồng bộ style với header trang */}
            <div className={`relative px-6 py-5 overflow-hidden ${
              editingEmployee
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
            }`}>
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,60 Q25,40 50,60 T100,60 L100,100 L0,100 Z" fill="white" />
                </svg>
              </div>
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white/20 backdrop-blur-sm p-2.5 ring-2 ring-white/30 flex-shrink-0">
                    {editingEmployee ? (
                      <Pencil className="h-6 w-6 text-white" />
                    ) : (
                      <Users className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white leading-tight">
                      {editingEmployee ? "Cập nhật nhân sự" : "Thêm nhân sự mới"}
                    </h2>
                    <p className="text-sm text-white/85 mt-0.5">
                      {editingEmployee
                        ? `Chỉnh sửa thông tin cho ${editingEmployee.fullName}`
                        : "Nhập đầy đủ thông tin để thêm tài xế / phụ xe"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAddModal}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 ring-1 ring-white/30 transition-colors flex-shrink-0"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Form body — scrollable (gồm cả footer để Enter vẫn submit được) */}
            <form onSubmit={handleAddStaff} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
              {/* ============ SECTION 1: Thông tin cá nhân ============ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent" />
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Thông tin cá nhân</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-indigo-200 to-transparent" />
                </div>

                <div className="space-y-3">
                  {/* Họ và tên */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium placeholder:text-slate-300 placeholder:font-normal"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-500" />
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="VD: 0987654321"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium placeholder:text-slate-300 placeholder:font-normal"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 ml-1">Dùng để liên hệ khi phân công chuyến</p>
                  </div>
                </div>
              </div>

              {/* ============ SECTION 2: Thông tin công việc ============ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent" />
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Thông tin công việc</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-purple-200 to-transparent" />
                </div>

                <div className="space-y-3">
                  {/* Hàng 1: Vai trò + Trạng thái */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                        <Shield className="h-3.5 w-3.5 text-indigo-500" />
                        Vai trò
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                        <select
                          className="w-full pl-10 pr-8 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                          value={formData.employeeType}
                          onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as "DRIVER" | "ASSISTANT" })}
                        >
                          <option value="DRIVER">Tài xế (Lái xe)</option>
                          <option value="ASSISTANT">Phụ xe (Lơ xe)</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                        Trạng thái
                      </label>
                      <div className="relative">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                        <select
                          className="w-full pl-10 pr-8 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                        >
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="INACTIVE">Nghỉ việc</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Hàng 2: Quê quán + Kinh nghiệm */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        Quê quán / Địa chỉ
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="VD: Hà Nội"
                          className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium placeholder:text-slate-300 placeholder:font-normal"
                          value={formData.hometown}
                          onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                        <Award className="h-3.5 w-3.5 text-indigo-500" />
                        Kinh nghiệm (năm)
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min="0"
                          placeholder="VD: 5"
                          className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium placeholder:text-slate-300 placeholder:font-normal"
                          value={formData.experienceYears}
                          onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Footer — cố định dưới form, vẫn submit được bằng Enter */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 ${
                    editingEmployee
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Đang lưu...
                    </>
                  ) : editingEmployee ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Cập nhật
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Lưu thông tin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
