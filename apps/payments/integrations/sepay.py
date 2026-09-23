import os
import re
from decimal import Decimal
from urllib.parse import quote_plus


def get_sepay_config() -> dict:
    return {
        "api_key": os.getenv("SEPAY_API_KEY", "sepay_secret_key_demo"),
        "bank_code": os.getenv("SEPAY_BANK_CODE", "MBBank"),
        "account_number": os.getenv("SEPAY_ACCOUNT_NUMBER", "0901000001"),
        "account_name": os.getenv("SEPAY_ACCOUNT_NAME", "NHA XE LIEN TINH PRO"),
        "webhook_secret": os.getenv("SEPAY_WEBHOOK_SECRET", ""),
    }


def build_vietqr_url(
    amount: Decimal | float | int,
    payment_code: str,
    bank_code: str | None = None,
    account_number: str | None = None,
) -> str:
    """
    Sinh link ảnh VietQR chuẩn từ SePay:
    https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amount}&des={des}
    """
    cfg = get_sepay_config()
    acc = account_number or cfg["account_number"]
    bank = bank_code or cfg["bank_code"]
    amt = int(amount)
    des = quote_plus(payment_code)
    return f"https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amt}&des={des}"


def verify_sepay_auth(request) -> bool:
    """
    Kiểm tra xác thực Webhook SePay:
    Chấp nhận:
    1. Authorization: Apikey <SEPAY_API_KEY>
    2. Authorization: Bearer <SEPAY_API_KEY>
    3. Authorization: <SEPAY_API_KEY>
    4. X-SePay-Api-Key: <SEPAY_API_KEY>
    """
    cfg = get_sepay_config()
    expected_key = (cfg.get("api_key") or "").strip()
    if not expected_key:
        return True

    custom_header = (request.headers.get("X-SePay-Api-Key") or "").strip()
    if custom_header and custom_header == expected_key:
        return True

    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header:
        if auth_header == expected_key:
            return True
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() in ("apikey", "bearer"):
            if parts[1].strip() == expected_key:
                return True

    return False


def extract_payment_code(content: str) -> str | None:
    """
    Trích xuất payment_code từ nội dung chuyển khoản ngân hàng.
    Hỗ trợ cả định dạng có gạch nối (PAY-18020054-DF6A)
    và định dạng ngân hàng tự xóa gạch nối (PAY18020054DF6A).
    """
    if not content:
        return None
    cleaned = content.upper()
    match = re.search(r"PAY-[A-Z0-9]+(-[A-Z0-9]+)*", cleaned)
    if match:
        return match.group(0)
    match_no_dash = re.search(r"PAY[A-Z0-9]{8,24}", cleaned)
    if match_no_dash:
        return match_no_dash.group(0)
    return None

