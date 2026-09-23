from rest_framework.permissions import BasePermission
from apps.accounts.models import User


class HasBusinessRole(BasePermission):
    """Require authentication, active status, and a role declared by the target view."""

    message = "Your business role does not permit this action."

    def has_permission(self, request, view) -> bool:
        allowed_roles = getattr(view, "allowed_roles", ())
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and allowed_roles
            and request.user.role in allowed_roles
        )


class IsCustomer(BasePermission):
    """Allow access only to authenticated active CUSTOMER users."""

    message = "Chỉ khách hàng mới có quyền thực hiện thao tác này."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.CUSTOMER
        )


class IsTicketAgent(BasePermission):
    """Allow access only to authenticated active TICKET_AGENT users."""

    message = "Chỉ nhân viên bán vé mới có quyền thực hiện thao tác này."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.TICKET_AGENT
        )


class IsDispatcher(BasePermission):
    """Allow access only to authenticated active DISPATCHER users."""

    message = "Chỉ điều hành viên mới có quyền thực hiện thao tác này."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.DISPATCHER
        )


class IsAdminRole(BasePermission):
    """Allow access only to authenticated active ADMIN users based on business role."""

    message = "Yêu cầu quyền Quản trị viên hệ thống."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.ADMIN
        )


class IsAdminOrTicketAgent(BasePermission):
    """Allow access to ADMIN or TICKET_AGENT users."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role in (User.Role.ADMIN, User.Role.TICKET_AGENT)
        )


class IsAdminOrDispatcher(BasePermission):
    """Allow access to ADMIN or DISPATCHER users."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role in (User.Role.ADMIN, User.Role.DISPATCHER)
        )


class IsStaffOrAdmin(BasePermission):
    """Allow access to ADMIN, DISPATCHER, or TICKET_AGENT users."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role in (User.Role.ADMIN, User.Role.DISPATCHER, User.Role.TICKET_AGENT)
        )
