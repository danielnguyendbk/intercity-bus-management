# Shared MySQL Staging Workflow & Runbook (DB-02)

Tài liệu này là cẩm nang vận hành (Runbook) chuẩn hóa quy trình triển khai migration, sao lưu (backup), phục hồi (restore), và kiểm tra sau triển khai (smoke checks) trên môi trường Staging MySQL dùng chung của dự án Intercity Bus Management.

---

## 1. Mục đích & Nguyên tắc an toàn (Safety Principles)

Môi trường Staging là môi trường kiểm thử tích hợp chung của toàn bộ team trước khi release. Để bảo vệ dữ liệu và bảo đảm tính ổn định:

1. **Cô lập môi trường Local (Local Isolation)**:
   - Môi trường máy cá nhân của từng lập trình viên hoàn toàn độc lập (dùng MySQL 8 cục bộ hoặc Docker container riêng).
   - **Tuyệt đối cấm kết nối môi trường local vào Staging database** để code thử hoặc test tính năng.
2. **Chỉ triển khai từ nhánh tích hợp (Integration Branch Only)**:
   - Staging database **chỉ được phép migrate từ nhánh `develop`** (hoặc release branch chính thức) sau khi tất cả các PR thành phần đã được merge và CI GitHub Actions xanh 100%.
   - **Tuyệt đối cấm migrate Staging từ Feature Branch**.
3. **Một người vận hành duy nhất (Single Designated Operator)**:
   - Mỗi phiên bảo trì/migrate Staging chỉ do **đúng 1 người được chỉ định** (Designated Operator — Technical Lead hoặc Database Owner) thực hiện để tránh xung đột lệnh đồng thời.
4. **Bảo mật tuyệt đối thông tin xác thực (Zero Credentials in Repo)**:
   - Mọi hostname, IP, username, password của Staging DB đều được cung cấp qua biến môi trường an toàn hoặc Secret Manager, không lưu trữ hay hardcode trong mã nguồn dự án.
   - Trong tài liệu này, toàn bộ tham số đều sử dụng placeholder (ví dụ: `<STAGING_DB_HOST>`).
5. **Cấm sửa tay cấu trúc database (Prohibition of Manual DDL)**:
   - Nghiêm cấm chạy trực tiếp các lệnh DDL thủ công (`ALTER TABLE`, `DROP COLUMN`, `CREATE TRIGGER` bằng tay) trên Staging. Mọi thay đổi schema bắt buộc phải đi qua Django migrations đã được phê duyệt.

---

## 2. Quy trình chuẩn bị trước khi Migrate (Pre-Migration Phase)

Trước khi tiến hành migrate trên Staging, Người vận hành (Operator) phải hoàn thành checklist sau:

### Checklist chuẩn bị:
- [ ] **Thông báo cho Team**: Gửi thông báo trên kênh trao đổi chung (Slack/Zalo/Discord) về thời gian bắt đầu bảo trì Staging để các thành viên tạm ngưng test/gửi request.
- [ ] **Kiểm tra trạng thái Code**:
  - Nhánh hiện tại là `develop` đã kéo code mới nhất (`git pull origin develop`).
  - Commit HEAD đã vượt qua toàn bộ checks trên GitHub Actions CI.
- [ ] **Kiểm tra kế hoạch migration (Dry Run)**:
  ```bash
  # Xem trước danh sách các migration sẽ được áp dụng
  python manage.py showmigrations
  python manage.py migrate --plan
  ```
  Xác nhận các migration dự kiến áp dụng đúng thứ tự và không có migration lạ ngoài kế hoạch.
- [ ] **Sao lưu bắt buộc (Mandatory Backup)**: Tiến hành full dump dữ liệu Staging trước khi chạy bất kỳ thao tác nào.

---

## 3. Runbook Sao lưu, Di chuyển & Phục hồi (Backup, Migrate & Restore)

> [!IMPORTANT]
> Toàn bộ lệnh dưới đây sử dụng biến môi trường hoặc placeholder. Người vận hành xuất các biến môi trường cấu hình trước khi chạy lệnh.

### 3.1. Cấu hình biến môi trường phiên làm việc
```bash
# Thiết lập thông tin kết nối tạm thời cho phiên làm việc của Operator
export STAGING_DB_HOST="<STAGING_DB_HOST>"
export STAGING_DB_PORT="<STAGING_DB_PORT>"
export STAGING_DB_USER="<STAGING_DB_USER>"
export STAGING_DB_NAME="<STAGING_DB_NAME>"
export BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
export BACKUP_FILE="staging_backup_${STAGING_DB_NAME}_${BACKUP_TIMESTAMP}.sql"
```

### 3.2. Lệnh Sao lưu Staging Database (Full Backup)
Lệnh dump phải bao gồm toàn bộ schema, data, triggers, và routines:
```bash
# Thực hiện sao lưu toàn diện Staging Database
mysqldump \
  --host="${STAGING_DB_HOST}" \
  --port="${STAGING_DB_PORT}" \
  --user="${STAGING_DB_USER}" \
  --password \
  --single-transaction \
  --quick \
  --triggers \
  --routines \
  --databases "${STAGING_DB_NAME}" > "${BACKUP_FILE}"

# Kiểm tra kích thước và tính hợp lệ cơ bản của file backup
ls -lh "${BACKUP_FILE}"
head -n 20 "${BACKUP_FILE}"
```

