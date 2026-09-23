from django.contrib import admin
from django.urls import include, path

from apps.accounts.views import (
    AdminUserDetailView,
    AdminUserListCreateView,
    AdminUserLockView,
    AdminUserPasswordView,
    LoginView,
    ProfileView,
    RegisterView,
)
from apps.bookings.views import (
    BookTicketView,
    CancelTicketView,
    MyTicketsView,
    TripSearchView,
    TripSeatsView,
)
from apps.common.views import health
from apps.operations.views import (
    AdminBusDetailView,
    AdminBusListCreateView,
    AdminBusStatusView,
    AdminDashboardView,
    AdminRouteDetailView,
    AdminRouteListCreateView,
    AssignTripView,
    AvailableEmployeesView,
    TripListCreateView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("accounts/", include("allauth.urls")),
    # Public Auth endpoints for Frontend
    path("api/public/auth/login", LoginView.as_view(), name="public-login"),
    path("api/public/auth/login/", LoginView.as_view(), name="public-login-slash"),
    path("api/public/auth/register", RegisterView.as_view(), name="public-register"),
    path("api/public/auth/register/", RegisterView.as_view(), name="public-register-slash"),
    path("api/auth/profile", ProfileView.as_view(), name="auth-profile"),
    path("api/auth/profile/", ProfileView.as_view(), name="auth-profile-slash"),

    # Admin Management & Dashboard endpoints for Frontend
    path("api/admin/dashboard", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("api/admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard-slash"),
    path("api/admin/routes", AdminRouteListCreateView.as_view(), name="admin-routes"),
    path("api/admin/routes/", AdminRouteListCreateView.as_view(), name="admin-routes-slash"),
    path("api/admin/routes/<int:pk>", AdminRouteDetailView.as_view(), name="admin-route-detail"),
    path("api/admin/routes/<int:pk>/", AdminRouteDetailView.as_view(), name="admin-route-detail-slash"),

    path("api/admin/buses", AdminBusListCreateView.as_view(), name="admin-buses"),
    path("api/admin/buses/", AdminBusListCreateView.as_view(), name="admin-buses-slash"),
    path("api/admin/buses/<int:pk>", AdminBusDetailView.as_view(), name="admin-bus-detail"),
    path("api/admin/buses/<int:pk>/", AdminBusDetailView.as_view(), name="admin-bus-detail-slash"),
    path("api/admin/buses/<int:pk>/status", AdminBusStatusView.as_view(), name="admin-bus-status"),
    path("api/admin/buses/<int:pk>/status/", AdminBusStatusView.as_view(), name="admin-bus-status-slash"),

    path("api/admin/users", AdminUserListCreateView.as_view(), name="admin-users"),
    path("api/admin/users/", AdminUserListCreateView.as_view(), name="admin-users-slash"),
    path("api/admin/users/<int:pk>", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("api/admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail-slash"),
    path("api/admin/users/<int:pk>/lock", AdminUserLockView.as_view(), name="admin-user-lock"),
    path("api/admin/users/<int:pk>/lock/", AdminUserLockView.as_view(), name="admin-user-lock-slash"),
    path("api/admin/users/<int:pk>/password", AdminUserPasswordView.as_view(), name="admin-user-password"),
    path("api/admin/users/<int:pk>/password/", AdminUserPasswordView.as_view(), name="admin-user-password-slash"),

    # Dispatcher endpoints for Frontend
    path("api/trips", TripListCreateView.as_view(), name="dispatcher-trips"),
    path("api/trips/", TripListCreateView.as_view(), name="dispatcher-trips-slash"),
    path("api/trip-assignments", AssignTripView.as_view(), name="dispatcher-trip-assignments"),
    path("api/trip-assignments/", AssignTripView.as_view(), name="dispatcher-trip-assignments-slash"),
    path("api/employees/available", AvailableEmployeesView.as_view(), name="dispatcher-available-employees"),
    path("api/employees/available/", AvailableEmployeesView.as_view(), name="dispatcher-available-employees-slash"),

    # Customer Booking endpoints for Frontend
    path("api/public/trips/search", TripSearchView.as_view(), name="frontend-trip-search"),
    path("api/public/trips/search/", TripSearchView.as_view(), name="frontend-trip-search-slash"),
    path("api/public/trips/<int:trip_id>/seats", TripSeatsView.as_view(), name="frontend-trip-seats"),
    path("api/public/trips/<int:trip_id>/seats/", TripSeatsView.as_view(), name="frontend-trip-seats-slash"),
    path("api/private/tickets", BookTicketView.as_view(), name="frontend-book-ticket"),
    path("api/private/tickets/", BookTicketView.as_view(), name="frontend-book-ticket-slash"),
    path("api/private/tickets/my", MyTicketsView.as_view(), name="frontend-my-tickets"),
    path("api/private/tickets/my/", MyTicketsView.as_view(), name="frontend-my-tickets-slash"),
    path("api/private/tickets/<int:ticket_id>/cancel", CancelTicketView.as_view(), name="frontend-cancel-ticket"),
    path("api/private/tickets/<int:ticket_id>/cancel/", CancelTicketView.as_view(), name="frontend-cancel-ticket-slash"),

    # Standard app routes
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/operations/", include("apps.operations.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/common/", include("apps.common.urls")),
]
