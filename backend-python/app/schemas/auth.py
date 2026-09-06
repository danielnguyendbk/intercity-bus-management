from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserDto(BaseModel):
    id: int
    username: str
    fullName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserDto

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    role: Optional[str] = None

class RegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=1)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class GoogleAuthRequest(BaseModel):
    idToken: str
    role: Optional[str] = None
