import hashlib
import hmac as hmac_lib
import json
from datetime import datetime, timedelta, timezone


def _build_valid_payload(data: dict, fingerprint: str = "test-fp") -> dict:
    DEVICE_SECRET = "secureassess-device-v1"
    data_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    checksum = hashlib.sha256(data_str.encode()).hexdigest()
    device_key = hmac_lib.new(DEVICE_SECRET.encode(), fingerprint.encode(), hashlib.sha256).hexdigest()
    signature = hmac_lib.new(device_key.encode(), checksum.encode(), hashlib.sha256).hexdigest()
    timestamp = datetime.now(timezone.utc).isoformat()
    return {
        "data": data,
        "checksum": checksum,
        "machine_fingerprint": fingerprint,
        "timestamp": timestamp,
        "signature": signature,
    }


def test_valid_payload_passes_verification():
    from services.integrity import verify_submission

    payload = _build_valid_payload({"session_id": "s1", "score": 95})
    ok, reason = verify_submission(payload)
    assert ok is True
    assert reason == "ok"


def test_tampered_checksum_fails():
    from services.integrity import verify_submission

    payload = _build_valid_payload({"session_id": "s1", "score": 95})
    payload["checksum"] = "deadbeef" * 8
    ok, reason = verify_submission(payload)
    assert ok is False
    assert reason in ("checksum_mismatch", "signature_mismatch")


def test_old_timestamp_fails():
    from services.integrity import verify_submission

    payload = _build_valid_payload({"session_id": "s2"})
    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
    payload["timestamp"] = two_hours_ago.isoformat()
    ok, reason = verify_submission(payload)
    assert ok is False
    assert "timestamp" in reason


def test_missing_fields_fails():
    from services.integrity import verify_submission

    ok, reason = verify_submission({"data": {"x": 1}})
    assert ok is False
    assert reason == "missing_fields"
