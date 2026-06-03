-- Add scheduling fields to the assessments table.
-- assessment_type: 'open' | 'deadline' | 'window'
-- deadline_at: ISO timestamp, used when type = 'deadline'
-- window_start / window_end: ISO timestamps, used when type = 'window'
-- timezone: IANA timezone string for display purposes

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS assessment_type TEXT        NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS deadline_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_start    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_end      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone        TEXT        NOT NULL DEFAULT 'Asia/Karachi';
