# Kế hoạch phát triển Frontend-Driven (Theo từng luồng giao diện)

Chuyển đổi chiến lược từ **Database-first / Layer-first** sang **Frontend-driven (Vertical Slices)**. Backend sẽ được xây dựng theo từng luồng màn hình của ứng dụng React/Vite (được trích xuất từ branch `feature/frontend-initial-setup`), giúp mỗi giai đoạn đều có thể cắm giao diện vào chạy thật (tắt `VITE_USE_MOCK=false` từng phần) thay vì chỉ test qua API/Postman.

---

## Đối chiếu giữa Frontend hiện tại & Backend

Frontend React/Vite (TypeScript + Tailwind) đã có sẵn UI hoàn chỉnh và tầng mock API (`frontend/src/api/mockClient.ts`):

| Luồng Frontend | Màn hình | API Frontend đang gọi | Backend App tương ứng | Trạng thái Mock |
|---|---|---|---|---|
| **1. Auth** | `/auth/login`<br>`/auth/register`<br>`/customer/profile` | `POST /public/auth/login`<br>`POST /public/auth/register`<br>`GET/PUT /auth/profile` | `accounts` | `mockLogin`<br>`mockRegister`<br>`mockGetProfile` |
| **2. Admin Config** | `/admin/routes`<br>`/admin/buses`<br>`/admin/users` | `GET/POST/PUT /admin/routes`<br>`GET/POST/PUT /admin/buses`<br>`GET/POST/PUT /admin/users` | `operations`<br>`accounts` | `mockGetRoutes...`<br>`mockGetBuses...`<br>`mockGetUsers...` |
| **3. Dispatcher** | `/dispatcher` | `GET/POST /trips`<br>`GET /employees/available`<br>`POST /trip-assignments` | `operations`<br>`accounts` | `mockGetTrips...`<br>`mockAssignTrip` |
| **4. Customer Booking** | `/customer/booking`<br>`/customer/tickets` | `GET /public/trips/search`<br>`GET /public/trips/:id/seats`<br>`POST /private/tickets`<br>`GET /private/tickets/my` | `operations`<br>`bookings`<br>`payments` | `mockSearchTrips`<br>`mockGetTripSeats`<br>`mockBookTicket` |
| **5. Admin Dashboard** | `/admin/dashboard` | `GET /admin/dashboard` | `operations`<br>`bookings`<br>`accounts` | `mockGetAdminDashboard` |

---

## Các điểm kiến trúc trọng yếu cần chốt

1. **Cơ chế Authentication:**
   - Frontend `apiClient.ts` gửi `Authorization: Bearer <token>` lưu trong `localStorage`.
   - Backend hỗ trợ `rest_framework.authtoken` (TokenAuthentication) hoặc kết hợp Session để tương thích ngay với `apiClient.ts` của Frontend mà không cần sửa giao diện.
2. **Đồng bộ Role Enum:**
   - Frontend: `ADMIN`, `STAFF`, `CUSTOMER`.
   - Backend: `ADMIN`, `DISPATCHER`, `TICKET_AGENT`, `CUSTOMER`.
   - `STAFF` phía Frontend sẽ tương ứng với `DISPATCHER` hoặc `TICKET_AGENT` phía Backend.
3. **Mã nguồn Frontend:**
   - Nhánh `feature/frontend-initial-setup` đã có đầy đủ thư mục `frontend/` (React/Vite). Ta có thể tích hợp mã nguồn frontend vào workspace để chạy `npm run dev` song song với backend.

---

## Chi tiết 5 Phase Frontend-Driven

### Phase 1 — Luồng Authentication (`/auth/login`, `/auth/register`, `/auth/profile`)

Mục tiêu: Đăng ký, đăng nhập và lấy thông tin cá nhân từ UI thật.

