from django.contrib import admin
from django.urls import include, path

from apps.common.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("accounts/", include("allauth.urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/operations/", include("apps.operations.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/common/", include("apps.common.urls")),
]
