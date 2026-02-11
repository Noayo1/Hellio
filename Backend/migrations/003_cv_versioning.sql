-- CV Versioning Migration
-- Enables email-based deduplication and CV version history

-- Add unique constraint on candidates.email
-- Note: Run "DELETE duplicates" query before applying if duplicates exist
ALTER TABLE candidates ADD CONSTRAINT candidates_email_unique UNIQUE (email);

-- Add versioning columns to files table
ALTER TABLE files ADD COLUMN version_number INTEGER DEFAULT 1;
ALTER TABLE files ADD COLUMN is_current BOOLEAN DEFAULT true;

-- Update existing files to have version 1 and be current
UPDATE files SET version_number = 1, is_current = true WHERE version_number IS NULL;

-- Index for quick current file lookup
CREATE INDEX idx_files_current ON files(candidate_id, is_current) WHERE is_current = true;

-- Index for version ordering
CREATE INDEX idx_files_version ON files(candidate_id, version_number DESC);
