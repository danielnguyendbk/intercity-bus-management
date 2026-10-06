// ============================================================================
// ADMIN ASSIGNMENTS PAGE — Phân công & Quản lý nhân sự (Admin)
// Thiết kế: Enterprise SaaS Dark • Reusable Design System • Unified Layout
// ============================================================================

import React, { useCallback, useEffect, useState } from "react";
import {
  AdminTrip,
  getAdminTrips,
  getAllEmployees,
  assignStaffToTrip,
  createEmployee,
  updateEmployee,
} from "../../api/admin";
import { Employee } from "../../types";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/ui/StatusBadge";
import PageHeader from "../../components/ui/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import KPICard from "../../components/ui/KPICard";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { extractApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";
import {
  Truck,
  Shield,
  Users,
  AlertCircle,
  RotateCw,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  TrendingUp,
  Star,
  Pencil,
  FileText,
  UserCheck,
  ChevronRight,
  CheckCircle,
  X,
} from "lucide-react";

const STAFF_BADGES: Record<
  string,
  {
    licenseType: string;
    birthday: string;
    address: string;
    email: string;
    achievements: string[];
    totalTrips: number;
  }
> = {
  "Nguyễn Văn Minh": {
    licenseType: "GPLX hạng E",
    birthday: "15/03/1978",
    address: "Hà Nội",
    email: "minh.nguyen@bus.com",
    achievements: ["An toàn 15 năm", "1250+ chuyến"],
    totalTrips: 1250,
  },
  "Trần Đình Cường": {
    licenseType: "GPLX hạng E",
    birthday: "20/06/1979",
    address: "TP.HCM",
    email: "cuong.tran@bus.com",
    achievements: ["An toàn 14 năm", "980+ chuyến"],
    totalTrips: 980,
  },
  "Lê Hồng Sơn": {
    licenseType: "GPLX hạng E",
    birthday: "10/01/1980",
    address: "Đà Nẵng",
    email: "son.le@bus.com",
    achievements: ["An toàn 13 năm", "920+ chuyến"],
    totalTrips: 920,
  },
  "Phạm Quốc Việt": {
    licenseType: "GPLX hạng E",
    birthday: "05/09/1981",
    address: "Hải Phòng",
    email: "viet.pham@bus.com",
    achievements: ["An toàn 12 năm", "880+ chuyến"],
    totalTrips: 880,
  },
  "Hoàng Minh Tuấn": {
    licenseType: "GPLX hạng E",
    birthday: "25/04/1982",
    address: "Cần Thơ",
    email: "tuan.hoang@bus.com",
    achievements: ["An toàn 11 năm", "850+ chuyến"],
    totalTrips: 850,
  },
  "Nguyễn Thị Lan": {
    licenseType: "GPLX hạng D",
    birthday: "18/08/1990",
    address: "Nam Định",
    email: "lan.nguyen@bus.com",
    achievements: ["10 năm kinh nghiệm", "520+ chuyến"],
    totalTrips: 520,
  },
  "Trần Thị Hương": {
    licenseType: "GPLX hạng D",
    birthday: "12/05/1991",
    address: "Thái Bình",
    email: "huong.tran@bus.com",
    achievements: ["8 năm kinh nghiệm", "450+ chuyến"],
    totalTrips: 450,
  },
  "Lê Thị Mai": {
    licenseType: "GPLX hạng D",
    birthday: "20/11/1992",
    address: "Hưng Yên",
    email: "mai.le@bus.com",
    achievements: ["7 năm kinh nghiệm", "400+ chuyến"],
    totalTrips: 400,
  },
  "Phạm Thị Oanh": {
    licenseType: "GPLX hạng D",
    birthday: "08/03/1993",
    address: "Bắc Ninh",
    email: "oanh.pham@bus.com",
    achievements: ["6 năm kinh nghiệm", "380+ chuyến"],
    totalTrips: 380,
  },
  "Hoàng Thị Ngọc": {
    licenseType: "GPLX hạng D",
    birthday: "15/07/1994",
    address: "Vĩnh Phúc",
    email: "ngoc.hoang@bus.com",
    achievements: ["5 năm kinh nghiệm", "350+ chuyến"],
    totalTrips: 350,
  },
};

