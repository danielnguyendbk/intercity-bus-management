# SePay / VietQR Configuration Contract (PAY-01)

**Issue**: [#2 [PAY-01]](https://github.com/danielnguyendbk/intercity-bus-management/issues/2)  
**Domain**: `apps.payments`  
**Security Reviewer**: `NguyenLeHoaiTam`  
**Status**: Ready for PR / Review  

---

## 1. Overview

This document specifies the secret-free configuration contract for the SePay / VietQR payment integration in the Intercity Bus Management platform.

It defines:
- The standard environment variable names.
- Validation boundaries distinguishing development/testing from production.
- Redaction and secret privacy requirements.
- Safe placeholder conventions for local development and CI.
- Blocker boundaries (API-08 details explicitly pending).

> [!IMPORTANT]
> **No Schema Impact**: This task defines only configuration and validation boundaries. No database models (`Payment`, `PaymentTransaction`), tables, constraints, or migrations are created.

---

## 2. Environment Variables Contract

| Variable Name | Type | Default | Required in Production (`DEBUG=False`) | Description |
|---|---|---|---|---|
| `SEPAY_WEBHOOK_SECRET` | `string` | `""` | **YES** | Secret key used for authenticating incoming SePay webhook requests. Never committed or logged in plaintext. |
| `SEPAY_BANK_ACCOUNT_NUMBER` | `string` | `""` | **YES** | Bank account number designated to receive customer ticket payments. Treated as sensitive and redacted in logs. |
| `SEPAY_BANK_ACCOUNT_NAME` | `string` | `""` | **YES** | Legal account holder name registered with the banking partner (e.g. `CONG TY CO PHAN XE KHACH`). |
| `SEPAY_BANK_CODE` | `string` | `""` | **YES** | Bank identifier code / BIN identifier (e.g. `VCB`, `TCB`, `MB`). |
| `SEPAY_WEBHOOK_MAX_AGE_SECONDS` | `integer` | `300` | Optional | Maximum tolerated age (seconds) for webhook delivery freshness to mitigate replay attacks. Must be positive integer. |
| `SEPAY_CALLBACK_BASE_URL` | `string` | `""` | Optional | Base URL for receiving callbacks. In production, **must** begin with `https://`. In development, `http://` is allowed. |

---

## 3. Validation Boundaries

### 3.1 Production Mode (`DEBUG=False`)
When `DEBUG=False` (or `DJANGO_DEBUG=False`), the following rules are enforced at startup and during deployment checks:
1. `SEPAY_WEBHOOK_SECRET`, `SEPAY_BANK_ACCOUNT_NUMBER`, `SEPAY_BANK_ACCOUNT_NAME`, and `SEPAY_BANK_CODE` must be non-empty strings. Missing values raise `django.core.exceptions.ImproperlyConfigured` immediately.
2. If `SEPAY_CALLBACK_BASE_URL` is set, it must begin with `https://`.
3. `SEPAY_WEBHOOK_MAX_AGE_SECONDS` must be a positive integer (`> 0`).

### 3.2 Development Mode (`DEBUG=True`)
1. Missing or empty values are permitted to allow developer onboarding without live provider credentials.
2. Local HTTP callback URLs (e.g. `http://localhost:8000`) are accepted.
3. If `SEPAY_WEBHOOK_MAX_AGE_SECONDS` is provided, it must still parse as a valid positive integer.

---

## 4. Redaction and Secret Privacy Guarantees

In accordance with repository security policies:
- **Redacted Helper**: `apps.payments.config.redact_secret(value, keep_last=4)` masks sensitive strings, leaving at most the last 4 characters visible (`****...9999`) for operational troubleshooting while ensuring the secret cannot be recovered.
- **Config Getter**: `apps.payments.config.get_sepay_config(redacted=True)` returns configuration with both `webhook_secret` and `bank_account_number` masked by default.
- **Logging**: `apps.payments.config.log_sepay_config()` prints only redacted fields. Raw secrets and bank account numbers are never logged.
- **Error Messages**: Exception messages from `validate_sepay_config()` cite only variable names (e.g., `"SEPAY_WEBHOOK_SECRET"`), never values.

---

## 5. Local & CI Development Guidelines

### `.env.example` Reference
```ini
# ── SePay / VietQR Configuration ──────────────────────────────────────────
# Required when DJANGO_DEBUG=False (production).
# Use safe local placeholders during development; never commit real values.
SEPAY_WEBHOOK_SECRET=replace-with-sepay-webhook-secret
SEPAY_BANK_ACCOUNT_NUMBER=1234567890
SEPAY_BANK_ACCOUNT_NAME=CONG TY CO PHAN XE KHACH
SEPAY_BANK_CODE=VCB
SEPAY_WEBHOOK_MAX_AGE_SECONDS=300
SEPAY_CALLBACK_BASE_URL=https://yourdomain.com
```

### Prohibitions
- Never commit `.env` files.
- Never commit real SePay webhook secrets, bank account numbers, or live payloads.
- In unit tests, use `@override_settings` with synthetic placeholder values.

---

## 6. Pending Decisions (API-08)

The following areas are **explicitly pending** resolution under **API-08**:
- Specific webhook signature HTTP header name (e.g., `X-SePay-Signature` vs custom header).
- Signature canonicalization algorithm and encoding.
- Webhook timestamp header and clock-skew tolerance.
- Webhook body payload structure and transaction-matching algorithm.

**PAY-02** (Signature Verification) and **PAY-04** (Payload Parser) remain blocked until API-08 decisions are formally ratified.

---

## 7. Verification Commands

```powershell
# Verify settings and apps check
.\.venv\Scripts\python.exe manage.py check

# Run payment configuration and redaction unit tests
.\.venv\Scripts\python.exe manage.py test apps.payments.tests

# Verify zero migration impact
.\.venv\Scripts\python.exe manage.py showmigrations payments
```
