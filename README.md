# Intercity Bus Management System (Hệ Thống Quản Lý Xe Khách Liên Tỉnh)

Hệ thống quản lý bán vé và điều hành xe khách liên tỉnh toàn diện. Dự án bao gồm Backend Django REST Framework (DRF), ứng dụng Frontend React/Vite/Tailwind với các cổng dành cho Khách hàng, Điều hành viên và Quản trị viên, cùng tích hợp thanh toán tự động VietQR qua cổng SePay.

## Công nghệ sử dụng

- **Backend:** Python 3.12, Django 5.2.17, Django REST Framework 3.18.0
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Zustand
- **Database:** MySQL 8.0+
- **Xác thực:** Session-based DRF Authentication & django-allauth Google OAuth
- **Cổng thanh toán:** SePay VietQR Webhook (tự động khớp giao dịch thời gian thực)

---

## Cài đặt và Chạy thử (Local Setup)

### 1. Cài đặt Backend (PowerShell)

Tạo database `intercity_bus_management` trong MySQL. Django migrations là nguồn sự thật duy nhất (không chạy trực tiếp file SQL).

```powershell
cd 'D:\Documents\PTIT DOC\Python\intercity-bus-management'
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Tạo file `.env` từ `.env.example` và cấu hình thông số kết nối MySQL cùng SePay:

```powershell
Copy-Item .env.example .env
```

Chạy migration và nạp dữ liệu mẫu ban đầu:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_bus_company_data
```

Khởi chạy máy chủ backend:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 8000
```

* Backend API: `http://127.0.0.1:8000/api/`
* Django Admin: `http://127.0.0.1:8000/admin/`
* Health Check: `http://127.0.0.1:8000/health/`

### 2. Cài đặt Frontend

Mở một cửa sổ terminal mới và khởi chạy giao diện người dùng:

```powershell
cd frontend
npm install
npm run dev
```

* Ứng dụng Frontend: `http://localhost:5173/`
* Chuyển đổi giữa chế độ Real API và Mock Data: chỉnh biến `VITE_USE_MOCK=false` trong `frontend/.env`.

---

## Hướng dẫn Test Thanh toán SePay VietQR (Sử dụng ngrok)

Hệ thống tích hợp quy trình thanh toán tự động thông qua **SePay Webhook**:
1. Khách hàng chọn tuyến, chuyến, ghế và chuyển đến bước Thanh toán (`/booking`).
2. Hệ thống sinh mã thanh toán duy nhất (`PAY-XXXXXX`) và hiển thị mã QR VietQR động.
3. Khi khách hàng chuyển khoản, ngân hàng gửi biến động số dư tới SePay -> SePay bắn Webhook tới Backend.
4. Backend đối soát số tiền và mã `payment_code`, tự động chuyển trạng thái vé sang `CONFIRMED`.
5. Frontend tự động Polling và hiển thị vé ngay tức thì mà không cần reload trang.

---

### Bước 1: Cấu hình biến môi trường SePay trong `.env`

Đảm bảo file `.env` ở thư mục gốc có các biến sau:

```ini
SEPAY_API_KEY=sepay_secret_key_demo
SEPAY_BANK_CODE=MBBank
SEPAY_ACCOUNT_NUMBER=0901000001
SEPAY_ACCOUNT_NAME=CONG TY XE KHACH LIEN TINH
SEPAY_WEBHOOK_SECRET=sepay_secret_key_demo
```

> **Lưu ý:** `SEPAY_API_KEY` dùng để xác thực các request Webhook gửi tới hệ thống nhằm tránh bị giả mạo.

---

### Bước 2: Tạo đường hầm Public với `ngrok`

Vì SePay là dịch vụ trực tuyến cần gọi Webhook về máy local của bạn, bạn cần sử dụng `ngrok` để public cổng `8000`:

```powershell
# Chạy file ngrok.exe có sẵn trong repo hoặc từ lệnh hệ thống
.\ngrok.exe http 8000
```

Ngrok sẽ hiển thị thông tin forwarding, ví dụ:
```text
Forwarding   https://abcd-1234-5678.ngrok-free.app -> http://localhost:8000
```

Địa chỉ Webhook public của bạn sẽ có dạng:
```
https://abcd-1234-5678.ngrok-free.app/api/payments/webhook/sepay/
```

---

### Bước 3: Cấu hình Webhook trên trang quản trị SePay

