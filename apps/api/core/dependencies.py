from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

from .config import settings

bearer_scheme = HTTPBearer()


def _decode_token(credentials: HTTPAuthorizationCredentials) -> dict:
    token = credentials.credentials
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_candidate(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    return _decode_token(credentials)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    payload = _decode_token(credentials)
    role = payload.get("user_metadata", {}).get("role") or payload.get("app_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload
