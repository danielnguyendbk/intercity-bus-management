from rest_framework import serializers
from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "fullName", "email", "role", "phone"]

    def get_fullName(self, obj) -> str:
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

    def get_role(self, obj) -> str:
        # Map DISPATCHER and TICKET_AGENT to STAFF for frontend role normalization
        if obj.role in (User.Role.DISPATCHER, User.Role.TICKET_AGENT):
            return "STAFF"
        return obj.role


class RegisterSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Tên đăng nhập đã tồn tại.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return value

    def create(self, validated_data):
        full_name = validated_data.get("fullName", "").strip()
        first_name = ""
        last_name = ""
        if full_name:
            parts = full_name.split(maxsplit=1)
            first_name = parts[0]
            if len(parts) > 1:
                last_name = parts[1]

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
            role=User.Role.CUSTOMER,
            is_staff=False,
            is_superuser=False,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, allow_blank=True)


class ProfileUpdateSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def update(self, instance, validated_data):
        if "fullName" in validated_data:
            full_name = validated_data["fullName"].strip()
            if full_name:
                parts = full_name.split(maxsplit=1)
                instance.first_name = parts[0]
                instance.last_name = parts[1] if len(parts) > 1 else ""
            else:
                instance.first_name = ""
                instance.last_name = ""

        if "phone" in validated_data:
            phone = validated_data["phone"].strip() or None
            if phone and User.objects.filter(phone=phone).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({"phone": "Số điện thoại đã được sử dụng."})
            instance.phone = phone

        instance.save()
        return instance


class AdminUserSerializer(serializers.ModelSerializer):
    fullName = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    employeeType = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="date_joined", format="%Y-%m-%dT%H:%M:%S")

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "status",
            "fullName",
            "employeeType",
            "createdAt",
        ]

    def get_fullName(self, obj) -> str:
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

    def get_role(self, obj) -> str:
        if obj.role in (User.Role.DISPATCHER, User.Role.TICKET_AGENT):
            return "STAFF"
        return obj.role

    def get_status(self, obj) -> str:
        return "ACTIVE" if obj.is_active else "LOCKED"

    def get_employeeType(self, obj) -> str:
        return ""


class AdminCreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    role = serializers.CharField(max_length=20)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Tên đăng nhập đã tồn tại.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return value

    def create(self, validated_data):
        role_raw = validated_data["role"].upper()
        if role_raw == "STAFF":
            role_val = User.Role.DISPATCHER
        elif role_raw == "ADMIN":
            role_val = User.Role.ADMIN
        else:
            role_val = User.Role.CUSTOMER

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            phone=validated_data.get("phone") or None,
            role=role_val,
            is_staff=(role_val == User.Role.ADMIN),
            is_superuser=False,
        )
        return user


class AdminUpdateUserSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    fullName = serializers.CharField(max_length=150, required=False, allow_blank=True)
    employeeType = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def update(self, instance, validated_data):
        if "email" in validated_data:
            email = validated_data["email"]
            if User.objects.filter(email=email).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({"email": "Email đã được sử dụng."})
            instance.email = email

        if "phone" in validated_data:
            phone = validated_data["phone"].strip() or None
            if phone and User.objects.filter(phone=phone).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({"phone": "Số điện thoại đã được sử dụng."})
            instance.phone = phone

        if "fullName" in validated_data:
            full_name = validated_data["fullName"].strip()
            if full_name:
                parts = full_name.split(maxsplit=1)
                instance.first_name = parts[0]
                instance.last_name = parts[1] if len(parts) > 1 else ""
            else:
                instance.first_name = ""
                instance.last_name = ""

        instance.save()
        return instance