1. **Backend Endpoints:**
   - `POST /api/public/auth/register`: Đăng ký tài khoản (tạo user `role=CUSTOMER`, hash password, trả về token + user data).
   - `POST /api/public/auth/login`: Xác thực username/password, trả về `token` + `user` object khớp với `User` type của frontend (`id`, `username`, `fullName`, `email`, `role`, `phone`).
   - `GET /api/auth/profile` & `PUT /api/auth/profile`: Lấy và cập nhật thông tin cá nhân.
2. **Kiểm thử trên Frontend:**
   - Bật `VITE_USE_MOCK=false` cho module auth.
   - Thử nghiệm đăng ký tài khoản mới trên UI `/auth/register` -> Lưu vào MySQL -> Đăng nhập thành công tại `/auth/login` -> Điều hướng vào trong app.

---

### Phase 2 — Luồng Admin Quản trị Hạ tầng (`/admin/routes`, `/admin/buses`, `/admin/users`)

Mục tiêu: Cho phép Admin cấu hình danh mục dữ liệu nền tảng trên giao diện.

1. **Backend Models & Migrations:**
   - `operations.Station` & `operations.Route`: Tuyến đường, bến xe, giá cơ bản, khoảng cách.
   - `operations.Bus` & `operations.BusSeat`: Xe, biển số, loại xe, số chỗ, ma trận ghế.
   - `accounts.Employee`: Tài xế, phụ xe, kiểm tra bằng lái.
2. **Backend Endpoints:**
   - `/api/admin/routes`: CRUD tuyến đường.
   - `/api/admin/buses`: CRUD xe, cập nhật trạng thái (AVAILABLE, MAINTENANCE), sinh tự động danh sách ghế `BusSeat`.
   - `/api/admin/users`: Quản lý người dùng và nhân viên, khóa/mở khóa tài khoản, reset mật khẩu.
3. **Kiểm thử trên Frontend:**
   - Chạy trang `/admin/routes`: tạo tuyến Hà Nội - Đà Nẵng.
   - Chạy trang `/admin/buses`: tạo xe, cấu hình ghế.
   - Chạy trang `/admin/users`: tạo nhân viên tài xế.

---

### Phase 3 — Luồng Dispatcher Quản lý Chuyến & Điều tài (`/dispatcher`)

Mục tiêu: Cho phép Điều hành viên tạo lịch chạy và phân công tài xế/phụ xe.

1. **Backend Models & Migrations:**
   - `operations.Trip`: Chuyến xe gắn với Route, Bus, thời gian đi/đến, trạng thái (SCHEDULED/OPEN_FOR_BOOKING).
   - `operations.TripStaffAssignment`: Gán Driver và Bus Attendant vào Trip, kiểm tra không bị trùng lịch (overlap).
2. **Backend Endpoints:**
   - `GET /api/trips`: Danh sách chuyến kèm bộ lọc (ngày, route, trạng thái).
   - `POST /api/trips`: Tạo chuyến xe mới.
   - `GET /api/employees/available`: Danh sách tài xế/phụ xe đang rảnh trong khung giờ chuyến đi.
   - `POST /api/trip-assignments`: Gán nhân viên vào chuyến.
3. **Kiểm thử trên Frontend:**
   - Điều hành viên vào `/dispatcher`, chọn ngày, tạo chuyến mới, gán tài xế hợp lệ.

---

### Phase 4 — Luồng Customer Tìm chuyến & Đặt vé (`/customer/booking`, `/customer/tickets`)

Mục tiêu: Khách hàng tìm chuyến, chọn ghế trên sơ đồ trực quan, tạo booking và thanh toán VietQR.

1. **Backend Models & Migrations:**
   - `bookings.Booking`: Mã đặt chỗ, tổng tiền, trạng thái (PENDING, CONFIRMED, EXPIRED, CANCELLED), thời hạn giữ chỗ 15 phút.
   - `bookings.Ticket`: Vé gắn với ghế, hành khách, trạng thái (HELD, CONFIRMED).
   - `payments.Payment`: Tích hợp tạo VietQR thanh toán (SePay/VietQR).
