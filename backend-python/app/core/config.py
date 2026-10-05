import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env', override=True)

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8080))
    
    # Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 3306))
    DB_NAME: str = os.getenv("DB_NAME", "bus_management_db")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "123456")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "mySecretKey12345678901234567890123456789012345678901234567890")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MS: int = int(os.getenv("JWT_EXPIRATION_MS", 3600000))
    
    # CORS
    APP_CORS_ALLOWED_ORIGINS: str = os.getenv(
        "APP_CORS_ALLOWED_ORIGINS", 
        "http://localhost:3000,http://localhost:4173,http://localhost:4174,http://localhost:4175,http://localhost:5173,https://*.trycloudflare.com,https://*.ngrok-free.dev,https://*.ngrok.app,https://*.loca.lt"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.APP_CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    # SePay credentials remain server-side.
    SEPAY_API_KEY: str = os.getenv("SEPAY_API_KEY", "")
    SEPAY_BANK_CODE: str = os.getenv("SEPAY_BANK_CODE", "")
    SEPAY_ACCOUNT_NUMBER: str = os.getenv("SEPAY_ACCOUNT_NUMBER", "")
    SEPAY_ACCOUNT_NAME: str = os.getenv("SEPAY_ACCOUNT_NAME", "")
    SEPAY_WEBHOOK_TOKEN: str = os.getenv("SEPAY_WEBHOOK_TOKEN", "")

settings = Settings()
