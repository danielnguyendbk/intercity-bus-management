# Backend Implementation Plan

## 1. Guardrails và nguồn sự thật

- Business scope/rules: `PhanTichNghiepVu_IntercityBusManagement.docx` và bản chuyển đổi [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md).
- Database design/reference: `Database_IntercityBusManagement.sql`.
- Django migrations sẽ là nguồn sự thật để tạo và nâng cấp schema.
- Không chạy toàn bộ SQL reference bên cạnh `manage.py migrate`; các phần được phê duyệt như trigger, generated column, composite foreign key và view phải được chuyển thành migration có state/operation rõ ràng.
- Không đổi tên bảng, field, enum, constraint hoặc workflow để "hợp Django" mà chưa ghi nhận và được BA/Database Owner phê duyệt.
- Các quyết định chưa có nguồn được giữ ở [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).

Baseline đã chốt: Python 3.12, Django 5.2.17, Django REST Framework 3.18.0, django-allauth 65.19.2 với socialaccount, mysqlclient 2.2.8, MySQL 8.0+, `TIME_ZONE = "Asia/Ho_Chi_Minh"`, `USE_TZ = True`, `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"`.

## 2. Repository tree đề xuất

```text
intercity-bus-management/
├─ manage.py
├─ pyproject.toml                 # hoặc requirements files; chốt công cụ trước Phase 1
├─ .env.example
├─ .gitignore
├─ README.md
├─ config/
│  ├─ __init__.py
│  ├─ settings/
│  │  ├─ __init__.py
│  │  ├─ base.py
│  │  ├─ local.py
│  │  ├─ test.py
│  │  └─ staging.py
│  ├─ urls.py
│  ├─ asgi.py
│  └─ wsgi.py
├─ apps/
│  ├─ __init__.py
│  ├─ accounts/
│  │  ├─ migrations/
│  │  ├─ models.py
│  │  ├─ admin.py
│  │  ├─ serializers.py
│  │  ├─ permissions.py
│  │  ├─ services.py
│  │  ├─ selectors.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ tests/
│  ├─ common/
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  ├─ services/
│  │  ├─ selectors/
│  │  ├─ validators/
│  │  └─ tests/
│  ├─ operations/
│  │  ├─ migrations/
│  │  ├─ models.py
│  │  ├─ admin.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ selectors.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ tests/
│  ├─ bookings/
│  │  ├─ migrations/
│  │  ├─ management/commands/
│  │  ├─ models.py
│  │  ├─ admin.py
│  │  ├─ serializers.py
│  │  ├─ services.py
│  │  ├─ selectors.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ tests/
│  └─ payments/
│     ├─ migrations/
│     ├─ integrations/sepay.py
│     ├─ models.py
│     ├─ admin.py
│     ├─ serializers.py
│     ├─ services.py
│     ├─ reconciliation.py
│     ├─ selectors.py
│     ├─ urls.py
│     ├─ webhooks.py
│     └─ tests/
├─ tests/
│  ├─ integration/
│  └─ concurrency/
├─ docs/
│  └─ ...
└─ scripts/                         # operator scripts only; no duplicate schema SQL
```

Tên package/file là đề xuất kỹ thuật, không phải thay đổi business scope. Không tạo tree này trong task hiện tại.

## 3. App boundaries và dependency direction

- `accounts`: `User`, `Employee`, local auth, allauth, RBAC.
- `common`: health endpoint và shared primitives thật sự dùng chung; không sở hữu business model.
- `operations`: `Station`, `Route`, `Bus`, `BusSeat`, `Trip`, `TripStaffAssignment` và schedule validation.
- `bookings`: `Booking`, `Ticket`, search/availability, booking transaction, expiry, cancellation, check-in.
- `payments`: `Payment`, `PaymentTransaction`, VietQR, SePay webhook, matching, idempotency, reconciliation, revenue.

Dependency cho phép:

```text
accounts <- operations
accounts <- bookings -> operations
bookings <- payments
```

