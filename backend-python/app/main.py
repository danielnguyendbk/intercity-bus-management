from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.migrations import ensure_database_schema
from app.routers import auth, trips_tickets, admin, routes, operations, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-migrate database schema on startup (e.g. on Render)
    ensure_database_schema()
    yield

app = FastAPI(
    title="Xe Khach Management API (Python FastAPI)",
    description="Hệ thống Backend quản lý xe khách, bán vé trực tuyến và thanh toán SePay chuyển đổi từ Spring Boot sang Python FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
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
