# Phân tích nghiệp vụ và thiết kế dữ liệu

## Website quản lý chuyến xe khách liên tỉnh

**Tên hệ thống:** Intercity Bus Management System  
**Công nghệ chốt:** Python - Django 5.2 LTS - Django REST Framework - django-allauth - MySQL 8.0+  
**Scope chốt:** 12 bảng nghiệp vụ - 4 role đăng nhập - thanh toán thật qua SePay/VietQR  
**Loại tài liệu:** Tài liệu BA / System Analysis  
**Phiên bản:** 2.0 - SePay

> Bản Markdown này chuyển đổi nội dung từ `PhanTichNghiepVu_IntercityBusManagement.docx`. Nội dung nghiệp vụ được giữ nguyên về ý nghĩa và cấu trúc; tên tệp SQL được nhắc trong tài liệu gốc được đối chiếu với tệp thực tế `Database_IntercityBusManagement.sql`.

> **Ghi chú về nguồn yêu cầu:** Đề bài môn học quy định sản phẩm Python/Django cần có giao diện, cơ sở dữ liệu, phân quyền và các nhóm chức năng nghiệp vụ. Đề bài không cung cấp sẵn nghiệp vụ xe khách. Các quy tắc nghiệp vụ chi tiết trong tài liệu này là scope BA do nhóm chốt cho đề tài, trừ khi được ghi rõ là yêu cầu từ đề bài.

> **Reconciliation note:** Bản Markdown này là yêu cầu hiệu lực của repository. Các quyết định kiến trúc được phê duyệt sau DOCX được tích hợp trực tiếp và ưu tiên ở các điểm đã từng mâu thuẫn: custom user theo `AbstractUser`, email bắt buộc, public search, dispatcher global scope, ranh giới CASH/SEPAY và các rule toàn vẹn trip/bus/seat. `Database_IntercityBusManagement.sql` vẫn là database reference; khác biệt vật lý còn lại được ghi trong `OPEN_QUESTIONS.md`.

## 1. Mục tiêu và phạm vi

Mục tiêu của hệ thống là hỗ trợ một nhà xe quy mô nhỏ hoặc mô phỏng nghiệp vụ nhà xe liên tỉnh: quản lý dữ liệu vận hành, tạo chuyến, phân công xe và nhân viên, tìm chuyến, đặt ghế, phát hành vé và xác nhận thanh toán. Thiết kế ưu tiên khả năng demo rõ luồng end-to-end hơn là mô phỏng đầy đủ một doanh nghiệp vận tải thực tế.

### Nguồn yêu cầu và giả định BA

- **[Đề bài]** Chương trình phải được xây dựng bằng Python; hướng Django phù hợp với ứng dụng web nhiều chức năng, có phân quyền và cơ sở dữ liệu.
- **[Yêu cầu nhóm]** Có quản lý vé/đặt vé, người dùng, xe/chuyến xe và phân công xe - nhân viên cho chuyến.
- **[Scope BA]** Bổ sung bến xe, tuyến, ghế, thanh toán thật qua SePay/VietQR, kiểm tra xung đột lịch và dashboard để tạo một luồng nghiệp vụ hoàn chỉnh.
- **[Giới hạn]** Không coi các business rule do nhóm đề xuất là quy định pháp luật; đây là quy ước của sản phẩm demo.

### Trong phạm vi (In scope)

- Đăng ký, đăng nhập và phân quyền 4 role: `CUSTOMER`, `TICKET_AGENT`, `DISPATCHER`, `ADMIN`.
- Quản lý nhân viên vận hành: `DRIVER` và `BUS_ATTENDANT`.
- Quản lý bến xe, tuyến xe, xe khách và sơ đồ ghế.
- Tạo chuyến, gán xe, phân công tài xế/phụ xe và quản lý trạng thái chuyến.
- Tìm chuyến theo điểm đi, điểm đến, ngày khởi hành.
- Xem ghế còn trống, tạo booking nhiều vé, chống đặt trùng ghế.
- Thanh toán `CASH` tại quầy hoặc chuyển khoản thật qua SePay/VietQR; hệ thống tự xác nhận giao dịch SePay bằng webhook.
- Tra cứu booking/vé, hủy booking chưa thanh toán, check-in vé và báo cáo cơ bản.

### Ngoài phạm vi (Out of scope)

- Điểm dừng trung gian phức tạp và đặt vé theo từng chặng.
- Các cổng thanh toán khác ngoài SePay (VNPay, MoMo, ZaloPay) và hoàn tiền tự động qua cổng.
- Refund/hoàn tiền tự động, chính sách phí hủy nhiều mức.
- GPS tracking, bản đồ, quản lý nhiên liệu/bảo dưỡng chi tiết.
- Khuyến mãi, voucher, loyalty, review/rating.
- Email/SMS/push notification tự động.
- Tài khoản đăng nhập riêng cho `DRIVER`/`BUS_ATTENDANT`.
- Audit log nghiệp vụ đầy đủ.

## 2. Actor và phân quyền

| Role | Tên nghiệp vụ | Quyền chính |
|---|---|---|
| `CUSTOMER` | Khách hàng | Đăng ký/đăng nhập; tìm chuyến; xem ghế; tạo booking; thanh toán; xem và hủy booking `PENDING` của chính mình. |
| `TICKET_AGENT` | Nhân viên bán vé | Tìm chuyến; đặt vé cho khách vãng lai; xác nhận `CASH`; tra cứu trạng thái SePay nhưng không xác nhận SePay thủ công; tra cứu booking; check-in vé. |
| `DISPATCHER` | Nhân viên điều hành | Quản lý dữ liệu vận hành trong phạm vi toàn cục của MVP; tạo chuyến; gán xe; phân công `DRIVER`/`BUS_ATTENDANT`; đổi trạng thái chuyến. |
| `ADMIN` | Quản trị viên | Toàn quyền; quản lý user, nhân viên, dữ liệu nền, vận hành, booking, payment và báo cáo. |

`DRIVER` và `BUS_ATTENDANT` là `employee_type` trong bảng `employees`, không phải role đăng nhập. Cách này giảm scope nhưng vẫn giữ được nghiệp vụ phân công nhân sự cho chuyến.

## 3. Mô hình dữ liệu chốt - 12 bảng

| # | Bảng | Trách nhiệm |
|---:|---|---|
| 1 | `users` | Tài khoản, thông tin cơ bản và role đăng nhập. |
| 2 | `employees` | Nhân viên vận hành: `DRIVER`/`BUS_ATTENDANT`. |
| 3 | `stations` | Bến/điểm đầu-cuối của tuyến. |
| 4 | `routes` | Tuyến liên tỉnh từ một station đến station khác. |
| 5 | `buses` | Xe khách, loại xe, sức chứa, trạng thái. |
| 6 | `bus_seats` | Sơ đồ ghế vật lý của từng xe. |
| 7 | `trips` | Một lần chạy cụ thể của route tại ngày/giờ xác định. |
| 8 | `trip_staff_assignments` | Phân công `DRIVER`/`BUS_ATTENDANT` vào trip. |
| 9 | `bookings` | Đơn đặt chỗ; một booking thuộc đúng một trip. |
| 10 | `tickets` | Mỗi vé = một hành khách + một ghế trong booking. |
| 11 | `payments` | Payment intent của booking; `CASH` hoặc SePay. |
| 12 | `payment_transactions` | Nhật ký giao dịch SePay/webhook; chống xử lý trùng và phục vụ đối soát. |