- `accounts` độc lập với nghiệp vụ downstream.
- `common` không import business apps; business apps chỉ phụ thuộc shared primitive nhỏ khi cần.
- `operations` chỉ tham chiếu `accounts.Employee`.
- `bookings` tham chiếu `accounts.User` và các model `operations`.
- `payments` tham chiếu `bookings.Booking`; reporting có thể join qua quan hệ này.
- Cross-domain workflow (expiry/cancel/payment success) nằm trong service orchestration có API nội bộ rõ ràng, tránh hai app import service của nhau. Trigger SQL vẫn được quản lý theo owner trong [MODEL_OWNERSHIP.md](./MODEL_OWNERSHIP.md).

## 4. Mapping SQL table -> Django model

| SQL | Model/app | Mapping đặc biệt cần giữ |
|---|---|---|
| `users` | `accounts.User` | `AbstractUser`, `db_table='users'`; username; required unique email; first/last name; nullable unique phone; business role; separate staff/superuser flags. |
| `employees` | `accounts.Employee` | Choice employee type; check driver license; indexes/unique theo SQL. |
| `stations` | `operations.Station` | `db_table`, code unique, soft deactivation. |
| `routes` | `operations.Route` | Hai FK tới station với distinct `related_name`; check origin != destination và numeric checks. |
| `buses` | `operations.Bus` | `CharField + TextChoices`; capacity check; không cho giảm capacity dưới active seat count. |
| `bus_seats` | `operations.BusSeat` | Unique `(bus, seat_number)`; capacity/deactivation triggers; FK delete behavior theo SQL. |
| `trips` | `operations.Trip` | Nullable bus; time/price checks; schedule indexes/overlap trigger; cấm đổi bus khi có active ticket. |
| `trip_staff_assignments` | `operations.TripStaffAssignment` | Unique `(trip, employee)`; role/type và overlap triggers. |
| `bookings` | `bookings.Booking` | Hai FK user với distinct related names; unique `(id, trip)` để làm target composite FK; expiry/status. |
| `tickets` | `bookings.Ticket` | FK booking/trip/seat; composite DB FK booking+trip; stored generated active seat key; unique key. |
| `payments` | `payments.Payment` | One-to-one booking; amount/status checks và transition triggers. |
| `payment_transactions` | `payments.PaymentTransaction` | Nullable payment; unique SePay ID; JSON raw payload; audit indexes. |

### Django/framework mapping decisions và conflicts còn lại

- **Resolved:** `User(AbstractUser)` theo field chuẩn Django; email required/unique; phone nullable/unique; first/last name; business role riêng với staff/superuser.
- **Resolved:** dùng `BigAutoField`; không giữ `UNSIGNED` nếu không có concrete rule.
- **Resolved:** business enum dùng `CharField + TextChoices`, không native MySQL enum.
- **Resolved:** không tái tạo `ON UPDATE CASCADE` nếu không có concrete requirement.
- Composite foreign key của `tickets(booking_id, trip_id)` không có mapping ForeignKey thông thường tương đương trong Django ORM.
- **Resolved:** Django sở hữu timestamps. User dùng `date_joined`, `last_login`, `updated_at=auto_now` và không có `created_at`; Employee dùng `created_at=auto_now_add`, `updated_at=auto_now`. Future business models theo convention này.
- `active_seat_key` là stored generated column; phải xác minh DDL của Django 5.2/MySQL hoặc dùng explicit migration.
- SQL reference chưa có trigger cho ba rule mới: đổi trip bus, giảm seat capacity và deactivate seat có active ticket.

Không giải quyết các khác biệt này bằng thay đổi ngầm. Chiến lược migration bên dưới chỉ là phương án đề xuất, chờ câu hỏi mở được duyệt.

## 5. Custom User strategy

1. Tạo `accounts.User(AbstractUser)` và đặt `AUTH_USER_MODEL='accounts.User'` ngay từ đầu.
2. Giữ `username`; `email` required + unique; `phone` nullable + unique; dùng `first_name` và `last_name`, không persisted `full_name`.
3. Role dùng `CharField + TextChoices`: `CUSTOMER`, `TICKET_AGENT`, `DISPATCHER`, `ADMIN`; default `CUSTOMER`.
4. `is_staff` và `is_superuser` giữ nguyên semantics Django, độc lập với business role. Không suy ra hai flag này chỉ từ `role`.
5. Registration local và Google OAuth auto-created user luôn ép role customer. Chỉ admin workflow được đổi staff business role.
6. Password dùng `set_password()`/Django hasher; serializer không đọc/trả password.
7. Dùng `settings.AUTH_USER_MODEL`/`get_user_model()` trong quan hệ/import.
8. Không dùng hard delete cho user có lịch sử; deactivate theo UC-03.
9. User timestamp: built-in `date_joined`, built-in `last_login`, thêm `updated_at = DateTimeField(auto_now=True)`; không thêm `created_at`.

