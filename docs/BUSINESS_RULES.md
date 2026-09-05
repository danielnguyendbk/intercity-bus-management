# Business Rules

BR-001 đến BR-038 được trích từ `PhanTichNghiepVu_IntercityBusManagement.docx`. BR-039 đến BR-051 là các quyết định kiến trúc/nghiệp vụ được Repository Owner, BA, Technical Lead, Database Owner và Payment Owner phê duyệt sau đó; các quyết định này được ưu tiên khi chúng làm rõ hoặc thay thế điểm chưa thống nhất trong tài liệu gốc. Không bổ sung quy tắc từ suy luận kỹ thuật. Các khác biệt còn lại với SQL được ghi tại [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).

| ID | Quy tắc nghiệp vụ đã được phê duyệt |
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
| BR-013 | Một employee không được phân công hai trip chồng lấn thời gian, trừ trip `CANCELLED`. |
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
| BR-026 | Payment `SEPAY` chỉ được chuyển `SUCCESS` sau khi webhook đã xác thực HMAC-SHA256 và timestamp hợp lệ. |
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
| BR-039 | Tài khoản dùng username; email bắt buộc và duy nhất; phone có thể NULL nhưng phải duy nhất nếu có; tên người dùng được lưu bằng `first_name` và `last_name`. |
| BR-040 | User được tạo tự động qua Google OAuth luôn bắt đầu với role `CUSTOMER`; không được tự chọn `TICKET_AGENT`, `DISPATCHER` hoặc `ADMIN` qua OAuth. `is_staff` và `is_superuser` độc lập với business role. |
| BR-041 | Người dùng chưa đăng nhập được tìm chuyến và xem tình trạng ghế; phải đăng nhập mới được tạo customer booking. |
| BR-042 | `DISPATCHER` có phạm vi vận hành toàn cục trong MVP; phân phạm vi theo chi nhánh/bến nằm ngoài scope. |
| BR-043 | Payment `CASH` có thể được `TICKET_AGENT` hoặc `ADMIN` xác nhận thủ công. Payment `SEPAY` chỉ được tự động xác nhận từ webhook SePay đã xác thực; `TICKET_AGENT` không được đánh dấu SePay thành công thủ công. |
| BR-044 | `ADMIN` được review/reconcile giao dịch SePay có vấn đề nhưng không được giả lập hành động thủ công như một webhook SePay hoặc bỏ qua bước xác thực webhook để xác nhận SePay. |
| BR-045 | Chỉ được đổi bus của trip khi trip chưa có ticket `HELD`, `CONFIRMED` hoặc `USED`; nếu đã có bất kỳ active ticket nào thì cấm đổi `trip.bus`. |
| BR-046 | Không được giảm `seat_capacity` thấp hơn số ghế đang được cấu hình active của bus. |
| BR-047 | Không được deactivate bus seat đang được ticket `HELD`, `CONFIRMED` hoặc `USED` tham chiếu. |
| BR-048 | Django sở hữu application timestamps. User dùng built-in `date_joined`, built-in `last_login`, thêm `updated_at` auto-update và không có duplicate `created_at`; Employee có Django-managed `created_at` và `updated_at`. Future business models theo cùng convention nếu không có approved exception. |
| BR-049 | Google OAuth chỉ auto-create user khi email chưa được dùng. Không silently link Google identity vào local user theo email; email trùng yêu cầu authenticate account hiện có rồi explicit link. |
| BR-050 | OAuth username là unique implementation identifier do server sinh từ email local-part với collision-safe suffix khi cần. |
| BR-051 | Phase 1 chỉ dùng DRF `SessionAuthentication`; `/admin/` dành riêng cho Django Admin; business API không dùng `/admin/`, và business authorization dùng `role` thay vì `is_staff`/`is_superuser`. |

BR-039 làm rõ và thay thế phần "email nếu có" của BR-002: email hiện là bắt buộc. BR-043/BR-044 làm rõ mô tả role Ticket Agent trong tài liệu gốc: xác nhận thủ công chỉ áp dụng cho `CASH`, không áp dụng cho `SEPAY`.
