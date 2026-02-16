-- LLM usage logging for cost tracking
CREATE TABLE IF NOT EXISTS llm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose VARCHAR(50) NOT NULL,        -- 'explanation', 'extraction', etc.
    entity_type VARCHAR(20),             -- 'candidate', 'position'
    entity_id VARCHAR(50),
    model_id VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for cost queries
CREATE INDEX IF NOT EXISTS idx_llm_logs_created_at ON llm_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_purpose ON llm_logs(purpose);