## 6. django-allauth / Google OAuth strategy

- Cài allauth như integration của `accounts`, dùng cùng custom user từ ngày đầu.
- Migrations allauth tạo bảng framework/social account ngoài 12 bảng nghiệp vụ; điều này phù hợp ghi chú trong nguồn.
- Google credentials và site/callback config qua environment/secret; không commit secret.
- OAuth callback tạo Django session giống local login; RBAC vẫn đọc `User.role`.
- Custom allauth adapter/account hook phải ép mọi OAuth user mới thành `role=CUSTOMER`, `is_staff=False`, `is_superuser=False`; không nhận các field quyền từ request/provider.
- Chỉ auto-create social user khi email chưa tồn tại. Email trùng không auto-link; yêu cầu user authenticate existing account rồi explicit link.
- Username do server sinh từ readable email local-part và collision-safe suffix khi cần.
- Verified-email/inactive-user details ngoài skeleton được test/chốt khi triển khai full OAuth business flow; không mở rộng Phase 1.
- Test adapter/account creation riêng để bảo đảm OAuth không thể tự gán staff/admin role.

## 7. Migration strategy: Django là nguồn tạo schema

### 7.1 Baseline

1. Không còn schema blocker: framework, user shape, timestamp ownership, PK và enum mapping đã được phê duyệt.
2. Tạo migration `accounts 0001` chứa custom user và employee.
3. Tạo `operations` schema theo thứ tự station -> route -> bus -> seat -> trip -> assignment.
4. Tạo `bookings` schema theo thứ tự booking -> ticket.
5. Tạo `payments` schema theo thứ tự payment -> transaction.
6. Thêm migration database-specific sau model state để tạo generated column/composite FK/trigger/view không biểu diễn trực tiếp.
7. Tạo data migration demo riêng và chỉ enable cho môi trường demo nếu được duyệt; không nhúng password.

### 7.2 Chuyển SQL reference thành migrations

- Không copy phần `CREATE DATABASE`, `USE`, `DROP TABLE`, `DROP VIEW`, `SET FOREIGN_KEY_CHECKS` vào migration production.
- PK/FK/index/check/unique nào Django hỗ trợ sẽ được khai báo trong model/migration state với tên constraint theo SQL khi khả thi.
- MySQL-specific generated columns/triggers/views dùng migration tách riêng (`RunSQL`/`SeparateDatabaseAndState` khi cần), có reverse SQL rõ ràng và test `sqlmigrate`/`SHOW CREATE TABLE`.
- Trigger và view nằm trong migration versioned, không chạy tay. Mỗi migration ghi dependency app rõ ràng.
- Khi có schema staging hiện hữu được tạo từ SQL reference, không dùng `--fake-initial` một cách mù quáng. So sánh `SHOW CREATE TABLE`, constraint, trigger và view trước khi baseline/fake.
- Sau khi migrations được chấp thuận, SQL reference chỉ dùng audit/traceability; mọi thay đổi schema mới phải bắt đầu bằng migration và cập nhật reference theo quy trình của Database Owner.

### 7.3 Mapping đã chốt và database-specific elements

- **PK:** dùng `BigAutoField`; migrations không cố giữ unsigned.
- **ENUM:** dùng `CharField + TextChoices`; migrations không tạo native MySQL enum. Có thể thêm `CheckConstraint` khi cần bảo vệ tập giá trị và được Database Owner duyệt.
- **FK update:** không tái tạo `ON UPDATE CASCADE`; primary keys bất biến.
- **Generated active seat key:** dùng `GeneratedField(..., db_persist=True)` nếu Django/MySQL version sinh đúng DDL; nếu không, giữ model state read-only tương ứng và tạo DDL qua migration SQL.
- **Composite FK:** model có quan hệ ORM dùng booking ID nhưng đặt `db_constraint=False` nếu cần tránh Django tạo FK khác thiết kế; migration SQL tạo FK `(booking_id, trip_id) -> bookings(id, trip_id)`. Cần test migration state và delete collector.
- **Triggers:** mỗi nhóm trigger MySQL nằm trong explicit named migration của app owner; không nhúng trong model save và không chạy SQL reference thủ công.
- **Timestamps:** Django fields là authoritative; không sao chép database-managed `CURRENT_TIMESTAMP`/`ON UPDATE` semantics từ SQL reference.