> [!WARNING]
> File backup chứa dữ liệu Staging. Cất giữ file này tại thư mục an toàn ngoài thư mục repo git. **Tuyệt đối không commit file `.sql` backup vào Git**.

### 3.3. Thực hiện Migration trên Staging
Khi backup thành công, tiến hành áp dụng migration:
```bash
# 1. Kiểm tra cấu hình hệ thống
python manage.py check --deploy

# 2. Thực thi migration
python manage.py migrate --noinput
```

### 3.4. Kịch bản Phục hồi khẩn cấp (Emergency Restore Runbook)
Nếu lệnh `migrate` gặp lỗi, hoặc bước Smoke Check sau đó thất bại:

1. **Dừng ngay lập tức** toàn bộ tiến trình ứng dụng đang kết nối tới DB.
2. **Khôi phục lại trạng thái DB từ bản backup vừa tạo**:
   ```bash
   mysql \
     --host="${STAGING_DB_HOST}" \
     --port="${STAGING_DB_PORT}" \
     --user="${STAGING_DB_USER}" \
     --password \
     "${STAGING_DB_NAME}" < "${BACKUP_FILE}"
   ```
3. **Kiểm tra trạng thái sau khi restore**:
   ```bash
   python manage.py showmigrations
   ```
4. **Ghi nhận sự cố**:
   - Ghi lại chi tiết log lỗi phát sinh vào GitHub Issue của task migration liên quan.
   - Thông báo cho team rằng Staging đã được khôi phục về trạng thái trước bảo trì.
   - **Không được cố sửa trực tiếp (hotfix) trên Staging**; App owner phải sửa migration ở local, mở PR mới theo quy trình DB-01.

---

## 4. Kiểm tra Hậu kiểm sau triển khai (Post-Migration Smoke Checks)

Sau khi `migrate` thành công, Operator phải thực hiện chuỗi kiểm tra sau trước khi bàn giao lại môi trường cho team:

### 4.1. Kiểm tra trạng thái Django ORM
```bash
# Tất cả các migration phải hiển thị trạng thái [X]
python manage.py showmigrations

# Kiểm tra hệ thống không phát sinh issue
python manage.py check
```

### 4.2. Kiểm tra tính toàn vẹn của Views và Triggers trong MySQL
Truy cập MySQL Client để xác nhận các đối tượng đặc thù còn nguyên vẹn:
```sql
-- 1. Kiểm tra danh sách views nghiệp vụ tồn tại và hợp lệ
SHOW FULL TABLES WHERE Table_type = 'VIEW';
-- Kỳ vọng: nhìn thấy v_trip_availability, v_booking_summary (nếu app đã triển khai)

-- 2. Kiểm tra danh sách triggers hoạt động
SHOW TRIGGERS FROM <STAGING_DB_NAME>;
-- Kỳ vọng: các trigger chống trùng lịch xe/tài xế, khóa đổi bus khi có vé hoạt động

-- 3. Kiểm tra thử câu lệnh query đơn giản trên view
SELECT COUNT(*) FROM v_trip_availability;
```

### 4.3. Kiểm tra Smoke Test chức năng ứng dụng cơ bản
Chạy chuỗi request kiểm tra các luồng thiết yếu:
- [ ] Endpoint Healthcheck phản hồi `HTTP 200`.
- [ ] Endpoint Authentication / Login phản hồi bình thường.
- [ ] Endpoint tìm kiếm chuyến xe (`GET /api/v1/trips/search/`) trả về dữ liệu hoặc danh sách rỗng hợp lệ.
- [ ] Admin portal truy cập được bình thường tại `/admin/`.

### 4.4. Mở lại môi trường
- Thông báo lên kênh liên lạc của team: *"Bảo trì và migrate Staging hoàn tất. Môi trường Staging đã mở lại cho hoạt động kiểm thử."*

---

## 5. Tiêu chuẩn biên bản nghiệm thu (Staging Acceptance Log Template)

Mỗi lần thực hiện migrate Staging, Operator điền biên bản dưới đây và lưu vào Release Note / Issue tương ứng:

```markdown
### Biên bản Triển khai Staging Database
- **Thời gian thực hiện**: YYYY-MM-DD HH:mm (UTC+7)
- **Người vận hành (Operator)**: @username
- **Nhánh / Commit triển khai**: `develop` @ `<commit_sha>`
- **File backup**: `staging_backup_<db>_<timestamp>.sql` (Đã lưu trữ an toàn)
- **Danh sách migration đã áp dụng**:
  - `accounts`: ...
  - `operations`: ...
  - `bookings`: ...
  - `payments`: ...
- **Kết quả Smoke Check**:
  - [x] `showmigrations` tất cả `[X]`
  - [x] Schema views & triggers toàn vẹn
  - [x] API basic smoke tests PASS
  - [x] Không phát sinh rollback
- **Trạng thái**: THÀNH CÔNG
```
