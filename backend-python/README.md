# 🚌 Hướng Dẫn Chạy Backend Python FastAPI (Xe Khách Pro)

Thư mục `backend-python/` chứa toàn bộ Backend đã được chuyển đổi từ Java Spring Boot sang **Python FastAPI (Python 3.13)**, giữ nguyên 100% logic và cấu trúc CSDL của dự án.

---

## 🚀 1. Khởi Chạy Server Backend Python

1. Mở terminal tại thư mục `backend-python/`:
   ```bash
   cd backend-python
   ```

2. Cài đặt các thư viện phụ thuộc (nếu chưa cài):
   ```bash
   pip install -r requirements.txt
   ```

3. Khởi chạy server:
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

## ⚙️ 3. Cấu Hình Biến Môi Trường (.env)

File `.env` bao gồm:
- **Database:** Kết nối MySQL `bus_management_db` (Port 3306).
- **JWT:** Thuật toán `HS256`, thời hạn token 3600000ms.
- **VNPay Sandbox:** TMN_CODE, HASH_SECRET và các URL callback (vnp_ReturnUrl, vnp_IpnUrl).

---

## 🔄 4. Khi Nào Muốn Đổi Hoàn Toàn Sang Python

Khi bạn đã kiểm tra và thấy Backend Python chạy mượt mà:
1. Bạn có thể đổi tên hoặc di chuyển thư mục `backend/` cũ (Java Spring Boot) sang nơi lưu trữ dự phòng.
2. Đổi tên thư mục `backend-python/` thành `backend/`.
3. Trong file [package.json](file:///d:/metbus/BUS/package.json), sửa script `"dev:backend"` thành:
   ```json
   "dev:backend": "cd backend && python run.py"
   ```
