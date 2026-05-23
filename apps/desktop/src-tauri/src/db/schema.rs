pub const CREATE_SESSIONS: &str = "
  CREATE TABLE IF NOT EXISTS assessment_sessions (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    timer_remaining_secs INTEGER NOT NULL,
    last_saved_at TEXT NOT NULL
  );";

pub const CREATE_SNAPSHOTS: &str = "
  CREATE TABLE IF NOT EXISTS code_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );";

pub const CREATE_EVENTS: &str = "
  CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );";

pub const CREATE_SYNC_QUEUE: &str = "
  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    payload_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    submission_hash TEXT,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  );";
