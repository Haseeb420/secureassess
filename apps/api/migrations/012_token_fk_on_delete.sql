-- Migration 012: fix FK constraints so tokens can be deleted cleanly
--
-- assessment_attempts.token_id: drop NOT NULL + switch to ON DELETE SET NULL
--   → deleting a token preserves attempt history, just unlinks the token reference
-- mock_attempts.token_id: same treatment
-- token_usage_log.token_id: switch to ON DELETE CASCADE
--   → usage log rows are meaningless without the token, so cascade-delete them

-- assessment_attempts
ALTER TABLE assessment_attempts ALTER COLUMN token_id DROP NOT NULL;
ALTER TABLE assessment_attempts DROP CONSTRAINT IF EXISTS assessment_attempts_token_id_fkey;
ALTER TABLE assessment_attempts
    ADD CONSTRAINT assessment_attempts_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL;

-- mock_attempts
ALTER TABLE mock_attempts ALTER COLUMN token_id DROP NOT NULL;
ALTER TABLE mock_attempts DROP CONSTRAINT IF EXISTS mock_attempts_token_id_fkey;
ALTER TABLE mock_attempts
    ADD CONSTRAINT mock_attempts_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL;

-- token_usage_log
ALTER TABLE token_usage_log DROP CONSTRAINT IF EXISTS token_usage_log_token_id_fkey;
ALTER TABLE token_usage_log
    ADD CONSTRAINT token_usage_log_token_id_fkey
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE;
