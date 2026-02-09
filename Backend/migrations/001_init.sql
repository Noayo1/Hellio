-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- 'admin' or 'viewer'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidates table (arrays stored as JSONB)
CREATE TABLE candidates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255) NOT NULL,
    linkedin VARCHAR(255),
    github VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    summary TEXT NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]',
    languages JSONB NOT NULL DEFAULT '[]',
    experience JSONB NOT NULL DEFAULT '[]',
    education JSONB NOT NULL DEFAULT '[]',
    certifications JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table (for CVs and other documents)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    content BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Positions table (arrays stored as JSONB)
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '[]',
    skills JSONB NOT NULL DEFAULT '[]',
    experience_years INTEGER NOT NULL DEFAULT 0,
    work_type VARCHAR(20) NOT NULL DEFAULT 'hybrid',
    salary VARCHAR(100),
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidate-Position assignments (many-to-many)
CREATE TABLE candidate_positions (
    candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
    position_id VARCHAR(50) REFERENCES positions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (candidate_id, position_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_files_candidate ON files(candidate_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_candidate_positions_candidate ON candidate_positions(candidate_id);
CREATE INDEX idx_candidate_positions_position ON candidate_positions(position_id);