### Quan hệ chính

- `stations (1) -> (N) routes` ở vai trò origin và destination.
- `routes (1) -> (N) trips`.
- `buses (1) -> (N) bus_seats` và `buses (1) -> (N) trips`.
- `trips (1) -> (N) trip_staff_assignments`; `employees (1) -> (N) trip_staff_assignments`.
- `trips (1) -> (N) bookings`.
- `bookings (1) -> (N) tickets`.
- `bus_seats (1) -> (N) tickets` theo thời gian; nhưng cùng một trip chỉ có tối đa một ticket active cho một seat.
- `bookings (1) -> (0..1) payments`; `payments (1) -> (N) payment_transactions` để lưu mọi webhook/giao dịch SePay nhận được.

### Quy ước mapping đã phê duyệt

- Python 3.12; `Django==5.2.17`; `djangorestframework==3.18.0`; `django-allauth[socialaccount]==65.19.2`; `mysqlclient==2.2.8`.
- Django migrations là nguồn tạo/nâng cấp schema; SQL là reference, không chạy song song.
- Dùng Django `BigAutoField` cho application primary keys; không cố giữ `UNSIGNED`.
- Business enum dùng `CharField + TextChoices`; không phụ thuộc native MySQL `ENUM`.
- Không tái tạo `ON UPDATE CASCADE` nếu không có concrete requirement.
- Generated columns/triggers đặc thù MySQL phải nằm trong explicit migrations và được document.
- `TIME_ZONE = "Asia/Ho_Chi_Minh"`, `USE_TZ = True`.
- Django sở hữu application timestamps; không dùng database-managed `CURRENT_TIMESTAMP`/`ON UPDATE` làm authoritative strategy.

## 4. Data dictionary

### `users`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT / Django `BigAutoField` | PK | Định danh user. Không giữ `UNSIGNED`. |
| `username` | VARCHAR(150) | UNIQUE, NOT NULL | Tên đăng nhập theo `AbstractUser`. |
| `password` | VARCHAR(128) | NOT NULL | Mật khẩu đã hash bằng Django; không lưu plaintext. |
| `first_name` | VARCHAR(150) | NOT NULL, có thể là chuỗi rỗng theo `AbstractUser` | Tên. |
| `last_name` | VARCHAR(150) | NOT NULL, có thể là chuỗi rỗng theo `AbstractUser` | Họ/tên đệm. |
| `email` | VARCHAR(254) | UNIQUE, NOT NULL | Email bắt buộc. |
| `phone` | VARCHAR(20) | UNIQUE, NULL | Số điện thoại. |
| `role` | VARCHAR / Django `TextChoices` | NOT NULL | `CUSTOMER`/`TICKET_AGENT`/`DISPATCHER`/`ADMIN`. |
| `is_active` | BOOLEAN | DEFAULT TRUE | Cho phép đăng nhập hay không. |
| `is_staff` | BOOLEAN | DEFAULT FALSE | Quyền truy cập Django admin; độc lập business role. |
| `is_superuser` | BOOLEAN | DEFAULT FALSE | Django superuser flag; độc lập business role. |
| `last_login` | DATETIME | NULL | Lần đăng nhập gần nhất. |
| `date_joined` | DATETIME | NOT NULL | Thời gian tạo tài khoản theo `AbstractUser`. |
| `updated_at` | DATETIME | Django `auto_now=True` | Thời gian cập nhật do Django quản lý; User không có duplicate `created_at`, dùng `date_joined`. |

### `employees`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh nhân viên. |
| `employee_code` | VARCHAR(20) | UNIQUE | Mã nhân viên. |
| `full_name` | VARCHAR(120) | NOT NULL | Họ tên. |
| `phone` | VARCHAR(20) | UNIQUE | Điện thoại. |
| `employee_type` | VARCHAR / Django `TextChoices` | NOT NULL | `DRIVER`/`BUS_ATTENDANT`. |
| `license_number` | VARCHAR(50) | NULL | Bắt buộc logic đối với `DRIVER`. |
| `license_class` | VARCHAR(20) | NULL | Hạng GPLX. |
| `license_expiry` | DATE | NULL | Ngày hết hạn GPLX. |
| `hire_date` | DATE | NULL | Ngày vào làm. |
| `is_active` | BOOLEAN | DEFAULT TRUE | Nhân viên đang hoạt động. |
| `created_at` | DATETIME | Django `auto_now_add=True` | Thời gian tạo do Django quản lý. |
| `updated_at` | DATETIME | Django `auto_now=True` | Thời gian cập nhật do Django quản lý. |

### `stations`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh bến. |
| `station_code` | VARCHAR(20) | UNIQUE | Mã bến. |
| `name` | VARCHAR(150) | NOT NULL | Tên bến. |
| `province_city` | VARCHAR(100) | NOT NULL | Tỉnh/thành. |
| `address` | VARCHAR(255) | NULL | Địa chỉ. |
| `is_active` | BOOLEAN | DEFAULT TRUE | Bến còn sử dụng. |

### `routes`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh tuyến. |
| `route_code` | VARCHAR(20) | UNIQUE | Mã tuyến. |
| `route_name` | VARCHAR(160) | NOT NULL | Tên tuyến. |
| `origin_station_id` | BIGINT | FK | Bến đi. |
| `destination_station_id` | BIGINT | FK | Bến đến. |
| `distance_km` | DECIMAL(8,2) | NULL | Khoảng cách. |
| `estimated_duration_minutes` | INT | NULL | Thời gian dự kiến. |
| `base_price` | DECIMAL(12,2) | >= 0 | Giá cơ bản tham khảo. |
| `status` | VARCHAR / Django `TextChoices` | `ACTIVE`/`INACTIVE` | Tuyến có còn khai thác. |

### `buses`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh xe. |
| `license_plate` | VARCHAR(20) | UNIQUE | Biển số. |
| `bus_name` | VARCHAR(100) | NULL | Tên gợi nhớ. |
| `bus_type` | VARCHAR / Django `TextChoices` | NOT NULL | `SEATER`/`SLEEPER`/`LIMOUSINE`. |
| `seat_capacity` | SMALLINT | > 0 | Sức chứa tối đa. |
| `status` | VARCHAR / Django `TextChoices` | NOT NULL | `ACTIVE`/`MAINTENANCE`/`INACTIVE`. |

