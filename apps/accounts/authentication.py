from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class BearerTokenAuthentication(TokenAuthentication):
    """
    Token authentication supporting both 'Bearer <token>' (standard Vite/React header)
    and 'Token <token>' (standard DRF format).
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return None

        parts = auth_header.split()
        if not parts or parts[0].lower() not in ("bearer", "token"):
            return None

        if len(parts) == 1:
            raise AuthenticationFailed("Invalid token header. No credentials provided.")
        elif len(parts) > 2:
            raise AuthenticationFailed("Invalid token header. Token string should not contain spaces.")

        return self.authenticate_credentials(parts[1])
