-- question_submissions: one row per question per session (idempotent via ON CONFLICT)
-- The desktop deduplicates via submission_hash in sync_queue before this is ever written.

CREATE TABLE IF NOT EXISTS question_submissions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id  UUID         NOT NULL,
  language     TEXT         NOT NULL,
  source_code  TEXT         NOT NULL,
  score        DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed_tests INTEGER      NOT NULL DEFAULT 0,
  total_tests  INTEGER      NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT question_submissions_unique_per_session
    UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS question_submissions_session
  ON question_submissions (session_id);
