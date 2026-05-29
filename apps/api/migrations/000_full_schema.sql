-- ============================================================
-- SecureAssess — full Supabase schema
-- Run this once in the Supabase SQL Editor before any other
-- migrations. Safe to re-run (all statements use IF NOT EXISTS).
-- ============================================================

-- ------------------------------------------------------------
-- assessments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'active',   -- active | archived
  duration_minutes  INTEGER     NOT NULL DEFAULT 60,
  allowed_languages TEXT[]      NOT NULL DEFAULT '{}',
  security_level    TEXT        NOT NULL DEFAULT 'standard',
  question_ids      UUID[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- questions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  type             TEXT        NOT NULL DEFAULT 'coding',     -- coding | multiple_choice
  difficulty       TEXT        NOT NULL DEFAULT 'medium',     -- easy | medium | hard
  time_limit_ms    INTEGER     NOT NULL DEFAULT 5000,
  memory_limit_mb  INTEGER     NOT NULL DEFAULT 256,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- test_cases
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_cases (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input           TEXT    NOT NULL DEFAULT '',
  expected_output TEXT    NOT NULL DEFAULT '',
  is_hidden       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS test_cases_question ON test_cases (question_id);

-- ------------------------------------------------------------
-- assessment_sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID        REFERENCES assessments(id) ON DELETE SET NULL,
  candidate_id        UUID,
  candidate_name      TEXT        NOT NULL DEFAULT '',
  candidate_email     TEXT        NOT NULL DEFAULT '',
  assessment_title    TEXT        NOT NULL DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'active',  -- active | completed | terminated
  final_score         DECIMAL(5,2),
  questions_done      INTEGER     NOT NULL DEFAULT 0,
  total_questions     INTEGER     NOT NULL DEFAULT 0,
  violation_count     INTEGER     NOT NULL DEFAULT 0,
  timer_remaining_secs INTEGER    NOT NULL DEFAULT 0,
  last_saved_at       TIMESTAMPTZ,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_assessment ON assessment_sessions (assessment_id);
CREATE INDEX IF NOT EXISTS sessions_candidate  ON assessment_sessions (candidate_id);
CREATE INDEX IF NOT EXISTS sessions_status     ON assessment_sessions (status);

-- ------------------------------------------------------------
-- code_snapshots
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS code_snapshots (
  id          TEXT        PRIMARY KEY,
  session_id  UUID        NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id UUID        NOT NULL,
  language    TEXT        NOT NULL,
  code        TEXT        NOT NULL DEFAULT '',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshots_session ON code_snapshots (session_id);

-- ------------------------------------------------------------
-- security_events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
  id         TEXT        PRIMARY KEY,
  session_id UUID        NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_session ON security_events (session_id);

-- ------------------------------------------------------------
-- evaluation_results  (migration 001)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluation_results (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id       UUID        NOT NULL,
  language          TEXT        NOT NULL,
  test_case_id      UUID        NOT NULL,
  passed            BOOLEAN     NOT NULL DEFAULT false,
  status            TEXT        NOT NULL,
  stdout            TEXT        NOT NULL DEFAULT '',
  stderr            TEXT        NOT NULL DEFAULT '',
  execution_time_ms INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluation_results_session_question
  ON evaluation_results (session_id, question_id);

-- ------------------------------------------------------------
-- question_submissions  (migration 002)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_submissions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID         NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id     UUID         NOT NULL,
  question_title  TEXT         NOT NULL DEFAULT '',
  language        TEXT         NOT NULL,
  source_code     TEXT         NOT NULL,
  score           DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed_tests    INTEGER      NOT NULL DEFAULT 0,
  total_tests     INTEGER      NOT NULL DEFAULT 0,
  submission_hash TEXT,
  submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT question_submissions_unique_per_session
    UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS question_submissions_session ON question_submissions (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS question_submissions_hash
  ON question_submissions (submission_hash) WHERE submission_hash IS NOT NULL;

-- ------------------------------------------------------------
-- assessment_invites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_invites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID        REFERENCES assessments(id) ON DELETE CASCADE,
  candidate_email TEXT        NOT NULL,
  token           TEXT        NOT NULL UNIQUE,
  expires_at      BIGINT      NOT NULL,   -- unix timestamp
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_token ON assessment_invites (token);