## 8. Rules ở Django và rules ở MySQL

### 8.1 Bắt buộc ở Django service/permission/validation

- Role/ownership/visibility và ma trận permission.
- Registration/OAuth default customer role; password hashing; inactive login; staff/superuser tách business role.
- Anonymous search/seat availability; authenticated customer booking; dispatcher global operations scope.
- Route/station/bus active checks trước mở bán.
- Driver license còn hiệu lực; trip có bus/driver trước mở bán.
- Trip/booking/ticket/payment state transition hợp lệ.
- Search chỉ trip mở bán tương lai và có bus.
- Ticket seat thuộc bus của trip (pre-validation; DB trigger là lớp cuối).
- Booking creation atomic; fare lấy từ trip; expiry; cancellation/check-in idempotency.
- SePay signature/timestamp/raw-body verification, match account/code/amount, replay behavior.
- Reporting/ownership/date filter.
- Cấm đổi trip bus khi có active ticket; cấm giảm capacity dưới active seat count; cấm deactivate seat có active ticket.

### 8.2 Giữ ở MySQL theo SQL reference

- Unique/check/FK/index của 12 bảng.
- Generated active seat key + unique constraint chống double booking.
- Trigger giới hạn active seat count.
- Trigger bus/staff overlap và assignment type/active.
- Trigger booking time/default expiry, ticket/booking consistency, ticket immutability/deletion.
- Trigger cộng booking total từ ticket insert.
- Trigger payment amount/immutability/on-time success.
- Trigger đồng bộ payment success -> booking/tickets confirmed.
- Trigger booking cancelled/expired -> tickets/payment pending cancelled.
- Explicit trigger mới chặn đổi trip bus khi có active ticket.
- Explicit trigger mới chặn giảm bus capacity dưới active seat count.
- Explicit trigger mới chặn deactivate seat đang có active ticket.
- Hai read views.

### 8.3 Không nên chỉ dựa vào trigger

- Trigger overlap dùng query `COUNT` không tự bảo đảm hai transaction đồng thời cùng vượt qua check. Service phải lock row tài nguyên liên quan.
- Trigger expiry chỉ chạy khi booking có insert/update; thời gian trôi qua không tự kích hoạt trigger. Management command/lazy check vẫn bắt buộc.
- HMAC/HTTP ownership/current user không thể đặt trong DB.
- State transition cần error có nghĩa ở API; Django phải validate trước, DB là lớp bảo vệ cuối.

## 9. Transaction boundaries và concurrency

### 9.1 Tạo booking

Một `transaction.atomic()` bao toàn bộ:

1. Đọc/lock trip và xác nhận mở bán, tương lai, có bus.
2. Lazy-expire các hold liên quan nếu policy được chốt.
3. Validate mọi seat active và thuộc bus.
4. Tạo booking pending.
5. Tạo toàn bộ tickets held, fare lấy từ trip.
6. Đọc total do trigger cập nhật trước response.

Unique generated key là quyết định cuối cho cùng trip+seat. Bắt `IntegrityError` theo tên/duplicate key, rollback toàn bộ và trả 409; không retry tự động sang ghế khác.

### 9.2 Schedule operations

- Khi tạo/sửa trip có bus: lock `Bus` row để serialize schedule check cho cùng bus; Django check overlap; DB trigger check lại.
- Trước khi đổi `Trip.bus`, lock trip và kiểm tra không có ticket `HELD`, `CONFIRMED`, `USED`; nếu có thì từ chối. Explicit MySQL trigger là lớp bảo vệ cuối.
- Trước khi giảm `Bus.seat_capacity`, lock bus và đếm active seats; từ chối nếu capacity mới thấp hơn count. Explicit MySQL trigger kiểm tra lại.
- Trước khi deactivate `BusSeat`, lock seat và kiểm tra không có active ticket tham chiếu; explicit MySQL trigger kiểm tra lại.
- Khi assign/sửa staff: lock `Employee` row; check overlap/license/type; DB trigger check lại.
- Khi đổi thời gian trip: lock bus và toàn bộ employee đã assign theo thứ tự ổn định để giảm deadlock; validate rồi update.
- Có retry hữu hạn chỉ cho deadlock/serialization failure được nhận diện, không retry business conflict.

