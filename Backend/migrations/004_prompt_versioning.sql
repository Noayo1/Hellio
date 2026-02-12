-- Add prompt version tracking to extraction logs
-- This allows tracking which prompt version was used for each extraction

ALTER TABLE extraction_logs
ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20);

-- Add index for querying by prompt version
CREATE INDEX IF NOT EXISTS idx_extraction_logs_prompt_version ON extraction_logs(prompt_version);
