# Therapy Companion — Backend API

> Robust, privacy-first Node.js & Express REST API for Therapy Companion, powered by Supabase PostgreSQL and pluggable AI Reflection Providers.

Hosted on **Render**: `https://therapy-companion-backend.onrender.com/api/v1`

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Design Patterns](#architecture--design-patterns)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Security & Privacy Standards](#security--privacy-standards)
- [AI Reflection Engine Architecture](#ai-reflection-engine-architecture)
  - [Mock Provider (Development / Testing)](#mock-provider-development--testing)
  - [OpenAI Provider (Production)](#openai-provider-production)
- [Database Schema & Migrations](#database-schema--migrations)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Running the Server](#running-the-server)
- [API Reference & Endpoints](#api-reference--endpoints)
  - [Health Checks](#health-checks)
  - [Authentication](#authentication)
  - [Emotional Check-Ins](#emotional-check-ins)
  - [Guided Reflections](#guided-reflections)
  - [AI Reflection Companion](#ai-reflection-companion)
  - [Exercises & Activity Logs](#exercises--activity-logs)
- [Testing & Quality Verification](#testing--quality-verification)
- [Production Deployment (Render)](#production-deployment-render)

---

## Overview

The Therapy Companion backend provides secure session management, persistent encrypted cloud synchronization for user check-ins and guided reflections, and a non-judgmental AI companion reflection engine.

It is designed with strict mental health privacy guardrails: journal entries are never logged to console, never recorded in activity logs, and never sent to external AI services without affirmative user consent.

---

## Architecture & Design Patterns

The backend follows a layered, modular **Controller-Service-Repository** architecture with TypeScript strict mode:

```
┌────────────────────────────────────────────────────────┐
│                   HTTP Request / Client                │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Middleware Pipeline                  │
│ • Helmet (Security Headers)                            │
│ • CORS (Origins & Native Mobile bypass)                │
│ • Request Logger (Sanitized, no PII/journal content)   │
│ • Auth Middleware (Supabase JWT Verification)          │
│ • Zod Validation (Request Body / Query Schemas)        │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                      Controllers                       │
│ (Handles HTTP req/res, status codes, Zod errors)       │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                        Services                        │
│ • AuthService, CheckinService, ReflectionService       │
│ • ExerciseService, ActivityService                     │
│ • AIReflectionService (Factory Pattern)                │
└─────────────┬────────────────────────────┬─────────────┘
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Supabase PostgreSQL    │  │   AI Provider Factory    │
│  (RLS Enforced via JWT)  │  │  • MockAIReflection       │
│  • Profiles              │  │  • OpenAIReflection       │
│  • Check-ins             │  └──────────────────────────┘
│  • Reflections           │
│  • Activity Logs         │
└──────────────────────────┘
```

---

## Tech Stack

| Domain | Technology | Version | Description |
|---|---|---|---|
| **Runtime** | Node.js | `>=20.0.0` | High-performance JavaScript runtime |
| **Framework** | Express.js | `^4.21.2` | Minimalist web application framework |
| **Language** | TypeScript | `^5.7.3` | Type-safe JavaScript |
| **Database** | Supabase PostgreSQL | `^2.49.1` | Relational database with Row-Level Security |
| **Validation** | Zod | `^3.24.2` | TypeScript-first schema declaration & validation |
| **Security** | Helmet | `^8.0.0` | HTTP security headers middleware |
| **CORS** | CORS | `^2.8.5` | Cross-Origin Resource Sharing |
| **AI Client** | OpenAI Node SDK | `^7.57.0` | Official OpenAI API client |
| **Runner** | tsx | `^4.19.3` | High-speed TypeScript execution |

---

## Project Directory Structure

```
backend/
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql         # Tables, enums, triggers, RLS policies
│       ├── 002_exercise_completion_rpc.sql # Atomic exercise completion RPC
│       └── README.md
├── src/
│   ├── config/
│   │   ├── env.ts                         # Zod-validated environment config
│   │   ├── openai.ts                      # OpenAI client instance
│   │   └── supabase.ts                    # Supabase client instances (anon + admin)
│   ├── controllers/                       # HTTP request handlers
│   │   ├── activity.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── checkin.controller.ts
│   │   ├── exercise.controller.ts
│   │   ├── health.controller.ts
│   │   └── reflection.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts             # Supabase JWT token extraction & verification
│   │   ├── error-handler.ts               # Global standardized error responses
│   │   ├── logger.ts                      # Privacy-safe HTTP request logging
│   │   ├── not-found.ts                   # 404 Route handler
│   │   └── validate.ts                    # Zod request validation middleware
│   ├── routes/                            # Route registrations (/api/v1/*)
│   │   ├── activity.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── checkin.routes.ts
│   │   ├── exercise.routes.ts
│   │   ├── health.routes.ts
│   │   └── reflection.routes.ts
│   ├── scripts/                           # Automated integration & verification test suites
│   │   ├── test-ai-flow.ts
│   │   ├── test-auth-flow.ts
│   │   ├── test-checkin-flow.ts
│   │   ├── test-complete-audit.ts
│   │   ├── test-exercise-flow.ts
│   │   ├── test-reflection-flow.ts
│   │   ├── verify-dist.ts
│   │   └── verify-supabase.ts
│   ├── services/                          # Business logic & database operations
│   │   ├── activity.service.ts
│   │   ├── ai.service.ts
│   │   ├── ai/
│   │   │   ├── ai-provider.factory.ts     # Provider selector based on AI_PROVIDER
│   │   │   ├── ai-provider.interface.ts   # Common provider contract
│   │   │   ├── mock.provider.ts           # Safe, rule-based deterministic provider
│   │   │   └── openai.provider.ts         # Production OpenAI gpt-4o-mini provider
│   │   ├── checkin.service.ts
│   │   └── reflection.service.ts
│   ├── types/
│   │   └── express.d.ts                   # Express Request user augmentation
│   ├── validators/                        # Zod schemas for input validation
│   ├── app.ts                             # Express app setup & route mounting
│   └── server.ts                          # Server listener and graceful shutdown
├── .env.example                           # Sample environment configuration
├── package.json
└── tsconfig.json
```

---

## Security & Privacy Standards

1. **Row-Level Security (RLS)**: Every user table (`check_ins`, `reflections`, `profiles`, `activity_logs`) has PostgreSQL RLS enabled. Users can only query and mutate their own data via their authenticated JWT `auth.uid()`.
2. **Explicit AI Consent (`consentGranted: true`)**: The endpoint `POST /api/v1/ai/reflection` strictly requires explicit consent. Requests with `consentGranted: false` or missing consent are immediately rejected (`400 Bad Request`).
3. **No Journal Leaks in Logs**: Journal answers, emotional notes, and AI response strings are completely omitted from logs and activity audits.
4. **Clinical Boundaries**: AI system prompts explicitly instruct models never to diagnose mental health conditions, never to recommend medications or medical treatments, and never to impersonate a human therapist.
5. **No Service Role Key in Public Endpoints**: All regular endpoints execute user operations within the user's scoped JWT context.

---

## AI Reflection Engine Architecture

The AI module uses a **Provider Design Pattern** configured via the `AI_PROVIDER` environment variable:

```
                  ┌───────────────────────────────┐
                  │      AIProviderFactory        │
                  └───────────────┬───────────────┘
                                  │
                   AI_PROVIDER == 'mock' | 'openai'
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│  MockAIReflectionProvider   │               │  OpenAIReflectionProvider   │
├─────────────────────────────┤               ├─────────────────────────────┤
│ • Deterministic & context-  │               │ • OpenAI GPT-4o-mini        │
│   aware rule-based output   │               │ • Clinical safety prompts   │
│ • No API key required       │               │ • Guarded temperature (0.7) │
│ • Zero latency & $0 cost    │               │ • Word count bounds (~100w) │
└─────────────────────────────┘               └─────────────────────────────┘
```

### Mock Provider (Development / Testing)
- Activated with: `AI_PROVIDER=mock`.
- Requires **no external API key** and incurs **$0 API cost**.
- Analyzes keywords across the three answers (work, sleep, breathing, somatic cues, self-compassion) and selects tailored, empathetic templates.
- Formulates a grounding reflection (80–120 words) with one gentle self-reflection inquiry.

### OpenAI Provider (Production)
- Activated with: `AI_PROVIDER=openai`.
- Requires: `OPENAI_API_KEY`.
- Model: `gpt-4o-mini` (or configured via `OPENAI_MODEL`).
- Enforces strict ethical framing, tone controls, and non-judgmental boundaries.

---

## Database Schema & Migrations

The database runs on Supabase PostgreSQL. Migration files are located in [`database/migrations/`](database/migrations/):

1. **`001_initial_schema.sql`**:
   - `profiles`: User name, primary goals, onboarding state, timestamps.
   - `check_ins`: Mood index (1–5), intensity (1–10), emotion tags array, somatic trigger, optional note.
   - `reflections`: Trigger answer, mind/body sensation answer, needed most answer, optional AI reflection text and generation timestamp.
   - `activity_logs`: Action type (`check_in_created`, `reflection_saved`, `exercise_completed`), metadata (NO journal text).
   - RLS policies ensuring users access only their own records.
2. **`002_exercise_completion_rpc.sql`**:
   - PostgreSQL stored procedure for recording completed breathing/mindfulness exercises atomically with activity logging.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for Express server |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `CLIENT_ORIGIN` | No | `*` | Allowed CORS origins (comma-separated or `*`) |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL (`https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | **Yes** | — | Supabase anon/public API key |
| `AI_PROVIDER` | No | `mock` | `mock` (free local development) or `openai` |
| `OPENAI_API_KEY` | If `openai` | — | Secret key from OpenAI platform |
| `OPENAI_MODEL` | No | `gpt-4o-mini`| Target OpenAI model |

---

## Getting Started

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- A free **Supabase** project (for database and authentication).

### Local Installation
```bash
cd backend
npm install
```

### Running the Server

#### Development Mode (with hot-reload via tsx):
```bash
npm run dev
```

#### Production Build & Start:
```bash
npm run build
npm start
```

The API will be available at `http://localhost:5000/api/v1`.

---

## API Reference & Endpoints

All application routes are prefixed with `/api/v1`.

### Health Checks
- `GET /health` — Check server status, uptime, and environment.
- `GET /health/database` — Verify Supabase PostgreSQL connectivity.

### Authentication
- `POST /auth/register` — Create a new account with email & password.
- `POST /auth/login` — Sign in and receive a Supabase access token (JWT).
- `POST /auth/logout` — Invalidate the session.
- `GET /auth/me` *(Auth Required)* — Retrieve current user profile and session data.

### Emotional Check-Ins
- `GET /check-ins` *(Auth Required)* — List user's check-in history.
- `POST /check-ins` *(Auth Required)* — Create an emotional check-in.
  ```json
  {
    "mood": "calm",
    "intensity": 7,
    "emotions": ["Peaceful", "Grounded"],
    "trigger": "Morning meditation",
    "notes": "Feeling centered today."
  }
  ```
- `GET /check-ins/:id` *(Auth Required)* — Get a specific check-in.
- `DELETE /check-ins/:id` *(Auth Required)* — Delete a check-in.

### Guided Reflections
- `GET /reflections` *(Auth Required)* — List all saved reflections.
- `POST /reflections` *(Auth Required)* — Save a new guided reflection.
  ```json
  {
    "triggerAnswer": "A difficult conversation at work.",
    "thoughtsSensationsAnswer": "Tightness in shoulders and shallow breathing.",
    "neededMostAnswer": "Validation and a moment of quiet."
  }
  ```
- `GET /reflections/:id` *(Auth Required)* — Retrieve reflection by ID.
- `DELETE /reflections/:id` *(Auth Required)* — Delete reflection by ID.
- `POST /reflections/:id/ai-reflection` *(Auth Required)* — Attach an AI reflection directly to an existing saved reflection entry.

### AI Reflection Companion
- `POST /ai/reflection` *(Auth Required)* — Generate an empathetic AI reflection.
  ```json
  {
    "triggerAnswer": "A tense meeting with my manager.",
    "thoughtsSensationsAnswer": "Chest felt tight, heartbeat raced.",
    "neededMostAnswer": "To pause and breathe before answering.",
    "consentGranted": true,
    "tone": "compassionate"
  }
  ```
  **Response:**
  ```json
  {
    "success": true,
    "data": {
      "reflection": "It is completely understandable to feel physical tension like a racing heart when navigating a tense meeting. Recognizing that your body needed a pause to breathe is a profound moment of self-attunement. How might you create space for that breath next time you feel that pressure rising?",
      "provider": "mock",
      "wordCount": 54,
      "tone": "compassionate"
    }
  }
  ```

### Exercises & Activity Logs
- `POST /exercises/complete` *(Auth Required)* — Record completed exercise (e.g. 4-7-8 Breathing).
- `GET /activity-logs` *(Auth Required)* — Paginated activity logs for the user.
- `GET /activity-logs/summary` *(Auth Required)* — Summary counts of check-ins, reflections, and exercises.

---

## Testing & Quality Verification

The repository includes end-to-end integration and flow verification scripts:

```bash
# TypeScript compiler verification
npm run typecheck

# Verify Supabase database schema & RLS tables
npm run db:verify

# Test user registration and authentication flow
npm run test:auth

# Test emotional check-in creation, fetch, and deletion
npm run test:checkins

# Test reflection creation and storage
npm run test:reflections

# Test AI reflection generation (Mock & validation checks)
npm run test:ai

# Test mindfulness exercise completion
npm run test:exercises

# Run complete end-to-end system audit
npm run test:audit
```

---

## Production Deployment (Render)

The backend is deployed as a **Web Service** on Render.

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Environment Variables**: Set all values from `.env.example` in the Render Dashboard:
   - `NODE_ENV=production`
   - `PORT=10000` (or leave default assigned by Render)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `CLIENT_ORIGIN=https://therapycompanion.app`
   - `AI_PROVIDER=mock` (or `openai`)
   - `OPENAI_API_KEY` (if using `openai`)
