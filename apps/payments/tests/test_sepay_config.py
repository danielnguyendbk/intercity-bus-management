"""Unit tests for SePay configuration contract and boundary validation (PAY-01).

These tests run without database access (using SimpleTestCase) and verify:
1. Production configuration requirements and boundaries.
2. Development (DEBUG=True) fallback tolerance.
3. Strict masking/redaction of sensitive secret and account number values.
4. Error message and log assertions ensuring secrets are never leaked.
5. Django system check integration.
"""

import logging
from unittest.mock import MagicMock

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from apps.payments.config import (
    check_sepay_configuration,
    get_sepay_config,
    log_sepay_config,
    redact_secret,
    validate_sepay_config,
)

# Standard mock settings fixture for production testing (safe placeholder values)
PRODUCTION_SEPAY_SETTINGS = {
    "DEBUG": False,
    "SEPAY_WEBHOOK_SECRET": "placeholder-webhook-secret-9999",
    "SEPAY_BANK_ACCOUNT_NUMBER": "9876543210",
    "SEPAY_BANK_ACCOUNT_NAME": "CONG TY CO PHAN XE KHACH",
    "SEPAY_BANK_CODE": "VCB",
    "SEPAY_WEBHOOK_MAX_AGE_SECONDS": 300,
    "SEPAY_CALLBACK_BASE_URL": "https://staging.busmanagement.vn",
}


@override_settings(**PRODUCTION_SEPAY_SETTINGS)
class SePayConfigurationContractTests(SimpleTestCase):
    """Tests for SePay environment variable validation boundaries."""

    def test_config_valid_when_all_required_settings_present(self):
        """When all required settings are provided in non-DEBUG mode, validation passes."""
        try:
            validate_sepay_config()
        except ImproperlyConfigured as exc:
            self.fail(f"validate_sepay_config() unexpectedly raised ImproperlyConfigured: {exc}")

    @override_settings(SEPAY_WEBHOOK_SECRET="")
    def test_missing_webhook_secret_raises_in_production(self):
        """Missing SEPAY_WEBHOOK_SECRET in non-DEBUG mode raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("SEPAY_WEBHOOK_SECRET", str(ctx.exception))

    @override_settings(SEPAY_BANK_ACCOUNT_NUMBER="")
    def test_missing_bank_account_number_raises_in_production(self):
        """Missing SEPAY_BANK_ACCOUNT_NUMBER in non-DEBUG mode raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("SEPAY_BANK_ACCOUNT_NUMBER", str(ctx.exception))

    @override_settings(SEPAY_BANK_ACCOUNT_NAME="")
    def test_missing_bank_account_name_raises_in_production(self):
        """Missing SEPAY_BANK_ACCOUNT_NAME in non-DEBUG mode raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("SEPAY_BANK_ACCOUNT_NAME", str(ctx.exception))

    @override_settings(SEPAY_BANK_CODE="")
    def test_missing_bank_code_raises_in_production(self):
        """Missing SEPAY_BANK_CODE in non-DEBUG mode raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("SEPAY_BANK_CODE", str(ctx.exception))

    @override_settings(
        DEBUG=True,
        SEPAY_WEBHOOK_SECRET="",
        SEPAY_BANK_ACCOUNT_NUMBER="",
        SEPAY_BANK_ACCOUNT_NAME="",
        SEPAY_BANK_CODE="",
    )
    def test_debug_mode_allows_empty_settings(self):
        """When DEBUG=True, missing SePay settings do not raise ImproperlyConfigured."""
        try:
            validate_sepay_config()
        except ImproperlyConfigured as exc:
            self.fail(f"DEBUG=True should allow empty local placeholders, got: {exc}")

    @override_settings(SEPAY_WEBHOOK_MAX_AGE_SECONDS=0)
    def test_zero_webhook_max_age_raises(self):
        """Zero or negative webhook max age raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("SEPAY_WEBHOOK_MAX_AGE_SECONDS", str(ctx.exception))

    @override_settings(SEPAY_WEBHOOK_MAX_AGE_SECONDS=-60)
    def test_negative_webhook_max_age_raises(self):
        """Negative webhook max age raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured):
            validate_sepay_config()

    @override_settings(SEPAY_CALLBACK_BASE_URL="http://insecure-endpoint.example.com")
    def test_insecure_callback_url_in_production_raises(self):
        """Non-HTTPS callback URL in production raises ImproperlyConfigured."""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_sepay_config()
        self.assertIn("HTTPS", str(ctx.exception))

    @override_settings(DEBUG=True, SEPAY_CALLBACK_BASE_URL="http://localhost:8000")
    def test_http_callback_url_allowed_in_debug(self):
        """HTTP callback URL is allowed for local development when DEBUG=True."""
        try:
            validate_sepay_config()
        except ImproperlyConfigured as exc:
            self.fail(f"DEBUG=True should allow http callback URL, got: {exc}")


