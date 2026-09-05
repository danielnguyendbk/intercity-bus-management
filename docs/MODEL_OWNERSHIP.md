# Model Ownership

## Nguyên tắc

- Mỗi bảng nghiệp vụ trong SQL có đúng một Django app sở hữu model và migration state tương ứng.
- App sở hữu chịu trách nhiệm model, admin, serializer cơ bản, service nghiệp vụ thuộc domain và test của model đó.
- App khác chỉ tham chiếu model qua public service/query API hoặc foreign key được định nghĩa rõ; không sửa migration của app không thuộc quyền sở hữu.
- BA/Technical Lead/Database Owner review mọi thay đổi model, constraint, trigger, view và thứ tự migration.
- `Database_IntercityBusManagement.sql` là thiết kế tham chiếu đã phê duyệt. Django migrations cuối cùng là cơ chế tạo/cập nhật schema; không chạy nguyên SQL song song với migrations.

## Ánh xạ bảng -> Django model -> owner

| Bảng SQL | Django model dự kiến | App sở hữu | Trách nhiệm chính |
|---|---|---|---|
| `users` | `User` (`AbstractUser`) | `accounts` | Username; required unique email; first/last name; nullable unique phone; business role; active/staff/superuser; built-in `date_joined`/`last_login`; `updated_at=auto_now`. |
| `employees` | `Employee` | `accounts` | Driver/attendant, GPLX, active state; `created_at=auto_now_add`, `updated_at=auto_now`. |
| `stations` | `Station` | `operations` | Danh mục bến. |
| `routes` | `Route` | `operations` | Tuyến origin/destination, giá và thời lượng tham khảo. |
| `buses` | `Bus` | `operations` | Xe, loại xe, sức chứa, trạng thái. |
| `bus_seats` | `BusSeat` | `operations` | Sơ đồ ghế vật lý của xe. |
| `trips` | `Trip` | `operations` | Lần chạy cụ thể, xe, thời gian, giá, trạng thái. |
| `trip_staff_assignments` | `TripStaffAssignment` | `operations` | Phân công employee vào trip. |
| `bookings` | `Booking` | `bookings` | Đơn giữ chỗ, contact, tổng tiền, hết hạn/hủy. |
| `tickets` | `Ticket` | `bookings` | Hành khách + ghế + trip, trạng thái/check-in. |
| `payments` | `Payment` | `payments` | Payment intent cash/SePay của booking. |
| `payment_transactions` | `PaymentTransaction` | `payments` | Webhook/giao dịch SePay, idempotency, audit/reconciliation. |

## Tài sản schema không phải model nghiệp vụ

| Tài sản SQL | Owner | Cách quản lý dự kiến |
|---|---|---|
| `v_trip_availability` | `bookings`, có review của `operations` | Migration database operation thuộc `bookings`; query layer read-only. |
| `v_booking_summary` | `payments`, có review của `bookings` | Migration database operation thuộc `payments`; query/report read-only. |
| Trigger trên `bus_seats`, `trips`, `trip_staff_assignments` | `operations` | Explicit migrations riêng của `operations`, gồm rule đổi trip bus, giảm capacity và deactivate seat. |
| Trigger trên `bookings`, `tickets` | `bookings` | Migration riêng của `bookings`. |
| Trigger trên `payments` và trigger cross-domain xác nhận booking/ticket | `payments`, review bắt buộc của `bookings` | Migration của `payments` phụ thuộc migration `bookings`; thay đổi phải có đồng thuận hai owner. |
| Django/allauth/auth/session tables | Framework/integration | Do migrations của Django và django-allauth quản lý; không tính vào 12 bảng nghiệp vụ. |

## Ownership chức năng

### `accounts`

- `User`, `Employee`.
- Đăng ký/đăng nhập/logout/session.
- Google OAuth bằng django-allauth.
- RBAC và permission classes dùng role đơn trên `User`.
- OAuth user auto-created luôn customer; `is_staff`/`is_superuser` độc lập business role.
- Google email trùng không auto-link; authenticate existing account trước explicit link. OAuth username do server sinh collision-safe.
- Phase 1 DRF auth chỉ dùng `SessionAuthentication`; `/admin/` chỉ dành cho Django Admin.
- Quy tắc driver license trước khi assignment được `accounts` cung cấp dưới dạng validation/service; `operations` gọi khi phân công.

