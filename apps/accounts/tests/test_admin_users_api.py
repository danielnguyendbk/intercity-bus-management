from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User


class AdminUsersAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="adminuser",
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
            first_name="Admin",
            last_name="System",
        )
        self.customer = User.objects.create_user(
            username="customer1",
            email="customer1@example.com",
            password="Password123!",
            role=User.Role.CUSTOMER,
            first_name="Khach",
            last_name="Hang",
        )

    def test_get_admin_users_list(self):
        response = self.client.get("/api/admin/users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        usernames = [u["username"] for u in response.data]
        self.assertIn("adminuser", usernames)
        self.assertIn("customer1", usernames)

    def test_filter_admin_users_by_role(self):
        response = self.client.get("/api/admin/users?role=ADMIN")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for u in response.data:
            self.assertEqual(u["role"], "ADMIN")

    def test_create_admin_user(self):
        payload = {
            "username": "newstaff",
            "password": "Password123!",
            "email": "staff@example.com",
            "phone": "0911223344",
            "role": "STAFF",
        }
        response = self.client.post("/api/admin/users", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "newstaff")
        self.assertEqual(response.data["role"], "STAFF")

        created = User.objects.get(username="newstaff")
        self.assertEqual(created.role, User.Role.DISPATCHER)

    def test_lock_unlock_user(self):
        # Toggle lock on customer
        response = self.client.put(f"/api/admin/users/{self.customer.id}/lock")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "LOCKED")

        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)

        # Toggle back
        response = self.client.put(f"/api/admin/users/{self.customer.id}/lock")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ACTIVE")

        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_active)

    def test_reset_user_password(self):
        payload = {"newPassword": "NewSecretPassword123!"}
        response = self.client.put(
            f"/api/admin/users/{self.customer.id}/password",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.customer.refresh_from_db()
        self.assertTrue(self.customer.check_password("NewSecretPassword123!"))
