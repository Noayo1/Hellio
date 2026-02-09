# Exercise 2: Backend & Database Integration Plan

## Summary
Add a simple Node.js/Express backend with PostgreSQL to replace static JSON imports. Test-first approach: write tests before implementation.

## Technology Stack
- **Backend:** Node.js + Express (TypeScript)
- **Database:** PostgreSQL 16 + `pg` package (raw SQL)
- **Auth:** JWT tokens (single admin role)
- **CV Storage:** PostgreSQL BLOB
- **Testing:** Vitest + Supertest
- **Containerization:** Docker Compose (frontend + backend + database)

---

## Database Schema (SQL)

```sql
-- migrations/001_init.sql

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
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
    file_type VARCHAR(50) NOT NULL,  -- 'cv', 'cover_letter', etc.
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

-- Index for faster file lookups
CREATE INDEX idx_files_candidate ON files(candidate_id);
CREATE INDEX idx_files_type ON files(file_type);
```

---

## REST API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List all candidates |
| GET | `/api/candidates/:id` | Get one candidate |
| POST | `/api/candidates/:id/positions/:posId` | Assign to position |
| DELETE | `/api/candidates/:id/positions/:posId` | Unassign from position |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates/:id/files` | List candidate files |
| GET | `/api/files/:fileId` | Download file |
| POST | `/api/candidates/:id/files` | Upload file |

### Positions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/positions` | List all positions |
| GET | `/api/positions/:id` | Get one position |
| PUT | `/api/positions/:id` | Update position |

---

## Backend Structure

```
Backend/
├── src/
│   ├── index.ts              # Entry + Express setup
│   ├── db.ts                 # PostgreSQL connection pool
│   ├── auth.ts               # Auth routes
│   ├── candidates.ts         # Candidates routes
│   ├── positions.ts          # Positions routes
│   ├── files.ts              # Files routes
│   ├── middleware.ts         # Auth middleware
│   └── seed.ts               # Seed script
├── migrations/
│   └── 001_init.sql          # Schema
├── tests/
│   ├── setup.ts              # Test setup
│   ├── auth.test.ts
│   ├── candidates.test.ts
│   ├── positions.test.ts
│   └── files.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── Dockerfile
```

---

## Environment Variables

All secrets stored in `.env` file (not in code):

```bash
# Database
POSTGRES_USER=hellio
POSTGRES_PASSWORD=<your-password>
POSTGRES_DB=hellio_hr
DATABASE_URL=postgresql://hellio:<your-password>@localhost:5432/hellio_hr
DATABASE_URL_DOCKER=postgresql://hellio:<your-password>@postgres:5432/hellio_hr

# Backend
JWT_SECRET=<your-jwt-secret>
PORT=3000
ADMIN_PASSWORD=<your-admin-password>
TEST_PASSWORD=<your-test-password>

# Frontend
VITE_API_URL=http://localhost:3000/api
```

---

## Docker Compose (Full Stack)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: hellio-db
    env_file: .env
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend-network

  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    container_name: hellio-backend
    env_file: .env
    environment:
      DATABASE_URL: ${DATABASE_URL_DOCKER}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - backend-network
      - frontend-network

  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile
    container_name: hellio-frontend
    env_file: .env
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - frontend-network

volumes:
  postgres_data:

networks:
  backend-network:
    driver: bridge
  frontend-network:
    driver: bridge
```

---

## Implementation Order (Test-First)

### Step 1: Backend Project Setup ✅
1. Create Backend/ folder structure
2. Initialize package.json with dependencies
3. Create tsconfig.json and vitest.config.ts
4. Create migrations/001_init.sql
5. Create docker-compose.yml
6. Create Backend/Dockerfile and Frontend/Dockerfile
7. Create src/db.ts with connection pool
8. Create basic src/index.ts
9. **Verify:** `docker-compose up` starts all services

### Step 2: Authentication (Test-First) ✅
1. Write tests first (tests/auth.test.ts)
2. Create src/middleware.ts (auth middleware)
3. Create src/auth.ts (login route)
4. Seed admin user in src/seed.ts
5. **Run tests:** All pass

### Step 3: Candidates API (Test-First) ✅
1. Write tests first (tests/candidates.test.ts)
2. Create src/candidates.ts routes
3. Add candidate seeding to src/seed.ts
4. **Run tests:** All pass

### Step 4: Positions API (Test-First) ✅
1. Write tests first (tests/positions.test.ts)
2. Create src/positions.ts routes
3. Add position seeding to src/seed.ts
4. **Run tests:** All pass

### Step 5: Candidate-Position Assignment (Test-First) ✅
1. Write tests first
2. Add assignment routes to src/candidates.ts
3. **Run tests:** All pass

### Step 6: Files API (Test-First) ✅
1. Write tests first (tests/files.test.ts)
2. Create src/files.ts routes
3. Update seed.ts to load CVs into files table
4. **Run tests:** All pass

### Step 7: Frontend Auth Integration ✅
1. Create src/api/client.ts (fetch wrapper with JWT)
2. Create src/contexts/AuthContext.tsx
3. Create src/pages/LoginPage.tsx
4. Update App.tsx with auth routing
5. Update Layout.tsx with logout button

### Step 8: Frontend API Integration ✅
1. Update CandidatesPage.tsx to fetch from API
2. Update PositionsPage.tsx to fetch from API
3. Add loading/error states
4. Update CandidateModal for position assignment via API
5. Update PositionModal with edit form

---

## Verification Checklist

1. `docker-compose up` - All 3 services start
2. Run backend tests: `npm test` - All pass (30 tests)
3. Open http://localhost:5173
4. Login with admin@hellio.com and ADMIN_PASSWORD from .env
5. Candidates page loads correctly
6. Positions page loads correctly
7. Assign a candidate to a position
8. Edit a position
9. Download a CV

---

## Default User

| Email | Password |
|-------|----------|
| admin@hellio.com | (set via ADMIN_PASSWORD in .env) |

---

## Key Files

**Backend:**
- `Backend/migrations/001_init.sql` - Database schema
- `Backend/src/index.ts` - Main server
- `Backend/src/db.ts` - PostgreSQL connection
- `Backend/src/auth.ts` - Auth routes
- `Backend/src/candidates.ts` - Candidates routes
- `Backend/src/positions.ts` - Positions routes
- `Backend/src/files.ts` - Files routes
- `Backend/src/middleware.ts` - Auth middleware
- `Backend/src/seed.ts` - Data seeding
- `Backend/tests/*.test.ts` - Tests

**Frontend:**
- `Frontend/src/App.tsx` - Auth routing
- `Frontend/src/api/client.ts` - API client
- `Frontend/src/contexts/AuthContext.tsx` - Auth context
- `Frontend/src/pages/LoginPage.tsx` - Login page
- `Frontend/src/pages/CandidatesPage.tsx` - API integration
- `Frontend/src/pages/PositionsPage.tsx` - API integration + edit

**Docker:**
- `docker-compose.yml` - Full stack setup with networks
- `Backend/Dockerfile`
- `Frontend/Dockerfile`
- `.env.example` - Environment variables template