### 9.3 Payment webhook

Sau signature validation, một atomic block:

1. Insert transaction unique theo SePay ID.
2. Nếu duplicate, trả kết quả idempotent mà không transition.
3. Lock payment và booking match được; đánh giá late/wrong/extra.
4. Update transaction processing state.
5. Với valid/on-time: update payment success; trigger/service đồng bộ booking/tickets.

Không giữ DB transaction trong lúc gọi network ngoài. QR construction không cần transaction dài.

### 9.4 Expiry/cancel/check-in

- Expiry worker xử lý batch nhỏ, lock booking bằng `select_for_update`; chỉ pending và expired mới transition.
- Cancel lock booking/payment/tickets; thao tác lặp lại trả current state.
- Check-in lock ticket; confirmed -> used một lần; used trả idempotent result.

## 10. SePay architecture

```text
Client -> create payment intent -> Payment PENDING + VietQR data
Bank transfer -> SePay -> HTTPS webhook -> signature/timestamp gate
                                      -> idempotency insert
                                      -> reconciliation/matching
                                      -> atomic state transition
Client <- poll payment status <------- Payment/Booking state
Admin  <- review/report <------------- PaymentTransaction audit data
```

Components:

- QR builder: thuần, nhận bank/account/amount/payment code và trả URL/data.
- Webhook verifier: chỉ xử lý raw bytes + headers; không truy cập DB trước khi auth pass.
- Payload adapter: ánh xạ payload SePay đã xác nhận sang command nội bộ.
- Idempotency/reconciliation service: insert transaction, match payment, phân loại processed/review/ignored.
- Confirmation service: atomic payment/booking/ticket transition.
- Status selector: read-only polling.
- Admin reconciliation/report selector: chỉ success vào revenue.

`CASH` đi qua action thủ công riêng và chỉ `TICKET_AGENT`/`ADMIN` được gọi. `SEPAY` không có manual-success action: chỉ verified webhook service được phép thực hiện transition SePay -> success. Admin reconciliation không được gọi confirmation service bằng cách giả webhook hoặc bỏ qua verifier.

Không log HMAC secret. Raw payload chỉ lưu sau khi webhook authenticity pass theo BR-031. Chính sách redaction/retention cho account number/raw payload là open question.

## 10.1 Authentication và admin boundary

- DRF Phase 1 chỉ cấu hình `SessionAuthentication`; không cài/cấu hình JWT, DRF token authentication hoặc SimpleJWT.
- `/admin/` chỉ mount Django Admin.
- Business APIs nằm dưới `/api/<app>/`; không dùng `/admin/`.
- Business permissions đọc `User.role`. `is_staff`/`is_superuser` chỉ điều khiển Django administrative access và không thay business role.

## 11. Environment variables dự kiến

Các tên dưới đây là config kỹ thuật đề xuất; giá trị thật không commit:

```text
DJANGO_SETTINGS_MODULE
DJANGO_SECRET_KEY
DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS
DJANGO_CSRF_TRUSTED_ORIGINS
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
MYSQL_HOST
MYSQL_PORT
MYSQL_CONN_MAX_AGE

GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_CALLBACK_URL

SEPAY_WEBHOOK_SECRET
SEPAY_BANK_CODE
SEPAY_ACCOUNT_NUMBER
SEPAY_ACCOUNT_NAME
SEPAY_WEBHOOK_MAX_AGE_SECONDS

BOOKING_HOLD_MINUTES
```

Tên biến chính thức cần được khóa trong `.env.example` ở Phase 1. `BOOKING_HOLD_MINUTES` mặc định 15 và không được làm expiry vượt departure. Callback/CSRF/allowed hosts khác nhau theo local/staging.

