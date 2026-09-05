from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        TICKET_AGENT = "TICKET_AGENT", "Ticket agent"
        DISPATCHER = "DISPATCHER", "Dispatcher"
        ADMIN = "ADMIN", "Administrator"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role, default=Role.CUSTOMER)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"


class Employee(models.Model):
    class EmployeeType(models.TextChoices):
        DRIVER = "DRIVER", "Driver"
        BUS_ATTENDANT = "BUS_ATTENDANT", "Bus attendant"

    employee_code = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, unique=True)
    employee_type = models.CharField(max_length=20, choices=EmployeeType)
    license_number = models.CharField(max_length=50, null=True, blank=True)
    license_class = models.CharField(max_length=20, null=True, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employees"
        constraints = [
            models.CheckConstraint(
                condition=(
                    ~Q(employee_type="DRIVER")
                    | (Q(license_number__isnull=False) & Q(license_expiry__isnull=False))
                ),
                name="chk_driver_license",
            )
        ]

    def clean(self) -> None:
        super().clean()
        if self.employee_type == self.EmployeeType.DRIVER:
            errors = {}
            if not self.license_number:
                errors["license_number"] = "A driver must have a license number."
            if not self.license_expiry:
                errors["license_expiry"] = "A driver must have a license expiry date."
            if errors:
                raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.employee_code} - {self.full_name}"