2. **Backend Endpoints:**
   - `GET /api/public/trips/search`: Tìm chuyến theo điểm đi, điểm đến, ngày đi.
   - `GET /api/public/trips/:id/seats`: Trả về sơ đồ ghế của xe (mã ghế, tọa độ X/Y, trạng thái đã đặt hay còn trống).
   - `POST /api/private/tickets`: Đặt giữ chỗ (atomic transaction, chống trùng ghế).
   - `GET /api/private/tickets/my`: Danh sách vé của khách hàng.
   - `PUT /api/private/tickets/:id/cancel`: Hủy vé pending.
3. **Kiểm thử trên Frontend:**
   - Khách tìm chuyến, chọn ghế trên sơ đồ xe.
   - Đặt vé -> Hiển thị mã QR thanh toán và đồng hồ đếm ngược giữ chỗ 15 phút.

---

### Phase 5 — Luồng Admin Dashboard & Báo cáo (`/admin/dashboard`) [HOÀN THÀNH]

Mục tiêu: Tổng hợp số liệu vận hành và doanh thu thực tế.

1. **Backend Endpoints:**
   - `GET /api/admin/dashboard` (hỗ trợ cả trailing slash):
     - `totalUsers`: Tổng người dùng.
     - `totalBuses`: Tổng số xe trong hệ thống.
     - `totalRoutes`: Tổng số tuyến đường.
     - `todayTrips`: Số chuyến chạy trong ngày hôm nay (tính theo khoảng thời gian local timezone an toàn trên MySQL).
     - `roleDistribution`: Phân bổ người dùng theo nhóm (`ADMIN`, `STAFF`, `CUSTOMER`).
     - `busStatusDistribution`: Phân bổ trạng thái xe (`AVAILABLE`, `RUNNING`, `MAINTENANCE`).
     - `insuranceAlerts`: Cảnh báo hạn bảo hiểm xe (`EXPIRED`, `EXPIRING_SOON` trong vòng 30 ngày).
2. **Kiểm thử trên Backend & Frontend:**
   - `apps/operations/tests/test_dashboard_api.py`: Kiểm thử đầy đủ các kịch bản rỗng, tính toán phân bố role, trạng thái xe, và cảnh báo bảo hiểm.
   - Màn hình `/admin/dashboard` hiển thị biểu đồ và thẻ số liệu chính xác từ database.

---

## Bảng Tổng Hợp Tiến Độ (100% Hoàn Thành)

| Phase | Luồng Nghiệp Vụ & Giao Diện | App Domain | Endpoint Chính | Trạng Thái | Số Lượng Tests |
|---|---|---|---|:---:|:---:|
| **Phase 1** | Authentication & RBAC | `accounts`, `common` | `POST /api/public/auth/login`<br>`POST /api/public/auth/register`<br>`GET/PUT /api/auth/profile` | **Hoàn thành** | 37 tests |
| **Phase 2** | Admin Infrastructure (Routes, Buses, Users) | `operations`, `accounts` | `/api/admin/routes`<br>`/api/admin/buses`<br>`/api/admin/users` | **Hoàn thành** | 16 tests |
| **Phase 3** | Dispatcher Trip Management & Assignment | `operations`, `accounts` | `GET/POST /api/trips`<br>`POST /api/trip-assignments`<br>`GET /api/employees/available` | **Hoàn thành** | 6 tests |
| **Phase 4** | Customer Search, Seat Map & Booking | `bookings`, `payments` | `GET /api/public/trips/search`<br>`GET /api/public/trips/:id/seats`<br>`POST /api/private/tickets`<br>`GET /api/private/tickets/my`<br>`PUT /api/private/tickets/:id/cancel` | **Hoàn thành** | 6 tests |
| **Phase 5** | Admin Dashboard & Analytics | `operations`, `accounts` | `GET /api/admin/dashboard` | **Hoàn thành** | 4 tests |
| **Toàn bộ** | **Tích Hợp Toàn Hệ Thống** | **All 5 Domains** | **Đầy đủ 100% Contract Frontend** | **PASS** | **69/69 tests** |

