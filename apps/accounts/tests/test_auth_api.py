from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="Password123!",
            first_name="Van A",
            last_name="Nguyen",
            role=User.Role.CUSTOMER,
            phone="0901234567",
        )

    def test_register_success(self):
        payload = {
            "fullName": "Tran Van B",
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "newuser")
        self.assertEqual(response.data["user"]["fullName"], "Tran Van B")
        self.assertEqual(response.data["user"]["role"], "CUSTOMER")

        # Verify in DB
        created = User.objects.get(username="newuser")
        self.assertEqual(created.role, User.Role.CUSTOMER)
        self.assertFalse(created.is_staff)
        self.assertFalse(created.is_superuser)

    def test_register_duplicate_username_fails(self):
        payload = {
            "fullName": "Duplicate User",
            "username": "testuser",
            "email": "other@example.com",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_duplicate_email_fails(self):
        payload = {
            "fullName": "Duplicate Email",
            "username": "uniqueuser",
            "email": "testuser@example.com",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_with_username_success(self):
        payload = {
            "username": "testuser",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")
        self.assertEqual(response.data["user"]["fullName"], "Van A Nguyen")

    def test_login_with_email_success(self):
        payload = {
            "username": "testuser@example.com",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_login_invalid_password_fails(self):
        payload = {
            "username": "testuser",
            "password": "WrongPassword!",
        }
        response = self.client.post("/api/public/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", response.data)

    def test_login_inactive_user_fails(self):
        self.user.is_active = False
        self.user.save()

        payload = {
            "username": "testuser",
            "password": "Password123!",
        }
        response = self.client.post("/api/public/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_profile_with_bearer_token(self):
        # Obtain token first
        login_res = self.client.post(
            "/api/public/auth/login",
            {"username": "testuser", "password": "Password123!"},
            format="json",
        )
        token = login_res.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/auth/profile")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "testuser@example.com")
        self.assertEqual(response.data["fullName"], "Van A Nguyen")

    def test_update_profile(self):
        login_res = self.client.post(
            "/api/public/auth/login",
            {"username": "testuser", "password": "Password123!"},
            format="json",
        )
        token = login_res.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        payload = {
            "fullName": "Le Thi C",
            "phone": "0988888888",
        }
        response = self.client.put("/api/auth/profile", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["fullName"], "Le Thi C")
        self.assertEqual(response.data["phone"], "0988888888")

        # Verify DB
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "0988888888")

    def test_profile_unauthorized_without_token(self):
        response = self.client.get("/api/auth/profile")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
