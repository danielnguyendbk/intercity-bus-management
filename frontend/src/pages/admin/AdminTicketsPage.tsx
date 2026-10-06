// ============================================================================
// ADMIN TICKETS PAGE — Quản lý vé (Admin)
// Thiết kế: Enterprise SaaS Dark • Reusable Design System • Unified Layout
// ============================================================================

import React, { useEffect, useState } from "react";
import { AdminTicket } from "../../types";
import {
  getAllTicketsForAdmin,
  confirmTicket,
  cancelTicketByAdmin,
  markTicketAsPaid,
} from "../../api/admin";
import StatusBadge from "../../components/ui/StatusBadge";
import Pagination from "../../components/ui/Pagination";
import PageHeader from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Toolbar, SearchInput, SelectInput } from "../../components/ui/Toolbar";
import { Download, Check, X, Loader2, MapPin, Flag } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const escapeCsvCell = (value: string | number | null | undefined) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "HOLD", label: "Chờ xác nhận (HOLD)" },
  { value: "CONFIRMED", label: "Đã xác nhận (CONFIRMED)" },
  { value: "PAID", label: "Đã thanh toán (PAID)" },
  { value: "CANCELLED", label: "Đã hủy (CANCELLED)" },
  { value: "REFUNDED", label: "Đã hoàn tiền (REFUNDED)" },
  { value: "BOOKED", label: "Đã giữ chỗ (BOOKED)" },
  { value: "EXPIRED", label: "Hết hạn (EXPIRED)" },
];

