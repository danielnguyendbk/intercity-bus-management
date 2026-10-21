# Hướng Dẫn Triển Khai Hệ Thống Lên Render.com

Tài liệu này hướng dẫn chi tiết cách deploy toàn bộ hệ thống (Backend FastAPI, Frontend React Vite, và MySQL Database) lên nền tảng **Render** hoàn toàn miễn phí.

---

## 🏗️ Tổng quan kiến trúc trên Render

| Thành phần | Loại dịch vụ trên Render | Chi phí | Đặc điểm |
| :--- | :--- | :--- | :--- |
| **Backend** | **Web Service** (Python 3) | Free tier | Tự động gán cổng `$PORT`, API docs tại `/docs`, healthcheck `/api/health`. Free tier sẽ tạm ngủ sau 15 phút không có request. |
| **Frontend** | **Static Site** (React SPA) | Free vĩnh viễn | Nhanh, CDN toàn cầu, **không bị ngủ**, phục vụ thư mục `dist`. |
| **Database** | **TiDB Cloud Serverless** (hoặc Aiven / Railway) | Free vĩnh viễn (5GB) | Render không có MySQL free tích hợp sẵn (Render chỉ có PostgreSQL), do đó dùng TiDB Cloud Serverless là giải pháp tối ưu nhất (chuẩn giao thức MySQL 8.0, không cần thẻ tín dụng). |

---

## BƯỚC 1: Chuẩn Bị Cơ Sở Dữ Liệu MySQL Cloud Miễn Phí (TiDB Cloud)

Vì Render không hỗ trợ MySQL native trên gói Free, bạn tạo một database MySQL trên **TiDB Cloud**:

1. Truy cập [https://tidbcloud.com](https://tidbcloud.com) và đăng ký tài khoản miễn phí (Google / GitHub).
2. Nhấn **Create Cluster** ➔ Chọn **Serverless** (Free 5GB).
3. Đặt tên cụm (ví dụ: `bus-management-db`), chọn khu vực gần nhất (ví dụ: `Singapore / ap-southeast-1`).
4. Nhấn **Create**. Sau vài giây, màn hình hiển thị thông tin kết nối:
   - Nhấn **Connect** ➔ Chọn tab **PyMySQL** hoặc **General**.
   - Bạn sẽ nhận được chuỗi kết nối dạng:
     ```text
     mysql://<user>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/<dbname>?ssl={"rejectUnauthorized":true}
     ```
   - *Lưu ý: Nhớ lưu lại mật khẩu (password) do TiDB sinh ra.*

### Nạp dữ liệu mẫu (data_dump.sql) vào Database từ máy tính của bạn:
Trong thư mục dự án, chạy lệnh tiện ích đã được cấu hình sẵn:
```bash
# Di chuyển vào backend-python
cd backend-python

# Kích hoạt venv (nếu chưa kích hoạt)
.\venv\Scripts\activate   # trên Windows PowerShell

# Chạy script import nạp dữ liệu vào TiDB
python import_db.py --url "mysql+pymysql://<user>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/<dbname>"
```
> Script sẽ tự động đọc file `data_dump.sql` và khởi tạo toàn bộ bảng, quyền, chuyến xe, xe, người dùng mẫu.

---

## BƯỚC 2: Đẩy Mã Nguồn Lên GitHub

Đảm bảo mã nguồn dự án của bạn đã được push lên GitHub:
```bash
git add .
git commit -m "Configure project for Render deployment"
git push origin main
```

---

## BƯỚC 3: Triển Khai Backend Lên Render (Web Service)

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com).
2. Nhấn nút **New +** ➔ Chọn **Web Service**.
3. Kết nối với Repository GitHub của bạn.
4. Điền các thông số như sau:
   - **Name**: `xe-khach-backend` (hoặc tên tùy thích)
   - **Region**: `Singapore` (để tốc độ về Việt Nam nhanh nhất)
   - **Branch**: `main`
   - **Root Directory**: `backend-python`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Mở phần **Advanced** ➔ **Environment Variables** và thêm các biến:
   | Key | Value | Ghi chú |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `mysql+pymysql://<user>:<pass>@<host>:4000/<dbname>` | Chuỗi kết nối TiDB đã tạo ở Bước 1 |
   | `JWT_SECRET` | *(chuỗi bảo mật ngẫu nhiên ít nhất 32 ký tự)* | Ví dụ: `super_secret_jwt_key_intercity_bus_2026` |
   | `JWT_ALGORITHM` | `HS256` | |
   | `JWT_EXPIRATION_MS` | `86400000` | (24 giờ) |
   | `APP_CORS_ALLOWED_ORIGINS` | `*` | Cho phép mọi domain gọi API |
   | `PORT` | `10000` *(hoặc để trống, Render sẽ tự gán)* | |
   | `SEPAY_API_KEY` | *(Tùy chọn, điền nếu dùng SePay)* | |
   | `SEPAY_BANK_CODE` | `BIDV` | |
   | `SEPAY_ACCOUNT_NUMBER` | *(Số tài khoản SePay)* | |
   | `SEPAY_ACCOUNT_NAME` | *(Tên tài khoản)* | |
   | `SEPAY_WEBHOOK_TOKEN` | *(Token bảo mật SePay)* | |

