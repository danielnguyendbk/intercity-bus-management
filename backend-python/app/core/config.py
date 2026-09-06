import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

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

    # VNPay
    VNPAY_TMN_CODE: str = os.getenv("VNPAY_TMN_CODE", "SY273SZH")
    VNPAY_HASH_SECRET: str = os.getenv("VNPAY_HASH_SECRET", "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT")
    VNPAY_URL: str = os.getenv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
    VNPAY_RETURN_URL: str = os.getenv("VNPAY_RETURN_URL", "https://shrunk-down-accuracy.ngrok-free.dev/payment/vnpay-return")
    VNPAY_API_URL: str = os.getenv("VNPAY_API_URL", "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction")
    VNPAY_IPN_URL: str = os.getenv("VNPAY_IPN_URL", "https://shrunk-down-accuracy.ngrok-free.dev/api/public/payment/vnpay/ipn")
    VNPAY_VERSION: str = "2.1.0"
    VNPAY_COMMAND: str = "pay"
    VNPAY_ORDER_TYPE: str = "other"
    VNPAY_LOCALE: str = "vn"
    VNPAY_CURRENCY_CODE: str = "VND"
    VNPAY_EXPIRE_MINUTES: int = 15

settings = Settings()