### `bus_seats`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh ghế. |
| `bus_id` | BIGINT | FK | Xe sở hữu ghế. |
| `seat_number` | VARCHAR(10) | UNIQUE theo bus | Ví dụ `A01`. |
| `seat_type` | VARCHAR / Django `TextChoices` | `STANDARD`/`VIP` | Loại ghế. |
| `floor_number` | TINYINT | >= 1 | Tầng xe. |
| `row_number` | SMALLINT | NULL | Hàng trên sơ đồ. |
| `column_number` | SMALLINT | NULL | Cột trên sơ đồ. |
| `is_active` | BOOLEAN | DEFAULT TRUE | Ghế đang được sử dụng. |

### `trips`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh chuyến. |
| `trip_code` | VARCHAR(30) | UNIQUE | Mã chuyến. |
| `route_id` | BIGINT | FK | Tuyến được chạy. |
| `bus_id` | BIGINT | FK, NULL khi `DRAFT` | Xe được phân công. |
| `departure_time` | DATETIME | NOT NULL | Giờ khởi hành. |
| `arrival_time` | DATETIME | > departure | Giờ đến dự kiến. |
| `ticket_price` | DECIMAL(12,2) | >= 0 | Giá vé của chuyến. |
| `status` | VARCHAR / Django `TextChoices` | NOT NULL | `DRAFT`/`OPEN_FOR_BOOKING`/`BOARDING`/`DEPARTED`/`COMPLETED`/`CANCELLED`. |
| `notes` | VARCHAR(500) | NULL | Ghi chú. |

### `trip_staff_assignments`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh phân công. |
| `trip_id` | BIGINT | FK | Chuyến. |
| `employee_id` | BIGINT | FK | Nhân viên. |
| `assignment_role` | VARCHAR / Django `TextChoices` | NOT NULL | `DRIVER`/`BUS_ATTENDANT`. |
| `created_at` | DATETIME | AUTO | Thời điểm phân công. |

### `bookings`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh booking. |
| `booking_code` | VARCHAR(30) | UNIQUE | Mã booking. |
| `trip_id` | BIGINT | FK | Chuyến được đặt. |
| `customer_user_id` | BIGINT | FK, NULL | Khách có tài khoản; NULL nếu khách vãng lai. |
| `created_by_user_id` | BIGINT | FK, NULL | User thực hiện tạo booking. |
| `contact_name` | VARCHAR(120) | NOT NULL | Người liên hệ. |
| `contact_phone` | VARCHAR(20) | NOT NULL | SĐT liên hệ. |
| `contact_email` | VARCHAR(255) | NULL | Email. |
| `total_amount` | DECIMAL(12,2) | AUTO khi tạo ticket | Tổng tiền tại thời điểm đặt; giữ lại khi hủy. |
| `booking_status` | VARCHAR / Django `TextChoices` | NOT NULL | `PENDING`/`CONFIRMED`/`EXPIRED`/`CANCELLED`/`COMPLETED`. |
| `cancelled_at` | DATETIME | NULL | Thời điểm hủy. |
| `cancellation_reason` | VARCHAR(255) | NULL | Lý do hủy. |
| `expires_at` | DATETIME | NULL; mặc định +15 phút ở DB trigger/service | Hạn giữ booking/ghế để chờ thanh toán. |

### `tickets`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh vé. |
| `ticket_code` | VARCHAR(30) | UNIQUE | Mã vé. |
| `booking_id` | BIGINT | FK | Booking chứa vé. |
| `trip_id` | BIGINT | FK | Lưu thêm để khóa ghế theo trip. |
| `bus_seat_id` | BIGINT | FK | Ghế được chọn. |
| `passenger_name` | VARCHAR(120) | NOT NULL | Tên hành khách. |
| `passenger_phone` | VARCHAR(20) | NULL | SĐT hành khách. |
| `fare` | DECIMAL(12,2) | >= 0 | Giá vé. |
| `ticket_status` | VARCHAR / Django `TextChoices` | NOT NULL | `HELD`/`CONFIRMED`/`USED`/`CANCELLED`. |
| `checked_in_at` | DATETIME | NULL | Thời điểm check-in. |
| `active_seat_key` | GENERATED | UNIQUE khi active | Khóa kỹ thuật chống double booking. |

### `payments`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh payment intent. |
| `payment_code` | VARCHAR(30) | UNIQUE | Mã thanh toán dùng làm nội dung VietQR/SePay. |
| `booking_id` | BIGINT | FK + UNIQUE | Một payment intent cho mỗi booking. |
| `payment_method` | VARCHAR / Django `TextChoices` | NOT NULL | `CASH`/`SEPAY`. |
| `amount` | DECIMAL(12,2) | > 0 | Phải bằng `booking.total_amount`. |
| `payment_status` | VARCHAR / Django `TextChoices` | NOT NULL | `PENDING`/`SUCCESS`/`FAILED`/`CANCELLED`/`REVIEW_REQUIRED`. |
| `paid_at` | DATETIME | NULL | Thời điểm thanh toán được xác nhận thành công. |
| `notes` | VARCHAR(500) | NULL | Ghi chú nghiệp vụ/đối soát. |

### `payment_transactions`

| Field | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh bản ghi webhook/giao dịch. |
| `payment_id` | BIGINT | FK, NULL | Payment intent được match; NULL nếu chưa match. |
| `sepay_transaction_id` | BIGINT | UNIQUE, NOT NULL | ID giao dịch SePay; khóa idempotency qua retry/replay. |
| `gateway` | VARCHAR(100) | NOT NULL | Ngân hàng của giao dịch. |
| `transaction_date` | DATETIME | NOT NULL | Thời gian giao dịch theo payload SePay. |
| `account_number` | VARCHAR(100) | NOT NULL | Tài khoản nhận tiền. |
| `sub_account` | VARCHAR(150) | NULL | VA/sub-account nếu SePay cung cấp. |
| `payment_code` | VARCHAR(100) | NULL | Mã thanh toán SePay trích từ nội dung chuyển khoản. |
| `transfer_type` | VARCHAR / Django `TextChoices` | NOT NULL | `in`/`out`; chỉ tiền vào mới được xét thanh toán. |
| `transfer_amount` | BIGINT | > 0 | Số tiền giao dịch, đơn vị VND. |
| `accumulated` | BIGINT | NULL | Số dư cộng dồn nếu ngân hàng hỗ trợ. |
| `reference_code` | VARCHAR(255) | NULL | Mã tham chiếu ngân hàng. |
| `content` | TEXT | NOT NULL | Nội dung chuyển khoản gốc. |
| `description` | TEXT | NULL | Mô tả giao dịch từ ngân hàng. |
| `processing_status` | VARCHAR / Django `TextChoices` | NOT NULL | `RECEIVED`/`PROCESSED`/`REVIEW_REQUIRED`/`IGNORED`. |
| `review_reason` | VARCHAR(500) | NULL | Lý do cần xử lý thủ công. |
| `webhook_timestamp` | BIGINT | NULL | `X-SePay-Timestamp` đã xác thực. |
| `webhook_signature` | VARCHAR(255) | NULL | Chữ ký webhook nhận được, phục vụ audit. |
| `raw_payload` | JSON | NOT NULL | Payload nguyên bản sau khi webhook đã qua xác thực. |
| `received_at` | DATETIME | AUTO | Thời điểm server nhận webhook. |
| `processed_at` | DATETIME | NULL | Thời điểm hoàn tất xử lý nghiệp vụ. |

