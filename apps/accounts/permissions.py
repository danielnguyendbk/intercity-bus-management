from rest_framework.permissions import BasePermission


class HasBusinessRole(BasePermission):
    """Require authentication and a role declared by the target view."""

    message = "Your business role does not permit this action."

    def has_permission(self, request, view) -> bool:
        allowed_roles = getattr(view, "allowed_roles", ())
        return bool(
            request.user.is_authenticated
            and allowed_roles
            and request.user.role in allowed_roles
        )
