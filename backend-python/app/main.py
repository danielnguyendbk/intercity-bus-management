from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, trips_tickets, admin, routes, operations, health

app = FastAPI(
    title="Xe Khach Management API (Python FastAPI)",
    description="Hệ thống Backend quản lý xe khách, bán vé trực tuyến và cổng thanh toán VNPay chuyển đổi từ Spring Boot sang Python FastAPI",
    version="1.0.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router endpoints
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(auth.auth_private_router)
app.include_router(trips_tickets.router)
app.include_router(routes.router)
app.include_router(operations.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Xe Khach Pro Python FastAPI Backend!",
        "docs": "/docs",
        "health": "/api/health"
    }
