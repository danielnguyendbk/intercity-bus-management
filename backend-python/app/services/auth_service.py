import uuid
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, Role, Passenger, UserStatus
from app.schemas.auth import RegisterRequest, LoginRequest, GoogleAuthRequest, AuthResponse, UserDto
from app.core.security import get_password_hash, verify_password, create_access_token

class UserService:
    @staticmethod
    def create_user_dto(user: User, db: Session) -> UserDto:
        role_name = user.role.name if user.role else ""
        if role_name.startswith("ROLE_"):
            role_name = role_name.replace("ROLE_", "")
        
        passenger = db.query(Passenger).filter(Passenger.user_id == user.id).first()
        full_name = passenger.fullName if passenger else user.username
        phone = passenger.phone if passenger else user.phone

        return UserDto(
            id=user.id,
            username=user.username,
            fullName=full_name,
            email=user.email,
            role=role_name,
            phone=phone
        )

    @staticmethod
    def register_user(request: RegisterRequest, db: Session) -> AuthResponse:
        if db.query(User).filter(User.username == request.username).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

        if db.query(User).filter(User.email == request.email).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        customer_role = db.query(Role).filter(Role.name.in_(["CUSTOMER", "ROLE_CUSTOMER"])).first()
        if not customer_role:
            customer_role = Role(name="CUSTOMER", description="Default Customer Role")
            db.add(customer_role)
            db.commit()
            db.refresh(customer_role)

        user = User(
            username=request.username,
            passwordHash=get_password_hash(request.password),
            email=request.email,
            role_id=customer_role.id,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        passenger = Passenger(
            user_id=user.id,
            fullName=request.fullName,
            email=request.email,
            phone=""
        )
        db.add(passenger)
        db.commit()

        token = create_access_token(data={"sub": user.username, "userId": user.id, "role": customer_role.name})
        return AuthResponse(token=token, user=UserService.create_user_dto(user, db))

    @staticmethod
    def authenticate_user(request: LoginRequest, db: Session) -> AuthResponse:
        user = db.query(User).filter(User.username == request.username).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

        # Verify selected role if provided
        user_role = user.role.name.replace("ROLE_", "") if user.role else ""
        if request.role:
            selected_role = request.role.replace("ROLE_", "")
            if selected_role.upper() != user_role.upper():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account does not match selected role")

        if not verify_password(request.password, user.passwordHash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token(data={"sub": user.username, "userId": user.id, "role": user_role})
        return AuthResponse(token=token, user=UserService.create_user_dto(user, db))

    @staticmethod
    def authenticate_google(request: GoogleAuthRequest, db: Session) -> AuthResponse:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={request.idToken}"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url)
                if res.status_code != 200:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google ID Token")
                payload = res.json()
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Failed to verify Google ID Token")

        email = payload.get("email")
        name = payload.get("name")
        sub = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token payload (no email)")

        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.status != UserStatus.ACTIVE:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
        else:
            customer_role = db.query(Role).filter(Role.name.in_(["CUSTOMER", "ROLE_CUSTOMER"])).first()
            if not customer_role:
                customer_role = Role(name="CUSTOMER", description="Default Customer Role")
                db.add(customer_role)
                db.commit()
                db.refresh(customer_role)

            user = User(
                username=f"google_{sub}",
                passwordHash=get_password_hash(str(uuid.uuid4())),
                email=email,
                role_id=customer_role.id,
                status=UserStatus.ACTIVE
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            passenger = Passenger(
                user_id=user.id,
                fullName=name or email,
                email=email,
                phone=""
            )
            db.add(passenger)
            db.commit()

        user_role = user.role.name.replace("ROLE_", "") if user.role else "CUSTOMER"
        token = create_access_token(data={"sub": user.username, "userId": user.id, "role": user_role})
        return AuthResponse(token=token, user=UserService.create_user_dto(user, db))