6. Phần **Health Check Path**: điền `/api/health`.
7. Nhấn **Create Web Service**.
8. Đợi vài phút để Render cài đặt thư viện và khởi chạy. Khi hoàn tất, bạn sẽ có URL backend:
   ```text
   https://xe-khach-backend.onrender.com
   ```
   *Kiểm tra: mở `https://xe-khach-backend.onrender.com/docs` trên trình duyệt xem Swagger UI có hiện lên bình thường không.*

---

## BƯỚC 4: Triển Khai Frontend Lên Render (Static Site)

1. Tại Render Dashboard, nhấn **New +** ➔ Chọn **Static Site**.
2. Chọn cùng Repository GitHub của bạn.
3. Điền thông tin cấu hình:
   - **Name**: `xe-khach-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Mở phần **Advanced** ➔ **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://xe-khach-backend.onrender.com/api` |
   *(Lưu ý: Thay `xe-khach-backend` bằng URL thực tế của backend bạn tạo ở Bước 3, nhớ có hậu tố `/api`)*

5. **Cấu hình Redirects/Rewrites (CỰC KỲ QUAN TRỌNG CHO REACT ROUTER SPA)**:
   - Cuộn xuống phần **Redirects/Rewrites** (hoặc tab **Redirects/Rewrites** sau khi tạo site).
   - Nhấn **Add Rule**:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
   > Bước này giúp người dùng khi F5 lại các trang như `/trips`, `/auth/login`, `/admin` không bị lỗi 404 Not Found!

6. Nhấn **Create Static Site**.
7. Đợi Render build mã nguồn. Sau khoảng 1-2 phút, bạn sẽ có link website hoạt động:
   ```text
   https://xe-khach-frontend.onrender.com
   ```

---

## ⚡ Cách Khác: Triển Khai Tự Động Bằng Render Blueprint (1 Click)

Dự án đã có sẵn file `render.yaml`. Bạn chỉ cần:
1. Vào Render Dashboard ➔ Chọn **Blueprints** ở thanh menu bên trái.
2. Nhấn **New Blueprint Instance**.
3. Chọn Repository GitHub của bạn.
4. Render sẽ tự động phát hiện cả **Backend Web Service** và **Frontend Static Site**.
5. Nhập biến `DATABASE_URL` và `VITE_API_BASE_URL` khi được hỏi.
6. Nhấn **Apply**. Cả hai dịch vụ sẽ tự động được khởi tạo và liên kết với nhau!

---

## 💡 Lưu Ý Quan Trọng Về Gói Free Của Render

1. **Hiện tượng "Cold Start" (Khởi động lạnh)**:
   - Gói Free của Render Web Service sẽ tự động "ngủ" sau 15 phút nếu không có ai truy cập.
   - Khi có request đầu tiên tới, hệ thống sẽ mất khoảng 30 - 50 giây để khởi động lại. Những request tiếp theo sẽ phản hồi tức thì.
   - Frontend là **Static Site** nên **không bao giờ bị ngủ**, load tức thì 100% thời gian.
2. **Cập nhật mã nguồn tự động**:
   - Mỗi khi bạn `git push origin main`, Render sẽ tự động kích hoạt tiến trình build và deploy phiên bản mới nhất.
