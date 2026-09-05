from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Employee, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Business profile", {"fields": ("phone", "role", "updated_at")}),
    )
    readonly_fields = ("updated_at",)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Business profile", {"fields": ("email", "phone", "role")}),
    )
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = UserAdmin.list_filter + ("role",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("employee_code", "full_name", "employee_type", "is_active")
    list_filter = ("employee_type", "is_active")
    search_fields = ("employee_code", "full_name", "phone")
    readonly_fields = ("created_at", "updated_at")
