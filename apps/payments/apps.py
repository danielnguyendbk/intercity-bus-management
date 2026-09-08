from django.apps import AppConfig
from django.core import checks


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"

    def ready(self) -> None:
        from apps.payments.config import check_sepay_configuration

        checks.register(check_sepay_configuration, checks.Tags.security, deploy=True)
