-- Extraction logs for debugging and auditing ingestion pipeline
-- No JSONB - use TEXT for JSON strings (consistent with normalized schema)
CREATE TABLE extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE SET NULL,
    source_file_path VARCHAR(500),
    source_type VARCHAR(20) NOT NULL,  -- 'cv' or 'job'
    status VARCHAR(20) NOT NULL,        -- 'pending', 'success', 'failed'

    raw_text TEXT,
    regex_results TEXT,           -- JSON string (email, phone, linkedin, github)
    llm_raw_response TEXT,        -- Raw LLM output for debugging
    llm_parsed_data TEXT,         -- JSON string of parsed LLM response
    validation_errors TEXT,       -- JSON string array of error messages
    error_message TEXT,

    parse_duration_ms INTEGER,
    llm_duration_ms INTEGER,
    total_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for querying failed extractions
CREATE INDEX idx_extraction_logs_status ON extraction_logs(status);
CREATE INDEX idx_extraction_logs_created ON extraction_logs(created_at);

-- Add extraction source tracking to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS extraction_log_id UUID REFERENCES extraction_logs(id);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS extraction_source VARCHAR(20); -- 'manual', 'ingestion', 'seed'
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS years_of_experience NUMERIC(4,1); -- e.g., 5.5 years
