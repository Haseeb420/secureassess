-- Allow tokens to have no expiry (unlimited time access).
-- When expiry_at IS NULL the token never expires due to time;
-- it can still be invalidated via is_revoked or usage_limit.
ALTER TABLE tokens ALTER COLUMN expiry_at DROP NOT NULL;
