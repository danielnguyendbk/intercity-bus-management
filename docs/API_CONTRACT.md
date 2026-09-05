# API Contract

## Trạng thái contract

Đây là contract lập kế hoạch dựa trên mục "API/View contract gợi ý" và 17 use case trong tài liệu nghiệp vụ. Các endpoint đã có trong nguồn được giữ nguyên. Những phần nguồn chưa quyết định được đánh dấu **TBD** và liên kết tới [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md); tài liệu này không tự thêm nghiệp vụ mới.

## Quy ước chung

- API dùng Django REST Framework, JSON và trailing slash như endpoint nguồn.
- Django 5.2.17 + Django REST Framework 3.18.0 + django-allauth 65.19.2 là baseline. Phase 1 chỉ dùng DRF `SessionAuthentication`; không JWT, DRF token authentication hoặc SimpleJWT.
- Request thay đổi trạng thái phải qua service layer và transaction; không cho client ghi trực tiếp state tùy ý.
- Datetime trao đổi theo ISO 8601 có timezone. Django dùng `TIME_ZONE="Asia/Ho_Chi_Minh"` và `USE_TZ=True`.
- Giá trị tiền giữ đúng precision của schema (`DECIMAL(12,2)`); API truyền dưới dạng chuỗi decimal để tránh lỗi float.
- Endpoint danh sách cần pagination/filter/order do kỹ thuật API, nhưng format cụ thể là TBD.
- Permission luôn được kiểm tra server-side. Ẩn nút trên frontend không thay thế authorization.
- Mã booking/payment/ticket là identifier nghiệp vụ; primary key nội bộ không thay thế mã ở các flow tra cứu đã được mô tả.

## Lỗi tối thiểu

| HTTP | Trường hợp |
|---:|---|
| 400 | Payload/transition/business validation không hợp lệ. |
| 401 | Chưa xác thực ở endpoint cần đăng nhập. |
| 403 | Đã đăng nhập nhưng sai role/ownership. |
| 404 | Không tìm thấy resource trong queryset đã giới hạn quyền. |
| 409 | Xung đột đồng thời như ghế vừa bị giữ, bus/staff overlap hoặc idempotency conflict không thể coi là replay hợp lệ. |
| 200 | Webhook hợp lệ đã xử lý hoặc replay idempotent theo BR-038. |

Tên field trong error envelope và mapping chính xác exception MySQL -> HTTP là TBD.

## Authentication và accounts

| Method | Endpoint nguồn | Access | Contract |
|---|---|---|---|
| `POST` | `/auth/register/` | Public | Nhận username, password, first name, last name, email bắt buộc và phone tùy chọn; server ép role `CUSTOMER`, staff/superuser false; trả user không có password. |
| `POST` | `/auth/login/` | Tất cả role | Xác thực username/password, tạo session, cập nhật last login. |
| allauth-managed | `/accounts/...` | Public/authenticated linking | Google redirect/callback skeleton; email mới mới được auto-create customer; email trùng yêu cầu authenticate existing account rồi explicit link. |
| `GET`/`POST` | `/api/accounts/users/` | `ADMIN` business role | Future list/create contract; không triển khai CRUD Phase 1 và không dùng `/admin/`. |
| `GET`/`POST` | `/employees/` | `ADMIN` theo bảng endpoint; `DISPATCHER` chỉ view theo ma trận quyền | List/create employee; chi tiết update/deactivate cần endpoint CRUD được chốt. |

### Payload account tối thiểu

- User output: `id`, `username`, `first_name`, `last_name`, required unique `email`, nullable unique `phone`, `role`, `is_active`, `is_staff`, `is_superuser`, `last_login`, `date_joined` và timestamp bổ sung sau khi chốt.
- Không bao giờ trả `password`; input password chỉ đi qua Django password hasher.
- Public/local/OAuth registration không nhận business role, `is_staff` hoặc `is_superuser`. Google-created user luôn bắt đầu là customer.
- OAuth username do server sinh từ email local-part và collision-safe suffix. Email trùng không được silently merge/link.
- Employee: các field từ bảng `employees`; driver phải có license number/expiry và license còn hiệu lực trước assignment.

## Operations

| Method | Endpoint nguồn | Access | Contract |
|---|---|---|---|
| `GET`/`POST` | `/stations/` | `DISPATCHER`, `ADMIN` cho quản lý; dispatcher có global MVP scope | List/create station. |
| `GET`/`POST` | `/routes/` | `DISPATCHER`, `ADMIN` cho quản lý; agent view | List/create route. |
| `GET`/`POST` | `/buses/` | `DISPATCHER`, `ADMIN` | List/create bus. |
| `GET`/`POST` | `/buses/{id}/seats/` | `DISPATCHER`, `ADMIN` | List/create seat thuộc bus; DB bảo vệ unique và capacity. |
| `GET`/`POST` | `/trips/` | `DISPATCHER`, `ADMIN` cho quản lý; quyền view theo use case | List/create trip; create mặc định `DRAFT`. |
| `POST` | `/trips/{id}/assignments/` | `DISPATCHER`, `ADMIN` | Gán employee với assignment role; kiểm tra active, type, license và overlap. |

