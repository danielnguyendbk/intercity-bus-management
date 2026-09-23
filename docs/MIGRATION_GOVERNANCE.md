# Migration Governance & Safety Checklist (DB-01)

Tài liệu này quy định quy chuẩn quản trị migration bắt buộc cho toàn bộ dự án Intercity Bus Management. Mọi thành viên trong team khi tạo, chỉnh sửa hoặc merge các thay đổi liên quan đến schema database đều phải tuân thủ nghiêm ngặt các quy tắc trong tài liệu này.

---

## 1. Mục đích & Phạm vi

- **Mục đích**: Bảo đảm tính toàn vẹn dữ liệu, loại bỏ rủi ro xung đột migration graph, ngăn ngừa migration lỗi trên môi trường Staging/Production, và chuẩn hóa quy trình review schema.
- **Phạm vi áp dụng**: Áp dụng cho toàn bộ 4 Django apps nghiệp vụ (`accounts`, `operations`, `bookings`, `payments`), các bảng framework (`auth`, `sessions`, `allauth`), các database view (`v_trip_availability`, `v_booking_summary`), và toàn bộ MySQL triggers / generated columns.

---

## 2. Nguyên tắc cốt lõi (Core Principles)

1. **Nguồn chân lý duy nhất (Single Source of Truth)**:
   - **Django Migrations là cơ chế DUY NHẤT** để tạo lập và cập nhật schema trên mọi môi trường (Local, CI, Staging, Production).
   - Tệp `docs/Database_IntercityBusManagement.sql` là bản thiết kế tham chiếu ban đầu. **Tuyệt đối không chạy trực tiếp file SQL này** để tạo bảng trên bất kỳ database nào của dự án.
2. **Explicit & Reversible**:
   - Mọi thay đổi schema (đặc biệt là MySQL-specific components: trigger, view, generated column, check constraint) phải nằm trong migration rõ ràng và **bắt buộc phải có khả năng rollback (reverse)**.
3. **Cấm migrate DB dùng chung từ Feature Branch**:
   - Nghiêm cấm mọi thành viên trỏ feature branch hoặc môi trường local của mình vào database Staging chung để chạy `migrate`.
   - Migration trên database dùng chung chỉ được phép thực hiện từ nhánh `develop` hoặc release branch đã được review và phê duyệt (xem chi tiết tại `docs/STAGING_WORKFLOW.md`).

---

## 3. Phân quyền & Sở hữu Migration (Ownership Rules)

Căn cứ theo `docs/MODEL_OWNERSHIP.md`, quyền tạo và sửa đổi migration được phân định như sau:

| App | Owner phụ trách | Bảng / Model sở hữu |
|---|---|---|
| `accounts` | `NguyenLeHoaiTam` | `users` (`User`), `employees` (`Employee`) |
| `operations` | `vgh203` | `stations` (`Station`), `routes` (`Route`), `buses` (`Bus`), `bus_seats` (`BusSeat`), `trips` (`Trip`), `trip_staff_assignments` (`TripStaffAssignment`) |
| `bookings` | `LeVuHao` | `bookings` (`Booking`), `tickets` (`Ticket`), view `v_trip_availability` |
| `payments` | `danielnguyendbk` | `payments` (`Payment`), `payment_transactions` (`PaymentTransaction`), view `v_booking_summary` |

### Quy tắc tạo migration:
- **Chính chủ app**: Chỉ người sở hữu app mới được tạo migration trong thư mục `migrations/` của app đó.
- **Quy tắc 1 nhánh / 1 app**: Tại một thời điểm, trong mỗi app **chỉ được có tối đa 1 nhánh tính năng sinh migration mới** đang mở PR. Không mở đồng thời nhiều PR cùng thêm migration vào một app để tránh rẽ nhánh lịch sử migration.
- **Cross-app dependency (Foreign Key)**: Khi model app B tham chiếu FK tới model app A (ví dụ `bookings.Trip` FK tới `operations.Trip`):
  - Phải đợi migration của app A merge vào `develop` trước, sau đó app B rebase/pull từ `develop` về rồi mới tạo migration mới.
  - Tuyệt đối không tạo model giả, stub model, hoặc sửa migration của app khác để thỏa mãn FK sớm.
  - PR có cross-app dependency bắt buộc phải có sự review và đồng thuận của cả 2 app owners + Database Owner.

