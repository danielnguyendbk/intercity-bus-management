from django.urls import path
from apps.bookings.views import (
    BookTicketView,
    CancelTicketView,
    MyTicketsView,
    TripSearchView,
    TripSeatsView,
)

urlpatterns = [
    path("trips/search/", TripSearchView.as_view(), name="booking-trip-search"),
    path("trips/<int:trip_id>/seats/", TripSeatsView.as_view(), name="booking-trip-seats"),
    path("tickets/", BookTicketView.as_view(), name="booking-book-ticket"),
    path("tickets/my/", MyTicketsView.as_view(), name="booking-my-tickets"),
    path("tickets/<int:ticket_id>/cancel/", CancelTicketView.as_view(), name="booking-cancel-ticket"),
]
