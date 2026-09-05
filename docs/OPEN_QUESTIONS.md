# Open Questions and Contradictions

## 1. Resolved decisions

Các mục dưới đây được đánh dấu **RESOLVED**. Quyết định mới được ưu tiên khi trực tiếp làm rõ hoặc thay thế câu hỏi trước đó.

### RESOLVED C-01 - Custom User shape

Sử dụng `User(AbstractUser)`, giữ `username`, `password`, `first_name`, `last_name`, `email`, `phone`, `role`, `is_active`, `is_staff`, `is_superuser`, `last_login`, `date_joined` và field timestamp bổ sung nào được chốt riêng. Không dùng `password_hash`, `full_name` hoặc `last_login_at` làm tên field Django.

### RESOLVED C-02 - Email và phone

Email bắt buộc và duy nhất. Phone nullable và unique. Email rỗng không phải giá trị hợp lệ của tài khoản.

### RESOLVED C-03 - CASH và SEPAY

`TICKET_AGENT` hoặc `ADMIN` được xác nhận `CASH` thủ công. `SEPAY` chỉ được tự động xác nhận từ webhook SePay đã xác thực. Ticket Agent không được đánh dấu SePay success thủ công. Admin chỉ review/reconcile giao dịch có vấn đề và không được giả lập/bỏ qua webhook verification.

### RESOLVED C-04 - Public search

Anonymous được tìm chuyến và xem seat availability. Authentication bắt buộc để tạo customer booking.

### RESOLVED C-05 - Dispatcher scope

Dispatcher có global operational scope trong MVP. Branch/station-specific dispatcher scoping nằm ngoài phạm vi.

### RESOLVED Q-01 - Primary key signedness

Dùng Django `BigAutoField` cho application primary keys. Không giữ MySQL `UNSIGNED` nếu không có business rule cụ thể yêu cầu.

### RESOLVED Q-02 - Enum mapping

Business enum dùng Django `CharField` + `TextChoices`. Không phụ thuộc native MySQL `ENUM` trong Django models.

### RESOLVED Q-04 - `ON UPDATE CASCADE`

Không tái tạo `ON UPDATE CASCADE` nếu không có concrete requirement. Application primary keys được coi là bất biến.

### RESOLVED Q-06 - Framework baseline

Dùng Django 5.2 LTS, Django REST Framework, django-allauth và MySQL 8.0+.

### RESOLVED Q-08 - Đổi bus của trip

Trip chỉ được đổi bus khi không tồn tại ticket `HELD`, `CONFIRMED` hoặc `USED` của trip. Khi đã có active ticket, đổi `trip.bus` bị cấm.

### RESOLVED Q-09 - Giảm `seat_capacity`

Không được giảm capacity thấp hơn số bus seats có `is_active = TRUE`.

### RESOLVED Q-10 - Deactivate seat

Không được deactivate seat đang được active ticket (`HELD`, `CONFIRMED`, `USED`) tham chiếu.

### RESOLVED Q-18a - Role của Google OAuth user

Google OAuth user được tạo tự động luôn bắt đầu là `CUSTOMER`. OAuth không được cho phép tự chọn staff/admin business role. Django `is_staff` và `is_superuser` độc lập với `role`.

### RESOLVED Q-20 - Name fields

Dùng `first_name` và `last_name`; không có persisted `full_name` trên `User`.

### RESOLVED Q-31a - Django timezone

`TIME_ZONE = "Asia/Ho_Chi_Minh"` và `USE_TZ = True`. Django xử lý datetime timezone-aware.

## 2. Resolved Phase 1 blockers

### RESOLVED B-01 - Timestamp ownership

Django sở hữu application timestamps. `User` dùng built-in `date_joined`, built-in `last_login`, thêm `updated_at = DateTimeField(auto_now=True)` và không có duplicate `created_at`. `Employee` dùng `created_at = DateTimeField(auto_now_add=True)` và `updated_at = DateTimeField(auto_now=True)`. Future business models theo cùng convention nếu không có approved requirement khác. Database-managed `CURRENT_TIMESTAMP`/`ON UPDATE` không phải authoritative strategy.

### RESOLVED B-02 - Google linking và username

Google identity chỉ được auto-create user nếu email chưa tồn tại. Không silently link theo email. Email đã tồn tại thì user phải authenticate vào account hiện có trước khi explicit link. Username OAuth do server sinh từ email local-part và thêm collision-safe suffix khi cần. Social user mới luôn `CUSTOMER` và không được chọn privileged role.

### RESOLVED B-03 - DRF authentication

Phase 1 chỉ dùng DRF `SessionAuthentication`. Không thêm JWT, DRF token authentication hoặc SimpleJWT; JWT chỉ được thêm bằng requirement phê duyệt riêng.

### RESOLVED B-04 - Admin namespace

`/admin/` dành riêng cho Django Admin. Business APIs không dùng namespace này. Business authorization dùng project `role`; `is_staff`/`is_superuser` chỉ là Django administrative concepts.

### RESOLVED B-05 - Dependency baseline

Python 3.12; `Django==5.2.17`; `djangorestframework==3.18.0`; `django-allauth[socialaccount]==65.19.2`; `mysqlclient==2.2.8`.

## 3. Remaining Phase 1 blockers

**None.** Không còn schema blocker ngăn tạo `accounts/0001_initial.py` theo contract đã phê duyệt.

## 4. Unresolved database decisions - non-blocking for Phase 1

### DB-01 - Composite foreign key ticket-booking

SQL dùng `(tickets.booking_id, tickets.trip_id) -> bookings(id, trip_id)`. Cần chốt Django model state/constraint strategy: relation theo booking ID với database composite FK qua explicit migration, hay một mapping khác được Database Owner duyệt. Chặn booking migration, không chặn accounts migration.

