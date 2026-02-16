-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS embedding_text TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMP;

-- Add embedding columns to positions
ALTER TABLE positions ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS embedding_text TEXT;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMP;

-- Embedding logs for traceability and debugging
CREATE TABLE IF NOT EXISTS embedding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    embedding_text TEXT NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    dimension INTEGER NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW indexes for fast similarity search (cosine distance)
-- Parameters: m=16 (connections per layer), ef_construction=64 (build quality)
CREATE INDEX IF NOT EXISTS idx_candidates_embedding
ON candidates USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_positions_embedding
ON positions USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Index for querying embedding logs by entity
CREATE INDEX IF NOT EXISTS idx_embedding_logs_entity
ON embedding_logs (entity_type, entity_id);
