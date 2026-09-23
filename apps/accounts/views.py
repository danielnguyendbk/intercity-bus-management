from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import (
    AdminCreateUserSerializer,
    AdminUpdateUserSerializer,
    AdminUserSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        try:
            django_login(request, user)
        except Exception:
            pass

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        user = None
        if "@" in username:
            user_obj = User.objects.filter(email=username).first()
            if user_obj:
                user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            user = authenticate(request, username=username, password=password)

        if not user:
            candidate = (
                User.objects.filter(email=username).first()
                if "@" in username
                else User.objects.filter(username=username).first()
            )
            if candidate and candidate.check_password(password) and not candidate.is_active:
                return Response(
                    {"detail": "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {"detail": "Sai tên đăng nhập hoặc mật khẩu."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)
        try:
            django_login(request, user)
        except Exception:
            pass

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        try:
            django_logout(request)
        except Exception:
            pass
        return Response({"detail": "Đăng xuất thành công."}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(instance=request.user, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class AdminUserListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        keyword = request.query_params.get("keyword", "").strip()
        role = request.query_params.get("role", "").strip()
        status_param = request.query_params.get("status", "").strip()

        qs = User.objects.all().order_by("-date_joined")
        if keyword:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=keyword)
                | Q(email__icontains=keyword)
                | Q(first_name__icontains=keyword)
                | Q(last_name__icontains=keyword)
                | Q(phone__icontains=keyword)
            )
        if role:
            role_upper = role.upper()
            if role_upper == "STAFF":
                qs = qs.filter(role__in=[User.Role.DISPATCHER, User.Role.TICKET_AGENT])
            elif role_upper == "ADMIN":
                qs = qs.filter(role=User.Role.ADMIN)
            elif role_upper == "CUSTOMER":
                qs = qs.filter(role=User.Role.CUSTOMER)

        if status_param:
            if status_param.upper() == "ACTIVE":
                qs = qs.filter(is_active=True)
            elif status_param.upper() in ("INACTIVE", "LOCKED"):
                qs = qs.filter(is_active=False)

        serializer = AdminUserSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminUserSerializer(user).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminUpdateUserSerializer(instance=user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        return Response(AdminUserSerializer(updated).data, status=status.HTTP_200_OK)


class AdminUserLockView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_200_OK)


class AdminUserPasswordView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        new_password = request.data.get("newPassword", "")
        if not new_password or len(new_password) < 6:
            return Response(
                {"newPassword": "Mật khẩu mới phải có tối thiểu 6 ký tự."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Đổi mật khẩu thành công."}, status=status.HTTP_200_OK)

