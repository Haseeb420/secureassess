from fastapi import FastAPI

from routers import assessments, auth, questions, reports, sessions

app = FastAPI(title="SecureAssess API", version="0.1.0")

app.include_router(auth.router)
app.include_router(assessments.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(reports.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "secureassess-api"}