## 5. Business Rules

| ID | Quy tắc |
|---|---|
| BR-001 | Mỗi user có đúng một role thuộc `CUSTOMER`, `TICKET_AGENT`, `DISPATCHER`, `ADMIN`. |
| BR-002 | Username là duy nhất; email và phone nếu có cũng phải duy nhất. |
| BR-003 | Mật khẩu chỉ được lưu dưới dạng hash tương thích Django, không lưu plaintext. |
| BR-004 | `DRIVER` và `BUS_ATTENDANT` nằm trong `employees` và không bắt buộc có tài khoản đăng nhập. |
| BR-005 | Employee loại `DRIVER` phải có thông tin giấy phép lái xe; trước khi phân công ứng dụng phải kiểm tra giấy phép còn hiệu lực. |
| BR-006 | Origin station và destination station của một route phải khác nhau. |
| BR-007 | Chỉ route `ACTIVE` mới được sử dụng để mở chuyến mới. |
| BR-008 | Số ghế active cấu hình cho bus không được vượt `seat_capacity`. |
| BR-009 | Một `seat_number` chỉ xuất hiện một lần trong cùng một bus. |
| BR-010 | Bus `MAINTENANCE` hoặc `INACTIVE` không được phân cho chuyến đang vận hành. |
| BR-011 | `arrival_time` phải lớn hơn `departure_time`. |
| BR-012 | Một bus không được phục vụ hai trip có khoảng thời gian chồng lấn, trừ trip `CANCELLED`. |
| BR-013 | Một employee không được được phân công hai trip chồng lấn thời gian, trừ trip `CANCELLED`. |
| BR-014 | `assignment_role` phải khớp `employee_type`. |
| BR-015 | Khuyến nghị trước khi `OPEN_FOR_BOOKING`, trip phải có bus và tối thiểu một `DRIVER`; kiểm tra này đặt ở service layer Django. |
| BR-016 | Khách chỉ nhìn thấy trip `OPEN_FOR_BOOKING` có `departure_time` trong tương lai. |
| BR-017 | Một booking chỉ thuộc một trip nhưng có thể chứa nhiều tickets. |
| BR-018 | Ticket chỉ được chọn `bus_seat` thuộc đúng bus đang gán cho trip. |
| BR-019 | Trong cùng một trip, một ghế chỉ có tối đa một ticket ở trạng thái `HELD`, `CONFIRMED` hoặc `USED`. |
| BR-020 | Booking `total_amount` được tính từ tổng `fare` khi tạo tickets và được giữ làm giá trị lịch sử, kể cả khi booking bị hủy. |
| BR-021 | Booking mới có trạng thái `PENDING`; ticket mới có trạng thái `HELD`. |
| BR-022 | Booking `PENDING` phải có `expires_at`; mặc định hệ thống giữ ghế 15 phút và không được vượt giờ khởi hành. |
| BR-023 | Booking `PENDING` quá `expires_at` phải chuyển `EXPIRED` ở application job/lazy check; ticket `HELD` chuyển `CANCELLED` và ghế được giải phóng. |
| BR-024 | Một booking có tối đa một payment intent; `payment_code` là mã duy nhất dùng cho QR/nội dung chuyển khoản. |
| BR-025 | Payment `amount` phải bằng booking `total_amount`. |
| BR-026 | `SEPAY` payment chỉ được chuyển `SUCCESS` sau khi webhook đã xác thực HMAC-SHA256 và timestamp hợp lệ. |
| BR-027 | Webhook phải được xử lý idempotent theo `sepay_transaction_id`; retry/replay cùng ID không được chạy lại business logic. |
| BR-028 | Trước khi xác nhận SePay phải kiểm tra `transfer_type=in`, `account_number` đúng tài khoản nhận, `payment_code` khớp và `transfer_amount` đúng số tiền. |
| BR-029 | SePay hợp lệ và đến trước `expires_at` làm payment `SUCCESS`, booking `CONFIRMED` và tickets `HELD` thành `CONFIRMED`. |
| BR-030 | Tiền đến sau khi booking `EXPIRED`/`CANCELLED`, sai số tiền hoặc giao dịch dư phải ghi `REVIEW_REQUIRED`; không tự khôi phục ghế. |
| BR-031 | Webhook SePay đã xác thực phải được lưu raw payload vào `payment_transactions` để debug/audit/đối soát. |
| BR-032 | Khách có thể hủy booking `PENDING` của chính mình trước giờ khởi hành; ticket `HELD` và payment `PENDING` chuyển `CANCELLED`. |
| BR-033 | Booking `CONFIRMED` không cho khách tự hủy trong scope hiện tại vì refund tự động chưa được xây dựng. |
| BR-034 | `TICKET_AGENT` có thể mark ticket `CONFIRMED` thành `USED` khi check-in hành khách. |
| BR-035 | Trip state flow chuẩn: `DRAFT -> OPEN_FOR_BOOKING -> BOARDING -> DEPARTED -> COMPLETED`; `CANCELLED` là nhánh kết thúc. |
| BR-036 | Báo cáo doanh thu chỉ cộng payments `SUCCESS`; `payment_transactions` `REVIEW_REQUIRED` không được tính doanh thu hợp lệ. |
| BR-037 | Secret HMAC SePay và cấu hình tài khoản nhận tiền phải nằm trong biến môi trường/secret store, không commit Git. |
| BR-038 | Endpoint webhook production phải dùng HTTPS và phản hồi HTTP 200 success cho webhook hợp lệ/đã xử lý idempotent. |
| BR-039 | Tài khoản dùng username; email bắt buộc và duy nhất; phone có thể NULL nhưng unique; tên user được lưu bằng `first_name` và `last_name`. |
| BR-040 | Google OAuth user được tạo tự động luôn có role ban đầu `CUSTOMER`; không được tự chọn staff/admin business role qua OAuth. `is_staff` và `is_superuser` độc lập với `role`. |
| BR-041 | Anonymous được tìm chuyến và xem seat availability; phải đăng nhập mới tạo customer booking. |
| BR-042 | Dispatcher có global operational scope trong MVP; branch/station scoping nằm ngoài scope. |
| BR-043 | `CASH` được `TICKET_AGENT` hoặc `ADMIN` xác nhận thủ công; `SEPAY` chỉ success tự động từ webhook đã xác thực. |
| BR-044 | Admin được review/reconcile SePay có vấn đề nhưng không được giả lập hoặc bỏ qua webhook verification để xác nhận SePay. |
| BR-045 | Cấm đổi bus của trip khi trip có bất kỳ ticket `HELD`, `CONFIRMED` hoặc `USED`. |
| BR-046 | Cấm giảm `seat_capacity` thấp hơn số ghế active đã cấu hình. |
| BR-047 | Cấm deactivate seat đang được active ticket (`HELD`, `CONFIRMED`, `USED`) tham chiếu. |
| BR-048 | Django sở hữu application timestamps. User dùng built-in `date_joined`/`last_login`, thêm `updated_at=auto_now` và không thêm `created_at`; Employee dùng `created_at=auto_now_add`, `updated_at=auto_now`. Future business models theo cùng convention nếu không có approved exception. |
| BR-049 | Google OAuth chỉ auto-create User khi email chưa tồn tại; email trùng không được silently link mà phải authenticate account hiện có rồi explicit link. |
| BR-050 | OAuth username do server sinh từ email local-part và thêm collision-safe suffix khi cần. |
| BR-051 | Phase 1 chỉ dùng DRF `SessionAuthentication`; không JWT/token/SimpleJWT. `/admin/` chỉ dành cho Django Admin; business authorization dùng `role`, không dùng `is_staff`/`is_superuser` thay thế. |

