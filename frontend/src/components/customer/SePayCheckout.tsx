import { useEffect, useRef, useState } from "react";
import { createSepayPayment, getPaymentStatus, TicketRecord } from "../../api/customer";
import { formatPrice } from "../../utils/format";

export default function SePayCheckout({ ticketId, onPaid }: { ticketId: number; onPaid: () => void }) {
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("PENDING");
  const paidCallback = useRef(onPaid);
  paidCallback.current = onPaid;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setTicket(null);
    setError("");
    setImageError(false);
    setStatus("PENDING");
    const poll = async (code: string) => {
      try {
        const result = await getPaymentStatus(code);
        if (cancelled) return;
        setStatus(result.paymentStatus);
        setError("");
        if (result.paymentStatus === "SUCCESS") {
          paidCallback.current();
          return;
        }
        if (result.paymentStatus !== "PENDING") return;
      } catch (err: any) {
        if (cancelled) return;
        setError("Chưa cập nhật được trạng thái. Nếu đã chuyển tiền, vui lòng không chuyển lại.");
        if ([401, 403, 404].includes(err?.response?.status)) return;
      }
      if (!cancelled) timer = setTimeout(() => poll(code), 3000);
    };
    createSepayPayment(ticketId).then((result) => {
      if (cancelled) return;
      if (!result.qrUrl || !result.paymentCode) throw new Error("Chưa tạo được mã QR SePay.");
      setTicket(result);
      void poll(result.paymentCode);
    }).catch((err) => {
      if (!cancelled) {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Không thể tạo QR SePay. Vui lòng thử lại.");
      }
    });
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [ticketId, attempt]);

  return (
    <section className="rounded-xl border border-blue-200 bg-white p-5 text-center space-y-3" aria-label="Thanh toán SePay">
      <h3 className="font-bold text-slate-900">Quét mã VietQR thanh toán qua SePay</h3>
      <div role="status" aria-live="polite">
        {status === "SUCCESS" ? <p className="text-emerald-700 font-semibold">Đã xác nhận thanh toán thành công.</p>
          : status === "REVIEW_REQUIRED" ? <p className="text-amber-700">Giao dịch cần nhân viên đối soát. Vui lòng không chuyển tiền thêm.</p>
          : status === "FAILED" ? <p className="text-amber-700">Giao dịch đã đóng. Vui lòng kiểm tra lại vé.</p>
          : !ticket && !error ? <p className="text-slate-500">Đang tạo mã QR…</p> : null}
      </div>
      {ticket && status === "PENDING" && <>
        <p className="text-xl font-bold">{formatPrice(ticket.price)}</p>
        {!imageError ? <img src={ticket.qrUrl} alt="Mã VietQR thanh toán vé qua SePay" className="mx-auto w-64 h-64 object-contain" onError={() => setImageError(true)} />
          : <p className="text-amber-700">Không tải được ảnh QR. Bạn có thể chuyển khoản theo thông tin bên dưới.</p>}
        <dl className="text-sm text-left space-y-2 bg-slate-50 p-3 rounded-lg">
          <div><dt className="text-slate-500">Ngân hàng</dt><dd>{ticket.bankName}</dd></div>
          <div><dt className="text-slate-500">Số tài khoản</dt><dd className="font-mono select-all">{ticket.accountNumber}</dd></div>
          <div><dt className="text-slate-500">Chủ tài khoản</dt><dd>{ticket.accountName}</dd></div>
          <div><dt className="text-slate-500">Nội dung chuyển khoản</dt><dd className="font-mono break-all select-all">{ticket.paymentCode}</dd></div>
        </dl>
        <p className="text-xs text-slate-500">Giữ nguyên số tiền và nội dung chuyển khoản. Vé được xác nhận khi hệ thống nhận được giao dịch từ SePay.</p>
      </>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {error && !ticket && <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Thử tạo QR lại</button>}
    </section>
  );
}
