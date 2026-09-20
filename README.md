# ResolveOS

Turn messy engineering problems into structured, evidence-backed resolutions.

ResolveOS is a self-hosted problem-resolution platform for engineering, security, SRE, and operations teams.

It provides a structured workflow for investigating technical problems from the initial problem statement through evidence collection, competing hypotheses, root-cause analysis, solution evaluation, corrective actions, verification, resolution, and retrospective review.

ResolveOS is intentionally designed as a focused, production-oriented, single-node application. It is not intended to be a hyperscale SaaS platform, multi-region distributed control plane, or enterprise identity platform.

---

## Why ResolveOS?

Technical incidents frequently become fragmented across:
- tickets
- chat threads
- logs
- dashboards
- screenshots
- temporary notes
- individual assumptions

ResolveOS keeps the investigation connected in one case model:

```text
Problem
   ↓
Symptoms
   ↓
Evidence
   ↓
Questions
   ↓
Hypotheses
   ↓
Root Cause
   ↓
Solutions
   ↓
Decision
   ↓
Actions
   ↓
Verification
   ↓
Resolution
   ↓
Retrospective
```

The objective is not simply to record that something broke. It is to preserve what was observed, what evidence was considered, what was decided, what was changed, and how the result was verified.

---

## Table of Contents

- [Core Workflow](#core-workflow)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Database and Persistence](#database-and-persistence)
- [Authentication and Authorization](#authentication-and-authorization)
- [Realtime and Offline Operation](#realtime-and-offline-operation)
- [AI Assistance](#ai-assistance)
- [Security](#security)
- [Privacy and Data Handling](#privacy-and-data-handling)
- [Scope and Boundaries](#scope-and-boundaries)
- [Known Engineering Limitations](#known-engineering-limitations)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Operations](#database-operations)
- [Production Deployment](#production-deployment)
- [Testing and Verification](#testing-and-verification)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security Reporting](#security-reporting)
- [License](#license)

---

## Core Workflow

ResolveOS models a problem as a structured investigation rather than a generic ticket.

### 1. Problem Definition
Capture baseline facts such as:
- expected behavior
- observed behavior
- impact
- affected users
- environment
- frequency
- constraints
- relevant timing and context

ResolveOS also includes a problem-statement completeness score to identify missing investigation context.

### 2. Symptoms
Record observable and measurable symptoms before committing to an explanation.

### 3. Evidence
Associate investigation evidence with the case so that reasoning can remain connected to the underlying observations.

### 4. Questions
Record unresolved questions that the investigation needs to answer.

### 5. Hypotheses
Document competing explanations and update them as evidence changes. Where AI is enabled, AI-generated hypotheses remain non-authoritative suggestions.

### 6. Root Cause Analysis
The domain layer supports:
- recursive 5 Whys
- Ishikawa / Fishbone analysis
- cause relationships

### 7. Solution Evaluation
Compare candidate solutions using explicit criteria such as:
- impact
- effort
- risk
- cost
- implementation time

The purpose is to make trade-offs visible rather than leaving them only in informal discussion.

### 8. Decision
Record the selected approach and the reasoning behind it.

### 9. Actions
Track corrective work, ownership, deadlines, and completion.

### 10. Verification
Define what must be true for the change to be considered successful and compare the expected outcome with the observed outcome.

### 11. Resolution
The server-side domain rules enforce a resolution gate. Normal resolution requires the applicable verification condition; an explicitly authorized owner override is handled as a separate controlled path and recorded.

### 12. Retrospective
Capture lessons learned, missed signals, monitoring improvements, and preventive actions.

---

## Key Capabilities

### Investigation
- Structured problem statements
- Problem completeness scoring
- Symptom and impact tracking
- Evidence records
- Investigation questions
- Competing hypotheses
- Root-cause analysis (5 Whys, Fishbone / Ishikawa)
- Weighted solution evaluation
- Decision records
- Corrective actions
- Verification criteria
- Retrospectives

### Collaboration
- Workspace-based organization
- Workspace roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- Realtime case updates
- Unified search / command palette
- Case relationship visualization
- Offline mutation queue
- Conflict reporting

### Data and Auditability
- PostgreSQL persistence
- Transaction support
- JSON/CSV export
- Session tracking
- Tamper-evident audit chaining
- Workspace-scoped access control

### Security
- Password hashing with `crypto.scrypt`
- TOTP-based MFA & Recovery codes
- Session revocation
- Server-side authorization
- IDOR/BOLA regression coverage
- SSRF protections
- Path traversal protections
- Request rate limiting
- Zod input validation
- Short-lived, single-use WebSocket tickets

### Optional AI
- AI can be disabled
- Deterministic/local behavior
- OpenAI-compatible provider support
- Consent-aware processing
- Prompt isolation
- Pattern-based PII/secret redaction
- Evidence citation validation
- Non-authoritative AI output

---

## Architecture

ResolveOS is a TypeScript monorepo with two applications and shared packages.

```text
                         ┌─────────────────────┐
                         │      React SPA       │
                         │      apps/web        │
                         └──────────┬──────────┘
                                    │
                              HTTPS / WSS
                                    │
                         ┌──────────▼──────────┐
                         │      Fastify API     │
                         │      apps/api        │
                         └───────┬──────┬──────┘
                                 │      │
                    ┌────────────┘      └─────────────┐
                    │                                  │
          ┌─────────▼──────────┐             ┌────────▼────────┐
          │ Domain / Validation │             │ Optional AI     │
          │ Security packages   │             │ provider        │
          └─────────┬──────────┘             └────────┬────────┘
                    │                                  │
                    ▼                                  ▼
             ┌───────────────┐                   Redaction +
             │  PostgreSQL   │                   evidence checks
             └───────────────┘
```

### Runtime Model

The current supported deployment model is:

```text
One application instance
        │
        ├── Fastify API
        ├── process-local realtime/auth state
        │
        ▼
   PostgreSQL
        │
        ▼
React frontend
(separate static host / reverse proxy)
```

The single-instance boundary matters because some ephemeral state, including WebSocket ticket state and TOTP replay protection, is process-local.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS |
| **Frontend state/data** | Zustand, TanStack Query |
| **Visualization** | Three.js / WebGL |
| **Backend** | Fastify, TypeScript |
| **Validation** | Zod |
| **Database** | PostgreSQL |
| **Database driver** | `pg` |
| **Authentication** | JWT, sessions, TOTP |
| **Password hashing** | Node.js `crypto.scrypt` |
| **Realtime** | WebSockets |
| **Testing** | Vitest |
| **Containerization** | Docker / Docker Compose |

---

## Repository Structure

```text
resolveos/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── middleware/
│   │       ├── routes/
│   │       ├── services/
│   │       └── scripts/
│   └── web/
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── stores/
│           └── lib/
│
├── packages/
│   ├── shared/
│   ├── domain/
│   ├── validation/
│   ├── security/
│   └── database/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
│
├── docs/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── package-lock.json
```

### Package Responsibilities

| Package | Responsibility |
|---|---|
| `@resolveos/shared` | Shared models, enums, DTOs, and event contracts |
| `@resolveos/domain` | State machine, problem scoring, root-cause logic, solution scoring, merge logic |
| `@resolveos/validation` | Zod validation schemas and input contracts |
| `@resolveos/security` | Password hashing, TOTP, redaction, SSRF/path defenses |
| `@resolveos/database` | Database abstraction, PostgreSQL driver, development store, migrations, query builders |
| `@resolveos/api` | Fastify API, authentication, workspaces, cases, privacy, AI, exports, sync, WebSockets |
| `@resolveos/web` | React UI, application state, API integration, offline behavior, visualization |

---

## Database and Persistence

### PostgreSQL
PostgreSQL is the canonical persistent database for production and self-hosted deployments.

The database layer includes:
- PostgreSQL connection pooling through `pg`
- parameterized SQL generation
- transaction support
- committed schema migrations
- production checks that reject the development memory/JSON store

A production deployment requires a PostgreSQL `DATABASE_URL`.

### Development storage
The repository also contains a local `MemoryStore`. It is useful for:
- unit tests
- development experiments
- synthetic/demo data

It is not a production persistence layer. A local JSON-backed development store must not be treated as equivalent to PostgreSQL.

### Migrations
The database package contains asynchronous migration functionality.

The current API startup does not automatically execute migrations, and the repository does not currently expose a canonical root-level `db:migrate` command.

Therefore, a fresh PostgreSQL deployment must explicitly execute the available migration mechanism before application use.

### Demo seeding
The current `npm run db:seed` command is a development/demo fixture path and targets the local development store. It is not a PostgreSQL production seed operation.

---

## Authentication and Authorization

ResolveOS provides:
- password authentication
- JWT authentication
- server-side session records
- session revocation
- workspace membership
- role-based authorization
- TOTP MFA
- recovery codes

### Roles
The canonical roles are: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.

Authorization is enforced by the server. Frontend role checks are presentation logic and are not a security boundary.

### JWT lifetime
The current API configuration uses a 7-day JWT expiration. Documentation describing a different token lifetime should be treated as stale until it is synchronized with the implementation.

### Browser credential storage
The current frontend stores the bearer credential in browser `localStorage`. This means a successful same-origin XSS compromise could expose the stored token to JavaScript. A deployment should therefore maintain a strong XSS/CSP posture.

An HttpOnly-cookie-based authentication architecture is a potential future hardening direction, but it is not the current frontend implementation.

---

## Realtime and Offline Operation

### WebSockets
The primary realtime authentication flow is:

```text
Authenticated client
       ↓
POST /api/auth/ws-ticket
       ↓
short-lived ticket
       ↓
WebSocket connection
       ↓
ticket consumed once
```

Current characteristics include:
- short-lived tickets
- single-use consumption
- workspace authorization
- automatic ticket expiry
- a 16 KB message-frame limit

The ticket store is process-local and assumes the current single-instance architecture.

### Offline synchronization
The client supports an offline mutation model with:
- local queuing
- ordered replay
- conflict detection
- field-level three-way comparison
- explicit conflict reporting

This is an application-level offline workflow, not a distributed event-processing system.

---

## AI Assistance

AI is an optional assistive component. The core application is intended to remain usable without an external LLM.

### Supported provider model
The AI layer supports:
- deterministic/local behavior
- OpenAI-compatible external providers

External AI processing is controlled through configuration.

### AI processing flow

```text
Case + Evidence
      ↓
Consent check
      ↓
PII / secret redaction
      ↓
Prompt isolation
      ↓
AI provider
      ↓
Structured response
      ↓
Evidence citation validation
      ↓
Non-authoritative suggestion
```

### AI output policy
AI output is intended for suggestions, candidate hypotheses, and investigation prompts. It does not replace human verification or the domain resolution invariant.

### Redaction scope
The repository implements pattern-based redaction for supported categories including:
- email addresses
- phone numbers
- API-key patterns
- JWT-like tokens
- credit-card-like values
- IPv4/IPv6 values
- URL credentials

This is pattern-based sanitization, not universal PII detection. The system should not be represented as guaranteeing detection or removal of every possible secret or sensitive datum.

---

## Security

ResolveOS includes application-layer controls for several common threat classes.

- **Password security**: Passwords are processed using Node.js `crypto.scrypt` with per-password salts and constant-time verification.
- **MFA**: TOTP-based MFA includes replay protection and recovery codes.
- **Authorization and tenant isolation**: Workspace and case operations perform server-side access checks intended to prevent cross-workspace object access.
- **Audit trail**: The application implements a SHA-256 chained audit-event model designed to make unauthorized modification detectable. The appropriate description is tamper-evident, not tamper-proof.
- **SSRF protection**: The security layer validates outbound URL/IP characteristics and performs DNS-aware checks for protected/private address ranges.
- **Path traversal**: Supported path/file operations apply path normalization and traversal protections.
- **Rate limiting**: Fastify rate limiting is enabled and configurable through environment variables.
- **Input validation**: Zod schemas are used at application input boundaries.
- **WebSocket security**: The realtime layer uses authenticated, short-lived tickets and checks workspace authorization before exposing workspace-scoped realtime data.

---

## Privacy and Data Handling

ResolveOS includes privacy-oriented functionality such as:
- explicit consent records
- optional AI processing
- JSON/CSV export
- account anonymization/deactivation
- server-side redaction before optional external AI processing

### Self-hosted responsibility
Self-hosting means the operator controls the surrounding infrastructure. Operators remain responsible for server and reverse-proxy logs, database access, backups, infrastructure monitoring, retention policies, network controls, organizational access policies, and third-party services.

ResolveOS should not be described as automatically compliant with GDPR, CCPA, DPDP, ISO 27001, SOC 2, or another regulatory/assurance framework without a separate assessment.

---

## Scope and Boundaries

### Intended use
ResolveOS is designed for engineering teams, security teams, SRE/operations teams, internal technical investigations, self-hosted deployments, and single-instance production workloads.

### Explicit non-goals
The current project is not intended to provide:
- multi-region active/active clustering
- distributed consensus
- distributed WebSocket coordination
- Kubernetes operators
- enterprise SAML/SSO
- hyperscale SaaS infrastructure
- built-in fleet management for many ResolveOS instances

These are architectural boundaries, not claims that such capabilities are partially implemented.

---

## Known Engineering Limitations

The following are current repository limitations that matter to operators and maintainers.

- **PostgreSQL CI integration**: The current GitHub Actions workflow does not provision a live PostgreSQL service. The repository contains a PostgreSQL implementation and database-related tests, but the CI pipeline should not be interpreted as a complete real-database integration environment.
- **Production migration workflow**: Migration functionality exists, but application startup does not automatically execute migrations and there is no canonical root-level migration command.
- **PostgreSQL seeding**: The current seed command targets the development storage path rather than PostgreSQL.
- **Database projection parity**: The PostgreSQL `select(selectFields)` entry point currently does not forward projection fields into the PostgreSQL select builder, so projected-select behavior is not completely equivalent between database implementations.
- **Browser credential storage**: The current frontend stores bearer credentials in `localStorage`.
- **Documentation synchronization**: Some repository documents are historical or may contain older verification counts/claims. Current implementation and reproducible tests should be treated as the source of technical truth when resolving such differences.
- **Verification scope**: Repository-owned tests and readiness scripts are automated engineering checks. They are not independent penetration tests, external security audits, compliance certifications, or guarantees of zero vulnerabilities.
- **Single-node state assumptions**: The process-local WebSocket ticket and TOTP replay stores are single-node assumptions. Multi-instance deployment requires redesigning or externalizing that coordination state.

---

## Requirements

### Development
- Node.js 20+
- npm
- Git

### Persistent deployment
- PostgreSQL
- valid PostgreSQL `DATABASE_URL`

### Optional
- Docker / Docker Compose
- external AI provider/API

---

## Getting Started

### 1. Clone
```bash
git clone https://github.com/Meet-pandya106/resolveos.git
cd resolveos
```

### 2. Install dependencies
Use the committed lockfile for a reproducible install:
```bash
npm ci
```

### 3. Configure the environment
macOS / Linux:
```bash
cp .env.example .env
```
Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Configure the values required for your development environment. For PostgreSQL-backed development, relevant values include:
```env
NODE_ENV=development
DATABASE_URL=<postgresql-connection-string>
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
```

Never commit real secrets.

### 4. Start development
```bash
npm run dev
```
The development setup uses:
- Fastify API: `http://localhost:4000`
- Vite frontend: `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### 5. Demo data
```bash
npm run db:seed
```
The current command is for local/demo data and does not initialize a production PostgreSQL database.

---

## Configuration

The authoritative environment template is `.env.example`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime mode |
| `PORT` | API listening port |
| `HOST` | API bind address |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Session secret |
| `REFRESH_TOKEN_SECRET` | Refresh-token secret configuration |
| `CORS_ORIGIN` | Allowed frontend origins |
| `SECURE_COOKIES` | Secure-cookie behavior |
| `ENABLE_AI_SERVICE` | Enables optional external AI processing |
| `AI_PROVIDER` | AI provider selection |
| `AI_API_KEY` | External AI credential |
| `AI_API_ENDPOINT` | OpenAI-compatible endpoint |
| `UPLOAD_DIR` | Attachment storage path |
| `MAX_FILE_SIZE_MB` | Upload size limit |
| `RATE_LIMIT_MAX` | Rate-limit maximum |
| `RATE_LIMIT_TIME_WINDOW_MS` | Rate-limit window |

For production:
- use high-entropy secrets
- keep `.env` private
- restrict `CORS_ORIGIN` to trusted origins
- keep PostgreSQL off the public internet
- terminate TLS at a trusted reverse proxy
- configure backups and retention

---

## Database Operations

### Migrations
Migration functionality is provided by the database package. Because application startup does not currently execute migrations automatically, a deployment must explicitly run the repository's migration mechanism before first use. A canonical root-level `db:migrate` command is not currently provided.

### Seeding
The current development/demo command is `npm run db:seed`. It targets the development store and should not be used as a PostgreSQL production initialization mechanism.

---

## Production Deployment

The intended deployment topology is:

```text
                         Internet
                            │
                         HTTPS/WSS
                            │
                  ┌─────────▼─────────┐
                  │ Reverse Proxy     │
                  │ CDN / Nginx /     │
                  │ Cloud service     │
                  └────────┬──────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
           React static files    Fastify API
                                      │
                                      ▼
                                  PostgreSQL
```

### Docker Compose
The repository's current Compose configuration provides `resolveos-api` and `postgres`.

The React frontend should be served separately through a suitable static host, CDN, Nginx configuration, or reverse proxy unless the deployment is customized to serve it from the application container.

Basic startup:
```bash
docker compose up --build -d
```

For a fresh PostgreSQL database, ensure the schema has been migrated before using application features that depend on it.

### Internet-facing deployment checklist
Before exposing ResolveOS publicly:
- use TLS
- set the correct `CORS_ORIGIN`
- generate strong secrets
- keep PostgreSQL private
- configure backups
- configure log retention
- configure monitoring
- verify WebSocket proxying
- review upload limits
- review rate limits
- verify migration state
- verify health/readiness behavior
- run the security test suite

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the detailed deployment runbook.

---

## Testing and Verification

The repository contains unit, integration, security, and end-to-end tests (currently 98 automated tests across 19 suites).

Run the full test suite:
```bash
npm test
```

Targeted suites:
```bash
npm run test:unit
npm run test:integration
npm run test:security
```

Static checks:
```bash
npm run typecheck
npm run lint
```

Production build:
```bash
npm run build
```

Repository readiness checks:
```bash
npm run readiness:check
```

Audit-chain verification:
```bash
npm run audit:verify
```

Pre-publish checks:
```bash
npm run prepublish:check
```

### Interpreting results
A passing repository test suite means the behaviors covered by those tests passed. It does not by itself prove absence of every vulnerability, universal PII detection, security against every possible attack, compliance with a regulatory framework, performance under every workload, or reliability in every infrastructure environment.

Performance, RPO, and RTO numbers documented elsewhere should be treated as operational objectives unless supported by reproducible measurements and recovery exercises.

---

## Documentation

The `docs/` directory contains deeper technical documentation.

| Document | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System and package architecture |
| [`docs/PRODUCTION_AUDIT.md`](./docs/PRODUCTION_AUDIT.md) | Historical baseline audit |
| [`docs/CLAIMS.md`](./docs/CLAIMS.md) | Claims and supporting evidence |
| [`docs/CHANGE_LEDGER.md`](./docs/CHANGE_LEDGER.md) | Remediation and change history |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Database design |
| [`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md) | Backup and restore procedures |
| [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) | Threat model and attack surface |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Security controls and reporting |
| [`docs/AI_SECURITY.md`](./docs/AI_SECURITY.md) | AI-specific security considerations |
| [`docs/DISASTER_RECOVERY.md`](./docs/DISASTER_RECOVERY.md) | Disaster recovery guidance |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Deployment runbook |
| [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) | Operational guidance |
| [`docs/PRIVACY.md`](./docs/PRIVACY.md) | Privacy and data handling |
| [`docs/TESTING.md`](./docs/TESTING.md) | Testing strategy |

Historical audit/review documents should be interpreted as historical records when they describe an older repository state.

---

## Contributing

Contributions should preserve the project's core principles:
- server-side authorization
- explicit domain invariants
- evidence-backed investigation
- testable business logic
- privacy-aware AI boundaries
- parameterized database access
- clear separation between development and production behavior
- technically honest documentation

Before opening a pull request:
```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run readiness:check
```

Do not delete or weaken tests to obtain a green build, introduce unsupported security claims, call mocked functionality fully implemented, describe project-owned tests as independent audits, or broaden the documented product scope without changing the architecture accordingly.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for repository-specific contribution guidance.

---

## Security Reporting

Do not disclose suspected vulnerabilities through public GitHub issues. Use a real monitored security contact or GitHub's private vulnerability-reporting mechanism.

*Important:* the historical `security@resolveos.local` address is a placeholder-style local domain and should not be treated as a functioning public vulnerability-reporting endpoint.

See [`SECURITY.md`](./SECURITY.md) for the repository's security policy.

---

## License

ResolveOS is released under the [MIT License](./LICENSE).

Copyright © 2026 ResolveOS Contributors.

---

## Project Status

ResolveOS is a production-oriented, self-hosted, single-node application.

The project's architectural objective is intentionally focused:

```text
React frontend
      +
Fastify API
      +
PostgreSQL
      +
optional AI
      +
single-instance realtime/auth state
```

The project should be evaluated against its documented architecture and verified behavior, not against distributed enterprise platforms that are outside its intended scope.
