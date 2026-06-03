-- ============================================================
-- SecureAssess — token revocation column
-- Run this in Supabase SQL editor.
-- ============================================================

ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS tokens_is_revoked ON tokens (is_revoked);
