/**
 * Schema context for SQL generation.
 * Provides a simplified view of the database schema for the LLM.
 */

export const SCHEMA_CONTEXT = `
DATABASE SCHEMA:

TABLE candidates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  location VARCHAR(255) NOT NULL,
  linkedin VARCHAR(255),
  github VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- Values: 'active', 'inactive', 'hired'
  summary TEXT NOT NULL,
  years_of_experience NUMERIC(4,1),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

TABLE positions (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'open',  -- Values: 'open', 'closed', 'on_hold'
  description TEXT,
  experience_years INTEGER,
  work_type VARCHAR(20),  -- Values: 'remote', 'hybrid', 'onsite'
  salary VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE  -- Shared skill catalog (e.g., 'JavaScript', 'Python', 'Kubernetes')
)

TABLE candidate_skills (
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  skill_id INTEGER REFERENCES skills(id),
  level VARCHAR(20),  -- Values: 'beginner', 'intermediate', 'advanced', 'expert'
  PRIMARY KEY (candidate_id, skill_id)
)

TABLE candidate_positions (
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  position_id VARCHAR(50) REFERENCES positions(id),
  assigned_at TIMESTAMP,
  PRIMARY KEY (candidate_id, position_id)
)

TABLE position_skills (
  position_id VARCHAR(50) REFERENCES positions(id),
  skill_id INTEGER REFERENCES skills(id),
  PRIMARY KEY (position_id, skill_id)
)

TABLE experiences (
  id SERIAL PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  title VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  start_date DATE,
  end_date DATE  -- NULL means current position
)

TABLE education (
  id SERIAL PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  degree VARCHAR(255),
  institution VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20)  -- Values: 'completed', 'in_progress'
)

TABLE certifications (
  id SERIAL PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  name VARCHAR(255),
  year INTEGER
)

TABLE position_requirements (
  id SERIAL PRIMARY KEY,
  position_id VARCHAR(50) REFERENCES positions(id),
  text TEXT,
  required BOOLEAN
)

TABLE languages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE  -- Language names (e.g., 'English', 'Spanish', 'Russian')
)

TABLE candidate_languages (
  candidate_id VARCHAR(50) REFERENCES candidates(id),
  language_id INTEGER REFERENCES languages(id),
  PRIMARY KEY (candidate_id, language_id)
)

RELATIONSHIPS:
- candidates <-> skills: Many-to-many through candidate_skills (with proficiency level)
- candidates <-> positions: Many-to-many through candidate_positions (assignment relationship)
- positions <-> skills: Many-to-many through position_skills (required skills for position)
- candidates <-> languages: Many-to-many through candidate_languages
- candidates have many experiences, education records, and certifications
- positions have many requirements
`.trim();

/**
 * Returns the schema context string for use in prompts.
 */
export function getSchemaContext(): string {
  return SCHEMA_CONTEXT;
}
