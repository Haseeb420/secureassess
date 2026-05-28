import hashlib
import hmac as hmac_lib
import json
from datetime import datetime, timedelta, timezone

DEVICE_SECRET = "secureassess-device-v1"  # must match Rust constant


def get_device_key(fingerprint: str) -> str:
    return hmac_lib.new(
        DEVICE_SECRET.encode(),
        fingerprint.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_submission(payload: dict) -> tuple[bool, str]:
    data = payload.get("data")
    checksum: str = payload.get("checksum", "")
    machine_fingerprint: str = payload.get("machine_fingerprint", "")
    timestamp: str = payload.get("timestamp", "")
    signature: str = payload.get("signature", "")

    if not all([data is not None, checksum, machine_fingerprint, timestamp, signature]):
        return False, "missing_fields"

    # Recompute checksum from data
    data_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    computed_checksum = hashlib.sha256(data_str.encode()).hexdigest()
    if computed_checksum != checksum:
        return False, "checksum_mismatch"

    # Recompute HMAC signature
    device_key = get_device_key(machine_fingerprint)
    computed_sig = hmac_lib.new(
        device_key.encode(),
        checksum.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac_lib.compare_digest(computed_sig, signature):
        return False, "signature_mismatch"

    # Replay protection: reject if older than 1 hour
    try:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - ts) > timedelta(hours=1):
            return False, "timestamp_too_old"
    except ValueError:
        return False, "invalid_timestamp"

    return True, "ok"
