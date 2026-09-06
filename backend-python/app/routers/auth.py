from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, GoogleAuthRequest, AuthResponse, UserDto
from app.services.auth_service import UserService
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/public/auth", tags=["Auth"])

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return UserService.register_user(request, db)

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return UserService.authenticate_user(request, db)

@router.post("/google", response_model=AuthResponse)
def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    return UserService.authenticate_google(request, db)

auth_private_router = APIRouter(prefix="/api/auth", tags=["Auth"])

@auth_private_router.get("/me", response_model=UserDto)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.create_user_dto(current_user, db)
