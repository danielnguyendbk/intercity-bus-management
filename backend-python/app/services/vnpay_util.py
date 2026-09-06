import hmac
import hashlib
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from app.core.config import settings

def hmac_sha512(secret_key: str, data: str) -> str:
    byte_key = secret_key.encode("utf-8")
    byte_data = data.encode("utf-8")
    return hmac.new(byte_key, byte_data, hashlib.sha512).hexdigest()

def url_encode(val: str) -> str:
    if val is None:
        return ""
    return urllib.parse.quote_plus(str(val))

def build_hash_data(params: Dict[str, Any]) -> str:
    sorted_keys = sorted(params.keys())
    hash_parts = []
    for k in sorted_keys:
        v = params[k]
        if v is not None and str(v) != "":
            hash_parts.append(f"{k}={url_encode(str(v))}")
    return "&".join(hash_parts)

def build_payment_url(params: Dict[str, Any]) -> str:
    hash_data = build_hash_data(params)
    secure_hash = hmac_sha512(settings.VNPAY_HASH_SECRET, hash_data)
    
    sorted_keys = sorted(params.keys())
    query_parts = []
    for k in sorted_keys:
        v = params[k]
        if v is not None and str(v) != "":
            query_parts.append(f"{k}={url_encode(str(v))}")
            
    query_string = "&".join(query_parts)
    return f"{settings.VNPAY_URL}?{query_string}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash={secure_hash}"

def verify_secure_hash(params: Dict[str, Any], secure_hash: str) -> bool:
    if not secure_hash:
        return False
    verify_params = {k: v for k, v in params.items() if k not in ["vnp_SecureHash", "vnp_SecureHashType"]}
    expected_hash = hmac_sha512(settings.VNPAY_HASH_SECRET, build_hash_data(verify_params))
    return expected_hash.lower() == secure_hash.lower()

def format_vnp_datetime(dt: datetime) -> str:
    # Format: yyyyMMddHHmmss (Asia/Ho_Chi_Minh GMT+7)
    vn_tz = timezone(timedelta(hours=7))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    vn_dt = dt.astimezone(vn_tz)
    return vn_dt.strftime("%Y%m%d%H%M%S")
