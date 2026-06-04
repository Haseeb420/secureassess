-- Junction table: links questions to assessments with per-assessment weightage
CREATE TABLE IF NOT EXISTS assessment_questions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_id TEXT NOT NULL,
  question_id   TEXT NOT NULL,
  weightage     NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (weightage >= 0 AND weightage <= 100),
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, question_id)
);

-- Remove weightage from questions table if it was added in F5
ALTER TABLE questions DROP COLUMN IF EXISTS weightage;
