# Intercity Bus Management — Monorepo

Dự án quản lý xe khách liên tỉnh. Kiến trúc **Monorepo** gồm 2 module độc lập:

| Thư mục | Stack | Mô tả |
|---|---|---|
| [`backend/`](backend/) | Python 3.12 · Django 5.2 · DRF · MySQL 8 | REST API, Business Logic, DB |
| [`frontend/`](frontend/) | React 18 · Vite · TypeScript · Tailwind CSS | Giao diện người dùng |

---

## Backend (Django)

### Yêu cầu runtime
- Python 3.12, Django 5.2.17, DRF 3.18.0, mysqlclient 2.2.8, MySQL 8.0+

### Setup (PowerShell)

```powershell
# 1. Tạo virtualenv
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# 2. Cấu hình biến môi trường — copy .env.example -> .env bên trong backend/
Copy-Item backend\.env.example backend\.env
# Điền các giá trị thực vào backend/.env

# 3. Migrate & chạy server
.\.venv\Scripts\python.exe backend\manage.py migrate
.\.venv\Scripts\python.exe backend\manage.py runserver
```

### Kiểm tra

```powershell
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py test
```

**Health endpoint**: `GET http://127.0.0.1:8000/health/`

### URL namespaces

- `/admin/` — Django Admin only
- `/health/` — Health check
- `/api/accounts/`, `/api/operations/`, `/api/bookings/`, `/api/payments/`, `/api/common/` — Business API

---

## Frontend (React + Vite)

### Setup

```powershell
cd frontend
npm install
```

### Chạy dev server (Mock Mode — không cần backend)

```powershell
cd frontend
# .env đã có VITE_USE_MOCK=true sẵn
npm run dev
```

Mở trình duyệt tại **http://localhost:4173** (hoặc cổng Vite hiển thị).

**Tài khoản demo mock:**
| Username | Role | Ghi chú |
|---|---|---|
| `admin` | ADMIN | Quản lý toàn hệ thống |
| `staff01` | STAFF | Điều phối viên |
| `customer01` | CUSTOMER | Khách đặt vé |

### Chạy với Backend thật

```powershell
# Sửa frontend/.env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000/api

npm run dev
```

### Build production

```powershell
cd frontend
npm run build
```

---

## Schema workflow

`docs/Database_IntercityBusManagement.sql` là tài liệu tham chiếu, **không phải** migration mechanism. Tạo/thay đổi bảng chỉ qua Django migrations đã review. MySQL generated columns, triggers, views thuộc về isolated explicit migrations trong owning app.

## Tài liệu

- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md)
- [`docs/TASK_ASSIGNMENT.md`](docs/TASK_ASSIGNMENT.md)
- [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)
