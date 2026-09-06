from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "timestamp": datetime.now().isoformat(),
        "framework": "FastAPI (Python 3.13)"
    }