Mọi endpoint quản lý operations của `DISPATCHER` dùng global MVP scope. Không filter theo branch/station ownership vì scoping đó nằm ngoài phạm vi.

### State transition trip

Không cho client PATCH `status` tự do. Service chỉ chấp nhận state flow BR-035. Trước `OPEN_FOR_BOOKING`, kiểm tra route active, bus active, không overlap và điều kiện driver theo BR-015. API action/path cụ thể cho transition chưa có trong nguồn và là TBD.

Update `Trip.bus` phải trả 400/409 nếu trip đã có ticket `HELD`, `CONFIRMED` hoặc `USED`. Update `Bus.seat_capacity` phải từ chối giá trị thấp hơn active seat count. Deactivate `BusSeat` phải từ chối khi seat đang được active ticket tham chiếu. Các kiểm tra này áp dụng cả API và service; explicit MySQL migrations cung cấp lớp bảo vệ cuối.

### CRUD chưa được đặc tả đầy đủ

Nguồn dùng ký hiệu `GET/POST` nhưng use case còn yêu cầu sửa, vô hiệu hóa và tra cứu chi tiết. Contract cho detail `GET`, update và deactivate chưa được đặt endpoint/method; không tự suy ra REST routes cho đến khi câu hỏi này được chốt.

## Search và seat availability

| Method | Endpoint nguồn | Access | Input | Output chính |
|---|---|---|---|---|
| `GET` | `/search-trips/` | Public/anonymous, `CUSTOMER`, `TICKET_AGENT` | `origin_station_id`, `destination_station_id`, `departure_date` | Trip mở bán tương lai, có bus, sắp theo departure; gồm giá và số ghế còn. |
| `GET` | `/trips/{id}/seats/` | Public/anonymous, `CUSTOMER`, `TICKET_AGENT` | Trip ID | Ghế active của bus với `AVAILABLE` hoặc trạng thái occupied/held; đây là snapshot, không phải reservation. |

Availability coi tickets `HELD`, `CONFIRMED`, `USED` là chiếm ghế. Kết quả GET không bảo đảm ghế còn trống đến lúc POST booking; database quyết định tại transaction insert.

## Bookings và tickets

| Method | Endpoint nguồn | Access | Contract |
|---|---|---|---|
| `POST` | `/bookings/` | Authentication required: `CUSTOMER`, `TICKET_AGENT`; quyền admin theo matrix | Tạo một booking và nhiều tickets trong một transaction. Anonymous bị từ chối. |
| `GET` | `/bookings/{code}/` | Owner, `TICKET_AGENT`, `ADMIN` | Trả booking summary, tickets và payment summary nếu có. |
| `POST` | `/bookings/{id}/cancel/` | Owner, `TICKET_AGENT`, `ADMIN` | Chỉ hủy booking pending trước giờ đi; thao tác lặp lại trả trạng thái hiện tại. |
| `POST` | `/tickets/{code}/check-in/` | `TICKET_AGENT`, `ADMIN` | Chuyển ticket confirmed -> used, ghi check-in; gọi lại không tạo check-in mới. |

### `POST /bookings/`

Input được nguồn hỗ trợ:

- `trip_id`
- `contact_name`, `contact_phone`, tùy chọn `contact_email`
- danh sách ticket, mỗi item gồm `bus_seat_id`, `passenger_name`, tùy chọn `passenger_phone`

Server chịu trách nhiệm:

- sinh `booking_code`, `ticket_code`;
- xác định customer/creator từ authenticated user và role;
- lấy `fare` từ giá trip tại thời điểm tạo, không tin giá từ client;
- đặt booking pending, ticket held và expiry;
- rollback toàn bộ nếu bất kỳ ticket nào lỗi;
- đổi duplicate active seat thành HTTP 409 có lỗi ghế không còn trống.

Output tối thiểu: booking code/status/expiry/total, danh sách tickets và bước thanh toán. Format QR không nằm trong response booking trừ khi payment intent được tạo riêng.

### Expiration

Scheduled command/lazy check chuyển booking pending quá hạn thành expired, hủy tickets held và payment pending. Không có endpoint/job cadence được phê duyệt; xem câu hỏi mở.

## Payments và SePay

