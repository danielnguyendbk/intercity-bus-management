from fastapi import APIRouter
from datetime import datetime
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/api/health")
def health_check():
    db_status = "UNKNOWN"
    db_error = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db_status = "CONNECTED"
        db.close()
    except Exception as e:
        db_status = "FAILED"
        db_error = str(e)

    db_url_masked = settings.DATABASE_URL
    if "@" in db_url_masked:
        part1, part2 = db_url_masked.split("@", 1)
        scheme = part1.split(":")[0]
        db_url_masked = f"{scheme}://***@{part2}"

    return {
        "status": "UP",
        "database": db_status,
        "database_target": db_url_masked,
        "database_error": db_error,
        "timestamp": datetime.now().isoformat(),
        "framework": "FastAPI (Python 3.13)"
    }
