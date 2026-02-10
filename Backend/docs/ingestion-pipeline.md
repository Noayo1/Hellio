# Document Ingestion Pipeline

## Overview

A TDD-built pipeline that extracts structured data from CVs (PDF/DOCX) and job descriptions (.txt) using regex for deterministic fields and AWS Bedrock for complex extraction.

## Architecture

```
[File Input] → [Parse] → [Regex Extract] → [LLM Extract] → [Validate] → [Persist]
                              ↓                 ↓              ↓
                    [extraction_logs table stores all raw outputs for debugging]
```

## Current Status

| Phase | Status | Tests |
|-------|--------|-------|
| Regex Extraction | ✅ Complete | 20 passing |
| Validators | ✅ Complete | 9 passing |
| Parsers | ✅ Complete | 6 passing |
| LLM Extraction | ✅ Complete | 8 passing |
| Pipeline Integration | ✅ Complete | 5 passing |
| API Routes | ✅ Complete | 9 passing |
| **E2E Test with Real CVs** | ✅ Complete | 5/5 CVs processed |

**Total: 57 tests passing**

**E2E Test Results (2024-02-10):**
- 5 CVs processed with Nova Lite
- 5/5 successfully persisted to database
- Extraction logs stored for debugging

## File Structure

```
Backend/src/ingestion/
├── index.ts              # CLI entry point
├── routes.ts             # API endpoints
├── pipeline.ts           # Main orchestrator
├── persistence.ts        # DB inserts
├── parsers/
│   ├── index.ts          # Router for file types
│   ├── pdf.ts            # pdf-parse library
│   ├── docx.ts           # mammoth library
│   └── txt.ts            # fs.readFile
├── extractors/
│   ├── regex.ts          # email, phone, linkedin, github, contactName, contactEmail, jobTitle
│   ├── llm.ts            # prompt templates + response parsing
│   └── bedrock.ts        # AWS Bedrock client (Nova + Claude)
└── validators/
    └── schema.ts         # Zod validation for LLM output

Backend/tests/ingestion/
├── regex.test.ts
├── validators.test.ts
├── parsers.test.ts
├── llm.test.ts
├── pipeline.test.ts
└── routes.test.ts
```

## Database Schema

Migration file: `Backend/migrations/002_ingestion_metadata.sql`

```sql
CREATE TABLE extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE SET NULL,
    source_file_path VARCHAR(500),
    source_type VARCHAR(20) NOT NULL,  -- 'cv' or 'job'
    status VARCHAR(20) NOT NULL,        -- 'pending', 'success', 'failed'
    raw_text TEXT,
    regex_results TEXT,           -- JSON string
    llm_raw_response TEXT,        -- Raw LLM output for debugging
    llm_parsed_data TEXT,         -- JSON string
    validation_errors TEXT,       -- JSON string array
    error_message TEXT,
    parse_duration_ms INTEGER,
    llm_duration_ms INTEGER,
    total_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE candidates ADD COLUMN extraction_log_id UUID REFERENCES extraction_logs(id);
ALTER TABLE candidates ADD COLUMN extraction_source VARCHAR(20);
ALTER TABLE candidates ADD COLUMN years_of_experience NUMERIC(4,1);
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/ingestion/upload?type=cv | Admin | Upload single file |
| POST | /api/ingestion/upload?type=job | Admin | Upload job description |
| GET | /api/ingestion/logs | Auth | List extraction logs |
| GET | /api/ingestion/logs/:id | Auth | Get detailed log |

### Upload Parameters

- `type` (required): `cv` or `job`
- `dryRun` (optional): `true` to skip database persistence

### Example Upload

```bash
curl -X POST "http://localhost:3000/api/ingestion/upload?type=cv&dryRun=true" \
  -H "Authorization: Bearer <token>" \
  -F "file=@cv.pdf"
```

## CLI Usage

```bash
# Dry run - parse + extract, no DB writes
npm run ingest -- --path ./CVsJobs/cvs --type cv --limit 5 --dry-run

# Full ingestion with persistence
npm run ingest -- --path ./CVsJobs/cvs --type cv --limit 5

# Process job descriptions
npm run ingest -- --path ./CVsJobs/jobs --type job
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| --path | -p | Path to file or directory |
| --type | -t | Document type: `cv` or `job` |
| --limit | -l | Max files to process |
| --dry-run | -d | Skip database persistence |

## Configuration

### Environment Variables

Add to `.env`:

```bash
# AWS Bedrock (required for LLM extraction)
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0

# Alternative: Use Claude
# BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

### Docker Compose

AWS credentials are mounted from host:

```yaml
backend:
  volumes:
    - ~/.aws:/root/.aws:ro