export default function AdminAssignmentsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [assistants, setAssistants] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"drivers" | "assistants">("drivers");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTripAssignments, setSelectedTripAssignments] = useState<
    Record<number, { driverId: string; assistantId: string }>
  >({});
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    hometown: "",
    experienceYears: "",
    employeeType: "DRIVER" as "DRIVER" | "ASSISTANT",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

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
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTrips = trips.filter(
    (t) => t.status === "SCHEDULED" || t.status === "RUNNING"
  );
  const staffList = activeTab === "drivers" ? drivers : assistants;

  const [currentTripPage, setCurrentTripPage] = useState(1);
  const TRIPS_PER_PAGE = 5;
  const totalTripPages = Math.ceil(activeTrips.length / TRIPS_PER_PAGE);
  const validTripPage = Math.min(currentTripPage, Math.max(1, totalTripPages));
  const paginatedActiveTrips = activeTrips.slice(
    (validTripPage - 1) * TRIPS_PER_PAGE,
    validTripPage * TRIPS_PER_PAGE
  );

  useEffect(() => {
    setCurrentTripPage(1);
  }, [trips]);

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp);
  };

  const handleAssignmentChange = (
    tripId: number,
    type: "driverId" | "assistantId",
    value: string
  ) => {
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
      await loadData(true);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể phân công");
    } finally {
      setIsSaving(null);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: "",
      phone: "",
      hometown: "",
      experienceYears: "",
      employeeType: "DRIVER",
      status: "ACTIVE",
    });
    setShowAddModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName ?? "",
      phone: emp.phone ?? "",
      hometown: emp.hometown ?? "",
      experienceYears: emp.experienceYears != null ? String(emp.experienceYears) : "",
      employeeType: (emp.employeeType === "ASSISTANT" ? "ASSISTANT" : "DRIVER") as
        | "DRIVER"
        | "ASSISTANT",
      status: (emp.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as
        | "ACTIVE"
        | "INACTIVE",
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
  };

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
      if (formData.experienceYears)
        payload.experienceYears = Number(formData.experienceYears);

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, payload);
        toast.success("Cập nhật nhân sự thành công!");
        // Update selected employee in detail panel if currently viewed
        if (selectedEmployee?.id === editingEmployee.id) {
          setSelectedEmployee({ ...selectedEmployee, ...payload });
        }
      } else {
        await createEmployee(payload);
        toast.success("Thêm nhân sự thành công!");
      }
      closeAddModal();
      setFormData({
        fullName: "",
        phone: "",
        hometown: "",
        experienceYears: "",
        employeeType: "DRIVER",
        status: "ACTIVE",
      });
      await loadData(true);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) ||
          (editingEmployee
            ? "Có lỗi khi cập nhật nhân sự!"
            : "Có lỗi khi thêm nhân sự!")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmployeeCurrentTrip = (emp: Employee): string | null => {
    for (const trip of activeTrips) {
      const hasDriver = trip.assignments?.some(
        (a) => a.employeeId === emp.id && a.role === "DRIVER"
      );
      const hasAssistant = trip.assignments?.some(
        (a) => a.employeeId === emp.id && a.role === "ASSISTANT"
      );
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
    return (
      STAFF_BADGES[name] || {
        licenseType: "GPLX hạng D",
        birthday: "—",
        address: "—",
        email: "—",
        achievements: ["Kinh nghiệm tốt"],
        totalTrips: 0,
      }
    );
  };

  const assignedCount = activeTrips.filter((t) =>
    t.assignments?.some((a) => a.role === "DRIVER" && a.employeeId)
  ).length;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">
            Đang tải dữ liệu nhân sự & phân công...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Staff Management"
        title="Phân công & Quản lý nhân sự"
        subtitle="Quản lý tài xế, phụ xe và phân công nhân sự cho các chuyến xe đang hoạt động."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={
                <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              }
              onClick={() => loadData(true)}
              disabled={isRefreshing}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openAddModal}
            >
              Thêm nhân sự
            </Button>
          </>
        }
      />

      {/* 2. KPI Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Chuyến đang hoạt động"
          value={activeTrips.length}
          icon={Truck}
          variant="blue"
          description="Chuyến SCHEDULED hoặc RUNNING"
        />
        <KPICard
          label="Tài xế"
          value={drivers.length}
          icon={Shield}
          variant="emerald"
          description="Tổng lái xe chính thức"
        />
        <KPICard
          label="Phụ xe"
          value={assistants.length}
          icon={Users}
          variant="purple"
          description="Tổng phụ xe & tiếp viên"
        />
        <KPICard
          label="Chưa phân công đủ"
          value={Math.max(0, activeTrips.length - assignedCount)}
          icon={AlertCircle}
          variant="amber"
          description="Chuyến cần bổ sung tài xế"
        />
      </div>

      {/* 3. Main 2-Column Section (Desktop: Left ~65% / Right ~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-8 or ~65%) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Personnel List Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#172338] p-5">
            {/* Header + Tabs row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Danh sách nhân sự
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nhấp vào nhân sự để xem hồ sơ và lịch sử phân công
                </p>
              </div>

              {/* Segmented Control */}
              <SegmentedControl
                value={activeTab}
                onChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedEmployee(null);
                }}
                options={[
                  {
                    value: "drivers",
                    label: "Tài xế",
                    count: drivers.length,
                    icon: Shield,
                  },
                  {
                    value: "assistants",
                    label: "Phụ xe",
                    count: assistants.length,
                    icon: Users,
                  },
                ]}
              />
            </div>

            {/* List */}
            <div className="divide-y divide-white/[0.06] mt-1">
              {staffList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-500 opacity-40" />
                  <p className="text-sm">
                    Chưa có {activeTab === "drivers" ? "tài xế" : "phụ xe"} nào.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-emerald-400 hover:text-emerald-300"
                    onClick={openAddModal}
                  >
                    + Thêm nhân sự mới
                  </Button>
                </div>
              ) : (
                staffList.map((emp) => {
                  const currentTrip = getEmployeeCurrentTrip(emp);
                  const isSelected = selectedEmployee?.id === emp.id;

                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleEmployeeClick(emp)}
                      className={`group flex items-center justify-between py-3.5 px-3 rounded-lg transition-all cursor-pointer min-h-[72px] ${
                        isSelected
                          ? "bg-[#1c2a42] border border-emerald-500/40 shadow-sm"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Identity */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-bold text-sm transition-colors ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-slate-800 text-slate-200 border-white/[0.08]"
                          }`}
                        >
                          {emp.fullName.split(" ").pop()?.charAt(0) || "N"}
                        </div>

                        {/* Name + Phone */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-100 text-sm sm:text-base truncate group-hover:text-emerald-400 transition-colors">
                              {emp.fullName}
                            </h4>
                            <StatusBadge status={emp.status} size="sm" />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 text-slate-500" />
                              {emp.phone}
                            </span>
                            {emp.hometown && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                                <MapPin className="h-3 w-3 text-slate-500" />
                                {emp.hometown}
                              </span>
                            )}
                            {currentTrip && (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-medium truncate">
                                <Truck className="h-3 w-3" />
                                {currentTrip}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Indicator / Experience */}
                      <div className="flex items-center gap-2.5 shrink-0 pl-2">
                        {emp.experienceYears ? (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-xs text-slate-300">
                            <Award className="h-3 w-3 text-amber-400" />
                            {emp.experienceYears} năm KN
                          </span>
                        ) : null}
                        <ChevronRight
                          className={`h-4 w-4 text-slate-500 transition-transform ${
                            isSelected ? "rotate-90 text-emerald-400" : "group-hover:text-slate-300"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Trips Dispatch / Assignment Table */}
          <div className="rounded-xl border border-white/[0.08] bg-[#172338] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Phân công theo chuyến xe đang hoạt động
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gán tài xế &amp; phụ xe cho các chuyến xe đang lên lịch khởi hành
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-[#101c2d] border border-white/[0.08] px-2.5 py-1 rounded-md">
                {activeTrips.length} chuyến
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#121d30]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Chuyến &amp; Tuyến
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Khởi hành
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Phân công tài xế &amp; phụ xe
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right pr-5">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {paginatedActiveTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Hiện không có chuyến xe nào đang hoạt động
                      </td>
                    </tr>
                  ) : (
                    paginatedActiveTrips.map((trip) => {
                      const assignedDriver = trip.assignments?.find(
                        (a) => a.role === "DRIVER"
                      );
                      const assignedAssistant = trip.assignments?.find(
                        (a) => a.role === "ASSISTANT"
                      );

                      const currentDriverVal =
                        selectedTripAssignments[trip.id]?.driverId ??
                        (assignedDriver?.employeeId
                          ? String(assignedDriver.employeeId)
                          : "");
                      const currentAssistantVal =
                        selectedTripAssignments[trip.id]?.assistantId ??
                        (assignedAssistant?.employeeId
                          ? String(assignedAssistant.employeeId)
                          : "");

                      return (
                        <tr
                          key={trip.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Trip / Route */}
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">
                              #{trip.id}
                            </span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">
                              ({trip.busLabel})
                            </span>
                            <p className="text-xs text-slate-300 mt-0.5 truncate max-w-[200px]">
                              {trip.routeName}
                            </p>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 text-xs text-slate-300">
                            {new Date(trip.departureTime).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            <div className="text-[11px] text-slate-400">
                              {new Date(trip.departureTime).toLocaleDateString("vi-VN")}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={trip.status} size="sm" />
                          </td>

                          {/* Assign Selects */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* Driver Select */}
                              <select
                                className="h-8 rounded-md border border-white/[0.08] bg-[#101c2d] px-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none w-full sm:w-36"
                                value={currentDriverVal}
                                onChange={(e) =>
                                  handleAssignmentChange(
                                    trip.id,
                                    "driverId",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">— Chọn tài xế —</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.fullName}
                                  </option>
                                ))}
                              </select>

                              {/* Assistant Select */}
                              <select
                                className="h-8 rounded-md border border-white/[0.08] bg-[#101c2d] px-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none w-full sm:w-36"
                                value={currentAssistantVal}
                                onChange={(e) =>
                                  handleAssignmentChange(
                                    trip.id,
                                    "assistantId",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">— Chọn phụ xe —</option>
                                {assistants.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.fullName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3 text-right pr-5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAssign(trip.id)}
                              disabled={isSaving === trip.id}
                              isLoading={isSaving === trip.id}
                              leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                            >
                              Lưu
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalTripPages > 1 && (
              <div className="border-t border-white/[0.08] bg-[#121d30]/60 p-3">
                <Pagination
                  currentPage={validTripPage}
                  totalPages={totalTripPages}
                  onPageChange={setCurrentTripPage}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Employee Detail Panel (lg:col-span-5 or ~35%) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <div className="rounded-xl border border-white/[0.08] bg-[#172338] p-5 shadow-lg">
            {selectedEmployee ? (
              (() => {
                const badge = getBadgeInfo(selectedEmployee.fullName);
                const currentTrip = getEmployeeCurrentTrip(selectedEmployee);
                const isDriver = selectedEmployee.employeeType === "DRIVER";

                return (
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="text-center pb-4 border-b border-white/[0.08]">
                      {/* Avatar */}
                      <div className="mx-auto mb-3 h-16 w-16 rounded-xl border border-emerald-500/30 bg-slate-800 text-emerald-400 font-bold text-2xl flex items-center justify-center shadow-md">
                        {selectedEmployee.fullName.split(" ").pop()?.charAt(0) || "N"}
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {selectedEmployee.fullName}
                      </h3>
                      <p className="text-sm font-mono text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedEmployee.phone}
                      </p>

                      <div className="flex items-center justify-center gap-2 mt-2.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-300 border-blue-500/25">
                          {isDriver ? "Tài xế chính" : "Phụ xe / Lơ xe"}
                        </span>
                        <StatusBadge status={selectedEmployee.status} size="sm" />
                      </div>
                    </div>

                    {/* Metadata Items */}
                    <div className="space-y-2 text-xs">
                      {/* Chuyến hiện tại */}
                      <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">
                            Chuyến xe hiện tại
                          </span>
                          <span
                            className={`font-semibold truncate block ${
                              currentTrip ? "text-amber-300" : "text-slate-400"
                            }`}
                          >
                            {currentTrip || "Đang rảnh rỗi — Sẵn sàng phân công"}
                          </span>
                        </div>
                      </div>

                      {/* Quê quán / Địa chỉ */}
                      <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">
                            Địa chỉ / Quê quán
                          </span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {selectedEmployee.hometown || badge.address || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Giấy phép lái xe */}
                      <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">
                            Hạng giấy phép lái xe
                          </span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {badge.licenseType}
                          </span>
                        </div>
                      </div>

                      {/* Kinh nghiệm */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-2.5">
                          <span className="text-[11px] text-slate-400 block">
                            Kinh nghiệm
                          </span>
                          <span className="font-semibold text-emerald-400 text-sm mt-0.5 block">
                            {selectedEmployee.experienceYears || 0} năm
                          </span>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-2.5">
                          <span className="text-[11px] text-slate-400 block">
                            Đã hoàn thành
                          </span>
                          <span className="font-semibold text-slate-200 text-sm mt-0.5 block">
                            {badge.totalTrips} chuyến
                          </span>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="rounded-lg border border-white/[0.06] bg-[#101c2d] p-3">
                        <span className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          Thành tích nổi bật
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {badge.achievements.map((ach, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[11px] text-slate-300"
                            >
                              <Star className="h-2.5 w-2.5 text-amber-400" />
                              {ach}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        leftIcon={<Pencil className="h-4 w-4" />}
                        onClick={() => openEditModal(selectedEmployee)}
                      >
                        Chỉnh sửa thông tin
                      </Button>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Clean Empty State */
              <div className="py-12 px-4 text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-xl border border-white/[0.08] bg-[#101c2d] text-slate-400 flex items-center justify-center">
                  <Users className="h-6 w-6 opacity-60" />
                </div>
                <h4 className="text-base font-semibold text-slate-200">
                  Chọn nhân viên
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Chọn một nhân viên bên trái để xem thông tin chi tiết và điều phối chuyến.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== Modal Thêm / Cập nhật Nhân Sự ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#172338] p-6 text-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {editingEmployee ? "Cập nhật nhân sự" : "Thêm nhân sự mới"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingEmployee
                    ? `Chỉnh sửa thông tin cho ${editingEmployee.fullName}`
                    : "Nhập đầy đủ thông tin để thêm tài xế / phụ xe"}
                </p>
              </div>
              <IconButton
                variant="default"
                size="md"
                onClick={closeAddModal}
                tooltip="Đóng"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddStaff} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Họ và tên <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  className="admin-field-input"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Số điện thoại <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 0987654321"
                  className="admin-field-input"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Vai trò
                  </label>
                  <select
                    className="admin-field-select"
                    value={formData.employeeType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employeeType: e.target.value as "DRIVER" | "ASSISTANT",
                      })
                    }
                  >
                    <option value="DRIVER">Tài xế (Lái xe)</option>
                    <option value="ASSISTANT">Phụ xe (Lơ xe)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Trạng thái
                  </label>
                  <select
                    className="admin-field-select"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "ACTIVE" | "INACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Nghỉ việc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Quê quán / Địa chỉ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Hà Nội"
                    className="admin-field-input"
                    value={formData.hometown}
                    onChange={(e) =>
                      setFormData({ ...formData, hometown: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 5"
                    className="admin-field-input"
                    value={formData.experienceYears}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceYears: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <Button type="button" variant="secondary" onClick={closeAddModal}>
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={
                    editingEmployee ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )
                  }
                >
                  {editingEmployee ? "Lưu thay đổi" : "Thêm nhân sự"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
