use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

const DEVICE_SECRET: &str = "secureassess-device-v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedPayload {
    pub data: serde_json::Value,
    pub checksum: String,
    pub machine_fingerprint: String,
    pub timestamp: String,
    pub signature: String,
}

fn sha256_hex(input: &str) -> String {
    let hash = Sha256::digest(input.as_bytes());
    hash.iter().map(|b| format!("{b:02x}")).collect()
}

fn get_device_key(fingerprint: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(DEVICE_SECRET.as_bytes())
        .expect("HMAC accepts any key size");
    mac.update(fingerprint.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

fn hmac_sha256_hex(message: &str, key: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(key.as_bytes()).expect("HMAC accepts any key size");
    mac.update(message.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn build_signed_payload(data: serde_json::Value, fingerprint: &str) -> SignedPayload {
    let data_str = serde_json::to_string(&data).unwrap_or_default();
    let checksum = sha256_hex(&data_str);
    let device_key = get_device_key(fingerprint);
    let signature = hmac_sha256_hex(&checksum, &device_key);
    let timestamp = Utc::now().to_rfc3339();

    SignedPayload {
        data,
        checksum,
        machine_fingerprint: fingerprint.to_string(),
        timestamp,
        signature,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_payload_checksum_matches() {
        let data = json!({"session_id": "s1", "score": 100});
        let fingerprint = "test-fingerprint-abc123";
        let payload = build_signed_payload(data.clone(), fingerprint);

        let expected = sha256_hex(&serde_json::to_string(&data).unwrap());
        assert_eq!(payload.checksum, expected);
    }

    #[test]
    fn test_tampered_data_changes_checksum() {
        let fp = "test-fingerprint-abc123";
        let p1 = build_signed_payload(json!({"score": 100}), fp);
        let p2 = build_signed_payload(json!({"score": 99}), fp);
        assert_ne!(p1.checksum, p2.checksum);
        assert_ne!(p1.signature, p2.signature);
    }

    #[test]
    fn test_build_signed_payload_has_checksum() {
        let data = json!({"session_id": "abc", "language": "python"});
        let payload = build_signed_payload(data, "fp-test");
        assert!(!payload.checksum.is_empty());
        assert!(!payload.signature.is_empty());
        assert!(!payload.timestamp.is_empty());
    }

    #[test]
    fn test_old_timestamp_would_be_stale() {
        use chrono::Duration;

        let payload = build_signed_payload(json!({"x": 1}), "fp-test");
        let two_hours_ago = Utc::now() - Duration::hours(2);
        let age_secs = (Utc::now() - two_hours_ago).num_seconds();
        assert!(age_secs > 3600, "2-hour-old timestamp should be > 3600s old");

        // Current payload timestamp should be fresh (< 60s old)
        let ts = chrono::DateTime::parse_from_rfc3339(&payload.timestamp)
            .expect("timestamp should be valid RFC3339")
            .with_timezone(&Utc);
        let fresh_age = (Utc::now() - ts).num_seconds();
        assert!(fresh_age < 60, "freshly built payload timestamp should be recent");
    }
}