`TIME_ZONE="Asia/Ho_Chi_Minh"` và `USE_TZ=True` là giá trị kiến trúc cố định trong settings, không phải environment overrides. Django-managed `auto_now_add`/`auto_now` là timestamp strategy cho business models.

## 12. Local MySQL và shared/staging workflow

### Local

- Mỗi developer dùng MySQL 8.0+ database riêng, không dùng chung schema dev.
- Tạo database/charset/collation bằng bootstrap command ngoài Django hoặc provisioning script; schema bảng chỉ bằng migrations.
- Workflow PR: pull branch -> migrate database local sạch -> chạy test -> kiểm tra migration plan/DDL -> review.
- Test cả migrate từ zero và migrate forward từ baseline gần nhất.
- Demo seed qua Django management command/data migration được duyệt; user tạo qua Django hasher.

### Shared/staging

- Chỉ branch tích hợp đã merge mới migrate shared database.
- Backup trước migration có rủi ro; ghi migration plan và reverse/forward recovery.
- Một người được chỉ định chạy migration; không sửa table/trigger/view trực tiếp bằng client SQL.
- Sau migrate: kiểm tra `showmigrations`, table/constraint/index/generated column/trigger/view, rồi smoke API.
- Không coi test local là xác nhận staging. SePay staging/live webhook cần acceptance riêng qua HTTPS và tài khoản cấu hình thật.
- SQL reference có phần drop/reset chỉ dùng database disposable; tuyệt đối không chạy vào shared/staging.

## 13. Testing strategy

### Unit/model/service

- Choices, checks, normalization và permission cho 4 role.
- User password hash/inactive/role escalation protection.
- Required unique email, nullable unique phone, first/last name và business role độc lập staff/superuser.
- Google OAuth auto-created user luôn customer và không tự nâng quyền.
- Driver license, route, seat capacity, trip transition/overlap.
- Cấm đổi trip bus khi có active ticket; cấm giảm capacity dưới active seats; cấm deactivate seat có active ticket.
- Booking total/expiry/cancel/check-in và state machines.
- SePay signature/timestamp/matching classification với fixture payload đã được xác nhận.

### API/integration với MySQL 8

- Không dùng SQLite cho tests phụ thuộc enum/check/generated column/trigger/locking.
- Migration từ database trống; constraint/trigger/view tồn tại đúng tên và behavior.
- Tất cả endpoint trong contract: auth, permission, ownership, validation và status code.
- Anonymous search/seat view thành công; anonymous booking bị từ chối; dispatcher có global operations scope.
- allauth adapter/callback với provider mocked; không gọi Google thật trong CI.
- Webhook signature valid/invalid/stale; duplicate; unmatched; wrong amount/account/code; late/extra; successful transition.
- Ticket Agent/Admin xác nhận cash; Ticket Agent không thể manual-success SePay; admin reconciliation không bypass verifier.

### Concurrency

- Hai transaction đồng thời giữ cùng trip+seat: đúng một thành công.
- Hai trip đồng thời dùng cùng bus overlap: đúng một thành công sau locking strategy.
- Hai assignment đồng thời dùng cùng employee overlap.
- Webhook duplicate song song cùng SePay ID: business transition đúng một lần.
- Expiry và valid webhook chạy sát nhau: outcome theo thứ tự lock/commit, không tái cấp ghế sai.

### Acceptance/live

- Chạy demo end-to-end với dữ liệu thống nhất.
- SePay thật qua HTTPS là live acceptance riêng; unit/integration mock không chứng minh payment production hoạt động.
- Dashboard được đối chiếu với query DB; no-data trả zero/empty.

## 14. GitHub Issues và Pull Requests

- Mỗi phase/vertical slice có issue với scope, source rules, tables, API, acceptance criteria và owner.
- Không để hai PR độc lập tạo competing migrations cùng app; Lead xếp thứ tự dependency.
- PR thay schema gồm migration, model state, test migration/constraint và cập nhật tài liệu liên quan.
- Không push trực tiếp `main`; shared DB chỉ migrate sau merge/test local theo tài liệu nguồn.
- Không commit `.env`, credential Google/SePay, account secret hoặc payload chứa dữ liệu nhạy cảm.

## 15. Implementation phases

### Phase 0 - Chốt contract trước code