class SePayRedactionAndPrivacyTests(SimpleTestCase):
    """Tests ensuring secrets and account details are masked and never leaked into logs/errors."""

    def test_redact_secret_empty_or_short(self):
        """Empty string returns empty; short string (<= keep_last) is fully masked."""
        self.assertEqual(redact_secret(""), "")
        self.assertEqual(redact_secret("ab"), "**")
        self.assertEqual(redact_secret("1234"), "****")

    def test_redact_secret_preserves_only_tail(self):
        """Long secret keeps only last 4 characters preceded by masking prefix."""
        secret = "secret-token-abcdef1234"
        redacted = redact_secret(secret, keep_last=4)
        self.assertEqual(redacted, "****...1234")
        self.assertNotIn("secret-token-abcdef", redacted)

    @override_settings(**PRODUCTION_SEPAY_SETTINGS)
    def test_get_sepay_config_redacts_by_default(self):
        """get_sepay_config() masks secret and account number by default."""
        cfg = get_sepay_config()
        self.assertEqual(cfg["webhook_secret"], "****...9999")
        self.assertEqual(cfg["bank_account_number"], "****...3210")
        self.assertEqual(cfg["bank_code"], "VCB")
        self.assertEqual(cfg["bank_account_name"], "CONG TY CO PHAN XE KHACH")
        self.assertEqual(cfg["webhook_max_age_seconds"], 300)

        # Confirm raw secret is not present in redacted dictionary
        self.assertNotIn(PRODUCTION_SEPAY_SETTINGS["SEPAY_WEBHOOK_SECRET"], str(cfg))
        self.assertNotIn(PRODUCTION_SEPAY_SETTINGS["SEPAY_BANK_ACCOUNT_NUMBER"], str(cfg))

    @override_settings(**PRODUCTION_SEPAY_SETTINGS)
    def test_get_sepay_config_unredacted_opt_in(self):
        """get_sepay_config(redacted=False) returns raw values when explicitly requested."""
        cfg = get_sepay_config(redacted=False)
        self.assertEqual(cfg["webhook_secret"], PRODUCTION_SEPAY_SETTINGS["SEPAY_WEBHOOK_SECRET"])
        self.assertEqual(
            cfg["bank_account_number"], PRODUCTION_SEPAY_SETTINGS["SEPAY_BANK_ACCOUNT_NUMBER"]
        )

    @override_settings(**PRODUCTION_SEPAY_SETTINGS)
    def test_log_sepay_config_never_discloses_raw_values(self):
        """log_sepay_config() logs masked values and never the raw secret or account number."""
        logged_messages: list[str] = []

        def mock_logger(msg: str) -> None:
            logged_messages.append(msg)

        log_sepay_config(log_func=mock_logger)

        self.assertEqual(len(logged_messages), 1)
        log_text = logged_messages[0]

        # Verify raw secret and raw account number are NEVER in log output
        raw_secret = PRODUCTION_SEPAY_SETTINGS["SEPAY_WEBHOOK_SECRET"]
        raw_account = PRODUCTION_SEPAY_SETTINGS["SEPAY_BANK_ACCOUNT_NUMBER"]
        self.assertNotIn(raw_secret, log_text)
        self.assertNotIn(raw_account, log_text)

        # Verify redacted representations ARE in log output
        self.assertIn("****...9999", log_text)
        self.assertIn("****...3210", log_text)

    @override_settings(**PRODUCTION_SEPAY_SETTINGS)
    def test_log_sepay_config_default_logger(self):
        """Default logger handler executes cleanly with logging framework."""
        with self.assertLogs("apps.payments.config", level="INFO") as captured:
            log_sepay_config()
        self.assertEqual(len(captured.output), 1)
        self.assertIn("****...9999", captured.output[0])
        self.assertNotIn(PRODUCTION_SEPAY_SETTINGS["SEPAY_WEBHOOK_SECRET"], captured.output[0])


@override_settings(**PRODUCTION_SEPAY_SETTINGS)
class SePaySystemCheckTests(SimpleTestCase):
    """Tests for Django system check integration."""

    def test_system_check_passes_when_valid(self):
        """check_sepay_configuration returns no errors when settings are valid."""
        errors = check_sepay_configuration()
        self.assertEqual(errors, [])

    @override_settings(SEPAY_WEBHOOK_SECRET="", SEPAY_BANK_CODE="")
    def test_system_check_reports_missing_fields(self):
        """check_sepay_configuration returns Error messages for missing fields."""
        errors = check_sepay_configuration()
        error_ids = [e.id for e in errors]
        self.assertIn("payments.E003", error_ids)  # SEPAY_WEBHOOK_SECRET
        self.assertIn("payments.E006", error_ids)  # SEPAY_BANK_CODE

    @override_settings(SEPAY_WEBHOOK_MAX_AGE_SECONDS=-1)
    def test_system_check_reports_invalid_max_age(self):
        """check_sepay_configuration returns Error for negative max age."""
        errors = check_sepay_configuration()
        error_ids = [e.id for e in errors]
        self.assertIn("payments.E001", error_ids)

    @override_settings(SEPAY_CALLBACK_BASE_URL="http://unencrypted.com")
    def test_system_check_reports_insecure_callback(self):
        """check_sepay_configuration returns Error for non-HTTPS callback URL."""
        errors = check_sepay_configuration()
        error_ids = [e.id for e in errors]
        self.assertIn("payments.E002", error_ids)
