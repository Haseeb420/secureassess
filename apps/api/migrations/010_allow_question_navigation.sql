-- Migration 010: add allow_question_navigation to assessments
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS allow_question_navigation BOOLEAN NOT NULL DEFAULT FALSE;