1. Đăng nhập vào tài khoản [my.sepay.vn](https://my.sepay.vn/).
2. Vào mục **Cấu hình Webhooks (Webhooks Settings)** -> Bấm **Tạo Webhook mới (Create Webhook)**.
3. Điền các thông tin:
   * **URL:** `https://abcd-1234-5678.ngrok-free.app/api/payments/webhook/sepay/`
   * **Phương thức:** `POST`
   * **Xác thực (Authentication):** Chọn `API Key` (hoặc cấu hình Header `Authorization: Apikey <SEPAY_API_KEY>`).
   * **API Key:** Điền giá trị giống với biến `SEPAY_API_KEY` trong `.env` (ví dụ: `sepay_secret_key_demo`).
4. Bấm **Lưu Webhook**.

---

### Bước 4: Thực hiện Test luồng Thanh toán

#### Cách A: Chuyển khoản thật hoặc dùng tính năng Test Webhook trên SePay
* Trên SePay Dashboard, bấm **Test Webhook** và chọn giao dịch gửi thử tới URL ngrok.
* Hoặc chuyển khoản 2,000đ - 10,000đ vào tài khoản ngân hàng liên kết SePay với nội dung là mã thanh toán (ví dụ: `PAY-18020054-DF6A`).

#### Cách B: Giả lập Webhook SePay qua cURL hoặc Postman (Khuyên dùng khi Dev)
Bạn có thể mô phỏng request mà SePay gửi về trực tiếp thông qua URL ngrok (hoặc local) bằng lệnh PowerShell sau:

```powershell
# Thay mã PAYMENT_CODE và SỐ TIỀN tương ứng với Booking vừa tạo
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Apikey sepay_secret_key_demo"
}

$body = @{
    "id" = 998801
    "gateway" = "MBBank"
    "transactionDate" = "2026-09-23 15:30:00"
    "accountNumber" = "0901000001"
    "transferType" = "in"
    "transferAmount" = 280000
    "code" = "PAY-18020054-DF6A"
    "content" = "PAY-18020054-DF6A chuyen tien ve xe"
    "referenceCode" = "FT260923TEST01"
    "description" = "Thanh toan ve xe lien tinh"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://abcd-1234-5678.ngrok-free.app/api/payments/webhook/sepay/" -Method Post -Headers $headers -Body $body
```

**Kết quả trả về thành công:**
```json
{
  "success": true,
  "status": "CONFIRMED",
  "message": "Thanh toán thành công và đã xác nhận đặt vé",
  "paymentCode": "PAY-18020054-DF6A",
  "bookingCode": "BK-260923-0001"
}
```

---

### Bước 5: Kiểm tra kết quả sau khi Webhook nhận thành công

1. **Trên giao diện Web (Frontend):**
   * Màn hình thanh toán của khách hàng tự động chuyển từ trạng thái *Chờ thanh toán* sang màn hình **Vé của tôi** kèm mã vé, thông tin chuyến và QR code của vé.
2. **Kiểm tra trạng thái thanh toán bằng API Polling:**
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payments/PAY-18020054-DF6A/status/" -Method Get
   ```
3. **Cơ chế An toàn & Phòng chống lỗi của hệ thống:**
   * **Idempotency (Trùng lặp):** Gửi lại cùng một `id` giao dịch sẽ được nhận diện là `ALREADY_PROCESSED` và không bị cộng dồn hay phát sinh vé lặp.
   * **Sai số tiền / Hết hạn:** Nếu khách hàng chuyển thiếu tiền hoặc chuyển sau khi Booking đã hết hạn (`expires_at`), giao dịch tự động chuyển sang trạng thái `REVIEW_REQUIRED` để nhân viên hỗ trợ xử lý thủ công, tránh mất tiền của khách.

---

### Mẹo: Test nhanh không cần ngrok (Endpoint Mô phỏng nội bộ)

Trong quá trình phát triển hoặc demo chấm đồ án nội bộ không có mạng ngoài, hệ thống cung cấp sẵn endpoint mô phỏng:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payments/simulate/" -Method Post `
  -Headers @{"Content-Type" = "application/json"} `
  -Body '{"paymentCode": "PAY-18020054-DF6A", "amount": 280000}'
```

---

## URL Namespaces & Endpoints chính

- `/admin/`: Django Admin.
- `/api/accounts/`: Đăng nhập, đăng ký, hồ sơ người dùng, phân quyền vai trò.
- `/api/operations/`: Quản lý bến xe, tuyến xe, phương tiện, chuyến xe và phân công tài xế/phụ xe.
- `/api/bookings/`: Tra cứu chuyến, đặt chỗ, chọn ghế, quản lý vé và hủy vé.
- `/api/payments/`:
  - `POST /api/payments/webhook/sepay/`: Tiếp nhận Webhook biến động số dư.
  - `GET /api/payments/<payment_code>/status/`: Polling trạng thái thanh toán.
  - `POST /api/payments/simulate/`: Mô phỏng thanh toán nội bộ.
- `/health/`: Kiểm tra tình trạng kết nối Database và hệ thống.
