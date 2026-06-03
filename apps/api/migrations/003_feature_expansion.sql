-- ============================================================
-- SecureAssess — feature expansion migration
-- Adds: tokens, assessment_attempts, mock_attempts,
--       question_answers, token_usage_log
-- Extends: assessments, questions
-- ============================================================

-- ------------------------------------------------------------
-- tokens
-- Each token grants a candidate access to one real assessment
-- plus optional mock assessments.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  candidate_email  TEXT        NOT NULL,
  candidate_name   TEXT        NOT NULL,
  assessment_id    UUID        NOT NULL REFERENCES assessments(id),
  mock_ids         TEXT[]      NOT NULL DEFAULT '{}',
  expiry_at        TIMESTAMPTZ NOT NULL,
  usage_limit      INTEGER     NOT NULL DEFAULT 1,
  used_count       INTEGER     NOT NULL DEFAULT 0,
  token_value      TEXT        NOT NULL UNIQUE,
  organization_id  TEXT,
  created_by       TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS tokens_token_value    ON tokens (token_value);
CREATE INDEX IF NOT EXISTS tokens_assessment_id  ON tokens (assessment_id);
CREATE INDEX IF NOT EXISTS tokens_candidate      ON tokens (candidate_email);

-- ------------------------------------------------------------
-- assessments — scheduling & mock extensions
-- ------------------------------------------------------------
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS type         TEXT        NOT NULL DEFAULT 'open'
    CHECK (type IN ('open', 'deadline', 'window')),
  ADD COLUMN IF NOT EXISTS deadline_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone     TEXT        NOT NULL DEFAULT 'Asia/Karachi',
  ADD COLUMN IF NOT EXISTS is_mock      BOOLEAN     NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- questions — type, weightage, MCQ options
-- ------------------------------------------------------------
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS type               TEXT          NOT NULL DEFAULT 'coding'
    CHECK (type IN ('coding', 'mcq', 'text')),
  ADD COLUMN IF NOT EXISTS weightage          NUMERIC(5,2)  NOT NULL DEFAULT 0
    CHECK (weightage >= 0 AND weightage <= 100),
  ADD COLUMN IF NOT EXISTS options            JSONB,
  ADD COLUMN IF NOT EXISTS is_manually_scored BOOLEAN       NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- assessment_attempts
-- One row per candidate attempt at a real (non-mock) assessment.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id              TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_id        TEXT         NOT NULL REFERENCES tokens(id),
  assessment_id   TEXT         NOT NULL,
  candidate_email TEXT         NOT NULL,
  candidate_name  TEXT         NOT NULL,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  status          TEXT         NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned', 'timed_out')),
  final_score     NUMERIC(5,2),
  total_time_secs INTEGER,
  attempt_number  INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS attempts_token      ON assessment_attempts (token_id);
CREATE INDEX IF NOT EXISTS attempts_assessment ON assessment_attempts (assessment_id);
CREATE INDEX IF NOT EXISTS attempts_candidate  ON assessment_attempts (candidate_email);
CREATE INDEX IF NOT EXISTS attempts_status     ON assessment_attempts (status);

-- ------------------------------------------------------------
-- mock_attempts
-- One row per mock attempt — unscored, uncounted.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mock_attempts (
  id              TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_id        TEXT         NOT NULL REFERENCES tokens(id),
  mock_id         TEXT         NOT NULL,
  candidate_email TEXT         NOT NULL,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  status          TEXT         NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS mock_attempts_token     ON mock_attempts (token_id);
CREATE INDEX IF NOT EXISTS mock_attempts_mock_id   ON mock_attempts (mock_id);
CREATE INDEX IF NOT EXISTS mock_attempts_candidate ON mock_attempts (candidate_email);

-- ------------------------------------------------------------
-- question_answers
-- One row per question per assessment attempt.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_answers (
  id              TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attempt_id      TEXT          NOT NULL REFERENCES assessment_attempts(id),
  question_id     TEXT          NOT NULL,
  question_type   TEXT          NOT NULL
    CHECK (question_type IN ('coding', 'mcq', 'text')),
  -- candidate input
  answer_text     TEXT,
  selected_option TEXT,
  source_code     TEXT,
  language        TEXT,
  submitted_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  -- scores (populated after evaluation)
  auto_score      NUMERIC(5,2),
  manual_score    NUMERIC(5,2),
  is_correct      BOOLEAN,
  test_results    JSONB,
  weighted_score  NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS answers_attempt  ON question_answers (attempt_id);
CREATE INDEX IF NOT EXISTS answers_question ON question_answers (question_id);

-- ------------------------------------------------------------
-- token_usage_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_usage_log (
  id         TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_id   TEXT         NOT NULL REFERENCES tokens(id),
  used_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS token_usage_token ON token_usage_log (token_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE tokens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_log     ENABLE ROW LEVEL SECURITY;

-- tokens: admin full access; public token_value lookup for validation only
DROP POLICY IF EXISTS tokens_admin_all    ON tokens;
DROP POLICY IF EXISTS tokens_public_lookup ON tokens;

CREATE POLICY tokens_admin_all ON tokens
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY tokens_public_lookup ON tokens
  FOR SELECT
  USING (true);

-- assessment_attempts: admin read; candidate insert/update with matching token
DROP POLICY IF EXISTS attempts_admin_read        ON assessment_attempts;
DROP POLICY IF EXISTS attempts_candidate_write   ON assessment_attempts;
DROP POLICY IF EXISTS attempts_candidate_update  ON assessment_attempts;

CREATE POLICY attempts_admin_read ON assessment_attempts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY attempts_candidate_write ON assessment_attempts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tokens t
      WHERE t.id = token_id
        AND t.candidate_email = candidate_email
        AND t.used_count < t.usage_limit
        AND t.expiry_at > now()
    )
  );

CREATE POLICY attempts_candidate_update ON assessment_attempts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tokens t
      WHERE t.id = token_id
        AND t.candidate_email = candidate_email
    )
  );

-- question_answers: admin read; candidate write during active attempt
DROP POLICY IF EXISTS answers_admin_read        ON question_answers;
DROP POLICY IF EXISTS answers_candidate_write   ON question_answers;
DROP POLICY IF EXISTS answers_candidate_update  ON question_answers;

CREATE POLICY answers_admin_read ON question_answers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY answers_candidate_write ON question_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_attempts a
      WHERE a.id = attempt_id
        AND a.status = 'in_progress'
    )
  );

CREATE POLICY answers_candidate_update ON question_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts a
      WHERE a.id = attempt_id
        AND a.status = 'in_progress'
    )
  );
