from fastapi import FastAPI

from core.logging import configure_logging, get_logger
from routers import assessments, auth, questions, reports, sessions, sync

configure_logging()
logger = get_logger()

app = FastAPI(title="SecureAssess API", version="0.1.0")

app.include_router(auth.router)
app.include_router(assessments.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(reports.router)
app.include_router(sync.router)


@app.on_event("startup")
async def _startup() -> None:
    logger.info("SecureAssess API starting up")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "secureassess-api"}
