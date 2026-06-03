-- ============================================================
-- SecureAssess — link assessment_sessions to tokens
-- Run this in the Supabase SQL editor.
-- ============================================================

ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS token_id TEXT REFERENCES tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_token_id ON assessment_sessions (token_id);

COMMENT ON COLUMN assessment_sessions.token_id IS
  'The invitation token used to enter this session. NULL for sessions '
  'created before the token system (M3-era auth flow).';