- **Complete:** user shape, timestamps, Google linking/username policy, session-only DRF auth, `/admin/` ownership, Python/framework dependency pins, PK/enum/timezone strategy đều đã chốt.
- Không còn schema blocker cho `accounts/0001_initial.py`.

### Phase 1 - Foundation, accounts và schema baseline

- Khởi tạo Django/DRF settings structure và MySQL connection.
- Cấu hình Python 3.12; Django 5.2.17; DRF 3.18.0; django-allauth 65.19.2; mysqlclient 2.2.8; `TIME_ZONE="Asia/Ho_Chi_Minh"`; `USE_TZ=True`; `DEFAULT_AUTO_FIELD="django.db.models.BigAutoField"`.
- Tạo custom `User(AbstractUser)` ngay migration đầu với username, required unique email, first/last name, nullable unique phone, `role` bằng `TextChoices`, và staff/superuser flags độc lập.
- Cấu hình auth/RBAC skeleton; public search permissions sẽ được dùng ở phase sau, booking vẫn yêu cầu authentication.
- Tạo `Employee` với Django-managed `created_at`/`updated_at` và validation nền.
- Tích hợp allauth socialaccount/Google skeleton; auto-create chỉ cho email mới, customer role, server username; explicit-link flow để TODO ngoài skeleton.
- Mount Django Admin tại `/admin/`; app URL skeletons dưới `/api/`; thêm `/health/`.
- Thiết lập test framework chạy trên MySQL, `.env.example`, CI migration check.
- Tạo migration cho `accounts` trước; chưa triển khai payment/live webhook.

### Phase 2 - Operations

- Station, route, bus, seat, trip, assignment models/migrations.
- Constraint/explicit MySQL trigger operations và schedule locking, gồm cấm đổi trip bus khi có active ticket, cấm giảm capacity dưới active seats và cấm deactivate seat có active ticket.
- CRUD/permission/state transition; tests.

### Phase 3 - Bookings

- Booking/ticket schema, generated key/composite FK/trigger/view.
- Search/availability, atomic multi-ticket booking, expiry/cancel/check-in.
- Concurrency tests thật trên MySQL.

### Phase 4 - Payments

- Payment/transaction schema, triggers/view.
- Cash confirmation.
- SePay intent/VietQR, verifier, webhook idempotency, reconciliation/review/status polling.
- Mock/integration tests rồi live HTTPS acceptance riêng.

### Phase 5 - Reporting, hardening và demo

- Dashboard/revenue/utilization/top route/trip.
- Full permission/regression/concurrency suite.
- Deployment/staging migration rehearsal, backup/recovery, end-to-end demo data.

## 16. Phase 1 implementation summary

Phase 1 không còn blocker và chỉ tạo foundation: pinned Python/Django/DRF/MySQL stack, environment settings, custom user/timestamps theo contract, employee model, session-only auth/RBAC base, allauth Google skeleton với safe account creation policy, Django Admin, health/app URL skeletons, environment template, MySQL-aware test/CI và migration workflow. Không triển khai CRUD/domain/SePay/reporting hoặc chạy SQL reference nguyên khối.

## 17. Phase 1 initial migration audit

`accounts/0001_initial.py` chỉ tạo hai business models: `User` và `Employee`. Migration dùng `BigAutoField`, `CharField` choices, Django-managed timestamps và custom user relations tới Django auth. Không có operations/bookings/payments model, MySQL trigger, generated column, view hoặc seed data.

Các divergence có chủ đích so với SQL reference:

- Signed Django `BigAutoField` thay cho `BIGINT UNSIGNED`.
- `CharField + TextChoices` thay native MySQL `ENUM`; choices không tự tạo native enum.
- Django field defaults/timestamps thay database `DEFAULT CURRENT_TIMESTAMP` và `ON UPDATE` semantics.
- Không tái tạo `ON UPDATE CASCADE`.
- `AbstractUser` tạo quan hệ groups/user permissions và framework migrations tạo thêm auth/admin/session/sites/allauth tables ngoài 12 business tables.
- SQL role check constraint và persistent DB defaults không tự xuất hiện chỉ từ Django `choices`/Python defaults.
- Trigger, view và demo seed trong SQL reference chưa được triển khai ở Phase 1.
