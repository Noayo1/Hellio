-- Cache for LLM-generated explanations to avoid regeneration
CREATE TABLE IF NOT EXISTS explanation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id VARCHAR(100) NOT NULL,
    position_id VARCHAR(100) NOT NULL,
    explanation TEXT NOT NULL,
    similarity REAL NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(candidate_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_explanation_cache_candidate ON explanation_cache(candidate_id);
CREATE INDEX IF NOT EXISTS idx_explanation_cache_position ON explanation_cache(position_id);
