import os

import pytest
from fastapi.testclient import TestClient

# Set required env vars before importing app modules that call Settings()
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "super-secret-jwt-key-for-tests-only")


@pytest.fixture(scope="session")
def client():
    from main import app

    with TestClient(app) as c:
        yield c
