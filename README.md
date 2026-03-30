# Hellio HR

LLM-native candidate management system for Hellio HR's team

Four LLM pipelines (document ingestion, SQL-RAG chat, semantic search, autonomous email agent) woven into every layer. Human-in-the-loop by design: the system drafts, suggests, and surfaces. Humans decide.

## Key Features

**Document Ingestion** - Regex + LLM extraction from CVs and job descriptions, deduplication by email, versioned prompt templates, full extraction audit logs.

**SQL-RAG Chat** - Natural language to SQL with query validation, hallucination detection, and transparent query traces showing the generated SQL and results.

**Semantic Search** - AWS Titan V2 1024-dim embeddings with pgvector cosine similarity, experience-aware filtering that prevents junior candidates from matching senior roles.

**Autonomous Agent** - Strands framework agent monitors Gmail via MCP, ingests CV attachments and job postings, matches candidates to positions, drafts templated replies for human approval.

**Notifications** - In-app notification panel with polling, color-coded by type (new candidate, new position, missing info), with direct action links for human review.

**RBAC** - Admin and Viewer roles controlling document upload and position editing vs. read-only access.

**Cost Tracking** - Per-model LLM and embedding token usage with cost dashboard for Titan embeddings and Nova generation.

## Architecture

### System Overview

![System Overview](Diagrams/system-overview.png)

Docker Compose: React frontend, Express backend, PostgreSQL + pgvector, Strands HR agent, Gmail MCP, AWS Bedrock.

### Document Ingestion Pipeline

![Ingestion Pipeline](Diagrams/pipeline-ingestion.png)

Shared pipeline for CVs and job descriptions: parse PDF/DOCX, regex extraction (contacts), LLM structured extraction (Nova), Zod validation with lenient fallbacks, deduplication by email, persist with extraction audit log.

### Embedding Pipeline

![Embedding Pipeline](Diagrams/pipeline-embedding.png)

AWS Titan V2 generates 1024-dim vectors stored in pgvector. Cosine similarity search with experience-aware filtering applies a tolerance window (+2 years) and penalizes experience gaps to prevent mismatches.

### HR Email Agent - Architecture

![Agent Architecture](Diagrams/pipeline-email-agent-architecture.png)

Strands agent with 17 tools: Gmail API (search, read, download, draft), Hellio API (ingest, match, notify), and state tracking (processed emails, error logging).

### HR Email Agent - Flow

![Agent Flow](Diagrams/pipeline-email-agent-flow.png)

Polling loop classifies emails as candidate or position, runs the appropriate workflow (ingest, match, draft reply from templates), and creates notifications for human review. Agent drafts but never sends automatically.

### Chat / RAG Pipeline

![Chat RAG Pipeline](Diagrams/pipeline-chat-rag.png)

Two-step LLM pipeline: (1) generate SQL from natural language with schema context and conversation history, (2) execute validated query and generate natural language answer from results. Safety checks block non-SELECT queries, system table access, and multi-statement injection.

### Database Schema

![Database Schema](Diagrams/database-schema.png)

Relational schema with pgvector embedding columns on candidates and positions. Junction tables for skills, languages, and candidate-position assignments. Extraction logs capture full pipeline audit trail.

### Embedding Space

![Embedding Space](Diagrams/embedding-space.png)

PCA visualization showing natural clustering by skill profile. Blue = candidates, red = positions.

## Application

<!-- Replace these placeholders with actual screenshots -->

| | |
|---|---|
| ![SQL-RAG Chat](Diagrams/placeholder-chat.png) | ![Semantic Search](Diagrams/placeholder-search.png) |
| SQL-RAG Chat | Semantic Search |
| ![Document Import](Diagrams/placeholder-import.png) | ![LLM Cost Tracking](Diagrams/placeholder-costs.png) |
| Document Import | LLM Cost Tracking |
| ![Agent Notifications](Diagrams/placeholder-notifications.png) | |
| Agent Notifications | |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite 7, React Router 7 |
| Backend | Express, TypeScript |
| Database | PostgreSQL 16, pgvector |
| LLM | AWS Nova Lite (generation), AWS Titan V2 (embeddings) |
| Agent | AWS Strands, Gmail MCP |
| Auth | JWT (bcrypt), RBAC (Admin / Viewer) |
| Infrastructure | Docker Compose |
| Testing | Vitest (backend) |

## Prerequisites

### Required: `.env` file

Create a `.env` file in the project root:

```env
# Database
POSTGRES_USER=hellio
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=hellio_hr
DATABASE_URL=postgresql://hellio:your_db_password@localhost:5432/hellio_hr
DATABASE_URL_DOCKER=postgresql://hellio:your_db_password@postgres:5432/hellio_hr

# Backend
JWT_SECRET=your_jwt_secret
PORT=3000
ADMIN_PASSWORD=your_admin_password

# Frontend
VITE_API_URL=http://localhost:5173/api
```

### Required: AWS Bedrock access

Your AWS credentials need access to:

- **Amazon Nova Lite** `amazon.nova-lite-v1:0` (document ingestion, chat, explanations)
- **Amazon Titan Embed V2** `amazon.titan-embed-text-v2:0` (embedding generation)

Mount your AWS credentials via `~/.aws` (Docker Compose mounts this read-only).

### Optional: HR Email Agent

The autonomous agent requires additional setup:

```env
# Add to .env
GMAIL_CANDIDATES=your+candidates@gmail.com
GMAIL_POSITIONS=your+positions@gmail.com
POLL_INTERVAL=30
```

Gmail MCP credentials: place your Gmail OAuth credentials at `~/.gmail-mcp/` (mounted read-only into the agent container).

## Quick Start

```bash
docker compose up -d --build
```

Open http://localhost:5173. Default credentials: `admin@hellio.com` / your `ADMIN_PASSWORD` env value.

## Testing

```bash
docker compose exec backend npm run test
```

## Project Structure

```
Frontend/src/
  api/              API client
  components/       CandidateCard, PositionCard, Modals, ChatWidget, Notifications
  pages/            Dashboard, Candidates, Positions, Upload, Chat, Login
  types/            TypeScript interfaces

Backend/src/
  chat/             SQL-RAG pipeline (generation, validation, execution, answers)
  embeddings/       Titan V2 client, search, explanations, cost tracking
  ingestion/        Document pipeline (parsers, extractors, validators, prompts)
  middleware.ts     JWT auth, role-based access
  index.ts          Express entry point

agent/
  hr_agent.py       Strands agent with system prompt and tool definitions
  tools/            Gmail API and Hellio API tool implementations
  config.py         Agent configuration

Diagrams/           Architecture and pipeline diagrams
```