### DB-02 - Generated `active_seat_key`

Đã chốt MySQL-specific generated columns phải ở explicit migration. Cần xác minh Django 5.2 `GeneratedField` sinh đúng MySQL DDL hay cần `SeparateDatabaseAndState`/`RunSQL`. Chặn ticket migration, không chặn Phase 1.

### DB-04 - Bus/staff overlap concurrency

Trigger reference dùng `COUNT` và có thể race giữa hai transaction. Plan dùng `select_for_update()` trên bus/employee. Cần quyết định có yêu cầu thêm database serialization/locking nào không.

### DB-05 - Booking expiry sát departure

Trigger có thể clamp expiry thành `departure - 1 minute` sau khi đã kiểm tra future time, tạo expiry không còn tương lai nếu trip quá gần giờ đi. Có cần booking cutoff trước departure không? Chưa có business rule về cutoff.

### DB-06 - State transition enforcement depth

Django service sẽ enforce state flow. Chưa chốt DB trigger có phải enforce toàn bộ trip/booking/payment transition hay chỉ giữ các trigger trong reference.

### DB-07 - `REVIEW_REQUIRED` state mapping

Cần matrix chính xác cho unmatched, wrong account, wrong code, wrong amount, late và extra payment: khi nào chỉ `PaymentTransaction` review, khi nào cả `Payment` review. Admin review không được bypass webhook verification đã được chốt.

### DB-08 - PaymentTransaction mutability

Chưa chốt field nào admin reconciliation được sửa (`payment_id`, `processing_status`, `review_reason`, `processed_at`) và field webhook nào immutable.

### DB-09 - Existing assignment after bus/employee deactivation

Chưa có rule cho việc đổi bus sang maintenance/inactive hoặc employee sang inactive sau khi đã được phân vào future trip.

## 5. Remaining API/business decisions - non-blocking for first migration

### API-01 - CRUD detail routes

Nguồn chỉ ghi `GET/POST` collection nhưng use case cần detail/update/deactivate. Cần chốt DRF conventional detail routes/methods và hard-delete policy cho từng resource.

### API-02 - Trip transition actions

Chưa có endpoint cho open/boarding/departed/completed/cancelled hoặc dữ liệu cancellation của trip.

### API-03 - Booking `COMPLETED`

Chưa có rule xác định khi nào booking chuyển completed.

### API-04 - Check-in time window

"BOARDING hoặc gần giờ khởi hành" chưa có số phút/cutoff cụ thể.

### API-05 - Agent/Admin cancellation scope

Chưa rõ agent được hủy mọi pending booking hay chỉ booking do mình tạo; staff cancellation reason có bắt buộc không.

### API-06 - Repeated payment intent

Chưa chốt create SePay lần hai trả intent hiện có, conflict, hay cho đổi method khi payment còn pending.

### API-07 - CASH creation flow

Đã chốt ai được confirm cash; chưa chốt payment cash luôn được tạo pending rồi confirm hay có thể tạo trực tiếp success tại quầy, và expiry được xử lý khi nào.

### API-08 - SePay payload/matching contract

Cần fixture từ integration thật để chốt payment-code extraction, case sensitivity, header names, signed bytes, timestamp unit/window, response body và retry behavior.

### API-09 - Date boundaries và dashboard formulas

Timezone đã chốt, nhưng chưa chốt inclusive/exclusive date boundaries; "vé đã bán", utilization, top route/trip và date field dùng cho từng report.

### API-10 - Manual reconciliation workflow

Admin được review/reconcile nhưng chưa chốt action hợp lệ như manual match/ignore/escalate và audit data. Không action nào được biến thành giả webhook hoặc manual SePay success.

### API-11 - Raw payload retention

Chưa có retention, masking, access và logging policy cho raw payload, account number và webhook signature.

### API-12 - Demo seed mechanism

Chưa chốt management command, fixture hay data migration và môi trường nào được phép chạy seed.

## 6. Remaining source/reference contradictions

Các điểm sau không được sửa ngầm trong `Database_IntercityBusManagement.sql`; Django migrations sẽ theo quyết định mới và phần khác biệt phải được review/document:

1. SQL vẫn dùng `BIGINT UNSIGNED`, trong khi quyết định mới dùng Django `BigAutoField` thông thường.
2. SQL vẫn dùng native MySQL `ENUM`, trong khi Django models dùng `CharField + TextChoices`.
3. SQL vẫn ghi `ON UPDATE CASCADE`, trong khi migrations không tái tạo nếu không có concrete requirement.
4. SQL chưa chặn đổi `trips.bus_id` khi trip đã có active tickets.
5. SQL chưa chặn giảm `buses.seat_capacity` thấp hơn số active seats.
6. SQL chưa chặn deactivate `bus_seats` đang được active tickets tham chiếu.
7. SQL timestamp defaults/auto-update khác quyết định Django-managed timestamps và sẽ không là authoritative migration semantics.
8. SQL overlap triggers chưa tự bảo đảm serialization cho concurrent inserts.
9. SQL booking-expiry trigger còn edge case rất sát departure.
10. SQL chỉ enforce một phần state machines.

## 7. First migration readiness

Không còn schema blocker. Có thể tạo an toàn `accounts/0001_initial.py` với `User(AbstractUser)` dùng `date_joined`, `last_login`, `updated_at=auto_now`; không thêm `created_at` cho User. `Employee` dùng `created_at=auto_now_add`, `updated_at=auto_now`. PK dùng `BigAutoField`; role/type dùng `CharField + TextChoices`.