Các rule cũng được tách nguyên nghĩa tại [BUSINESS_RULES.md](./BUSINESS_RULES.md) để truy vết và kiểm thử.

## 6. Vòng đời trạng thái

| Đối tượng | Luồng chính | Nhánh khác |
|---|---|---|
| Trip | `DRAFT -> OPEN_FOR_BOOKING -> BOARDING -> DEPARTED -> COMPLETED` | `DRAFT`/`OPEN`/`BOARDING -> CANCELLED` |
| Booking | `PENDING -> CONFIRMED -> COMPLETED` | `PENDING -> EXPIRED` hoặc `CANCELLED` |
| Ticket | `HELD -> CONFIRMED -> USED` | `HELD -> CANCELLED`; `CONFIRMED` chỉ hủy bởi staff trong trường hợp đặc biệt ngoài flow khách hàng |
| Payment | `PENDING -> SUCCESS` | `PENDING -> FAILED`/`CANCELLED`/`REVIEW_REQUIRED` |

## 7. Use Case chi tiết

### UC-01 - Đăng ký tài khoản khách hàng

**Mục tiêu:** Tạo tài khoản `CUSTOMER` để khách tự đặt và quản lý vé.  
**Actor chính:** Khách chưa có tài khoản.  
**Tiền điều kiện:** Username và email chưa bị trùng; phone nếu có chưa bị trùng.  
**Kích hoạt:** Khách chọn Đăng ký.  
**Hậu điều kiện:** Tạo `users.role = CUSTOMER`, `is_active = TRUE`.  
**Bảng liên quan:** `users`.

Luồng chính:

1. Khách nhập username, mật khẩu, `first_name`, `last_name`, email bắt buộc và phone tùy chọn.
2. Backend validate dữ liệu và tính duy nhất.
3. Mật khẩu được hash bằng cơ chế Django trước khi lưu.
4. Tạo user với role `CUSTOMER`.
5. Hệ thống thông báo đăng ký thành công và chuyển sang đăng nhập.

Luồng thay thế/lỗi:

- Username/email/phone trùng: từ chối và hiển thị lỗi cụ thể.
- Dữ liệu bắt buộc thiếu hoặc sai định dạng: không ghi DB.

Acceptance Criteria:

- Không tồn tại hai users có cùng username.
- Không có mật khẩu plaintext trong database.
- User mới không thể tự chọn role `ADMIN`/`DISPATCHER`/`TICKET_AGENT`.

Google OAuth do django-allauth xử lý. User được tạo tự động từ Google luôn bắt đầu với role `CUSTOMER`; OAuth không được nhận business role, `is_staff` hoặc `is_superuser` từ client/provider. Chỉ auto-create khi email chưa dùng. Nếu email đã tồn tại, không silently merge/link; user phải authenticate account hiện có rồi explicit link. Username được server sinh từ email local-part và thêm collision-safe suffix khi cần.

### UC-02 - Đăng nhập và phân quyền

**Mục tiêu:** Xác thực user và chỉ cho phép truy cập chức năng đúng role.  
**Actor chính:** `CUSTOMER`, `TICKET_AGENT`, `DISPATCHER`, `ADMIN`.  
**Tiền điều kiện:** User tồn tại và `is_active = TRUE`.  
**Kích hoạt:** User gửi form đăng nhập.  
**Hậu điều kiện:** Tạo session đăng nhập; cập nhật `last_login`.  
**Bảng liên quan:** `users`.

Luồng chính: nhập username/mật khẩu; backend tìm user theo username; so sánh mật khẩu bằng hàm Django; tạo session; điều hướng dashboard/menu theo role.

Luồng thay thế/lỗi: sai mật khẩu trả lỗi chung; user inactive bị từ chối; URL sai quyền trả HTTP 403 hoặc redirect.

Acceptance Criteria: `CUSTOMER` không vào quản trị trip/user; `DISPATCHER` không tự nâng role; `ADMIN` truy cập toàn bộ chức năng trong scope.

### UC-03 - Quản lý người dùng

**Actor:** `ADMIN`. **Hậu điều kiện:** User được tạo/cập nhật/khóa. **Bảng:** `users`.

Luồng chính: xem/filter user; tạo tài khoản nhân viên nghiệp vụ; sửa `first_name`, `last_name`, email, phone, role hoặc `is_active`; validate rồi lưu. Không cho trùng username/email/phone; email luôn bắt buộc. Không xóa cứng user đã liên quan booking, dùng `is_active = FALSE`. Chỉ `ADMIN` đổi role; khóa user không làm mất lịch sử booking.

### UC-04 - Quản lý nhân viên vận hành

**Actor:** `ADMIN`. **Bảng:** `employees`.

Thêm mã, họ tên, phone, loại nhân viên; với `DRIVER` nhập số/hạng/hạn GPLX; hỗ trợ kích hoạt/vô hiệu hóa. Từ chối driver thiếu GPLX; nhân viên có lịch sử phân công không xóa cứng. `employee_code` và phone không trùng; `BUS_ATTENDANT` không bắt buộc GPLX; employee inactive không được phân công mới.

### UC-05 - Quản lý bến xe

**Actor:** `ADMIN`, `DISPATCHER`. **Bảng:** `stations`.

Thêm/sửa mã bến, tên, tỉnh/thành, địa chỉ; dùng `is_active = FALSE` khi ngừng sử dụng. Từ chối `station_code` trùng; không xóa cứng bến đang được route tham chiếu. Route mới chỉ chọn station active và dữ liệu lịch sử phải được giữ.

### UC-06 - Quản lý tuyến xe

**Actor:** `ADMIN`, `DISPATCHER`. **Tiền điều kiện:** Có ít nhất hai station active. **Bảng:** `routes`, `stations`.

Chọn origin/destination; nhập code, name, distance, duration, base price; validate hai bến khác nhau; lưu trạng thái. Từ chối origin = destination, giá âm hoặc duration <= 0. Route inactive không được dùng để mở trip mới ở service layer.

### UC-07 - Quản lý xe khách

**Actor:** `ADMIN`, `DISPATCHER`. **Bảng:** `buses`.

