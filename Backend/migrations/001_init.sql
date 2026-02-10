-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidates table (normalized - no JSONB)
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Positions table (normalized - no JSONB)
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    work_type VARCHAR(100),
    salary VARCHAR(100),
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table (for CVs and other documents)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    content BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Candidate-Position assignments (many-to-many)
CREATE TABLE candidate_positions (
    candidate_id VARCHAR(50) NOT NULL,
    position_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (candidate_id, position_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);

-- Skills table (master list)
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Candidate-Skills junction (many-to-many with level)
CREATE TABLE candidate_skills (
    candidate_id VARCHAR(50) NOT NULL,
    skill_id INTEGER NOT NULL,
    level VARCHAR(20),
    PRIMARY KEY (candidate_id, skill_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Position-Skills junction (many-to-many)
CREATE TABLE position_skills (
    position_id VARCHAR(50) NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (position_id, skill_id),
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Languages table (master list)
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Candidate-Languages junction (many-to-many)
CREATE TABLE candidate_languages (
    candidate_id VARCHAR(50) NOT NULL,
    language_id INTEGER NOT NULL,
    PRIMARY KEY (candidate_id, language_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
);

-- Experiences table (one-to-many from candidates)
CREATE TABLE experiences (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Experience highlights (one-to-many from experiences)
CREATE TABLE experience_highlights (
    id SERIAL PRIMARY KEY,
    experience_id INTEGER NOT NULL,
    highlight TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
);

-- Education table (one-to-many from candidates)
CREATE TABLE education (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Certifications table (one-to-many from candidates)
CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    year INTEGER,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Position requirements table (one-to-many from positions)
CREATE TABLE position_requirements (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    required BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_files_candidate ON files(candidate_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_candidate_positions_candidate ON candidate_positions(candidate_id);
CREATE INDEX idx_candidate_positions_position ON candidate_positions(position_id);
CREATE INDEX idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX idx_candidate_skills_skill ON candidate_skills(skill_id);
CREATE INDEX idx_position_skills_position ON position_skills(position_id);
CREATE INDEX idx_position_skills_skill ON position_skills(skill_id);
CREATE INDEX idx_candidate_languages_candidate ON candidate_languages(candidate_id);
CREATE INDEX idx_experiences_candidate ON experiences(candidate_id);
CREATE INDEX idx_experience_highlights_experience ON experience_highlights(experience_id);
CREATE INDEX idx_education_candidate ON education(candidate_id);
CREATE INDEX idx_certifications_candidate ON certifications(candidate_id);
CREATE INDEX idx_position_requirements_position ON position_requirements(position_id);
