import os
import re

from fastapi import FastAPI, Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.logging import configure_logging, get_logger
from routers import assessments, attempts, auth, mock_attempts, questions, reports, sessions, sync, tokens

configure_logging()
logger = get_logger()

app = FastAPI(title="SecureAssess API", version="0.1.0")

_STATIC_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "tauri://localhost",       # macOS / Linux Tauri production builds
    "http://tauri.localhost",  # Windows Tauri production builds
]

# Accept any ngrok tunnel URL (admin URL is dynamic, so exact match is impossible)
_NGROK_PATTERN = re.compile(r"https://[a-z0-9-]+\.ngrok(-free)?\.(app|dev|io)$")

# Additional origins can be injected via env var (space or comma separated)
_extra = os.getenv("CORS_EXTRA_ORIGINS", "")
_EXTRA_ORIGINS = [o.strip() for o in re.split(r"[\s,]+", _extra) if o.strip()]

# Vercel admin URL and optional ngrok URL set as Fly.io secrets
for _env_key in ("ADMIN_URL", "NGROK_URL"):
    _val = os.getenv(_env_key, "").strip()
    if _val and _val not in _EXTRA_ORIGINS:
        _EXTRA_ORIGINS.append(_val)


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin", "")
        allowed = (
            origin in _STATIC_ORIGINS
            or origin in _EXTRA_ORIGINS
            or bool(_NGROK_PATTERN.match(origin))
        )
        if request.method == "OPTIONS":
            # Always approve preflight; auth is JWT-based and Tauri builds may omit Origin.
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin or "*",
                    "Access-Control-Allow-Credentials": "true" if origin else "false",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            )
        response = await call_next(request)
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response


class StripApiPrefix(BaseHTTPMiddleware):
    _PREFIX = "/api/backend"

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.scope["path"]
        if path.startswith(self._PREFIX):
            request.scope["path"] = path[len(self._PREFIX):] or "/"
        return await call_next(request)


app.add_middleware(StripApiPrefix)           # inner: rewrite path before routing
app.add_middleware(DynamicCORSMiddleware)    # outer: handle CORS/OPTIONS first

app.include_router(auth.router)
app.include_router(assessments.router)
app.include_router(attempts.router)
app.include_router(mock_attempts.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(reports.router)
app.include_router(sync.router)
app.include_router(tokens.router)


@app.on_event("startup")
async def _startup() -> None:
    logger.info("SecureAssess API starting up")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "secureassess-api"}
