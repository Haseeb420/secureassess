-- Migration 011: allow null expiry_at on tokens (null = no expiry / unlimited)
ALTER TABLE tokens
  ALTER COLUMN expiry_at DROP NOT NULL;
