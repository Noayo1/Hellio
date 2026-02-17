-- Agent state management tables

-- Track processed emails to avoid reprocessing
CREATE TABLE IF NOT EXISTS agent_processed_emails (
  email_id TEXT PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW(),
  email_type TEXT NOT NULL,
  action_taken TEXT,
  draft_id TEXT,
  candidate_id TEXT,
  position_id TEXT,
  summary TEXT
);

-- Notifications for human review
CREATE TABLE IF NOT EXISTS agent_notifications (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  action_url TEXT,
  status TEXT DEFAULT 'pending',
  related_email_id TEXT,
  candidate_id TEXT,
  position_id TEXT,
  draft_id TEXT,
  metadata JSONB
);

-- Index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_status ON agent_notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON agent_notifications(created_at DESC);
