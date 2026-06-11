-- Allow tokens to have no usage limit (unlimited attempts).
-- When usage_limit IS NULL the token can be used any number of times;
-- it can still be invalidated via is_revoked or expiry_at.
ALTER TABLE tokens ALTER COLUMN usage_limit DROP NOT NULL;
