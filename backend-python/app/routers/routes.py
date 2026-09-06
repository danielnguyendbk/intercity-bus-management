from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.bus import Route
from app.schemas.trips_tickets import RouteDto

router = APIRouter(prefix="/api/routes", tags=["Routes"])

@router.get("", response_model=List[RouteDto])
def get_routes(db: Session = Depends(get_db)):
    return db.query(Route).filter(Route.isActive == True).all()