Nhập biển số, tên, loại, sức chứa và trạng thái. Từ chối biển số trùng hoặc sức chứa <= 0. Không được giảm `seat_capacity` thấp hơn số ghế active đã cấu hình. Xe maintenance không được gán cho trip hoạt động; status xe ảnh hưởng trực tiếp logic phân xe.

### UC-08 - Quản lý sơ đồ ghế

**Actor:** `ADMIN`, `DISPATCHER`. **Tiền điều kiện:** Bus tồn tại. **Bảng:** `buses`, `bus_seats`.

Chọn bus; thêm số/loại/tầng/hàng/cột ghế; đặt `is_active`; lưu. Từ chối trùng seat trong cùng bus và số ghế active vượt capacity. Không được deactivate seat đang được ticket `HELD`, `CONFIRMED` hoặc `USED` tham chiếu. Cùng số ghế được phép xuất hiện ở hai bus khác nhau.

### UC-09 - Tạo và quản lý chuyến

**Actor:** `DISPATCHER`, `ADMIN`. **Tiền điều kiện:** Route tồn tại, thời gian hợp lệ. **Bảng:** `trips`, `routes`, `buses`.

Chọn route; nhập giờ đi/đến và giá; có thể chọn bus hoặc để trống khi `DRAFT`; sinh `trip_code`; mở bán khi đủ điều kiện. Từ chối thời gian không hợp lệ, bus không active hoặc bus overlap. Chỉ được đổi bus khi trip chưa có ticket `HELD`, `CONFIRMED` hoặc `USED`; có active ticket thì cấm đổi bus. Mỗi code duy nhất; khách chỉ tìm thấy trip `OPEN_FOR_BOOKING`.

### UC-10 - Phân công xe và nhân viên cho chuyến

**Actor:** `DISPATCHER`, `ADMIN`. **Tiền điều kiện:** Trip tồn tại; employee và bus active. **Bảng:** `trips`, `buses`, `employees`, `trip_staff_assignments`.

Chọn bus trống; chọn driver và tùy chọn bus attendant; backend kiểm tra overlap rồi lưu. Từ chối overlap, role không khớp type, driver inactive hoặc hết hạn GPLX. Khi đổi giờ trip, DB kiểm tra lại xung đột bus và staff.

### UC-11 - Tìm chuyến

**Actor:** Public/anonymous, `CUSTOMER`, `TICKET_AGENT`. **Tiền điều kiện:** Có trip `OPEN_FOR_BOOKING` trong tương lai. **Bảng:** `stations`, `routes`, `trips`, `buses`, `tickets`.

Chọn điểm đi/đến/ngày; lọc route và trip; tính ghế trống; sắp theo giờ đi. Không có dữ liệu thì hiển thị empty state; trip không bus không xuất hiện. Không trả trip cancelled/departed/completed; số ghế trống phản ánh ticket active.

### UC-12 - Xem và chọn ghế

**Actor:** Public/anonymous, `CUSTOMER`, `TICKET_AGENT`. **Tiền điều kiện:** Trip mở bán và có bus. **Bảng:** `trips`, `bus_seats`, `tickets`.

Lấy ghế active của bus, đối chiếu ticket active, đánh dấu available/occupied/held và cho chọn nhiều ghế. Nếu ghế vừa bị giữ, unique constraint từ chối. Seat không thuộc bus của trip không thể tạo ticket.

### UC-13 - Tạo booking và phát hành vé tạm giữ

**Actor:** Authenticated `CUSTOMER`, `TICKET_AGENT`. **Tiền điều kiện:** Đã xác thực; trip mở bán; ghế còn trống. **Bảng:** `bookings`, `tickets`, `users`, `trips`, `bus_seats`.

1. Tạo booking code và booking `PENDING`.
2. Customer tự đặt: `customer_user_id` và `created_by_user_id` là user hiện tại.
3. Agent đặt khách vãng lai: customer có thể NULL, creator là agent.
4. Tạo một ticket `HELD` cho mỗi ghế/hành khách.
5. Trigger cộng fare vào total.
6. Hiển thị summary và bước thanh toán.

Một ghế bị chiếm hoặc một ticket lỗi làm toàn bộ transaction rollback. Booking có nhiều tickets; total bằng tổng fare tại lúc tạo; không có booking half-created khi dùng `transaction.atomic()`.

### UC-14 - Thanh toán thật qua SePay/VietQR

**Actor:** `CUSTOMER`, `TICKET_AGENT`, `ADMIN`; hệ thống ngoài: SePay.  
**Tiền điều kiện:** Booking `PENDING`, chưa hết hạn, có ticket `HELD`, total > 0.  
**Bảng:** `payments`, `payment_transactions`, `bookings`, `tickets`.

1. Tạo payment intent `PENDING`, code duy nhất, amount bằng booking total.
2. Với SePay, dựng VietQR đúng tài khoản, amount, code; frontend hiển thị QR và countdown.
3. Khách chuyển khoản thật.
4. SePay gửi POST webhook; Django dùng raw body xác minh `X-SePay-Signature` HMAC-SHA256 và `X-SePay-Timestamp` trước khi parse JSON.
5. Kiểm tra idempotency, tiền vào, account, code và amount; lưu transaction.
6. Giao dịch hợp lệ, đúng hạn: payment, booking và tickets được xác nhận; frontend polling trạng thái.

Amount sai total bị DB từ chối. Chữ ký/timestamp sai bị từ chối và không xử lý nghiệp vụ. Sai amount/code/account hoặc tiền đến trễ được ghi `REVIEW_REQUIRED`. Retry cùng SePay transaction ID trả success idempotent. `SUCCESS` phải có `paid_at`; ngoại lệ xác nhận không qua webhook chỉ dành cho cash bởi agent/admin.

### UC-15 - Hủy hoặc hết hạn booking chưa thanh toán

**Actor:** `CUSTOMER`, `TICKET_AGENT`, `ADMIN`. **Tiền điều kiện:** Booking `PENDING`; customer chỉ thao tác booking của mình. **Bảng:** `bookings`, `tickets`, `payments`, `payment_transactions`.

Kiểm tra quyền, status và giờ khởi hành; ghi lý do/thời điểm; chuyển `CANCELLED`. Trigger/job/lazy check hủy tickets held và payment pending. Confirmed booking không cho customer tự hủy; late transfer cần review. Hủy lại là idempotent; không xóa dữ liệu lịch sử.

### UC-16 - Check-in hành khách

**Actor:** `TICKET_AGENT`, `ADMIN`. **Tiền điều kiện:** Ticket `CONFIRMED`; trip `BOARDING` hoặc gần giờ khởi hành theo rule ứng dụng. **Bảng:** `tickets`, `bookings`, `trips`.

Nhập/scan code ở mức demo; kiểm tra ticket và trip; chuyển `USED`, ghi `checked_in_at`. Từ chối cancelled/held; ticket đã used trả trạng thái đã check-in, không tạo giao dịch mới.

### UC-17 - Dashboard và báo cáo cơ bản

