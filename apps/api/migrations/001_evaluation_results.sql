-- evaluation_results: one row per test case per submission run
-- Populated by the desktop's LocalExecutor via /sync/ingest

CREATE TABLE IF NOT EXISTS evaluation_results (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id   UUID        NOT NULL,
  language      TEXT        NOT NULL,
  test_case_id  UUID        NOT NULL,
  passed        BOOLEAN     NOT NULL DEFAULT false,
  status        TEXT        NOT NULL,   -- accepted | wrong_answer | time_limit_exceeded | runtime_error | compile_error
  stdout        TEXT        NOT NULL DEFAULT '',
  stderr        TEXT        NOT NULL DEFAULT '',
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluation_results_session_question
  ON evaluation_results (session_id, question_id);
