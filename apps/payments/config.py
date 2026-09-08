"""SePay / VietQR configuration contract and boundary validation.

This module freezes the secret-free configuration names, default behaviors,
and validation boundaries for SePay payment integration (PAY-01).

BLOCKER NOTICE (API-08):
    SePay webhook signature headers, timestamp freshness window specifics,
    and payload format details remain PENDING resolution under API-08.
    No signature verification, QR generation, or payment persistence
    is implemented here.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core import checks
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# Required setting names in production (non-DEBUG) environments.
REQUIRED_SEPAY_PRODUCTION_SETTINGS: tuple[str, ...] = (
    "SEPAY_WEBHOOK_SECRET",
    "SEPAY_BANK_ACCOUNT_NUMBER",
    "SEPAY_BANK_ACCOUNT_NAME",
    "SEPAY_BANK_CODE",
)


def redact_secret(value: str, keep_last: int = 4) -> str:
    """Mask sensitive string values for safe logging and error reporting.

    Never exposes the full secret or sensitive value. If the string is
    short (<= keep_last), the entire string is replaced with asterisks.
    Otherwise, a fixed masked prefix is used followed by the last `keep_last`
    characters for operational traceability.
    """
    if not value:
        return ""
    if len(value) <= keep_last:
        return "*" * len(value)
    return f"****...{value[-keep_last:]}"


def get_sepay_config(
    settings_obj: Any = None,
    redacted: bool = True,
) -> dict[str, Any]:
    """Retrieve SePay configuration dictionary from Django settings.

    Parameters:
        settings_obj: Django settings object (defaults to django.conf.settings).
        redacted: When True (default), sensitive values (webhook secret and
            bank account number) are masked to prevent accidental disclosure.

    Returns:
        A dict containing all SePay configuration keys.
    """
    target = settings_obj or settings
    secret = getattr(target, "SEPAY_WEBHOOK_SECRET", "")
    account_number = getattr(target, "SEPAY_BANK_ACCOUNT_NUMBER", "")

    return {
        "webhook_secret": redact_secret(secret) if redacted else secret,
        "bank_account_number": redact_secret(account_number) if redacted else account_number,
        "bank_account_name": getattr(target, "SEPAY_BANK_ACCOUNT_NAME", ""),
        "bank_code": getattr(target, "SEPAY_BANK_CODE", ""),
        "webhook_max_age_seconds": getattr(target, "SEPAY_WEBHOOK_MAX_AGE_SECONDS", 300),
        "callback_base_url": getattr(target, "SEPAY_CALLBACK_BASE_URL", ""),
    }


def log_sepay_config(settings_obj: Any = None, log_func: Any = None) -> None:
    """Log current SePay configuration safely.

    Never discloses raw secret or full account numbers.
    """
    cfg = get_sepay_config(settings_obj=settings_obj, redacted=True)
    msg = (
        f"SePay Configuration: bank_code={cfg['bank_code']!r}, "
        f"account_name={cfg['bank_account_name']!r}, "
        f"account_number={cfg['bank_account_number']!r}, "
        f"webhook_secret={cfg['webhook_secret']!r}, "
        f"max_age_seconds={cfg['webhook_max_age_seconds']!r}, "
        f"callback_base_url={cfg['callback_base_url']!r}"
    )
    if log_func is not None:
        log_func(msg)
    else:
        logger.info(msg)


def validate_sepay_config(settings_obj: Any = None) -> None:
    """Validate SePay configuration boundaries.

    Raises `ImproperlyConfigured` when configuration violates security rules.
    Error messages NEVER disclose raw secret or account values.

    Rules:
    1. SEPAY_WEBHOOK_MAX_AGE_SECONDS must be a positive integer.
    2. In non-DEBUG (production):
       - SEPAY_WEBHOOK_SECRET is required and non-empty.
       - SEPAY_BANK_ACCOUNT_NUMBER is required and non-empty.
       - SEPAY_BANK_ACCOUNT_NAME is required and non-empty.
       - SEPAY_BANK_CODE is required and non-empty.
       - SEPAY_CALLBACK_BASE_URL, if set, must use HTTPS (https://).
    3. In DEBUG mode:
       - Safe local placeholders and empty values are allowed.
    """
    target = settings_obj or settings
    is_debug = getattr(target, "DEBUG", True)

    max_age = getattr(target, "SEPAY_WEBHOOK_MAX_AGE_SECONDS", 300)
    try:
        max_age_val = int(max_age)
        if max_age_val <= 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ImproperlyConfigured("SEPAY_WEBHOOK_MAX_AGE_SECONDS must be a positive integer.")

    callback_url = getattr(target, "SEPAY_CALLBACK_BASE_URL", "")
    if callback_url and not is_debug and not callback_url.startswith("https://"):
        raise ImproperlyConfigured("SEPAY_CALLBACK_BASE_URL must use HTTPS in production.")

    if not is_debug:
        missing = [
            field_name
            for field_name in REQUIRED_SEPAY_PRODUCTION_SETTINGS
            if not str(getattr(target, field_name, "")).strip()
        ]
        if missing:
            raise ImproperlyConfigured(
                f"Missing required SePay configuration settings for non-DEBUG environment: "
                f"{', '.join(sorted(missing))}"
            )


def check_sepay_configuration(app_configs: Any = None, **kwargs: Any) -> list[checks.CheckMessage]:
    """Django system check handler for SePay configuration.

    Registered with Django's system check framework under `security` tag.
    """
    errors: list[checks.CheckMessage] = []
    is_debug = getattr(settings, "DEBUG", True)

    max_age = getattr(settings, "SEPAY_WEBHOOK_MAX_AGE_SECONDS", 300)
    try:
        max_age_val = int(max_age)
        if max_age_val <= 0:
            errors.append(
                checks.Error(
                    "SEPAY_WEBHOOK_MAX_AGE_SECONDS must be a positive integer.",
                    id="payments.E001",
                )
            )
    except (ValueError, TypeError):
        errors.append(
            checks.Error(
                "SEPAY_WEBHOOK_MAX_AGE_SECONDS must be a valid integer.",
                id="payments.E001",
            )
        )

    callback_url = getattr(settings, "SEPAY_CALLBACK_BASE_URL", "")
    if callback_url and not is_debug and not callback_url.startswith("https://"):
        errors.append(
            checks.Error(
                "SEPAY_CALLBACK_BASE_URL must use HTTPS in production.",
                hint="Ensure SEPAY_CALLBACK_BASE_URL begins with 'https://'.",
                id="payments.E002",
            )
        )

    if not is_debug:
        code_map = {
            "SEPAY_WEBHOOK_SECRET": "payments.E003",
            "SEPAY_BANK_ACCOUNT_NUMBER": "payments.E004",
            "SEPAY_BANK_ACCOUNT_NAME": "payments.E005",
            "SEPAY_BANK_CODE": "payments.E006",
        }
        for field_name in REQUIRED_SEPAY_PRODUCTION_SETTINGS:
            val = getattr(settings, field_name, "")
            if not str(val).strip():
                errors.append(
                    checks.Error(
                        f"Missing required SePay configuration setting: {field_name}",
                        hint=f"Set {field_name} in your environment or .env file.",
                        id=code_map.get(field_name, "payments.E099"),
                    )
                )

    return errors
