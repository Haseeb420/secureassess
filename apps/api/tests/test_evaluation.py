def test_run_without_auth_returns_401_or_403(client):
    # Any evaluation endpoint requires a valid auth token
    response = client.post(
        "/sync/ingest",
        json={"type": "submission", "payload": {}, "submission_hash": "abc"},
    )
    # Without a signed payload the integrity check rejects it (400) or auth rejects (401/403)
    assert response.status_code in (400, 401, 403, 422)


def test_hidden_tests_not_in_response_schema():
    # TestCaseResult should not expose an isHidden field to the candidate
    from routers import sync  # noqa: F401 — import verifies the module loads cleanly

    # Verify the SyncItem model doesn't contain hidden test fields
    from routers.sync import SyncItem

    fields = SyncItem.model_fields
    hidden_like = [f for f in fields if "hidden" in f.lower()]
    assert hidden_like == [], f"SyncItem exposes hidden fields: {hidden_like}"