### `operations`

- `Station`, `Route`, `Bus`, `BusSeat`, `Trip`, `TripStaffAssignment`.
- CRUD dữ liệu nền và vận hành.
- Dispatcher có global operations scope trong MVP; không có branch/station ownership model.
- State transition của trip.
- Kiểm tra bus/staff overlap và điều kiện mở bán.
- Cấm đổi trip bus khi có active tickets; cấm giảm capacity dưới active seats; cấm deactivate seat có active ticket.
- Không sở hữu booking, seat hold hoặc payment.

### `bookings`

- `Booking`, `Ticket`.
- Trip search và seat availability bằng read/query dependency vào `operations`.
- Public được search/view availability; customer booking creation yêu cầu authentication.
- Tạo booking nhiều vé, transaction boundary, double-booking protection.
- Expiration, cancellation, check-in.
- Không thay đổi master data hoặc payment state trực tiếp ngoài contract đã định nghĩa.

### `payments`

- `Payment`, `PaymentTransaction`.
- Tạo VietQR/payment intent; nhận và xác thực webhook SePay.
- Idempotency, matching, reconciliation, review queue, revenue reporting.
- Khi payment hợp lệ, gọi workflow xác nhận booking/tickets trong cùng transaction; không bypass service bằng API thông thường.
- CASH confirmation thuộc action riêng cho Ticket Agent/Admin. SePay success chỉ từ verified webhook path; admin reconciliation không giả lập webhook.

## Mapping conventions đã phê duyệt

- Django 5.2 LTS, DRF, django-allauth, MySQL 8.0+.
- Python 3.12; exact pins: Django 5.2.17, DRF 3.18.0, django-allauth 65.19.2, mysqlclient 2.2.8.
- `BigAutoField` cho application primary keys; không giữ `UNSIGNED` nếu không có concrete rule.
- Business enums dùng `CharField + TextChoices`, không native MySQL `ENUM`.
- Không tái tạo `ON UPDATE CASCADE` nếu không có concrete requirement.
- `TIME_ZONE="Asia/Ho_Chi_Minh"`, `USE_TZ=True`.
- Django sở hữu timestamps: User không có duplicate `created_at`; future business models mặc định `created_at=auto_now_add`, `updated_at=auto_now` nếu không có approved exception.
- Generated columns, triggers và views đặc thù MySQL phải nằm trong explicit migrations của app owner.

## Dependency direction

```text
accounts        operations
    ^               ^
    | employee      | trip/bus/seat read contracts
    | reference     |
    +---- operations+---- bookings <---- payments
          (User/Employee)       ^           |
                                +-----------+
                         booking confirmation contract
```

Diễn giải dependency ở mức Django app:

- `operations -> accounts`: assignment tham chiếu `Employee`.
- `bookings -> accounts`: booking tham chiếu customer/creator `User`.
- `bookings -> operations`: booking/ticket tham chiếu trip/seat và đọc availability.
- `payments -> bookings`: payment tham chiếu booking và xác nhận booking/tickets.
- `payments` có thể đọc `operations` gián tiếp qua booking cho báo cáo; không thêm foreign key payment -> operations.
- `accounts` không phụ thuộc app nghiệp vụ khác.
- Tránh import ngược `bookings -> payments`; booking cancellation/expiry phát ra service-level action hoặc dùng orchestration module để payments cập nhật payment pending. Cách triển khai cụ thể phải tránh circular import.

## Quyền thay đổi contract

- Thay đổi field/table/constraint: Database Owner + Technical Lead phê duyệt.
- Thay đổi business rule/API/permission: BA + Technical Lead phê duyệt.
- Thay đổi SePay matching/signature/idempotency: Payment Owner + Technical Lead phê duyệt.
- Migration cross-app chỉ được merge sau khi migration graph được kiểm tra trên database local sạch và bản sao staging.