| Method | Endpoint nguồn | Access | Contract |
|---|---|---|---|
| `POST` | `/payments/sepay/` | Owner customer, `TICKET_AGENT` | Tạo payment intent SePay cho booking pending; trả payment code, amount, QR URL/data và expiry. |
| `POST` | `/payments/{id}/confirm-cash/` | `TICKET_AGENT`, `ADMIN` | Chỉ xác nhận payment method `CASH`; từ chối `SEPAY`. |
| `GET` | `/payments/{id}/status/` | Owner, `TICKET_AGENT`, `ADMIN` | Poll payment/booking status; không làm thay đổi trạng thái. |
| `POST` | `/webhooks/sepay/` | SePay, xác thực HMAC | Nhận raw body; xác thực trước parse; lưu transaction; xử lý idempotent và reconciliation. |
| `GET` | `/api/payments/transactions/` | `ADMIN` business role | Future tra cứu giao dịch và `REVIEW_REQUIRED`; không dùng `/admin/`. |

### Tạo payment intent SePay

Input tối thiểu: booking identifier. Server lấy amount từ booking, sinh payment code duy nhất và dùng cấu hình tài khoản nhận để dựng VietQR. Chỉ một payment intent cho một booking; behavior khi gọi lại cần chốt (trả intent hiện có hay conflict).

### Webhook boundary

Thứ tự bắt buộc theo tài liệu nguồn:

1. Đọc raw request body.
2. Xác minh signature HMAC-SHA256 và timestamp trước khi parse/xử lý business.
3. Parse và chuẩn hóa payload theo field SePay thực tế.
4. Trong `transaction.atomic()`, insert `PaymentTransaction` với unique `sepay_transaction_id`.
5. Nếu duplicate ID: đọc kết quả cũ và trả HTTP 200, không chạy lại transition.
6. Match payment code; kiểm tra transfer type, account number, amount và expiry.
7. Lock payment/booking liên quan; với giao dịch hợp lệ, chuyển payment success, booking/tickets confirmed trong cùng transaction.
8. Giao dịch muộn/sai/dư: lưu `REVIEW_REQUIRED`, không tái cấp ghế.

Không cung cấp endpoint manual-success cho SePay. `TICKET_AGENT` không được gọi transition SePay success. Admin reconciliation chỉ được phân loại/match/xử lý review theo workflow sẽ chốt; nó không được giả lập verified webhook hoặc gọi success transition khi chưa qua verifier.

Payload field/header chính xác và response body cho SePay phải được xác nhận với cấu hình SePay dùng thật trước Phase payment; tài liệu này không tự phát minh schema bên thứ ba.

## Dashboard/report

| Method | Endpoint nguồn | Access | Input | Kết quả |
|---|---|---|---|---|
| `GET` | `/dashboard/` | `DISPATCHER` operational, `ADMIN` full | Khoảng ngày | Trip theo status, tickets bán/used, revenue, utilization, top route/trip. |

Revenue chỉ cộng payments success; transaction review/failed/cancelled không tính. Không có dữ liệu trả 0/empty collection. Định nghĩa date boundary, timezone và bộ chỉ số khác nhau giữa dispatcher/admin còn TBD.

## Security/permission matrix

| Năng lực | Customer | Ticket agent | Dispatcher | Admin |
|---|---|---|---|---|
| Quản lý user | - | - | - | CRUD |
| Employee | - | - | View | CRUD |
| Station/route | Search view | View | Global CRUD | CRUD |
| Bus/seat | Qua trip | View | CRUD | CRUD |
| Trip/assignment | Open trip | View | CRUD | CRUD |
| Booking | Own | Cho khách | - | Có |
| Payment | SePay own | Confirm CASH + SePay lookup; no manual SePay success | View | Confirm CASH + review/reconcile; no webhook bypass |
| Cancel pending | Own | Có | - | Có |
| Check-in | - | Có | View | Có |
| Dashboard | - | - | Operational | Full |

Mọi queryset chi tiết phải áp ownership trước khi trả 404/403. Google OAuth không thay đổi role matrix; user mới luôn customer. Email trùng chỉ được explicit-link sau khi authenticate existing account. `/admin/` chỉ dành cho Django Admin; business authorization dùng `role`.

## Phase 1 URL surface

Phase 1 chỉ triển khai foundation endpoints/routes sau:

- `/admin/`: Django Admin.
- `/health/`: health response không phụ thuộc business models.
- `/accounts/`: django-allauth URL skeleton.
- `/api/accounts/`, `/api/operations/`, `/api/bookings/`, `/api/payments/`, `/api/common/`: app URL skeletons, chưa có business CRUD/workflow.

Các endpoint business còn lại trong tài liệu này là contract tương lai, không phải Phase 1 implementation.