---

## 4. Trật tự phụ thuộc (Migration Sequencing)

Quy trình phát triển và merge migration giữa các app phải tuân theo thứ tự phân tầng nghiêm ngặt:

```
[accounts]  (User, Employee)
    │
    ▼
[operations] (Station, Route, Bus, BusSeat, Trip, TripStaffAssignment)
    │
    ▼
[bookings]  (Booking, Ticket, v_trip_availability)
    │
    ▼
[payments]  (Payment, PaymentTransaction, v_booking_summary)
```

- Không merge PR của tầng sau khi tầng trước chưa hoàn tất và merge vào `develop`.
- **Bảo vệ lịch sử**: Sau khi migration đã được merge vào `develop`, **cấm tuyệt đối rebase làm thay đổi commit SHA hoặc sửa đổi/xóa các file migration đã merge**.

---

## 5. Quy chuẩn viết Migration (Authoring Standards)

### 5.1. Đặt tên file migration rõ nghĩa
- Tuyệt đối không dùng tên mặc định khó hiểu (ví dụ: `0003_auto_20260908_1234.py`).
- Đặt tên theo cú pháp: `<sequence>_<action>_<target>.py`.
  - Ví dụ tốt: `0002_create_station_model.py`, `0003_add_unique_seat_code_index.py`, `0004_create_trip_overlap_trigger.py`.

### 5.2. Quản lý các đối tượng đặc thù của MySQL (Triggers, Views, Generated Columns)
1. **Sử dụng `migrations.RunSQL` tường minh**:
   - Phải cung cấp cả câu lệnh thuận (`sql`) và câu lệnh đảo ngược (`reverse_sql`).
   - Ví dụ trigger:
     ```python
     migrations.RunSQL(
         sql="""
         CREATE TRIGGER trg_check_bus_active_ticket
         BEFORE UPDATE ON trips
         FOR EACH ROW
         BEGIN
             ...
         END;
         """,
         reverse_sql="""
         DROP TRIGGER IF EXISTS trg_check_bus_active_ticket;
         """
     )
     ```
2. **Sử dụng `SeparateDatabaseAndState` khi cần thiết**:
   - Khi cần đồng bộ hóa giữa metadata của Django ORM và cấu trúc thực tế trên MySQL mà Django không tự sinh DDL chuẩn, phải dùng `SeparateDatabaseAndState` để tách biệt `state_operations` và `database_operations`.
3. **Cấm thực thi SQL trực tiếp ngoài migration framework**:
   - Không dùng `connection.cursor().execute(...)` tùy tiện trong file migration.
   - Không chèn logic gọi API bên ngoài, gửi email, sinh token hay phụ thuộc vào network/time bên ngoài trong migration.

### 5.3. Tuân thủ 10 điểm sai biệt thiết kế đã phê duyệt (Divergence Rules)
Căn cứ theo `docs/OPEN_QUESTIONS.md` mục 6, khi viết model và migration cần lưu ý:
1. Primary Key dùng Django standard `BigAutoField`, không dùng `BIGINT UNSIGNED`.
2. Trạng thái / Enum dùng Django `CharField(choices=...)` với `TextChoices`, không dùng native MySQL `ENUM`.
3. Không tái tạo `ON UPDATE CASCADE` nếu không có yêu cầu nghiệp vụ cụ thể.
4. Trigger nghiệp vụ chặn đổi `trips.bus_id` khi trip có vé active phải được triển khai ở `operations`.
5. Trigger chặn giảm `buses.seat_capacity` thấp hơn active seats phải được triển khai ở `operations`.
6. Trigger chặn deactivate `bus_seats` đang được tham chiếu bởi active tickets phải ở `operations`.
7. Timestamp: dùng `auto_now_add` và `auto_now` do Django quản lý, không dựa vào MySQL auto-update semantics.
8. Bus/staff overlap concurrency: giải quyết bằng khóa giao dịch kết hợp trigger.
9. Xử lý logic booking expiry sát departure theo business rule phê duyệt.
10. State transition sâu phải được bảo đảm đồng bộ qua tầng service và trigger.

