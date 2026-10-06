// ============================================================================
// ADMIN USERS PAGE — Quản lý tài khoản (Admin)
// Thiết kế: Enterprise SaaS Dark • Clean Data Density • Reusable Design System
// ============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Lock, Unlock, Key, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getUsers,
  createUser,
  updateUser,
  lockUnlockUser,
  resetUserPassword,
  deleteUser,
  AdminUser,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/ui/StatusBadge";
import PageHeader from "../../components/ui/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import { Toolbar, SearchInput, SelectInput } from "../../components/ui/Toolbar";
import { UserRole } from "../../types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "ADMIN", label: "Admin" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "LOCKED", label: "Bị khóa" },
  { value: "INACTIVE", label: "Đã xóa" },
];

const EMPLOYEE_TYPE_OPTIONS = [
  { value: "DRIVER", label: "Tài xế" },
  { value: "ASSISTANT", label: "Phụ xe" },
  { value: "DISPATCHER", label: "Điều phối" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "TECHNICIAN", label: "Kỹ thuật" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadUsers = useCallback(() => {
    setIsLoading(true);

    getUsers({
      keyword: keyword || undefined,
      role: filterRole || undefined,
      status: filterStatus || undefined,
    })
      .then((data) => {
        setUsers(data);
        setCurrentPage(1);
      })
      .catch((err) =>
        toast.error(extractApiErrorMessage(err) || "Không thể tải danh sách người dùng")
      )
      .finally(() => setIsLoading(false));
  }, [keyword, filterRole, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedUsers = users.slice(
    (validCurrentPage - 1) * ITEMS_PER_PAGE,
    validCurrentPage * ITEMS_PER_PAGE
  );

  const handleCreate = async (form: CreateForm) => {
    setIsSaving(true);
    try {
      await createUser({
        username: form.username,
        password: form.password,
        email: form.email,
        phone: form.phone,
        role: form.role,
      });

      toast.success("Tạo tài khoản thành công");
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (form: EditForm) => {
    if (!selectedUser) return;
    setIsSaving(true);

    try {
      await updateUser(selectedUser.id, {
        email: form.email,
        phone: form.phone,
        fullName: form.fullName,
        employeeType: form.employeeType,
      });

      toast.success("Cập nhật thông tin thành công");
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockUnlock = async (user: AdminUser) => {
    if (user.status === "INACTIVE") {
      toast.error("Tài khoản đã xóa không thể khóa hoặc mở khóa");
      return;
    }

    try {
      const updated = await lockUnlockUser(user.id);
      toast.success(
        updated.status === "LOCKED"
          ? `Đã khóa tài khoản ${user.username}`
          : `Đã mở khóa tài khoản ${user.username}`
      );
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  const handleResetPassword = async (id: number, newPassword: string) => {
    try {
      await resetUserPassword(id, newPassword);
      toast.success("Đổi mật khẩu thành công");
      setShowPasswordModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.status === "INACTIVE") {
      toast.error("Tài khoản này đã bị xóa");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tài khoản "${user.username}" không?`
    );
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      toast.success(`Đã xóa tài khoản ${user.username}`);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Account Management"
        title="Quản lý tài khoản"
        subtitle="Quản lý tài khoản admin, nhân viên và khách hàng trong hệ thống."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Tạo tài khoản
          </Button>
        }
      />

      {/* 2. Filter / Search Toolbar */}
      <Toolbar>
        <SearchInput
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm tên đăng nhập, email..."
        />
        <SelectInput
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          options={ROLE_FILTER_OPTIONS}
        />
        <SelectInput
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </Toolbar>

      {/* 3. Data Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#172338] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[780px] lg:min-w-full">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#121d30]">
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tài khoản
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Vai trò
                </th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Trạng thái
                </th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Loại nhân sự
                </th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Ngày tạo
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right pr-5">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    Không tìm thấy tài khoản nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.02] transition-colors h-[68px]"
                  >
                    {/* User Identity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-emerald-400 border border-white/[0.08]">
                          {user.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-sm">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {user.fullName || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-slate-300 font-normal">
                      {user.email || "—"}
                    </td>

                    {/* Role */}
                    <td className="px-3 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <StatusBadge status={user.status} />
                    </td>

                    {/* Employee Type */}
                    <td className="px-3 py-3 text-xs text-slate-300">
                      {user.employeeType || "—"}
                    </td>

                    {/* Created At */}
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton
                          tooltip="Sửa thông tin"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>

                        <IconButton
                          tooltip={user.status === "LOCKED" ? "Mở khóa" : "Khóa tài khoản"}
                          variant="warning"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleLockUnlock(user)}
                        >
                          {user.status === "LOCKED" ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </IconButton>

                        <IconButton
                          tooltip="Đổi mật khẩu"
                          variant="info"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </IconButton>

                        <IconButton
                          tooltip="Xóa tài khoản"
                          variant="danger"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-white/[0.08] bg-[#121d30]/60 p-3">
            <Pagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSaving={isSaving}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleEdit}
          isSaving={isSaving}
        />
      )}

      {showPasswordModal && selectedUser && (
        <ResetPasswordModal
          username={selectedUser.username}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onSubmit={(password) => handleResetPassword(selectedUser.id, password)}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isCustomer = role === "CUSTOMER";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isCustomer
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
          : "bg-blue-500/10 text-blue-300 border-blue-500/25"
      }`}
    >
      {isCustomer ? "Khách hàng" : "Admin"}
    </span>
  );
}

interface CreateForm {
  username: string;
  password: string;
  email: string;
  phone: string;
  role: UserRole;
}

function CreateUserModal({
  onClose,
  onSubmit,
  isSaving,
}: {
  onClose: () => void;
  onSubmit: (form: CreateForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "CUSTOMER",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title="Tạo tài khoản mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tên đăng nhập" required>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="admin-field-input"
            required
            placeholder="VD: nguyenvana"
          />
        </FormField>

        <FormField label="Mật khẩu" required>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="admin-field-input"
            required
            minLength={6}
            placeholder="Tối thiểu 6 ký tự"
          />
        </FormField>

        <FormField label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="admin-field-input"
            required
            placeholder="VD: user@example.com"
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="admin-field-input"
            placeholder="VD: 0912345678"
          />
        </FormField>

        <FormField label="Vai trò" required>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="admin-field-select"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditForm {
  email: string;
  phone: string;
  fullName: string;
  employeeType: string;
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  isSaving,
}: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (form: EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    email: user.email || "",
    phone: user.phone || "",
    fullName: user.fullName || "",
    employeeType: user.employeeType || "",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title={`Sửa tài khoản: ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="admin-field-input"
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="admin-field-input"
          />
        </FormField>

        <FormField label="Họ tên">
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="admin-field-input"
          />
        </FormField>

        <FormField label="Loại nhân sự">
          <select
            value={form.employeeType}
            onChange={(e) => setForm({ ...form, employeeType: e.target.value })}
            className="admin-field-select"
          >
            <option value="">— Không xác định —</option>
            {EMPLOYEE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  username,
  onClose,
  onSubmit,
}: {
  username: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải từ 6 ký tự trở lên");
      return;
    }
    onSubmit(password);
  };

  return (
    <Modal title={`Đổi mật khẩu: ${username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Mật khẩu mới" required>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-field-input"
            required
            minLength={6}
            placeholder="Tối thiểu 6 ký tự"
          />
        </FormField>

        <FormField label="Xác nhận mật khẩu" required>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="admin-field-input"
            required
            minLength={6}
            placeholder="Nhập lại mật khẩu mới"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary">
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#172338] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <IconButton
            variant="default"
            size="md"
            onClick={onClose}
            tooltip="Đóng"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}