**Actor:** `ADMIN`, `DISPATCHER`. **Bảng:** `trips`, `routes`, `bookings`, `tickets`, `payments`, `payment_transactions`.

Chọn khoảng ngày; tính trip theo trạng thái, vé bán/đã dùng, doanh thu từ payment success, tỷ lệ ghế sử dụng, top route/trip theo doanh thu hoặc số vé. Không dữ liệu trả 0/empty chart. Filter ngày phải nhất quán và số liệu phải đối chiếu được bằng query DB.

## 8. Ma trận phân quyền chức năng

| Chức năng | CUSTOMER | TICKET_AGENT | DISPATCHER | ADMIN |
|---|---|---|---|---|
| Đăng ký/đăng nhập | Own | Login | Login | Login |
| Quản lý users | - | - | - | CRUD |
| Quản lý employees | - | - | View | CRUD |
| Stations/Routes | View qua search | View | CRUD | CRUD |
| Buses/Seats | View qua trip | View | CRUD | CRUD |
| Trips/Assignments | View open trips | View | CRUD | CRUD |
| Tạo booking | Own | Cho khách | - | Có |
| Thanh toán | SePay own booking | Xác nhận CASH + tra cứu SePay; không manual-success SePay | View | Xác nhận CASH + review/reconcile SePay; không bypass webhook |
| Hủy PENDING booking | Own | Có | - | Có |
| Check-in | - | Có | View | Có |
| Dashboard | - | - | Operational | Full |

## 9. Business rule nằm ở đâu

| Quy tắc | Nơi xử lý | Lý do |
|---|---|---|
| Unique username/email/phone | MySQL UNIQUE + Django validation | DB là lớp bảo vệ cuối. |
| Role access | Django permissions/decorators/middleware | Không đưa permission matrix vào DB để giữ 12 bảng. |
| Bus seat capacity | MySQL trigger + Django validation | Tránh vượt sức chứa khi thao tác trực tiếp DB. |
| Bus overlap | MySQL trigger + service validation | Kiểm tra INSERT/UPDATE trip. |
| Staff overlap | MySQL trigger + service validation | Kiểm tra assignment và khi đổi giờ trip. |
| Trip open prerequisites | Django service layer | Cần kiểm tra nhiều bảng: bus + driver + route active. |
| Double booking | MySQL generated column + UNIQUE | Bảo vệ concurrency thực sự. |
| Booking total | MySQL ticket INSERT trigger + Django display | Tính từ fare khi tạo vé và giữ giá trị lịch sử khi hủy. |
| Payment amount | MySQL trigger + Django form validation | Phải bằng booking total. |
| Payment SUCCESS transition | Django webhook service + MySQL trigger + `transaction.atomic()` | Chỉ sau HMAC/idempotency/amount/account/code validation. |
| Customer ownership | Django queryset/permission | DB không biết user hiện tại của HTTP request. |
| Webhook authenticity | Django raw request + HMAC-SHA256 + timestamp | Xác minh request thật trước khi parse/xử lý. |
| Webhook idempotency | UNIQUE SePay transaction ID | Retry/replay không cập nhật booking lần hai. |
| Booking expiry | Django scheduled command/lazy check + DB state trigger | Hết hạn giải phóng held seats; late payment cần review. |
| Trip bus immutability after active tickets | Django service validation + MySQL trigger trong explicit migration | Ngăn ticket tham chiếu ghế của bus cũ. |
| Bus capacity reduction | Django service validation + MySQL trigger trong explicit migration | Không cho capacity thấp hơn active seat count. |
| Seat deactivation with active ticket | Django service validation + MySQL trigger trong explicit migration | Giữ tính nhất quán availability và ticket. |

Các trigger mới ở ba dòng cuối là quyết định đã phê duyệt sau SQL reference; chúng phải được cô lập trong Django migrations và không được thêm bằng thao tác SQL thủ công.

## 10. Transaction và chống đặt trùng ghế

Khi hai người cùng chọn một ghế, database là lớp quyết định cuối cùng:

1. Django mở `transaction.atomic()` khi tạo booking và tickets.
2. Ticket có `active_seat_key = trip_id:bus_seat_id` khi status là held/confirmed/used.
3. UNIQUE trên khóa này chỉ cho một active ticket cho trip + seat.
4. Request thứ hai gặp duplicate key; Django rollback và yêu cầu chọn ghế khác.
5. Khi ticket cancelled, khóa generated thành NULL và ghế được đặt lại.

## 11. Kịch bản demo end-to-end đề xuất

| Bước | Actor | Thao tác | Kết quả mong đợi |
|---:|---|---|---|
| 1 | `ADMIN` | Đăng nhập; tạo/kiểm tra `DRIVER`, `BUS_ATTENDANT`, station, route, bus và seat layout. | Dữ liệu nền sẵn sàng. |
| 2 | `DISPATCHER` | Tạo trip `DRAFT` TP.HCM -> Đà Lạt; gán bus; phân `DRIVER`/`BUS_ATTENDANT`; mở bán. | Trip `OPEN_FOR_BOOKING`. |
| 3 | `CUSTOMER` | Tìm TP.HCM -> Đà Lạt theo ngày; mở sơ đồ ghế. | Thấy A01... và ghế trống. |
| 4 | `CUSTOMER` | Chọn A01 và A02; nhập 2 hành khách; tạo booking. | Booking `PENDING`, 2 ticket `HELD`, total = 2 x fare, có expiry. |
| 5 | `CUSTOMER` | Chọn SePay; hệ thống tạo payment code và hiển thị VietQR đúng số tiền/nội dung. | Payment `PENDING`; QR sẵn sàng quét. |
| 6 | `CUSTOMER` | Quét QR bằng app ngân hàng và chuyển khoản thật số tiền nhỏ dùng khi demo. | Tiền vào tài khoản đã liên kết SePay. |
| 7 | `SEPAY` | Gửi webhook đã ký HMAC tới Django. | Transaction được lưu; payment success; booking/tickets confirmed. |
| 8 | `CUSTOMER 2` | Mở cùng trip. | A01/A02 không còn chọn được. |
| 9 | `TICKET_AGENT` | Tra ticket code và check-in. | Ticket chuyển used. |
| 10 | `ADMIN` | Mở dashboard và payment audit. | Doanh thu + giao dịch SePay phản ánh đúng dữ liệu vừa demo. |

## 12. Gợi ý chia task backend cho nhóm 4 người

| Người | Backend ownership | Ghi chú |
|---|---|---|
| Bạn - BA/Lead/Dev | `users`, `employees`, `trips`, `trip_staff_assignments`; DB design; Auth/RBAC; integration; review | Nặng nhất; chịu contract dữ liệu và merge. |
| Member 2 | `stations`, `routes`, `buses`, `bus_seats` | Master data + validation + CRUD backend. |
| Member 3 | `bookings`, `tickets` | Seat availability, booking transaction, chống double booking. |
| Member 4 | `payments`, `payment_transactions` + SePay/VietQR + DB integration + dashboard/report | QR/payment code, HMAC webhook, idempotency, late-payment review, seed/migration/aggregate query. |

