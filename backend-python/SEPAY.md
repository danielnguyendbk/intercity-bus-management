# Thanh toán SePay

Backend đọc `backend-python/.env` theo đường dẫn cố định. Các biến bắt buộc:
`SEPAY_API_KEY`, `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_NAME`,
`SEPAY_WEBHOOK_TOKEN`. Không đưa hai khóa bí mật vào biến `VITE_*`.

Luồng online sử dụng VietQR cho tài khoản đã cấu hình, không yêu cầu BIDV doanh nghiệp
hay API tạo VA theo đơn hàng. COD vẫn thanh toán qua nhân viên.

1. Khách đã đăng nhập gọi `POST /api/private/payment/sepay/create` với `ticketId`.
   Backend lấy giá từ vé, tạo mã chuyển khoản riêng và trả QR cùng thông tin tài khoản.
   Gọi lại trên cùng vé đang chờ thanh toán trả cùng mã QR.
2. Khách chuyển đúng số tiền và nội dung QR. Frontend đọc trạng thái tại
   `GET /api/private/payment/{paymentCode}/status`; chỉ chủ vé được đọc.
3. Trong SePay Dashboard, cấu hình webhook tiền vào đến
   `https://<public-backend>/api/public/payment/sepay/webhook`.
   Backend cũng nhận URL tương thích `/api/payments/webhook/sepay/` (có hoặc
   không có dấu `/` cuối), dùng chung xác thực và đối chiếu, không chuyển hướng.
   Chọn xác thực API Key, nhập giá trị `SEPAY_WEBHOOK_TOKEN`.
   SePay gửi header `Authorization: Apikey <token>`.
   Cho phép gửi cả giao dịch chưa tách được mã thanh toán; backend tìm mã BUS
   trong nội dung giao dịch do API SePay trả về.
4. Backend dùng `SEPAY_API_KEY` với Bearer authentication để lấy giao dịch theo ID
   từ API SePay. Chỉ giao dịch tiền vào đúng tài khoản (hoặc sub-account), đúng mã,
   đúng số tiền và vé còn chờ thanh toán mới được xác nhận PAID.
   Giao dịch lặp không xác nhận thêm. Sai số tiền hoặc vé đã hủy chuyển sang
   REVIEW_REQUIRED để nhân viên đối soát, không tự xác nhận vé.
5. Sau khi commit, backend gửi SSE `payment.sepay.success` đến admin.

Khách không có nút/API tự xác nhận đã chuyển tiền. Tạo QR và đọc trạng thái không
đánh dấu đã thanh toán. API admin cũng chặn đánh dấu trả tiền thủ công cho SePay
và chặn xác nhận vé SePay chưa thanh toán; xác nhận tiền mặt/COD vẫn được giữ.

API token phải có hiệu lực để truy vấn giao dịch. Khi API SePay không truy cập được,
webhook trả 502 để SePay gửi lại; không tự đánh dấu đã trả tiền.
Máy localhost cần URL HTTPS công khai/tunnel cho callback. Chỉ có env chưa chứng minh
webhook đã được cấu hình trong Dashboard hoặc đã nhận được giao dịch thật.

Các endpoint tạo thanh toán/return/IPN của cổng cũ và endpoint khách tự đánh dấu
đã trả tiền đã bị gỡ. Cột và nhãn lịch sử trong DB được giữ để đọc giao dịch cũ.
Không chạy file SQL dump để nâng cấp dữ liệu đang sử dụng.

Giới hạn của cấu trúc hiện tại: mỗi ghế/chuyến chỉ có một bản ghi vé. Để không
gán nhầm tiền từ QR cũ cho người đặt mới, vé đã hủy nhưng có lịch sử thanh toán
không được tái sử dụng tự động; cần nhân viên xử lý. Không xóa lịch sử để mở ghế.

Kiểm tra hồi quy (SQLite tạm trong RAM, giao dịch API giả lập, không chuyển tiền):

```powershell
cd backend-python
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Tài liệu chính thức: [QR](https://docs.sepay.vn/tao-qr-code-vietqr-dong.html),
[API Token](https://docs.sepay.vn/tao-api-token.html),
[giao dịch](https://docs.sepay.vn/api-giao-dich.html),
[webhook](https://docs.sepay.vn/tich-hop-webhooks.html).
