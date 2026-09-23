from types import SimpleNamespace
from django.test import SimpleTestCase

from apps.accounts.models import User
from apps.accounts.permissions import (
    HasBusinessRole,
    IsAdminOrDispatcher,
    IsAdminOrTicketAgent,
    IsAdminRole,
    IsCustomer,
    IsDispatcher,
    IsStaffOrAdmin,
    IsTicketAgent,
)


class MockView:
    def __init__(self, allowed_roles=()):
        self.allowed_roles = allowed_roles


def make_request(user=None, is_authenticated=True, is_active=True, role=User.Role.CUSTOMER):
    if user is None:
        user = SimpleNamespace(
            is_authenticated=is_authenticated,
            is_active=is_active,
            role=role,
        )
    return SimpleNamespace(user=user)


class RBACPermissionTests(SimpleTestCase):
    def test_anonymous_user_denied_everywhere(self):
        req = make_request(is_authenticated=False)
        permissions = [
            IsCustomer(),
            IsTicketAgent(),
            IsDispatcher(),
            IsAdminRole(),
            IsAdminOrTicketAgent(),
            IsAdminOrDispatcher(),
            IsStaffOrAdmin(),
            HasBusinessRole(),
        ]
        view = MockView(allowed_roles=(User.Role.CUSTOMER,))
        for perm in permissions:
            self.assertFalse(perm.has_permission(req, view))

    def test_inactive_user_denied_everywhere(self):
        req = make_request(is_authenticated=True, is_active=False, role=User.Role.ADMIN)
        permissions = [
            IsCustomer(),
            IsTicketAgent(),
            IsDispatcher(),
            IsAdminRole(),
            IsAdminOrTicketAgent(),
            IsAdminOrDispatcher(),
            IsStaffOrAdmin(),
            HasBusinessRole(),
        ]
        view = MockView(allowed_roles=(User.Role.ADMIN,))
        for perm in permissions:
            self.assertFalse(perm.has_permission(req, view))

    def test_is_customer_permission(self):
        perm = IsCustomer()
        view = MockView()

        customer_req = make_request(role=User.Role.CUSTOMER)
        admin_req = make_request(role=User.Role.ADMIN)

        self.assertTrue(perm.has_permission(customer_req, view))
        self.assertFalse(perm.has_permission(admin_req, view))

    def test_is_ticket_agent_permission(self):
        perm = IsTicketAgent()
        view = MockView()

        agent_req = make_request(role=User.Role.TICKET_AGENT)
        customer_req = make_request(role=User.Role.CUSTOMER)

        self.assertTrue(perm.has_permission(agent_req, view))
        self.assertFalse(perm.has_permission(customer_req, view))

    def test_is_dispatcher_permission(self):
        perm = IsDispatcher()
        view = MockView()

        disp_req = make_request(role=User.Role.DISPATCHER)
        admin_req = make_request(role=User.Role.ADMIN)

        self.assertTrue(perm.has_permission(disp_req, view))
        self.assertFalse(perm.has_permission(admin_req, view))

    def test_is_admin_role_permission(self):
        perm = IsAdminRole()
        view = MockView()

        admin_req = make_request(role=User.Role.ADMIN)
        disp_req = make_request(role=User.Role.DISPATCHER)

        self.assertTrue(perm.has_permission(admin_req, view))
        self.assertFalse(perm.has_permission(disp_req, view))

    def test_is_admin_or_ticket_agent_permission(self):
        perm = IsAdminOrTicketAgent()
        view = MockView()

        self.assertTrue(perm.has_permission(make_request(role=User.Role.ADMIN), view))
        self.assertTrue(perm.has_permission(make_request(role=User.Role.TICKET_AGENT), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.DISPATCHER), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.CUSTOMER), view))

    def test_is_admin_or_dispatcher_permission(self):
        perm = IsAdminOrDispatcher()
        view = MockView()

        self.assertTrue(perm.has_permission(make_request(role=User.Role.ADMIN), view))
        self.assertTrue(perm.has_permission(make_request(role=User.Role.DISPATCHER), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.TICKET_AGENT), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.CUSTOMER), view))

    def test_is_staff_or_admin_permission(self):
        perm = IsStaffOrAdmin()
        view = MockView()

        self.assertTrue(perm.has_permission(make_request(role=User.Role.ADMIN), view))
        self.assertTrue(perm.has_permission(make_request(role=User.Role.DISPATCHER), view))
        self.assertTrue(perm.has_permission(make_request(role=User.Role.TICKET_AGENT), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.CUSTOMER), view))

    def test_has_business_role_respects_view_allowed_roles(self):
        perm = HasBusinessRole()
        view = MockView(allowed_roles=(User.Role.DISPATCHER, User.Role.ADMIN))

        self.assertTrue(perm.has_permission(make_request(role=User.Role.DISPATCHER), view))
        self.assertTrue(perm.has_permission(make_request(role=User.Role.ADMIN), view))
        self.assertFalse(perm.has_permission(make_request(role=User.Role.CUSTOMER), view))