```

## When You Get AWS Bedrock Access

### Step 1: Verify AWS Permissions

```bash
# Check if credentials are configured
aws sts get-caller-identity

# List available Bedrock models
aws bedrock list-foundation-models --region us-east-1
```

### Step 2: Test with Single CV (Dry Run)

```bash
docker compose exec backend npm run ingest -- \
  --path ./seed-data/cvs/cv_001.pdf \
  --type cv \
  --dry-run
```

Expected output:
```
=== Document Ingestion Pipeline ===
Path: ./seed-data/cvs/cv_001.pdf
Type: cv
Mode: DRY RUN

Found 1 files

Processing: cv_001.pdf... ✓ Success

=== Summary ===
Total: 1, Success: 1, Failed: 0
```

### Step 3: Test with 5 CVs (Dry Run)

```bash
docker compose exec backend npm run ingest -- \
  --path ./seed-data/cvs \
  --type cv \
  --limit 5 \
  --dry-run
```

### Step 4: Run Full Ingestion

```bash
# Process 5 CVs with database persistence
docker compose exec backend npm run ingest -- \
  --path ./seed-data/cvs \
  --type cv \
  --limit 5
```

### Step 5: Verify in Database

```bash
# Check extraction logs
docker compose exec postgres psql -U admin -d hellio_hr -c \
  "SELECT id, source_file_path, status, error_message FROM extraction_logs ORDER BY created_at DESC LIMIT 5;"

# Check created candidates
docker compose exec postgres psql -U admin -d hellio_hr -c \
  "SELECT id, name, email, extraction_source FROM candidates WHERE extraction_source = 'ingestion' LIMIT 5;"
```

### Step 6: Test API Upload

```bash
# Get admin token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hellio.com","password":"YOUR_PASSWORD"}' | jq -r '.token')

# Upload a CV
curl -X POST "http://localhost:3000/api/ingestion/upload?type=cv&dryRun=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@CVsJobs/cvs/cv_001.pdf"

# Check logs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/ingestion/logs
```

## Troubleshooting

### AWS Credentials Not Found

```
Error: Could not load credentials from any providers
```

**Solution:** Ensure `~/.aws/credentials` exists and docker-compose mounts it.

### SCP Denial Error

```
Error: User is not authorized to perform: bedrock:InvokeModel ... with an explicit deny in a service control policy
```

**Solution:** Contact AWS organization admin to grant Bedrock access.

### Model Not Available in Region

```
Error: Could not resolve the foundation model
```

**Solution:** Try a different region or model ID:
```bash
# Use Claude instead of Nova
export BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

## Regex Patterns

### CV Extraction
```typescript
// Email
/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi

// Israeli phone numbers
/(?:\+?972|0)[-\s]?(?:[23489]|5[0-9])[-\s]?\d{3}[-\s]?\d{4}/g

// LinkedIn
/linkedin\.com\/in\/[\w-]+/gi

// GitHub
/github\.com\/[\w-]+/gi
```

### Job Description Extraction
```typescript
// Contact name (from "From: Name <email>" pattern)
/From:\s*([^<\n]+?)(?:\s*<|$)/i

// Job title (from "Subject:" line, with cleanup)
/Subject:\s*(.+)/i
// Removes prefixes: "Urgent -", "Re:", "Fwd:"
// Removes suffixes: "- Urgent", "Needed", "Required", etc.
```

## LLM Prompts

### CV Extraction
```
Extract structured data from this CV. Return valid JSON only.

{
  "name": "Full name",
  "location": "City/region or null",
  "yearsOfExperience": "Number from profile summary or null",
  "skills": [{"name": "Python", "level": "beginner|intermediate|advanced|expert or null"}],
  "languages": ["Hebrew", "English"],
  "experience": [{"title": "", "company": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null", "highlights": []}],
  "education": [{"degree": "", "institution": "", "startDate": "", "endDate": "", "status": ""}],
  "certifications": [{"name": "", "year": ""}],
  "summary": "2-3 sentence professional bio"
}
```

### Job Description Extraction
```
Extract structured data from this job description. Return valid JSON only.

{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location (optional)",
  "description": "Comprehensive description (5-10 sentences, preserve details)",
  "requirements": [{"text": "", "required": true/false}],
  "skills": ["skill1", "skill2"],
  "experienceYears": "Number (optional)",
  "workType": "remote|onsite|hybrid (optional)",
  "salary": "Salary info (optional)",
  "contactName": "Hiring contact (optional)",
  "contactEmail": "Contact email (optional)"
}
```

## Running Tests

```bash
# All ingestion tests
docker compose exec backend npx vitest run tests/ingestion/

# Single test file
docker compose exec backend npx vitest run tests/ingestion/regex.test.ts

# Watch mode
docker compose exec backend npx vitest watch tests/ingestion/
```