Model naming và migration contract do BA/Lead review; không push trực tiếp vào main; shared MySQL chỉ migrate sau khi PR merge và test local.

## 13. API/View contract gợi ý

| Method | Endpoint | Role | Mục đích |
|---|---|---|---|
| `POST` | `/auth/register/` | `CUSTOMER` | Đăng ký. |
| `POST` | `/auth/login/` | All | Đăng nhập. |
| `GET/POST` | `/api/accounts/users/` | `ADMIN` business role | Quản lý user; không dùng `/admin/`. |
| `GET/POST` | `/employees/` | `ADMIN` | Quản lý nhân viên. |
| `GET/POST` | `/stations/` | `DISPATCHER`/`ADMIN` | Quản lý bến. |
| `GET/POST` | `/routes/` | `DISPATCHER`/`ADMIN` | Quản lý tuyến. |
| `GET/POST` | `/buses/` | `DISPATCHER`/`ADMIN` | Quản lý xe. |
| `GET/POST` | `/buses/{id}/seats/` | `DISPATCHER`/`ADMIN` | Sơ đồ ghế. |
| `GET/POST` | `/trips/` | `DISPATCHER`/`ADMIN` | Quản lý chuyến. |
| `POST` | `/trips/{id}/assignments/` | `DISPATCHER`/`ADMIN` | Phân công staff. |
| `GET` | `/search-trips/` | Public/Customer/Agent | Tìm chuyến. |
| `GET` | `/trips/{id}/seats/` | Customer/Agent | Xem ghế. |
| `POST` | `/bookings/` | Authenticated Customer/Agent | Tạo booking + tickets; anonymous không được tạo. |
| `GET` | `/bookings/{code}/` | Owner/Agent/Admin | Xem booking. |
| `POST` | `/bookings/{id}/cancel/` | Owner/Agent/Admin | Hủy pending. |
| `POST` | `/payments/sepay/` | Customer/Agent | Tạo payment intent + payment code + VietQR. |
| `POST` | `/payments/{id}/confirm-cash/` | Agent/Admin | Xác nhận cash; không dùng để xác nhận SePay. |
| `POST` | `/tickets/{code}/check-in/` | Agent/Admin | Check-in. |
| `GET` | `/dashboard/` | Dispatcher/Admin | Báo cáo. |
| `POST` | `/webhooks/sepay/` | SePay (HMAC) | Nhận webhook, idempotent, lưu transaction, match payment. |
| `GET` | `/payments/{id}/status/` | Owner/Agent/Admin | Polling trạng thái thanh toán/QR. |
| `GET` | `/api/payments/transactions/` | Admin business role | Tra cứu giao dịch SePay và review required; không dùng `/admin/`. |

Contract lập kế hoạch chi tiết được trình bày tại [API_CONTRACT.md](./API_CONTRACT.md).

## 14. Definition of Done

- 12 business tables migrate thành công trên MySQL 8.0+ với PK/FK/index/constraint đúng thiết kế.
- 4 role hoạt động và URL/action quan trọng được bảo vệ.
- Admin/Dispatcher tạo master data, trip và assignment.
- Customer tìm trip, xem ghế và tạo booking nhiều ghế.
- Hai request không thể giữ cùng ghế cho cùng trip.
- Cash và SePay thật hoạt động; webhook HMAC/idempotency xác nhận đúng booking và lưu transaction.
- Hủy booking pending giải phóng ghế.
- Có check-in và dashboard từ dữ liệu thật.
- Có bộ dữ liệu demo thống nhất.
- Code chạy từ README trên máy khác; secret nằm trong `.env`, không commit Git.

## 15. Rủi ro và quyết định scope

| Rủi ro | Biểu hiện | Giải pháp |
|---|---|---|
| Migration conflict | Nhiều người cùng sửa model/migration. | Lead review model contract; merge theo thứ tự; shared DB chỉ migrate từ branch tích hợp. |
| Double booking | Hai người chọn cùng ghế. | DB unique active seat + `transaction.atomic()`. |
| Webhook giả mạo/replay | Payload giả hoặc SePay retry cùng giao dịch. | HMAC-SHA256 + timestamp + unique SePay transaction ID. |
| Scope phình | Thêm refund, gateway khác, VA phức tạp, GPS, promo. | Khóa scope ở SePay QR/webhook; refund tự động và gateway khác đưa backlog. |
| Shared DB hỏng dữ liệu | Thành viên sửa trực tiếp schema/data. | Dev bằng local DB; staging/shared chỉ cho integration/demo; backup trước migration lớn. |
| Driver role phình hệ thống | Tạo thêm dashboard/login cho driver. | Driver giữ ở `employees`, không phải user role trong scope hiện tại. |
| Late/extra payment | Tiền đến sau expiry hoặc khách chuyển dư/lặp. | Lưu transaction review required; không tự cấp lại ghế; Admin xử lý thủ công. |

## 16. File database đi kèm

Tài liệu DOCX gọi file SQL đi kèm là `03_Database_IntercityBusManagement_MySQL_SePay.sql`; tệp thực tế trong repository là `Database_IntercityBusManagement.sql`. Tệp thực tế tạo database `intercity_bus_management`, định nghĩa 12 bảng nghiệp vụ, index, trigger, hai view và dữ liệu master demo không chứa mật khẩu user.

- MySQL mục tiêu: 8.0+.
- Phần reset schema chỉ dành cho development/demo, không chạy production.
- User demo phải tạo qua Django để password đúng chuẩn Django.
- Django có thể sinh thêm bảng framework; con số 12 chỉ tính bảng nghiệp vụ.

## Phụ lục A. Traceability nghiệp vụ -> bảng

| Nhóm nghiệp vụ | Bảng chính |
|---|---|
| Account/RBAC | `users` |
| Employee management | `employees` |
| Station management | `stations` |
| Route management | `routes`, `stations` |
| Bus management | `buses` |
| Seat layout | `bus_seats`, `buses` |
| Trip management | `trips`, `routes`, `buses` |
| Staff assignment | `trip_staff_assignments`, `trips`, `employees` |
| Search/availability | `routes`, `stations`, `trips`, `buses`, `bus_seats`, `tickets` |
| Booking | `bookings`, `tickets`, `users`, `trips` |
| Payment | `payments`, `payment_transactions`, `bookings`, `tickets` |
| Check-in | `tickets`, `trips` |
| Dashboard | `trips`, `bookings`, `tickets`, `payments`, `payment_transactions`, `routes` |

## Phụ lục B. Tham chiếu kỹ thuật SePay

- SePay Developer - tích hợp webhook: `https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook`
- SePay Developer - xác thực webhook: `https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc`
- SePay Developer - bảo mật webhook: `https://developer.sepay.vn/vi/sepay-webhooks/bao-mat`
- SePay Developer - tạo QR/form thanh toán: `https://developer.sepay.vn/vi/sepay-webhooks/tao-qr-va-form-thanh-toan`
