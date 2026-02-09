# Plan: Normalize Database Schema (15 Tables)

## Overview

Split JSONB columns into proper relational tables while maintaining frontend API compatibility.

- **Existing tables:** 5 (users, files, candidates, positions, candidate_positions)
- **New tables:** 10
- **Total:** 15 tables

---

## Complete Schema

### Existing Tables (Modified)

#### 1. `users` (unchanged)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `candidates` (JSONB columns removed)
```sql
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
```
- **Removed:** skills, languages, experience, education, certifications (moved to separate tables)

#### 3. `positions` (JSONB columns removed)
```sql
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    work_type VARCHAR(20) NOT NULL DEFAULT 'hybrid',
    salary VARCHAR(100),
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
- **Removed:** requirements, skills (moved to separate tables)

#### 4. `files` (unchanged)
```sql
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
```

#### 5. `candidate_positions` (unchanged)
```sql
CREATE TABLE candidate_positions (
    candidate_id VARCHAR(50) NOT NULL,
    position_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (candidate_id, position_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);
```

---

### New Tables

#### 6. `skills` (Master)
```sql
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
```
- **PK:** `id` (auto-increment)
- **Constraint:** `name` UNIQUE

#### 7. `candidate_skills` (Junction: candidates ↔ skills)
```sql
CREATE TABLE candidate_skills (
    candidate_id VARCHAR(50) NOT NULL,
    skill_id INTEGER NOT NULL,
    level VARCHAR(20),
    PRIMARY KEY (candidate_id, skill_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);
```
- **PK:** Composite (`candidate_id`, `skill_id`)
- **FK:** `candidate_id` → `candidates.id`
- **FK:** `skill_id` → `skills.id`

#### 8. `position_skills` (Junction: positions ↔ skills)
```sql
CREATE TABLE position_skills (
    position_id VARCHAR(50) NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (position_id, skill_id),
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);
```
- **PK:** Composite (`position_id`, `skill_id`)
- **FK:** `position_id` → `positions.id`
- **FK:** `skill_id` → `skills.id`

#### 9. `languages` (Master)
```sql
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
```
- **PK:** `id` (auto-increment)
- **Constraint:** `name` UNIQUE

#### 10. `candidate_languages` (Junction: candidates ↔ languages)
```sql
CREATE TABLE candidate_languages (
    candidate_id VARCHAR(50) NOT NULL,
    language_id INTEGER NOT NULL,
    PRIMARY KEY (candidate_id, language_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
);
```
- **PK:** Composite (`candidate_id`, `language_id`)
- **FK:** `candidate_id` → `candidates.id`
- **FK:** `language_id` → `languages.id`

#### 11. `experiences` (Child of candidates)
```sql
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
```
- **PK:** `id` (auto-increment)
- **FK:** `candidate_id` → `candidates.id`

#### 12. `experience_highlights` (Child of experiences)
```sql
CREATE TABLE experience_highlights (
    id SERIAL PRIMARY KEY,
    experience_id INTEGER NOT NULL,
    highlight TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
);
```
- **PK:** `id` (auto-increment)
- **FK:** `experience_id` → `experiences.id`

#### 13. `education` (Child of candidates)
```sql
CREATE TABLE education (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);
```
- **PK:** `id` (auto-increment)
- **FK:** `candidate_id` → `candidates.id`

#### 14. `certifications` (Child of candidates)
```sql
CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    year INTEGER,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);
```
- **PK:** `id` (auto-increment)
- **FK:** `candidate_id` → `candidates.id`

#### 15. `position_requirements` (Child of positions)
```sql
CREATE TABLE position_requirements (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    required BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);
```
- **PK:** `id` (auto-increment)
- **FK:** `position_id` → `positions.id`

---

## Relationship Diagram

```
                         ┌─────────────────┐
                         │     users       │
                         └─────────────────┘

┌─────────────┐          ┌─────────────────┐          ┌─────────────┐
│   skills    │◄────────►│ candidate_skills│◄────────►│ candidates  │
└─────────────┘          └─────────────────┘          └──────┬──────┘
      ▲                                                      │
      │                  ┌─────────────────┐                 │
      └─────────────────►│ position_skills │◄───┐            │
                         └─────────────────┘    │            │
                                                │            │
┌─────────────┐          ┌─────────────────┐    │            │
│  languages  │◄────────►│candidate_languag│◄───┼────────────┤
└─────────────┘          └─────────────────┘    │            │
                                                │            │
                         ┌─────────────────┐    │            │
                         │   experiences   │◄───┼────────────┤
                         └────────┬────────┘    │            │
                                  │             │            │
                         ┌────────▼────────┐    │            │
                         │exp_highlights   │    │            │
                         └─────────────────┘    │            │
                                                │            │
                         ┌─────────────────┐    │            │
                         │   education     │◄───┼────────────┤
                         └─────────────────┘    │            │
                                                │            │
                         ┌─────────────────┐    │            │
                         │ certifications  │◄───┼────────────┤
                         └─────────────────┘    │            │
                                                │            │
                         ┌─────────────────┐    │            │
                         │candidate_positio│◄───┼────────────┤
                         └────────┬────────┘    │            │
                                  │             │            │
                                  ▼             │            │
                         ┌─────────────────┐    │            │
                         │   positions     │◄───┘            │
                         └────────┬────────┘                 │
                                  │                          │
                         ┌────────▼────────┐                 │
                         │position_require │                 │
                         └─────────────────┘                 │
                                                             │
                         ┌─────────────────┐                 │
                         │     files       │◄────────────────┘
                         └─────────────────┘
```

---

## Indexes

```sql
-- Performance indexes
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
CREATE INDEX idx_files_candidate ON files(candidate_id);
CREATE INDEX idx_candidate_positions_candidate ON candidate_positions(candidate_id);
CREATE INDEX idx_candidate_positions_position ON candidate_positions(position_id);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `Backend/migrations/001_init.sql` | Rewrite with normalized schema |
| `Backend/src/seed.ts` | Insert into normalized tables |
| `Backend/src/candidates.ts` | JOIN queries, same API response shape |
| `Backend/src/positions.ts` | JOIN queries, same API response shape |
| `Backend/src/__tests__/schema.test.ts` | NEW - Database schema tests |
| `Backend/src/__tests__/candidates.test.ts` | NEW - Candidates API tests |
| `Backend/src/__tests__/positions.test.ts` | NEW - Positions API tests |

---

## Test Definitions (Write BEFORE Implementation)

### 1. Schema Tests (`schema.test.ts`)

```typescript
describe('Database Schema', () => {
  // Table existence tests
  it('should have users table with correct columns')
  it('should have candidates table without JSONB columns')
  it('should have positions table without JSONB columns')
  it('should have files table')
  it('should have candidate_positions table')
  it('should have skills table')
  it('should have candidate_skills table')
  it('should have position_skills table')
  it('should have languages table')
  it('should have candidate_languages table')
  it('should have experiences table')
  it('should have experience_highlights table')
  it('should have education table')
  it('should have certifications table')
  it('should have position_requirements table')

  // Foreign key constraint tests
  it('should cascade delete candidate_skills when candidate is deleted')
  it('should cascade delete candidate_languages when candidate is deleted')
  it('should cascade delete experiences when candidate is deleted')
  it('should cascade delete experience_highlights when experience is deleted')
  it('should cascade delete education when candidate is deleted')
  it('should cascade delete certifications when candidate is deleted')
  it('should cascade delete position_skills when position is deleted')
  it('should cascade delete position_requirements when position is deleted')
  it('should cascade delete files when candidate is deleted')
  it('should cascade delete candidate_positions when candidate is deleted')
  it('should cascade delete candidate_positions when position is deleted')

  // Unique constraint tests
  it('should enforce unique skill names')
  it('should enforce unique language names')
  it('should enforce unique candidate-skill pairs')
  it('should enforce unique position-skill pairs')
  it('should enforce unique candidate-language pairs')
})
```

### 2. Candidates API Tests (`candidates.test.ts`)

```typescript
describe('GET /api/candidates', () => {
  it('should return all candidates')
  it('should return candidates with skills array (name + level)')
  it('should return candidates with languages array')
  it('should return candidates with experience array (with highlights)')
  it('should return candidates with education array')
  it('should return candidates with certifications array')
  it('should return candidates with positionIds array')
  it('should return 401 without auth token')
})

describe('GET /api/candidates/:id', () => {
  it('should return single candidate with all related data')
  it('should return 404 for non-existent candidate')
  it('should return 401 without auth token')
})

describe('Candidate data shape', () => {
  it('should match frontend Candidate interface structure')
  it('skills should have {name, level} objects')
  it('experience should have {title, company, location, startDate, endDate, highlights}')
  it('education should have {degree, institution, startDate, endDate, status}')
  it('certifications should have {name, year}')
})
```

### 3. Positions API Tests (`positions.test.ts`)

```typescript
describe('GET /api/positions', () => {
  it('should return all positions')
  it('should return positions with skills array')
  it('should return positions with requirements array')
  it('should return 401 without auth token')
})

describe('GET /api/positions/:id', () => {
  it('should return single position with all related data')
  it('should return 404 for non-existent position')
  it('should return 401 without auth token')
})

describe('PUT /api/positions/:id', () => {
  it('should update position fields')
  it('should update position skills')
  it('should update position requirements')
  it('should return 403 for viewer role')
  it('should return 401 without auth token')
})

describe('Position data shape', () => {
  it('should match frontend Position interface structure')
  it('requirements should have {text, required} objects')
  it('skills should be string array')
})
```

### 4. Seed Tests (`seed.test.ts`)

```typescript
describe('Database Seeding', () => {
  it('should seed all candidates from JSON')
  it('should seed all positions from JSON')
  it('should seed skills table with unique skills from candidates and positions')
  it('should seed languages table with unique languages')
  it('should create candidate_skills junction records')
  it('should create position_skills junction records')
  it('should create candidate_languages junction records')
  it('should create experience records with highlights')
  it('should create education records')
  it('should create certification records')
  it('should create position_requirements records')
  it('should be idempotent (safe to run multiple times)')
})
```

---

## Implementation Steps

1. **Write tests** - Create test files with all test cases defined above
2. **Update `001_init.sql`** - Replace JSONB schema with normalized tables
3. **Update `seed.ts`** - Insert skills/languages first, then junction tables
4. **Update `candidates.ts`** - Query with JOINs, aggregate into arrays
5. **Update `positions.ts`** - Query with JOINs, aggregate into arrays
6. **Run tests** - Verify all tests pass

---

## Verification

```bash
# Reset database
docker compose down -v && docker compose up -d

# Run migration
npm run migrate

# Seed data
npm run seed

# Test APIs
curl http://localhost:3000/api/candidates | jq
curl http://localhost:3000/api/positions | jq
```
