from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.utils import generate_unique_username
from django.contrib.auth import get_user_model

from .models import User


class AccountAdapter(DefaultAccountAdapter):
    def generate_unique_username(
        self, txts: list[str | None], regex: str | None = None
    ) -> str:
        email = next((value for value in txts if value and "@" in value), None)
        local_part = email.split("@", maxsplit=1)[0] if email else "user"
        return generate_unique_username([local_part, "user"], regex)


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_auto_signup_allowed(self, request, sociallogin) -> bool:
        email = (sociallogin.user.email or "").strip()
        if not email:
            return False
        return not get_user_model().objects.filter(email__iexact=email).exists()

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        user.role = User.Role.CUSTOMER
        user.is_staff = False
        user.is_superuser = False
        return user