const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // State quản lý hành động xác nhận / hủy vé
  const [actionTicketId, setActionTicketId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getAllTicketsForAdmin();
        setTickets(data);
      } catch {
        toast.error("Lỗi khi tải danh sách vé. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  // Lọc vé kết hợp cả từ khóa tìm kiếm VÀ trạng thái
  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      (t.passengerName &&
        t.passengerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.passengerPhone && t.passengerPhone.includes(searchTerm)) ||
      t.ticketId.toString().includes(searchTerm);

    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTickets = filteredTickets.slice(
    (validCurrentPage - 1) * ITEMS_PER_PAGE,
    validCurrentPage * ITEMS_PER_PAGE
  );

  const handleExport = () => {
    if (filteredTickets.length === 0) {
      toast.error("Không có dữ liệu vé để xuất.");
      return;
    }

    const headers = [
      "Mã vé",
      "Khách hàng",
      "Số điện thoại",
      "Tuyến",
      "Khởi hành",
      "Điểm đón",
      "Điểm trả",
      "Xe",
      "Ghế",
      "Giá vé",
      "Ngày đặt",
      "Trạng thái",
    ];
    const rows = filteredTickets.map((ticket) => [
      ticket.ticketId,
      ticket.passengerName,
      ticket.passengerPhone,
      ticket.routeName,
      format(new Date(ticket.departureTime), "dd/MM/yyyy HH:mm"),
      ticket.pickupPoint,
      ticket.dropoffPoint,
      ticket.busInfo,
      ticket.seatNumber,
      ticket.price,
      ticket.bookedAt
        ? format(new Date(ticket.bookedAt), "dd/MM/yyyy HH:mm")
        : "",
      ticket.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `danh-sach-ve-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredTickets.length} vé.`);
  };

  const handleConfirm = async (ticketId: number) => {
    if (
      !window.confirm(
        "Xác nhận đã gọi điện và thông tin chính xác cho vé này? Khách vẫn có thể thanh toán sau."
      )
    )
      return;
    setActionTicketId(ticketId);
    try {
      await confirmTicket(ticketId);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === ticketId ? { ...t, status: "CONFIRMED" } : t
        )
      );
      toast.success("Đã xác nhận giữ chỗ thành công!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xác nhận vé thất bại");
    } finally {
      setActionTicketId(null);
    }
  };

  const handleMarkPaid = async (ticketId: number) => {
    if (
      !window.confirm(
        "Xác nhận khách đã thanh toán (chuyển khoản hoặc tiền mặt)?"
      )
    )
      return;
    setActionTicketId(ticketId);
    try {
      await markTicketAsPaid(ticketId);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === ticketId ? { ...t, status: "PAID" } : t
        )
      );
      toast.success("Đã xác nhận thanh toán thành công!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Cập nhật thanh toán thất bại");
    } finally {
      setActionTicketId(null);
    }
  };

  const handleCancel = async (ticketId: number) => {
    if (!window.confirm("Hủy vé này? Lịch sử đặt vé vẫn được lưu lại.")) return;
    setActionTicketId(ticketId);
    try {
      await cancelTicketByAdmin(ticketId);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === ticketId ? { ...t, status: "CANCELLED" } : t
        )
      );
      toast.success("Đã hủy vé thành công!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Hủy vé thất bại");
    } finally {
      setActionTicketId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Ticket Management"
        title="Quản lý vé đặt"
        subtitle="Theo dõi, kiểm tra thông tin hành khách và xác nhận thanh toán trên toàn hệ thống."
        actions={
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={loading}
          >
            Xuất dữ liệu
          </Button>
        }
      />

      {/* 2. Filter & Search Toolbar */}
      <Toolbar>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm theo tên khách, SĐT, mã vé..."
        />
        <SelectInput
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
        />
      </Toolbar>

      {/* 3. Data Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#172338] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#121d30]">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mã vé
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Khách hàng &amp; Liên hệ
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Chuyến đi &amp; Thời gian
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Điểm đón / Điểm trả
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Xe &amp; Ghế
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Giờ đặt
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right pr-6">
                  Trạng thái &amp; Xử lý
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <span>Đang tải danh sách vé...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    Không tìm thấy vé nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => (
                  <tr
                    key={ticket.ticketId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Ticket ID */}
                    <td className="px-5 py-4 font-semibold text-emerald-400 align-top">
                      #{ticket.ticketId}
                    </td>

                    {/* Passenger */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-white">
                        {ticket.passengerName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {ticket.passengerPhone}
                      </div>
                    </td>

                    {/* Route & Time */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-medium text-slate-200">
                        {ticket.routeName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(ticket.departureTime), "HH:mm dd/MM/yyyy")}
                      </div>
                    </td>

                    {/* Pick / Drop */}
                    <td className="px-5 py-4 align-top">
                      {ticket.pickupPoint || ticket.dropoffPoint ? (
                        <div className="space-y-1.5 max-w-xs">
                          {ticket.pickupPoint && (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold block">
                                  Đón
                                </span>
                                <span className="text-slate-300 text-xs leading-snug break-words block">
                                  {ticket.pickupPoint}
                                </span>
                              </div>
                            </div>
                          )}
                          {ticket.dropoffPoint && (
                            <div className="flex items-start gap-1.5">
                              <Flag className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold block">
                                  Trả
                                </span>
                                <span className="text-slate-300 text-xs leading-snug break-words block">
                                  {ticket.dropoffPoint}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Chưa chọn
                        </span>
                      )}
                    </td>

                    {/* Bus & Seat */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-medium text-slate-200">
                        {ticket.busInfo}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Ghế:{" "}
                        <span className="font-bold text-white font-mono">
                          {ticket.seatNumber}
                        </span>
                      </div>
                    </td>

                    {/* Booked At */}
                    <td className="px-5 py-4 align-top text-xs text-slate-400">
                      {ticket.bookedAt
                        ? format(new Date(ticket.bookedAt), "HH:mm dd/MM/yyyy")
                        : "—"}
                    </td>

                    {/* Status & Actions */}
                    <td className="px-5 py-4 align-top text-right pr-6">
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={ticket.status} />
                        {(ticket.status === "HOLD" ||
                          ticket.status === "CONFIRMED") && (
                          <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
                            {ticket.status === "HOLD" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleConfirm(ticket.ticketId)}
                                disabled={actionTicketId === ticket.ticketId}
                                isLoading={actionTicketId === ticket.ticketId}
                                leftIcon={<Check className="h-3 w-3" />}
                              >
                                Giữ chỗ
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMarkPaid(ticket.ticketId)}
                              disabled={actionTicketId === ticket.ticketId}
                              isLoading={actionTicketId === ticket.ticketId}
                              leftIcon={<Check className="h-3 w-3" />}
                            >
                              Đã thu tiền
                            </Button>

                            {ticket.status === "HOLD" && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleCancel(ticket.ticketId)}
                                disabled={actionTicketId === ticket.ticketId}
                                leftIcon={<X className="h-3 w-3" />}
                              >
                                Hủy
                              </Button>
                            )}
                          </div>
                        )}
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
    </div>
  );
};

export default AdminTicketsPage;
