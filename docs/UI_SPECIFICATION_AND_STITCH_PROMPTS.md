# BỘ MÔ TẢ GIAO DIỆN DỰ ÁN & PROMPT THIẾT KẾ CHO GOOGLE STITCH
> **Dự án**: Hệ Thống Quản Lý Xe Khách Liên Tỉnh (*Intercity Bus Management System - XeKhách Pro*)  
> **Phiên bản UI**: 2.0 Redesign Specification  
> **Mục đích**: Tài liệu hóa chi tiết kiến trúc giao diện hiện tại và cung cấp sẵn các câu lệnh Prompt tối ưu để đưa vào **Google Stitch / AI UI Designer** sinh ra giao diện hiện đại, cao cấp (High-End SaaS / Travel Tech).

---

## MỤC LỤC
1. [Tổng Quan Hệ Thống & Vai Trò Người Dùng](#1-tổng-quan-hệ-thống--vai-trò-người-dùng)
2. [Hệ Thống Thiết Kế Hiện Tại & Định Hướng Nâng Cấp](#2-hệ-thống-thiết-kế-hiện-tại--định-hướng-nâng-cấp)
3. [Danh Mục & Mô Tả Chi Tiết Từng Màn Hình](#3-danh-mục--mô-tả-chi-tiết-từng-màn-hình)
   - [3.1. Phân Hệ Xác Thực (Auth)](#31-phân-hệ-xác-thực-auth)
   - [3.2. Phân Hệ Khách Hàng (Customer Portal)](#32-phân-hệ-khách-hàng-customer-portal)
   - [3.3. Phân Hệ Điều Phối Viên (Dispatcher / Staff Portal)](#33-phân-hệ-điều-phối-viên-dispatcher--staff-portal)
   - [3.4. Phân Hệ Quản Trị Viên (Admin Portal)](#34-phân-hệ-quản-trị-viên-admin-portal)
4. [Bộ Câu Lệnh Prompt Sẵn Dùng Cho Google Stitch](#4-bộ-câu-lệnh-prompt-sẵn-dùng-cho-google-stitch)
   - [Prompt 0: Master Theme & System Style](#prompt-0-master-theme--system-style)
   - [Prompt 1: Khách Hàng - Đặt Vé & Sơ Đồ Ghế + VietQR SePay](#prompt-1-khách-hàng---đặt-vé--sơ-đồ-ghế--vietqr-sepay)
   - [Prompt 2: Điều Phối Viên - Trung Tâm Lịch Trình & Phân Công Tài Xế](#prompt-2-điều-phối-viên---trung-tâm-lịch-trình--phân-công-tài-xế)
   - [Prompt 3: Quản Trị Viên - Executive Analytics & Cảnh Báo Xe](#prompt-3-quản-trị-viên---executive-analytics--cảnh-báo-xe)
   - [Prompt 4: Quản Trị Viên - Quản Lý Đội Xe & Tuyến Đường](#prompt-4-quản-trị-viên---quản-lý-đội-xe--tuyến-đường)
   - [Prompt 5: Màn Hình Đăng Nhập / Đăng Ký Đẳng Cấp Cao](#prompt-5-màn-hình-đăng-nhập--đăng-ký-đẳng-cấp-cao)

---

## 1. TỔNG QUAN HỆ THỐNG & VAI TRÒ NGƯỜI DÙNG

Hệ thống quản lý xe khách liên tỉnh được xây dựng cho các nhà xe vận hành quy mô vừa và lớn, phục vụ 4 nhóm đối tượng người dùng chính:

| Vai trò | Tên hiển thị | Trách nhiệm chính trên giao diện |
| :--- | :--- | :--- |
| **CUSTOMER** | Khách hàng | Tìm kiếm chuyến đi, chọn ghế trên sơ đồ 2 tầng, điền thông tin, thanh toán quét mã VietQR SePay thời gian thực, quản lý vé và lịch sử đi xe. |
| **STAFF (DISPATCHER)** | Điều phối viên | Giám sát lịch trình xuất bến/đến bến, theo dõi trạng thái chuyến (SCHEDULED, DEPARTED, ARRIVED, DELAYED), điều động và phân công tài xế/phụ xe theo thời gian thực có kiểm tra xung đột lịch. |
| **STAFF (TICKET_AGENT)** | Nhân viên bán vé | Bán vé tại quầy, tra cứu vé, xác nhận thanh toán tiền mặt (CASH) hoặc hỗ trợ giải quyết sự cố vé. |
| **ADMIN** | Quản trị viên hệ thống | Dashboard KPI doanh thu & hoạt động xe, quản lý hạm đội xe (bảo hiểm, bảo dưỡng, trạng thái), cấu hình tuyến đường và quản lý phân quyền tài khoản nhân viên. |

---

## 2. HỆ THỐNG THIẾT KẾ HIỆN TẠI & ĐỊNH HƯỚNG NÂNG CẤP

### 2.1. Bảng màu chủ đạo (Color Palette)
- **Primary Navy (`#0F2849` / `rgb(15, 40, 73)`)**: Màu xanh hải quân đậm quyền lực cho Sidebar, Hero Header, đại diện cho tính kỷ luật và tin cậy của ngành vận tải.
- **Brand Accent Warm Amber (`#F59E0B` / `#D97706`)**: Màu vàng hổ phách năng động, dùng cho các nút CTA chính, trạng thái đang chọn (active menu item, ghế đang chọn, cảnh báo).
- **Secondary Blue (`#2563EB`)**: Màu xanh hiện đại cho các liên kết, huy hiệu thông tin, điểm đón/trả.
- **Success Emerald (`#10B981`)**: Dành cho trạng thái đã thanh toán, vé đã xác nhận, xe sẵn sàng hoạt động.
- **Warning / Alert Amber (`#F59E0B`)**: Cảnh báo xe sắp hết hạn bảo hiểm, chuyến bị trễ, vé chờ xác nhận.
- **Danger Rose (`#EF4444`)**: Cảnh báo xe quá hạn kiểm định, chuyến bị hủy, tài khoản bị khóa.
- **Backgrounds**: Slate-50 (`#F8FAFC`) nhẹ dịu cho nền app, White (`#FFFFFF`) cho các card nội dung với bo góc lớn `rounded-2xl`/`rounded-3xl` và đổ bóng nhẹ `shadow-sm`.

### 2.2. Định hướng nâng cấp thẩm mỹ khi thiết kế lại trên Stitch
- **Phong cách**: Modern Luxury SaaS Dashboard & High-conversion Booking Experience.
- **Hiệu ứng**:
  - Glassmorphism nhẹ cho Header và Floating Bar.
  - Phối màu gradient tinh tế (Deep Slate Navy sang Midnight Blue).
  - Micro-interactions: Card hover nâng nhẹ (-translate-y-1), viền sáng neon tinh tế khi focus.
  - Sơ đồ ghế (Seat Map): Thiết kế giả lập không gian xe 3D isometric hoặc 2D Flat có độ nổi, thể hiện rõ vô lăng tài xế, lối đi, tầng 1 và tầng 2.
  - Cổng thanh toán VietQR: Thiết kế chuẩn ngân hàng số (Fintech/Neobank aesthetic) với khung viền quét mã QR nổi bật, đồng hồ đếm ngược pulsing animation.

---

## 3. DANH MỤC & MÔ TẢ CHI TIẾT TỪNG MÀN HÌNH

### 3.1. Phân Hệ Xác Thực (Auth)

#### Màn hình: Đăng nhập (`/auth/login`)
- **Bố cục**: Chia đôi màn hình (Split Layout - 50/50):
  - *Cột trái*: Banner thương hiệu nền Navy Gradient `#0F2849`, họa tiết bản đồ tuyến đường xe chạy mờ, huy hiệu chứng chỉ an toàn, tiêu đề lớn *"XeKhách Pro - Hệ thống quản lý vận tải liên tỉnh"*.
  - *Cột phải*: Form đăng nhập màu trắng, sạch sẽ.
- **Thành phần**:
  - Tab chuyển vai trò nhanh demo: `Nhân viên / Điều phối`, `Quản trị viên`, `Khách hàng`.
  - Input: Tên đăng nhập (kèm icon User).
  - Input: Mật khẩu (kèm icon Khóa và nút toggle Ẩn/Hiện mật khẩu Eye/EyeOff).
  - Nút CTA *"Đăng nhập"* hiệu ứng gradient, trạng thái loading spinner.
  - Liên kết *"Chưa có tài khoản? Đăng ký ngay"*.

#### Màn hình: Đăng ký (`/auth/register`)
- **Bố cục**: Tương tự trang đăng nhập, tập trung vào trải nghiệm đăng ký tài khoản khách hàng cá nhân.
- **Thành phần**: Họ và tên, Số điện thoại, Email, Tên tài khoản, Mật khẩu, Xác nhận mật khẩu, Checkbox đồng ý điều khoản dịch vụ.

---

### 3.2. Phân Hệ Khách Hàng (Customer Portal)

#### Màn hình: Đặt Vé Trực Tuyến & Thanh Toán VietQR (`/customer/booking`)
*Đây là màn hình cốt lõi nhất của khách hàng, gồm Stepper 5 bước liên tục:*

1. **Bước 1: Tìm chuyến xe (Trip Search)**:
   - Form ngang dạng thanh tìm kiếm du lịch: Điểm đi (Dropdown bến xe), Điểm đến, Ngày khởi hành (Date picker), Nút *"Tìm chuyến"*.
   - Danh sách thẻ chuyến xe kết quả (Trip Card):
     - Giờ khởi hành - Giờ đến (kèm thời lượng di chuyển, ví dụ: `08:00 - 14:00 (6 giờ)`).
     - Tuyến đường: `TP. Hồ Chí Minh -> Đà Lạt`.
     - Loại xe (Giường nằm 40 chỗ / Limousine 22 phòng).
     - Biển số xe & Bến đi/Bến đến.
     - Số ghế trống còn lại (ví dụ: `Còn 12 chỗ`).
     - Giá vé nổi bật (ví dụ: `280.000 đ`).
     - Nút *"Chọn chuyến"*.
2. **Bước 2: Chọn ghế ngồi trên xe (Interactive Seat Map)**:
   - Hiển thị tab chuyển đổi giữa **Tầng 1 (Dưới)** và **Tầng 2 (Trên)** (đối với xe giường nằm).
   - Biểu tượng vô lăng bác tài và cửa lên xuống.
   - Lưới ma trận ghế: Mỗi ghế là một ô trực quan có mã số (`A01`, `A02`, `B01`...).
   - 4 trạng thái ghế có màu sắc và chú thích rõ ràng:
     - `Trống (Available)`: Viền xám, nền trắng.
     - `Đang giữ chỗ (Held)`: Nền vàng/cam mờ.
     - `Đã bán (Booked)`: Nền xám đậm, icon khóa/gạch chéo, disabled.
     - `Bạn đang chọn (Selected)`: Nền xanh/vàng hổ phách viền đậm, nổi bật.
   - Thẻ tóm tắt dưới chân: Ghế đã chọn, Tổng tiền tạm tính, Nút *"Tiếp tục điền thông tin"*.
3. **Bước 3: Thông tin hành khách (Passenger Form)**:
   - Họ và tên hành khách.
   - Số điện thoại liên hệ (nhận mã vé SMS/Zalo).
   - Email nhận vé điện tử.
   - Điểm đón cụ thể và ghi chú cho tài xế.
   - Bảng tóm tắt hành trình và giá vé trước khi xác nhận.
4. **Bước 4: Thanh toán tự động SePay VietQR (SePay Payment Gateway)**:
   - Đồng hồ đếm ngược giữ chỗ 15 phút (`14:59`, `14:58`...) cảnh báo hết hạn giữ ghế.
   - *Cột trái*: Khung ảnh mã QR ngân hàng chuẩn VietQR tự động sinh theo cú pháp SePay:
     - Ảnh QR rõ nét, logo ngân hàng.
     - Đốm tròn radar phát xung (`animate-ping`) với dòng chữ: *"Chờ hệ thống ngân hàng xác nhận tự động..."*.
   - *Cột phải*: Hộp thông tin chuyển khoản chi tiết kèm nút **Sao chép 1-chạm (Copy to clipboard)**:
     - Ngân hàng thụ hưởng (VD: `MBBank` / `BIDV`).
     - Tên chủ tài khoản: `CONG TY XE KHACH LIEN TINH PRO`.
     - Số tài khoản: `0901000001`.
     - Số tiền chính xác: `280.000 đ`.
     - **Nội dung chuyển khoản bắt buộc**: `PAY-18020054-DF6A` (highlight màu vàng nổi bật).
   - **Nút Demo Simulator**: Nút gradient xanh lục *"⚡ Mô phỏng chuyển khoản thành công (Dành cho Demo/Chấm đồ án)"* để kích hoạt webhook backend chuyển trạng thái tức thì mà không cần chuyển tiền thật.
5. **Bước 5: Hoàn tất & Vé điện tử (Success & E-Ticket)**:
   - Huy hiệu xanh tròn Checkmark chúc mừng.
   - Mã vé `#102` & Mã giao dịch ngân hàng.
   - Thẻ vé điện tử thiết kế phong cách Boarding Pass sân bay:
     - Cắt góc răng cưa hai bên vé.
     - Mã vạch / QR Code để phụ xe quét khi lên xe.
     - Toàn bộ thông tin lộ trình, thời gian đón, số ghế, biển số xe.
   - Nút *"Tải vé PDF / In vé"* và nút *"Về danh sách vé"*.

#### Màn hình: Vé Của Tôi (`/customer/tickets`)
- **Bố cục**: Danh sách thẻ vé dạng danh thiếp vé xe.
- **Thành phần**:
  - Lọc theo trạng thái: Tất cả, Đã thanh toán (PAID), Chờ xác nhận (BOOKED), Đã hủy (CANCELLED).
  - Từng thẻ vé hiển thị: Tuyến đường, Ngày giờ khởi hành, Số ghế, Biển số xe, Giá tiền.
  - Huy hiệu trạng thái viền mềm màu tương ứng.
  - Nút *"Hủy vé"* (đối với vé hợp lệ chưa khởi hành) có hộp thoại xác nhận modal.

#### Màn hình: Hồ Sơ Cá Nhân (`/customer/profile`)
- **Bố cục**: 2 khối chính (Thông tin cá nhân & Đổi mật khẩu).
- **Thành phần**: Ảnh đại diện Avatar, Họ tên, Email, Số điện thoại, Vai trò tài khoản, Form đổi mật khẩu mới.

---

### 3.3. Phân Hệ Điều Phối Viên (Dispatcher / Staff Portal)

#### Màn hình: Trung Tâm Điều Phối Chuyến Đi (`/staff/dashboard`)
*Màn hình tác nghiệp thời gian thực quan trọng nhất của nhân viên điều hành:*

1. **Thanh thống kê nhanh (KPI Ribbon)**:
   - Thẻ 1: Tổng số chuyến trong ngày (`24 chuyến`).
   - Thẻ 2: Chuyến đúng giờ / Đã lên lịch (`SCHEDULED - 18`).
   - Thẻ 3: Chuyến đang chạy trên đường (`RUNNING - 4`).
   - Thẻ 4: Chuyến trễ giờ / Sự cố (`DELAYED - 2`).
2. **Bảng ma trận lịch trình chuyến đi (Trip Departure Matrix)**:
   - Danh sách chuyến theo thứ tự giờ xuất bến tăng dần.
   - Cột: Mã chuyến, Tuyến đường, Xe đảm nhận (Biển số & Loại xe), Giờ xuất bến, Giờ đến bến dự kiến, Trạng thái (Dropdown đổi trạng thái nhanh: `SCHEDULED`, `RUNNING`, `COMPLETED`, `DELAYED`, `CANCELLED`).
   - Cột Tài xế & Phụ xe được chỉ định.
   - Nút hành động *"Chọn điều phối"*.
3. **Bảng phân công nhân sự trực tiếp (Live Assignment Panel)**:
   - Khi click chọn một chuyến trên danh sách, bảng bên phải/bên dưới kích hoạt:
   - Hiển thị thông tin chuyến đang chọn: Tuyến, thời gian từ mấy giờ đến mấy giờ.
   - Danh sách nhân sự hiện tại của chuyến (Đã có tài xế nào? Có phụ xe nào?).
   - Bộ chọn vai trò điều động: `Tài xế (DRIVER)` hoặc `Phụ xe (ASSISTANT)`.
   - Dropdown chọn nhân viên: **Hệ thống tự lọc thông minh chỉ hiển thị những nhân viên đang rảnh trong khung giờ đó**.
   - Cảnh báo xung đột thời gian (Conflict Alert): Nếu nhân viên đã có lịch chạy trùng giờ, hệ thống báo đỏ và chặn phân công (`BR-015`).
   - Nút xác nhận *"Phân công chuyến đi"*.

---

### 3.4. Phân Hệ Quản Trị Viên (Admin Portal)

#### Màn hình 1: Executive Analytics Dashboard (`/admin/dashboard`)
- **4 Thẻ số liệu tổng quan (Stats Cards)**:
  - Tổng số người dùng hệ thống (icon Users, màu xanh dương).
  - Tổng số xe trong hạm đội (icon Bus, màu xanh ngọc).
  - Tổng số tuyến đường đang khai thác (icon Route, màu tím).
  - Số chuyến xe vận hành hôm nay (icon Calendar, màu hổ phách).
- **Biểu đồ phân bổ tỷ lệ (Distribution Progress Rows)**:
  - Khối 1: Tỷ lệ cơ cấu người dùng (Admin, Nhân viên, Khách hàng).
  - Khối 2: Tỷ lệ trạng thái đội xe (`Sẵn sàng` - xanh lá, `Đang chạy` - xanh dương, `Đang bảo trì` - vàng cam).
- **Bảng cảnh báo an toàn kỹ thuật xe (Fleet Insurance & Maintenance Alerts)**:
  - Danh sách những xe sắp hết hạn đăng kiểm / bảo hiểm trong 30 ngày tới hoặc đã quá hạn.
  - Cột: Biển số xe, Loại xe, Trạng thái hiện tại, Ngày hết hạn, Nhãn cảnh báo nổi bật (`ĐÃ HẾT HẠN` - Đỏ rực rỡ, `SẮP HẾT HẠN` - Vàng cam).

#### Màn hình 2: Quản Lý Đội Xe Khách (`/admin/buses`)
- **Thanh công cụ**: Ô tìm kiếm biển số, Dropdown lọc theo trạng thái (`AVAILABLE`, `RUNNING`, `MAINTENANCE`), Dropdown lọc loại xe (`SLEEPER`, `SEAT`, `LIMOUSINE`), Nút *"Thêm xe mới"*.
- **Bảng dữ liệu xe**: Biển số, Loại xe, Sức chứa số ghế, Ngày bảo dưỡng gần nhất, Ngày hết hạn bảo hiểm, Trạng thái hoạt động, Cột hành động (Sửa, Đổi trạng thái).
- **Modal Thêm / Chỉnh sửa xe**: Nhập biển số, chọn loại xe, số ghế ngồi tự động điền, chọn ngày bảo hiểm, chọn ngày bảo dưỡng.

#### Màn hình 3: Quản Lý Tuyến Đường (`/admin/routes`)
- **Thanh công cụ**: Tìm kiếm tên bến/tỉnh thành, Lọc tuyến đang hoạt động, Nút *"Tạo tuyến mới"*.
- **Bảng dữ liệu tuyến**: Mã tuyến (`RT-01`), Tên tuyến (`TP. Hồ Chí Minh -> Đà Lạt`), Bến đi, Bến đến, Khoảng cách (km), Thời gian ước tính (giờ/phút), Giá vé sàn (VND), Trạng thái kích hoạt (Toggle switch On/Off), Nút Chỉnh sửa.
- **Modal Tạo tuyến**: Chọn Bến xuất phát, Bến kết thúc, Cự ly km, Thời lượng tính bằng phút, Giá tiền cơ sở.

#### Màn hình 4: Quản Trị Người Dùng & Phân Quyền (`/admin/users`)
- **Thanh công cụ**: Tìm kiếm họ tên/email/phone, Lọc theo vai trò (`ADMIN`, `STAFF`, `CUSTOMER`), Lọc trạng thái (`ACTIVE`, `LOCKED`), Nút *"Tạo tài khoản"*.
- **Bảng dữ liệu người dùng**: ID, Tên tài khoản, Họ tên, Email, Số điện thoại, Vai trò, Vị trí chuyên môn nhân viên (`DRIVER`, `ASSISTANT`, `DISPATCHER`), Trạng thái hoạt động, Cột thao tác nhanh.
- **Thao tác nhanh**:
  - Nút **Khóa / Mở khóa** tài khoản (Lock/Unlock icon) đổi trạng thái tức thì.
  - Nút **Đặt lại mật khẩu (Reset Password Modal)**: Nhập mật khẩu mới trực tiếp cho nhân viên khi quên mật khẩu.
  - Nút Chỉnh sửa thông tin tài khoản.

---

## 4. BỘ CÂU LỆNH PROMPT SẴN DÙNG CHO GOOGLE STITCH

Bạn chỉ cần **sao chép (Copy) nguyên văn** các đoạn mã prompt bên dưới và dán vào thanh chat của **Google Stitch** để công cụ sinh ra mã nguồn giao diện HTML/CSS/Tailwind đỉnh cao.

---

### PROMPT 0: MASTER THEME & SYSTEM STYLE
*(Dùng prompt này trước để thiết lập phong cách chuẩn cho toàn bộ dự án)*

```text
Design a world-class, modern, enterprise-grade UI design system for an intercity bus fleet management and ticket booking web application named "XeKhách Pro".

Core Aesthetic & Tone:
- Industry: Modern Transportation & Travel Tech (combining the operational rigor of airline dispatch systems with the sleek consumer booking ease of Booking.com / Grab).
- Color Palette:
  * Primary: Deep Obsidian Navy (#0F2849) for navigation bars, sidebar, and high-emphasis headers.
  * Secondary: Cobalt Blue (#2563EB) for interactive buttons and informational highlights.
  * Accent / Brand Warmth: Amber Gold (#F59E0B) for primary CTAs, active highlights, and seat selection indicators.
  * Success: Emerald Green (#10B981) for confirmed bookings, valid payments, and active buses.
  * Warning: Bright Amber (#F59E0B) for maintenance, schedule delays, and expiring documents.
  * Danger / Critical: Coral Red (#EF4444) for cancelled trips, locked accounts, and expired insurance.
  * Canvas Background: Clean Slate-50 (#F8FAFC) with pure White (#FFFFFF) rounded cards (border-radius: 16px to 24px) with subtle borders (border-slate-200) and soft atmospheric shadows (shadow-sm to shadow-md).
- Typography: Clean geometric sans-serif (Inter or Plus Jakarta Sans). High readability for tabular schedules and numerical seat identifiers.
- Icons: Lucide React icon set with precise stroke width (1.75px).
- Feel: Premium, ultra-responsive, trustworthy, polished micro-interactions, clean status badges with soft backgrounds and contrasting text.
```

---

### PROMPT 1: KHÁCH HÀNG - ĐẶT VÉ & SƠ ĐỒ GHẾ + VIETQR SEPAY
*(Màn hình quan trọng nhất của người dùng khách hàng)*

```text
Create a pixel-perfect, high-conversion 5-step bus ticket booking experience for "XeKhách Pro" using React, Tailwind CSS, and Lucide icons.

The page must feature a smooth, horizontal stepper with 5 states:
1. Search & Select Trip
2. Interactive 2-Deck Sleeper Seat Map
3. Passenger Information
4. Instant SePay VietQR Payment (Real-time fintech checkout)
5. Booking Confirmed & Boarding Pass (E-Ticket)

Specific UI Details for Key Steps:

Step 1 - Trip Search & Card Results:
- Modern travel search widget: Origin Station, Destination Station, Departure Date picker, and "Find Trips" button.
- Trip Result Cards displaying: Departure & Arrival times, duration (e.g. "08:00 -> 14:00 (6h)"), Route ("TP. Hồ Chí Minh -> Đà Lạt"), Bus badge ("Limousine Sleeper 34 Beds"), Remaining seats badge ("12 seats left"), Price ("280,000 VND"), and a prominent "Select Trip" CTA.

Step 2 - Interactive Sleeper Bus Seat Map:
- Toggle tabs for "Floor 1 (Lower Deck)" and "Floor 2 (Upper Deck)".
- Bus cockpit illustration at the top (steering wheel icon, entrance door).
- Grid of sleeper berths with clear labels (A01 to A15 on Floor 1, B01 to B15 on Floor 2).
- Visual legend for 4 seat states: Available (clean white border), Held (soft amber), Booked (disabled slate with lock icon), and Selected (glowing amber/navy accent).
- Sticky bottom summary bar showing: Selected seat number, unit price, and "Proceed to Passenger Info" button.

Step 4 - SePay VietQR Live Payment Screen (Killer Feature):
- 15-minute countdown urgency timer with clock icon ("Time remaining to hold seat: 14:45").
- Left Column: Prominent dynamic VietQR card featuring the scanned bank QR code image with rounded corners, subtle shadow, bank logo, and a pulsing radar indicator ("Waiting for automatic banking webhook confirmation...").
- Right Column: Bank transfer details card with 1-click "Copy" buttons:
  * Bank Name: MBBank (Military Bank)
  * Account Holder: CONG TY XE KHACH LIEN TINH PRO
  * Account Number: 0901000001
  * Exact Amount: 280,000 VND
  * Transfer Content / Code: PAY-18020054-DF6A (highlighted in golden yellow pill with warning note: "Keep exact code for instant auto-approval").
- Demo Simulator Action: A stylish gradient button: "⚡ Simulate Instant Bank Transfer (For Demo / Evaluation)" with micro-animations.

Step 5 - Success Confirmation:
- Airline-style e-ticket with perforated ticket edge effect, QR code for boarding check-in, complete trip itinerary breakdown, passenger name, seat number, and "Print / Download PDF" button.
```

---

### PROMPT 2: ĐIỀU PHỐI VIÊN - TRUNG TÂM LỊCH TRÌNH & PHÂN CÔNG TÀI XẾ
*(Màn hình tác nghiệp chính của nhân viên điều phối)*

```text
Design a professional real-time Dispatcher Operations Dashboard for "XeKhách Pro" bus company.

Layout & Components:
1. Top KPI Summary Strip:
   - 4 glassmorphic metric cards: Total Scheduled Trips Today, On-Time Departures, In-Transit Trips (Running), and Delayed/Alert Trips with color-coded status pills.

2. Main Section: Master Departure Schedule Table:
   - Filter bar: Filter by Departure Station, Route, and Status (SCHEDULED, RUNNING, COMPLETED, DELAYED, CANCELLED).
   - Dense, high-legibility data table with columns:
     * Trip ID & Departure Time (e.g. "06:30 AM - Today").
     * Route & Direction with arrow icon ("Hà Nội -> Sapa").
     * Bus Info (License plate pill "29B-123.45", Bus Type "Sleeper 40").
     * Assigned Driver & Assistant Driver avatar pills.
     * Real-time Trip Status badge with inline status toggle dropdown.
     * "Dispatch / Assign Staff" action button.

3. Live Crew Assignment Drawer / Modal:
   - Header displaying the focused trip details and departure time window.
   - Assignment form with radio toggle for Role: "Primary Driver" vs "Assistant / Conductor".
   - Smart Employee Dropdown: Must display employee name, phone, license grade (e.g. "Hạng E"), and an "Available" green dot.
   - Real-time Conflict Alert Box: If an employee already has an overlapping trip within that time window, show a warning card in red/amber explaining: "Schedule Conflict: Driver is currently assigned to Trip #TR-108 (07:00 - 13:00)".
   - Action buttons: "Cancel" and "Confirm Assignment".
```

---

### PROMPT 3: QUẢN TRỊ VIÊN - EXECUTIVE ANALYTICS & CẢNH BÁO XE
*(Màn hình Dashboard tổng quan của Quản trị viên)*

```text
Design a high-end Executive Analytics Dashboard for the Admin of "XeKhách Pro" intercity transport management system.

Required Sections & Visual Elements:
1. Page Header:
   - Greeting, system title, and live Vietnamese localized date display with a refresh button.

2. Top 4 Stat Widgets:
   - Total System Users (with icon and breakdown link).
   - Fleet Size (Total Active Buses with bus icon).
   - Active Operating Routes (with route map icon).
   - Trips Dispatched Today (with calendar icon).

3. Two Analytics Breakdown Cards:
   - Left Card: User Role Distribution progress bars with percentage and counts (Admin in Red, Staff/Dispatcher in Blue, Customer in Green).
   - Right Card: Fleet Operational Status breakdown progress bars (Available in Emerald, Running in Cobalt Blue, Maintenance in Amber).

4. Critical Fleet Safety & Insurance Alert Table (Urgent Action Center):
   - Table displaying vehicles requiring regulatory attention:
     * License Plate (e.g. "51B-888.99").
     * Bus Type (Limousine / Sleeper).
     * Current Vehicle Status.
     * Insurance Expiry Date.
     * Alert Badge: "EXPIRED" (bold red badge with exclamation mark) or "EXPIRING SOON" (amber warning badge with days countdown).
     * Action button: "Update Compliance Record".
```

---

### PROMPT 4: QUẢN TRỊ VIÊN - QUẢN LÝ ĐỘI XE & TUYẾN ĐƯỜNG
*(Màn hình quản lý xe và tuyến xe)*

```text
Design a responsive, sleek fleet and route management interface for "XeKhách Pro" Admin Portal.

Section A - Bus Fleet Management (/admin/buses):
- Top Action Bar: Search input for license plate, Filter dropdown by Bus Type (Sleeper, Seat, Limousine), Filter by Status (Available, Running, Maintenance), and primary button "+ Add New Bus".
- Bus Grid / Table:
  * License plate rendered in authentic vehicle plate typography.
  * Bus Type badge.
  * Seat capacity pill ("40 Berths").
  * Last maintenance date and Insurance expiry date.
  * Quick Status Switcher (One-click toggle between Available and In-Maintenance).
  * Edit button opening a slide-over modal for vehicle details.

Section B - Route & Pricing Management (/admin/routes):
- Search routes by city or station name.
- Interactive Route Cards or Table:
  * Origin Station and Destination Station with directional arrow indicator.
  * Distance in kilometers (e.g. "320 km").
  * Estimated travel duration formatted nicely (e.g. "6 hours 30 mins").
  * Base ticket fare in Vietnamese Dong ("280,000 VND").
  * Active/Inactive toggle switch.
  * "+ Create New Route" modal with fields: Origin terminal selector, Destination terminal selector, distance, duration, and default ticket price.
```

---

### PROMPT 5: MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ ĐẲNG CẤP CAO
*(Màn hình Auth ấn tượng thu hút người dùng)*

```text
Create a modern, ultra-clean Split-Screen Authentication page for "XeKhách Pro" (Intercity Bus Management Platform).

Layout:
- Left Hero Panel (50% width on Desktop, dark theme):
  * Background: Deep luxurious Midnight Navy gradient (#0F2849 to #081629) with faint abstract vector lines depicting high-speed highways and glowing GPS route nodes.
  * Logo & Typography: "XeKhách Pro" in bold modern typography with a stylized highway bus icon.
  * Tagline: "Hệ thống quản lý và điều hành vận tải xe khách liên tỉnh thế hệ mới".
  * Feature highlight pills with subtle glassmorphism:
    - "Real-time Dispatching & Seat Management"
    - "Automated VietQR Banking Checkout"
    - "Intelligent Driver Conflict Detection"

- Right Form Panel (50% width, bright clean white theme):
  * Header: "Chào mừng quay trở lại" (Welcome back) and subtitle.
  * Role Switcher Tabs for easy role simulation: [Nhân viên / Điều phối] | [Quản trị viên] | [Khách hàng].
  * Form inputs with icon prefixes:
    - Username or Email input with User icon.
    - Password input with Lock icon and show/hide password toggle (Eye/EyeOff).
  * Remember Me checkbox & "Quên mật khẩu?" link.
  * Primary Button: Full-width navy-to-blue gradient CTA "Đăng nhập vào hệ thống".
  * Footer: "Chưa có tài khoản? Đăng ký đặt vé ngay" linking to customer registration.
```

---

## 5. CÁCH THỨC SỬ DỤNG VỚI CÔNG CỤ THIẾT KẾ (WORKFLOW)

1. **Khởi tạo Style toàn cục**: Sao chép **Prompt 0** và dán vào công cụ thiết kế (Stitch) để thiết lập bảng màu, typography, khoảng cách và ngôn ngữ thiết kế chung.
2. **Thiết kế từng màn hình chi tiết**: Sử dụng lần lượt từ **Prompt 1** đến **Prompt 5** để sinh ra từng cụm giao diện theo nhu cầu cụ thể.
3. **Đưa mã nguồn vào dự án**:
   - Khi công cụ sinh ra mã JSX/Tailwind CSS, các components có thể sao chép trực tiếp vào thư mục `frontend/src/pages/` và `frontend/src/components/`.
   - Các tên biến và trường dữ liệu (ví dụ: `paymentCode`, `tripAssignments`, `licensePlate`, `totalSeats`) đã được khớp 100% với backend Django REST framework hiện hành.
