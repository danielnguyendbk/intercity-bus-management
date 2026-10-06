# 🚌 Hướng Dẫn Chạy Backend Python FastAPI (Xe Khách Pro)

Thư mục `backend-python/` chứa toàn bộ Backend đã được chuyển đổi từ Java Spring Boot sang **Python FastAPI (Python 3.13)**, giữ nguyên 100% logic và cấu trúc CSDL của dự án.

---

## 🚀 1. Khởi Chạy Server Backend Python

1. Mở terminal tại thư mục `backend-python/`:
   ```bash
   cd backend-python
   ```

2. Kích hoạt môi trường ảo (Virtualenv) đã có sẵn:
   - Trên Windows (PowerShell/CMD):
     ```powershell
     .\venv\Scripts\activate
     ```
   *(Hoặc chạy trực tiếp bằng python của venv: `.\venv\Scripts\python.exe run.py`)*

3. Cài đặt các thư viện (nếu cần bổ sung):
   ```bash
   pip install -r requirements.txt
   ```

4. Khởi chạy server:
   ```bash
   python run.py
   ```
   *Server sẽ chạy tại `http://localhost:8080` (cùng port với Spring Boot cũ).*

---

## 📖 2. Tài Liệu API & Swagger UI

- **Swagger UI (Interactive API Docs):** [http://localhost:8080/docs](http://localhost:8080/docs)
- **Redoc UI:** [http://localhost:8080/redoc](http://localhost:8080/redoc)
- **Health Check Endpoint:** `GET http://localhost:8080/api/health`

---

## 🔑 3. Tài Khoản Demo (Dùng Để Test & Đăng Nhập)

Dưới đây là danh sách các tài khoản mẫu sẵn có trong cơ sở dữ liệu để kiểm thử hệ thống:

| Vai trò (Role) | Tên đăng nhập (`username`) | Mật khẩu | Email | Quyền hạn / Mục đích |
|---|---|---|---|---|
| **ADMIN** | `admin` | `password` | `admin@bus.com` | Quản trị toàn bộ: Dashboard realtime, quản lý chuyến/tuyến, xe, tài xế, người dùng, doanh thu. |
| **ADMIN** | `dispatcher` | `password` | `dispatcher@example.com` | Quản trị viên / Điều phối viên tuyến xe. |
| **CUSTOMER** | `customer` | `password` | `customer@example.com` | Khách hàng: Tìm chuyến, đặt vé, chọn ghế, thanh toán trực tuyến. |
| **CUSTOMER** | `demo` | `password` | `demo@example.com` | Khách hàng mẫu bổ sung. |

> 💡 **Lưu ý khi đăng nhập trên giao diện Frontend (`/login`):**
> - Hãy chuyển đổi nút chọn vai trò tương ứng (**Khách hàng** hoặc **Quản trị viên**) trước khi bấm "Đăng nhập". Tài khoản `ADMIN` cần chọn vai trò Quản trị viên, tài khoản `CUSTOMER` chọn Khách hàng.
> - Khi test qua **Swagger UI** (`/api/auth/login`), truyền trường `role` là `"ADMIN"` hoặc `"CUSTOMER"`.

---

## ⚙️ 4. Cấu Hình Biến Môi Trường (.env)

File `.env` bao gồm:
- **Database:** Kết nối MySQL `bus_management_db` (Port 3306).
- **JWT:** Thuật toán `HS256`, thời hạn token 3600000ms.
- **SePay:** `SEPAY_API_KEY`, `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_NAME`, `SEPAY_WEBHOOK_TOKEN`. Xem [SEPAY.md](SEPAY.md).

---

## 🔄 5. Khi Nào Muốn Đổi Hoàn Toàn Sang Python

Khi bạn đã kiểm tra và thấy Backend Python chạy mượt mà:
1. Bạn có thể đổi tên hoặc di chuyển thư mục `backend/` cũ (Java Spring Boot) sang nơi lưu trữ dự phòng.
2. Đổi tên thư mục `backend-python/` thành `backend/`.
3. Trong file [package.json](file:///d:/metbus/BUS/package.json), sửa script `"dev:backend"` thành:
   ```json
   "dev:backend": "cd backend && python run.py"
   ```
