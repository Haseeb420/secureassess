from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.logging import configure_logging, get_logger
from routers import assessments, auth, questions, reports, sessions, sync, tokens

configure_logging()
logger = get_logger()

app = FastAPI(title="SecureAssess API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # admin dashboard
        "http://localhost:5173",   # desktop Vite dev server
        "tauri://localhost",       # Tauri production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assessments.router)
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