---

## 6. Checklist kiểm thử & Bằng chứng bắt buộc (Verification & Evidence Checklist)

Tác giả PR có thay đổi migration bắt buộc phải thực hiện đủ 5 bước kiểm tra dưới đây trên môi trường local với database MySQL 8 sạch, và đính kèm bằng chứng vào mô tả PR:

```bash
# BƯỚC 1: Kiểm tra tính hợp lệ của cấu hình và model
python manage.py check

# BƯỚC 2: Kiểm tra forward migration từ trạng thái trắng (Fresh DB)
python manage.py migrate --noinput

# BƯỚC 3: Kiểm tra kế hoạch migration & trạng thái áp dụng
python manage.py showmigrations
python manage.py migrate --plan

# BƯỚC 4: Xuất và kiểm tra DDL thực tế sinh ra cho MySQL (LƯU KẾT QUẢ ĐÍNH KÈM PR)
python manage.py sqlmigrate <app_name> <migration_name>

# BƯỚC 5: Diễn tập Rollback (Reverse Migration) để chứng minh tính hoàn nguyên
python manage.py migrate <app_name> <previous_migration_name>
# Sau đó migrate forward trở lại:
python manage.py migrate <app_name>

# BƯỚC 6: Chạy toàn bộ test suite để đảm bảo không gãy chức năng hiện có
python manage.py test
```

---

## 7. Cổng kiểm duyệt PR (PR Review & Approval Gate)

Mọi Pull Request có chứa file migration chỉ được phép merge khi đáp ứng đủ 5 điều kiện:

1. **Database Owner Approval**: Bắt buộc có phê duyệt (Approve) từ Database Owner (`danielnguyendbk`).
2. **Domain Owner Approval**: Bắt buộc có phê duyệt từ owner của domain tương ứng (xem bảng mục 3).
3. **Đầy đủ bằng chứng DDL & Rollback**: Mô tả PR phải dán kèm output của lệnh `sqlmigrate` và kết quả diễn tập rollback (BƯỚC 4 & 5).
4. **CI xanh 100%**: GitHub Actions CI test trên MySQL 8 chạy thành công.
5. **Khai báo PR Template**: Tích chọn đầy đủ các mục trong section `Schema and migration impact` và `Shared/staging database` của file PR template:
   - `[x] Migration included and inspected`
   - `[x] MySQL-specific operation isolated and reversible`
   - `[x] SQL-reference divergence documented`
   - `[x] Not migrated directly from this branch`

---

## 8. Xử lý sự cố & Blocker

- **Khi phát hiện xung đột nhánh migration (Migration Conflict)**:
  - Nếu xuất hiện 2 file migration cùng trỏ về một node cha trong cùng một app, **không được tự ý chạy `makemigrations --merge`** mà phải báo cho App Owner và Database Owner để điều phối rebase / đánh lại số thứ tự.
- **Khi gặp quyết định kỹ thuật chưa rõ (Open Questions DB-01 đến DB-09)**:
  - Nếu một migration đòi hỏi phải lựa chọn cách triển khai cho các vấn đề đang mở trong `docs/OPEN_QUESTIONS.md`, tác giả **phải dừng lại, ghi nhận blocker vào issue/PR**, không được tự ý phán đoán hoặc lựa chọn phương án khi chưa có quyết định chính thức từ Technical Lead / Database Owner.
