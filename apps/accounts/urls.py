from django.urls import path
from apps.accounts.views import LoginView, LogoutView, ProfileView, RegisterView

urlpatterns = [
    path("login/", LoginView.as_view(), name="account-login"),
    path("register/", RegisterView.as_view(), name="account-register"),
    path("logout/", LogoutView.as_view(), name="account-logout"),
    path("profile/", ProfileView.as_view(), name="account-profile"),
    path("me/", ProfileView.as_view(), name="account-me"),
]
