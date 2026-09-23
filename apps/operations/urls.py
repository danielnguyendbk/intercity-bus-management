from django.urls import path

from apps.operations.views import (
    AdminBusDetailView,
    AdminBusListCreateView,
    AdminBusStatusView,
    AdminRouteDetailView,
    AdminRouteListCreateView,
)

urlpatterns = [
    path("routes/", AdminRouteListCreateView.as_view(), name="operations-routes"),
    path("routes/<int:pk>/", AdminRouteDetailView.as_view(), name="operations-route-detail"),
    path("buses/", AdminBusListCreateView.as_view(), name="operations-buses"),
    path("buses/<int:pk>/", AdminBusDetailView.as_view(), name="operations-bus-detail"),
    path("buses/<int:pk>/status/", AdminBusStatusView.as_view(), name="operations-bus-status"),
]
