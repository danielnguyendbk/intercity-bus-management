<div align="center">

# 🚌 XeKhách Pro — Bus Management & Online Ticketing Platform

### Hệ thống quản lý & đặt vé xe khách trực tuyến — Python FastAPI · React 18 · SePay · Google OAuth · SSE Realtime

[![FastAPI](https://img.shields.io/badge/FastAPI-0.103.1-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)]()
[![SePay](https://img.shields.io/badge/Payment-SePay-0072BC)](https://sepay.vn)
[![Google OAuth](https://img.shields.io/badge/Auth-Google%20OAuth-4285F4?logo=google&logoColor=white)](https://developers.google.com/identity)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> *"Không chỉ là đặt vé — đó là cả một bộ điều phối tuyến xe thời gian thực: từ đăng nhập một chạm qua Google OAuth, chọn điểm đón cụ thể, giữ ghế bằng pessimistic lock, thanh toán online có xác thực chữ ký API Key webhook và đối chiếu giao dịch SePay, cho đến dashboard admin đẩy notification real-time qua Server-Sent Events."*

</div>

---

## 📖 Mục lục

- [🎬 Tổng quan dự án](#-tổng-quan-dự-án)
- [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)
- [🏗️ Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [🚀 Cài đặt & Chạy nhanh](#-cài-đặt--chạy-nhanh)
- [🔑 Tài khoản Demo](#-tài-khoản-demo-test-hệ-thống)
- [🔐 Cấu hình môi trường](#-cấu-hình-môi-trường)

---

## 🎬 Tổng quan dự án

**XeKhách Pro** là một hệ thống **full-stack** đặt vé & quản lý xe khách, được thiết kế theo kiến trúc microservices-lite với 2 module chính (Dự án này đã được **chuyển đổi hoàn toàn từ Spring Boot Java sang Python FastAPI**):

| Module | Công nghệ | Vai trò |
|---|---|---|
| **Backend** (`/backend-python`) | FastAPI + SQLAlchemy + PyMySQL | REST API, JWT auth, SePay integration, SSE broadcaster |
| **Frontend** (`/src`) | React 18 + Vite + TypeScript + Tailwind + Zustand | UI/UX, real-time dashboard, booking flow |

### 🎯 Đối tượng sử dụng

- 🛒 **Khách hàng (CUSTOMER)**: Đăng nhập Google OAuth, tìm chuyến, chọn ghế, thanh toán online (SePay) hoặc COD.
- 👨‍💼 **Quản trị viên (ADMIN)**: Quản lý chuyến, xe, tuyến, nhân sự & phân công điều phối, quản lý vé, dashboard realtime.

---

## ✨ Tính năng nổi bật

- **Backend chuyển đổi 100% sang Python FastAPI**: Tốc độ phản hồi cực nhanh nhờ kiến trúc Async của FastAPI.
- **Bảo mật với JWT & Pydantic**: Validate dữ liệu đầu vào cực kỳ chặt chẽ bằng Pydantic models.
- **Thanh toán SePay**: Tích hợp luồng thanh toán SePay chuẩn, kiểm tra checksum API Key webhook và đối chiếu giao dịch SePay.
- **Real-time SSE Notification**: Đẩy thông báo từ backend về admin dashboard tức thời.
- **Quản lý toàn diện**: Giao diện trực quan cho admin quản lý xe, chuyến, nhân viên, doanh thu, v.v.

---

## 🏗️ Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              🌍 BROWSER (React 18)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Customer UI  │  │ Admin UI     │  │ Zustand Store│  │ Axios Client │    │
└─────────┼─────────────────┼──────────────────────────────────────┼──────────┘
          │ HTTP/REST       │ HTTP/REST                            ▼ SSE
          ▼                 ▼                                      
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ⚙️  PYTHON FASTAPI BACKEND (port 8080)                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  🔒 FastAPI Dependencies (Auth, JWT, Role Checks)                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  📡 REST Routers    │  │  📡 SSE Broadcaster │  │  📡 SePay Webhook   │  │
│  │  /auth, /trips, etc │  │  /admin/sse         │  │  /payment/sepay     │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                  🗄️  SQLAlchemy ORM (Models & Sessions)                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┼───────────────────────────────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │   🐬 MySQL 8 Database    │
                          └──────────────────────────┘
```

---

## 🚀 Cài đặt & Chạy nhanh

### 1. Yêu cầu hệ thống
- **Python 3.10+** (khuyến nghị 3.11)
- **Node.js 18+**
- **MySQL 8.0**

### 2. Chạy Frontend

```bash
cd frontend

# Cài đặt dependencies (nếu chưa cài)
npm install

# Khởi động server (chạy trên localhost:4173)
npm run dev
```

### 3. Chạy Backend (Python)

```powershell
cd backend-python

# Tạo môi trường ảo (nếu chưa có)
python -m venv venv

# Kích hoạt môi trường ảo (Windows)
.\venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
pip install "pydantic[email]"

# Chạy server (trên localhost:8080)
python run.py
```

*Swagger UI sẽ có sẵn tại: `http://localhost:8080/docs`*

### 4. Sử dụng Docker (Tùy chọn)
Hệ thống cũng hỗ trợ chạy qua Docker Compose, cấu hình đã được cập nhật để sử dụng backend-python.
```bash
docker-compose up -d
```

### 5. Lệnh chạy nhanh (Windows)
Chạy script `start-dev.ps1` để khởi động đồng thời cả frontend và backend (FastAPI).
```powershell
.\start-dev.ps1
```

---

## 🔑 Tài khoản Demo (Test hệ thống)

| Vai trò | Tên đăng nhập (`username`) | Mật khẩu | Email | Quyền hạn chính |
|---|---|---|---|---|
| **ADMIN** | `admin` | `password` | `admin@bus.com` | Quản trị viên tối cao: Điều phối xe/chuyến, duyệt vé, xem doanh thu, quản trị người dùng. |
| **ADMIN** | `dispatcher` | `password` | `dispatcher@example.com` | Điều phối viên chuyến xe. |
| **CUSTOMER** | `customer` | `password` | `customer@example.com` | Khách hàng: Tìm chuyến, đặt vé, chọn vị trí ghế, thanh toán qua SePay. |
| **CUSTOMER** | `demo` | `password` | `demo@example.com` | Tài khoản khách hàng phụ. |

> 📌 **Lưu ý:** Khi đăng nhập tại giao diện Frontend (`/login`), hãy bấm chọn tab vai trò tương ứng (**Khách hàng** hoặc **Quản trị viên**) trước khi bấm nút Đăng nhập.

---

## 🔐 Cấu hình môi trường

Copy `.env.example` (nếu có) thành `.env` ở trong `backend-python` và tùy chỉnh:

```ini
# backend-python/.env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/bus_management_db
SECRET_KEY=your_super_secret_key
PORT=8080
SEPAY_API_KEY=your_sepay_api_token
SEPAY_BANK_CODE=your_bank_code
SEPAY_ACCOUNT_NUMBER=your_account_number
SEPAY_ACCOUNT_NAME=your_account_name
SEPAY_WEBHOOK_TOKEN=your_webhook_api_key
```

Xem cấu hình và luồng xác nhận thanh toán tại [backend-python/SEPAY.md](backend-python/SEPAY.md).
