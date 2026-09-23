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

    def test_role_choices_contain_four_expected_roles(self):
        # BR-001: Customer, Ticket Agent, Dispatcher, Admin
        expected_roles = {"CUSTOMER", "TICKET_AGENT", "DISPATCHER", "ADMIN"}
        actual_roles = {choice[0] for choice in User.Role.choices}
        self.assertEqual(actual_roles, expected_roles)

    def test_password_is_hashed_and_never_plaintext(self):
        # BR-003: Password must be hashed and never stored plaintext
        user = User(username="hashuser", email="hash@example.com")
        plain_password = "SuperSecretPassword123!"
        user.set_password(plain_password)

        self.assertNotEqual(user.password, plain_password)
        self.assertTrue(user.check_password(plain_password))
        self.assertFalse(user.check_password("WrongPassword123!"))

    def test_user_fields_and_table_configuration(self):
        # BR-002, BR-039, BR-048: table name, unique email, nullable unique phone, timestamps
        self.assertEqual(User._meta.db_table, "users")

        email_field = User._meta.get_field("email")
        self.assertTrue(email_field.unique)

        phone_field = User._meta.get_field("phone")
        self.assertTrue(phone_field.unique)
        self.assertTrue(phone_field.null)
        self.assertTrue(phone_field.blank)

        updated_at_field = User._meta.get_field("updated_at")
        self.assertTrue(updated_at_field.auto_now)

        date_joined_field = User._meta.get_field("date_joined")
        self.assertIsNotNone(date_joined_field)

    def test_user_role_isolation_from_staff_and_superuser(self):
        # BR-051: Role is independent of is_staff / is_superuser
        admin_user = User(username="admin_user", email="admin@example.com", role=User.Role.ADMIN)
        self.assertEqual(admin_user.role, User.Role.ADMIN)
        self.assertFalse(admin_user.is_staff)
        self.assertFalse(admin_user.is_superuser)


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

    def test_driver_missing_only_license_number_fails(self):
        employee = Employee(
            employee_code="DRV001",
            full_name="Driver One",
            phone="0900000001",
            employee_type=Employee.EmployeeType.DRIVER,
            license_expiry=date(2030, 1, 1),
        )

        with self.assertRaises(ValidationError) as ctx:
            employee.clean()
        self.assertIn("license_number", ctx.exception.message_dict)

    def test_driver_missing_only_license_expiry_fails(self):
        employee = Employee(
            employee_code="DRV001",
            full_name="Driver One",
            phone="0900000001",
            employee_type=Employee.EmployeeType.DRIVER,
            license_number="LIC-001",
        )

        with self.assertRaises(ValidationError) as ctx:
            employee.clean()
        self.assertIn("license_expiry", ctx.exception.message_dict)

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

    def test_bus_attendant_does_not_require_license(self):
        # BR-004: Bus attendant has no license requirements
        attendant = Employee(
            employee_code="ATT001",
            full_name="Attendant One",
            phone="0900000002",
            employee_type=Employee.EmployeeType.BUS_ATTENDANT,
        )

        attendant.clean()

    def test_employee_fields_and_table_configuration(self):
        # BR-048: timestamps, table name, unique constraints
        self.assertEqual(Employee._meta.db_table, "employees")

        code_field = Employee._meta.get_field("employee_code")
        self.assertTrue(code_field.unique)

        phone_field = Employee._meta.get_field("phone")
        self.assertTrue(phone_field.unique)

        created_at_field = Employee._meta.get_field("created_at")
        self.assertTrue(created_at_field.auto_now_add)

        updated_at_field = Employee._meta.get_field("updated_at")
        self.assertTrue(updated_at_field.auto_now)

    def test_employee_str_representation(self):
        employee = Employee(
            employee_code="EMP001",
            full_name="Nguyen Van A",
            phone="0900000003",
            employee_type=Employee.EmployeeType.BUS_ATTENDANT,
        )
        self.assertEqual(str(employee), "EMP001 - Nguyen Van A")


class AuthenticationFoundationTests(SimpleTestCase):
    def test_drf_authentication_classes(self):
        auth_classes = settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]
        self.assertIn("rest_framework.authentication.SessionAuthentication", auth_classes)
        self.assertIn("apps.accounts.authentication.BearerTokenAuthentication", auth_classes)

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
