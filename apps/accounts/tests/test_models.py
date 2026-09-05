from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from apps.accounts.adapters import AccountAdapter, SocialAccountAdapter
from apps.accounts.models import Employee, User


class UserModelContractTests(SimpleTestCase):
    def test_business_role_defaults_to_customer(self):
        user = User(username="customer", email="customer@example.com")

        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)


class EmployeeModelContractTests(SimpleTestCase):
    def test_driver_requires_license_number_and_expiry(self):
        employee = Employee(
            employee_code="DRV001",
            full_name="Driver One",
            phone="0900000001",
            employee_type=Employee.EmployeeType.DRIVER,
        )

        with self.assertRaises(ValidationError):
            employee.clean()

    def test_driver_with_required_license_fields_is_valid(self):
        employee = Employee(
            employee_code="DRV001",
            full_name="Driver One",
            phone="0900000001",
            employee_type=Employee.EmployeeType.DRIVER,
            license_number="LICENSE-001",
            license_expiry=date(2030, 1, 1),
        )

        employee.clean()


class AuthenticationFoundationTests(SimpleTestCase):
    def test_drf_uses_session_authentication_only(self):
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"],
            ["rest_framework.authentication.SessionAuthentication"],
        )

    @patch("apps.accounts.adapters.generate_unique_username")
    def test_oauth_username_uses_email_local_part(self, generate_username):
        generate_username.return_value = "customer7"

        username = AccountAdapter().generate_unique_username(
            ["First", "Last", "customer@example.com"]
        )

        self.assertEqual(username, "customer7")
        generate_username.assert_called_once_with(["customer", "user"], None)

    @patch("apps.accounts.adapters.get_user_model")
    def test_oauth_duplicate_email_is_not_auto_created(self, get_user_model):
        get_user_model.return_value.objects.filter.return_value.exists.return_value = True
        sociallogin = SimpleNamespace(user=SimpleNamespace(email="used@example.com"))

        allowed = SocialAccountAdapter().is_auto_signup_allowed(None, sociallogin)

        self.assertFalse(allowed)

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_new_oauth_user_is_never_privileged(self, populate_user):
        user = User(
            username="candidate",
            email="candidate@example.com",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        populate_user.return_value = user

        result = SocialAccountAdapter().populate_user(None, SimpleNamespace(), {})

        self.assertEqual(result.role, User.Role.CUSTOMER)
        self.assertFalse(result.is_staff)
        self.assertFalse(result.is_superuser)
