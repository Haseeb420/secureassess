from fastapi import FastAPI

from routers import auth

app = FastAPI(title="SecureAssess API", version="0.1.0")

app.include_router(auth.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "secureassess-api"}
