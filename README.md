# ResolveOS

Turn messy engineering problems into structured, evidence-backed resolution work.

ResolveOS is a self-hosted problem-resolution and incident-management application for engineering, security, and operations teams. It organizes an investigation from the initial problem statement through evidence collection, competing hypotheses, root-cause analysis, solution selection, actions, verification, resolution, and retrospective.

The project is designed as a production-oriented, single-node deployment backed by PostgreSQL. It is not intended to be a hyperscale SaaS platform, multi-region distributed system, or enterprise SSO product.

---

## Table of Contents

- [What ResolveOS Does](#what-resolveos-does)
- [Core Workflow](#core-workflow)
- [Who It Is For](#who-it-is-for)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Security Model](#security-model)
- [AI Processing](#ai-processing)
- [Privacy and Data Handling](#privacy-and-data-handling)
- [Offline and Real-Time Behavior](#offline-and-real-time-behavior)
- [Requirements](#requirements)
- [Local Development](#local-development)
- [Database Configuration](#database-configuration)
- [Demo Data](#demo-data)
- [Production Deployment Model](#production-deployment-model)
- [Docker](#docker)
- [Testing and Verification](#testing-and-verification)
- [Configuration Reference](#configuration-reference)
- [Architectural Boundaries](#architectural-boundaries)
- [Known Limitations and Release Notes](#known-limitations-and-release-notes)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security Reporting](#security-reporting)
- [License](#license)

---

## What ResolveOS Does

Most engineering incidents are not difficult because teams lack a ticketing system. They are difficult because the diagnostic context becomes fragmented.

A typical investigation may involve:
- an incident ticket;
- logs and monitoring screenshots;
- chat messages and hypotheses;
- measurements taken at different times;
- competing proposed fixes;
- decisions whose rationale is lost later; and
- a resolution that is declared without a reproducible verification record.

ResolveOS puts those artifacts into one case and gives the case an explicit lifecycle.

The application is centered on the idea that a problem should move from observation $\to$ evidence $\to$ reasoning $\to$ decision $\to$ action $\to$ verification, rather than jumping directly from symptom to fix.

---

## Core Workflow

A ResolveOS case is organized around the following workflow:

```text
Problem Definition
        ↓
Symptom Quantification
        ↓
Evidence Collection / Corroboration
        ↓
Questions & Inquiry
        ↓
Competing Hypotheses
        ↓
Root Cause Analysis
  ├── 5 Whys
  └── Fishbone / Ishikawa
        ↓
Solution Evaluation
        ↓
Decision Record
        ↓
Action Plan
        ↓
Verification
        ↓
Resolution
        ↓
Post-Incident Retrospective
```

The application also enforces a case state machine. In particular, a case cannot normally enter `RESOLVED` without a passed verification condition; an owner-level override path exists where the documented rules permit it.

---

## Who It Is For

ResolveOS is aimed at teams that need structured technical investigations rather than a generic issue list.

### Engineering and SRE
Use cases include:
- production incidents;
- latency and reliability investigations;
- recurring failures;
- dependency and infrastructure problems;
- engineering regressions; and
- post-incident reviews.

### Security and Operations
Relevant use cases include:
- security incident investigation;
- evidence tracking;
- auditability of investigative changes;
- sensitive-data handling before optional external AI processing; and
- controlled workspace access.

### Engineering Leads and Architects
The workflow can also preserve:
- competing hypotheses;
- root-cause reasoning;
- solution trade-offs;
- decision context; and
- follow-up actions.

ResolveOS does not replace specialized monitoring, SIEM, APM, ticketing, or observability products. It is the structured investigation and resolution layer around the information those systems produce.

---

## Key Capabilities

### Structured problem definition
- Problem Statement Quality Meter with a 0–100 completeness score.
- Expected vs observed behavior capture.
- Impact, affected users, environment, frequency, severity, and constraints.

### Evidence management
- Evidence records associated with a case.
- Evidence confidence/status metadata.
- Attachments and supporting artifacts where enabled.
- Relationship tracking between evidence and investigative entities.

### Hypothesis and root-cause analysis
- Competing hypothesis states such as `UNTESTED`, `SUPPORTED`, `WEAKENED`, `REJECTED`, and `CONFIRMED`.
- Recursive 5 Whys analysis.
- Fishbone / Ishikawa categories.

### Solution evaluation
- Multi-criteria solution scoring.
- Cost, effort, risk, impact, and time-to-implement inputs.
- Explicit solution selection and decision records.

### Verification and lifecycle enforcement
- Expected vs observed verification results.
- Verification status used by the domain state machine.
- Restricted transition to `RESOLVED` unless the verification invariant is satisfied or an authorized override path is used.

### Decision and action management
- Decision records with context, reasoning, assumptions, and revision information.
- Action tracking with ownership, priority, status, and deadlines.
- Kanban-style action workflows in the web application.

### Search and visualization
- Global search / command palette.
- Interactive Three.js case relationship visualization.

### Offline-capable operation
- Client-side mutation queue for network interruptions.
- Field-level 3-way conflict detection.
- Explicit conflict reporting during synchronization.

### Real-time collaboration
- WebSocket-based case updates.
- Workspace authorization on realtime subscriptions.
- Short-lived single-use WebSocket tickets in the normal production authentication flow.

---

## Architecture

ResolveOS is a monorepo containing a React web application, Fastify API, reusable TypeScript packages, and automated tests.

```text
                           ResolveOS
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          React Web App                 Fastify API
          apps/web                      apps/api
                 │                           │
                 │                    ┌──────┼─────────────┐
                 │                    │      │             │
                 │                 Auth/RBAC AI        WebSockets
                 │                    │      │             │
                 └───────────────┬────┴──────┴─────────────┘
                                 │
                       Domain / Validation / Security
                                 │
                                 ▼
                          PostgreSQL Database
```

### Package responsibilities

| Package / App | Responsibility |
|---|---|
| `packages/shared` | Shared domain types, enums, DTOs, and event contracts |
| `packages/domain` | Business rules, state transitions, problem scoring, 5 Whys, solution evaluation, conflict logic |
| `packages/validation` | Zod-based request, mutation, and export validation |
| `packages/security` | Password hashing, TOTP primitives, redaction rules, SSRF checks, path sanitization |
| `packages/database` | Database abstraction, PostgreSQL driver, in-memory test/dev driver, migrations, query execution |
| `apps/api` | Fastify HTTP API, authentication, authorization, cases, privacy, search, AI, sync, audit, WebSockets |
| `apps/web` | React SPA, routing, state, API/query integration, case UI, Three.js visualization |
| `tests` | Unit, integration, security, and lifecycle/E2E coverage |

---

## Repository Structure

```text
resolveos/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   └── package.json
│   └── web/
│       ├── src/
│       └── package.json
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
├── .github/workflows/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## Technology Stack

### Frontend
- React 18
- Vite
- TypeScript
- React Router
- Zustand
- TanStack Query
- Tailwind CSS
- Three.js / WebGL
- Zod

### Backend
- Node.js 20+
- Fastify 5
- `@fastify/cookie`
- `@fastify/cors`
- `@fastify/helmet`
- `@fastify/jwt`
- `@fastify/rate-limit`
- `@fastify/websocket`
- PostgreSQL driver (`pg`)
- Zod

### Database
- PostgreSQL for persistent production/self-hosted deployments.
- In-memory / file-backed memory storage is retained for development and unit-test scenarios.

### Testing and Tooling
- Vitest
- TypeScript compiler
- Biome
- Docker / Docker Compose

The repository is versioned as `1.0.0` in the current package metadata.

---

## Security Model

ResolveOS uses multiple security controls at application and domain boundaries.

### Authentication
- Password hashing uses Node.js `crypto.scrypt` with per-password random salts.
- JWT authentication is combined with server-side session lookup/revocation behavior.
- TOTP-based MFA follows RFC 6238 and includes replay protection and recovery codes.
- Device/session management supports revocation.

### Authorization and tenant isolation
- Workspace membership and role checks are enforced server-side (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`). Case and nested case resources are expected to verify workspace access before reading or mutating data.
- The client UI is not treated as a security boundary.

### WebSocket security
- The normal production flow uses short-lived, single-use WebSocket tickets. The ticket store is process-local and therefore assumes a single application instance for consistent ticket/replay behavior.

### SSRF protection
- The security package contains checks for private/loopback address ranges, link-local addresses, IPv6 ULA ranges, cloud metadata addresses, and DNS-resolution-based checks.
- These controls are defensive application logic; they should not be described as a universal guarantee against every possible SSRF technique in every deployment environment.

### Path sanitization
- Attachment/path handling includes decoding, control-character stripping, separator normalization, and traversal-oriented sanitization.

### Audit trail
- The application maintains a cryptographically chained audit/event structure intended to be tamper-evident. This should not be interpreted as immutable storage or an independently certified forensic chain of custody.

### Rate limiting and HTTP hardening
Fastify plugins are used for:
- security headers;
- CORS restrictions;
- request rate limits; and
- authenticated cookies/JWT handling.

---

## AI Processing

AI is optional and is not required for the core ResolveOS workflow.

The environment template defaults AI processing to disabled.

The architecture supports a provider abstraction with a deterministic/offline mode and optional OpenAI-compatible external providers.

The intended flow is:

```text
User / Case Data
      ↓
Server-side redaction
      ↓
Prompt construction / isolation
      ↓
AI provider (optional)
      ↓
Structured response validation
      ↓
Evidence/citation validation where applicable
      ↓
Human review
```

AI output must be treated as assistive and non-authoritative. A model suggestion does not establish that a root cause is true, and AI output must not bypass the case verification invariant.

### Redaction scope
- ResolveOS includes pattern-based detection for supported PII/secret classes such as email addresses, credentials/tokens, phone numbers, credit-card-like values, JWTs, IPv4/IPv6 addresses, and URL credentials.
- This is pattern-based sanitization, not a claim of perfect or universal PII detection.
- External AI processing is optional and can be disabled completely.

---

## Privacy and Data Handling

ResolveOS is designed to avoid unnecessary product telemetry and does not require marketing analytics to operate.

The repository includes functionality for:
- consent records;
- workspace data export;
- optional AI processing controls;
- account anonymization/deactivation flows; and
- revocation of active sessions.

### Important distinction
Privacy controls in the application do not automatically make a deployment compliant with a particular law or regulation.

Self-hosted operators remain responsible for:
- infrastructure;
- backups;
- database access;
- server logs;
- reverse proxies;
- monitoring;
- retention policies; and
- legal/regulatory obligations applicable to their environment.

ResolveOS should not be described as independently certified for GDPR, CCPA, DPDP, ISO 27001, ISO 27037, FRE 902, or any other compliance framework unless separate evidence for that claim exists.

---

## Offline and Real-Time Behavior

### Offline queue
The web client can queue mutations while network access is unavailable.

### 3-way merge
When local and remote versions diverge, ResolveOS uses field-level comparison against a base version and reports conflicts rather than silently assuming that every concurrent edit can be merged safely.

### Real-time updates
WebSockets are used for live case updates between collaborators. Workspace authorization is performed before a client is registered for workspace-specific realtime traffic.

Because the ticket/replay state is process-local, the documented architecture assumes a single API instance.

---

## Requirements

For local development:
- Node.js 20+
- npm 9+
- PostgreSQL 14+ when using persistent/PostgreSQL-backed operation
- Docker and Docker Compose are optional

The root `package.json` currently exposes the following primary commands:

```bash
npm run dev
npm run dev:api
npm run dev:web
npm run build
npm test
npm run test:unit
npm run test:integration
npm run test:security
npm run lint
npm run typecheck
npm run db:seed
npm run audit:verify
npm run readiness:check
npm run prepublish:check
```

---

## Local Development

### 1. Clone the repository
```bash
git clone https://github.com/Meet-pandya106/resolveos.git
cd resolveos
```

### 2. Create local environment configuration
```bash
cp .env.example .env
```

Edit `.env` before starting the API.

At minimum, review:
```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgres://resolveos_user:your_password@localhost:5432/resolveos
JWT_SECRET=replace_with_a_secure_random_value
SESSION_SECRET=replace_with_a_secure_random_value
REFRESH_TOKEN_SECRET=replace_with_a_secure_random_value
CORS_ORIGIN=http://localhost:5173,http://localhost:4000
ENABLE_AI_SERVICE=false
AI_PROVIDER=disabled
```

Use unique random secrets rather than the examples above.

### 3. Install dependencies
```bash
npm install
```

### 4. Build packages
```bash
npm run build
```

### 5. Start the development environment
```bash
npm run dev
```

This starts the Fastify API and Vite web application concurrently.
- Web application: `http://localhost:5173`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- API readiness: `http://localhost:4000/readiness`

---

## Database Configuration

### PostgreSQL for persistent deployments
Set:
```env
DATABASE_URL=postgres://resolveos_user:your_password@localhost:5432/resolveos
```
In production, ResolveOS requires a PostgreSQL URL and rejects the in-memory/JSON fallback.

### Docker PostgreSQL
The Compose file provides a PostgreSQL 16 Alpine service:
```bash
docker compose up -d postgres
```
Then configure the API to use the corresponding PostgreSQL connection string.

### Migrations
The database package contains a PostgreSQL migration path and an internal migration bookkeeping table.

For production deployment, treat schema migration as an explicit deployment concern and verify the database connectivity before starting application traffic.

---

## Demo Data

The repository includes a synthetic local demo seed containing a demo user, workspace, and example incident data.

The documented demo login is:
- **Email:** `demo@resolveos.local`
- **Password:** `ResolveOS#Demo2026!`

Use these credentials only for local exploration. Never use them for a public or production deployment.

### Current implementation note
The current `db:seed` script is a demo-data generator and invokes the database initializer with a local file path. That path selects the in-memory/file-backed development store rather than the PostgreSQL production driver.

Therefore:
- do not treat `npm run db:seed` as a PostgreSQL production seeding procedure;
- do not assume it has initialized your production PostgreSQL database; and
- if production demo seeding is ever required, create a dedicated PostgreSQL-safe seed/migration workflow and test it against a real PostgreSQL instance.

---

## Production Deployment Model

ResolveOS is designed for a single-node self-hosted deployment.

A typical production topology is:

```text
                    Internet
                       │
                 HTTPS / WSS
                       │
              Reverse Proxy / CDN
                 │             │
                 │             └── Static React SPA
                 │
                 └── /api + /ws
                       │
                 Fastify API
                       │
                  PostgreSQL
```

A reverse proxy can terminate TLS and route:
- `/api/*` $\to$ Fastify API
- `/ws` $\to$ Fastify WebSocket endpoint
- `/` $\to$ static React application

### Production responsibilities
Before exposing ResolveOS to the public internet, the operator must configure and verify:
- strong unique secrets;
- HTTPS/WSS;
- restrictive `CORS_ORIGIN`;
- secure cookies;
- PostgreSQL backups;
- firewall/network rules;
- log and retention policy;
- attachment storage permissions;
- database credentials;
- monitoring and alerting; and
- an operational vulnerability reporting channel.

---

## Docker

The repository includes a multi-stage Dockerfile and a Docker Compose configuration containing:
- `resolveos-api`
- `postgres`

The API container runs as the non-root `node` user and exposes port 4000.

Example:
```bash
cp .env.example .env
# Edit .env with strong secrets and PostgreSQL settings.
docker compose up --build -d
```

### Important Docker scope
The current Compose file provisions the API and PostgreSQL services. The production deployment guide separately describes hosting the React build behind a CDN, Nginx, Cloudflare Pages, Vercel, or another static web host.

Although the Dockerfile copies `apps/web/dist` into the image, the current container entrypoint starts the Fastify API and does not itself act as the production static-file server for the React application.

Therefore, do not document the current Compose setup as a complete browser-facing frontend + API stack unless the frontend-serving path is explicitly implemented and verified.

---

## Testing and Verification

The repository currently reports:
- **98 automated tests across 19 suites**

Run the suite yourself from the checkout you intend to release:
```bash
npm test
```

Additional commands:
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Security regression suites
npm run test:security

# Type checking
npm run typecheck

# Lint / static analysis
npm run lint

# Build all packages and applications
npm run build

# Verify the audit chain
npm run audit:verify

# Run the repository's production-readiness checks
npm run readiness:check

# Run prepublish/security hygiene checks
npm run prepublish:check
```

### What the current test suites cover
The repository includes automated coverage for areas including:
- domain and lifecycle behavior;
- verification invariants;
- authentication and TOTP;
- workspace isolation / IDOR regression;
- SSRF defenses;
- path sanitization;
- audit integrity behavior;
- WebSocket security;
- synchronization/concurrency logic;
- backup/restore behavior; and
- end-to-end resolution flows.

### Important verification limitation
A passing readiness script means the repository's scripted checks passed. It is not equivalent to:
- an external penetration test;
- an independent security audit;
- a compliance certification;
- a load test demonstrating arbitrary scale; or
- a guarantee that the software is suitable for every production environment.

The verification claims should always be interpreted within the documented single-node architecture and the exact test environment used.

---

## Configuration Reference

The canonical environment template is `.env.example`.

Important variables include:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) |
| `PORT` | Fastify HTTP port |
| `HOST` | Bind address |
| `DATABASE_URL` | PostgreSQL connection string for persistent operation |
| `JWT_SECRET` | JWT signing secret; production requires a strong secret |
| `SESSION_SECRET` | Cookie/session secret; production requires a strong secret |
| `REFRESH_TOKEN_SECRET` | Refresh-token secret |
| `CORS_ORIGIN` | Allowed browser origins |
| `SECURE_COOKIES` | Cookie security mode |
| `ENABLE_AI_SERVICE` | Enables optional external/dedicated AI integration |
| `AI_PROVIDER` | AI provider selection |
| `AI_API_KEY` | External AI credential when enabled |
| `AI_API_ENDPOINT` | OpenAI-compatible API endpoint when configured |
| `UPLOAD_DIR` | Attachment storage directory |
| `MAX_FILE_SIZE_MB` | Upload size limit |
| `RATE_LIMIT_MAX` | Rate-limit request count |
| `RATE_LIMIT_TIME_WINDOW_MS` | Rate-limit interval |

Never commit production credentials to Git.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl + K** | Open command palette / unified search |
| **Esc** | Close active modal, drawer, or palette |
| **M** | Toggle theme |

---

## Architectural Boundaries

These are intentional project boundaries, not missing enterprise features.

- **Single-node deployment**: The documented architecture assumes a single API instance with one PostgreSQL backend.
- **No distributed coordination layer**: The current project does not require or provide a distributed Redis/PubSub/consensus layer for WebSocket tickets or TOTP replay state.
- **No hyperscale target**: ResolveOS is not positioned as infrastructure for millions of users, global multi-region workloads, or arbitrary horizontal scaling.
- **No enterprise SAML/SSO**: SAML/SSO integration is not part of the current implementation.
- **Optional AI**: The application can operate without external AI services.
- **Specialized integrations are not the core product**: ResolveOS is not intended to replace every upstream observability, incident-response, SIEM, APM, or ticketing platform.

---

## Known Limitations and Release Notes

This section is intentionally explicit so that users do not confuse a production-oriented implementation with a universally production-ready platform.

### Current limitations to understand before deployment
- **PostgreSQL Integration Testing**: PostgreSQL integration should be exercised against a real PostgreSQL service in CI before using "real database verification" as a release claim. The current repository includes a PostgreSQL driver, but some database tests use mocked pool/client behavior.
- **Frontend Serving**: The frontend is not served by the current API container. The current deployment documentation assumes a separate static-hosting or reverse-proxy path for the React build.
- **Demo Seeding Scope**: The demo seed is development-oriented. It currently targets the memory/file-backed development store rather than a PostgreSQL production database.
- **Pattern-Based Redaction**: PII/secret redaction is pattern based. It should not be described as universal detection or a 100% guarantee.
- **Account Deletion Behavior**: Account deletion currently anonymizes/deactivates the user record and revokes sessions. Documentation should distinguish this from a claim of asynchronous physical database erasure unless such a deletion workflow is actually implemented.
- **Scope of Readiness Scripts**: The readiness script is a repository verification tool, not an independent audit. Passing its gates does not establish compliance certification or universal security.
- **Single-Node State Assumptions**: The process-local WebSocket ticket and TOTP replay stores are single-node assumptions. Multi-instance deployment requires redesigning or externalizing that coordination state.
- **Test Count Consistency**: The test count shown in this README should be regenerated from the exact checkout being released. Do not manually preserve stale test numbers after modifying the suite.

These limitations are part of the project's current engineering scope and should be removed from this section only when the underlying implementation and verification have actually changed.

---

## Documentation

The repository contains supporting technical documentation. Start with:
- [Architecture (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)
- [Claims & Verification Matrix (`docs/CLAIMS.md`)](./docs/CLAIMS.md)
- [Security Architecture (`docs/SECURITY.md`)](./docs/SECURITY.md)
- [Threat Model (`docs/THREAT_MODEL.md`)](./docs/THREAT_MODEL.md)
- [AI Security (`docs/AI_SECURITY.md`)](./docs/AI_SECURITY.md)
- [Database Guide (`docs/DATABASE.md`)](./docs/DATABASE.md)
- [Backup & Restore (`docs/BACKUP_RESTORE.md`)](./docs/BACKUP_RESTORE.md)
- [Disaster Recovery (`docs/DISASTER_RECOVERY.md`)](./docs/DISASTER_RECOVERY.md)
- [Deployment Guide (`docs/DEPLOYMENT.md`)](./docs/DEPLOYMENT.md)
- [Operations (`docs/OPERATIONS.md`)](./docs/OPERATIONS.md)
- [Privacy (`docs/PRIVACY.md`)](./docs/PRIVACY.md)
- [Testing (`docs/TESTING.md`)](./docs/TESTING.md)
- [Change Ledger (`docs/CHANGE_LEDGER.md`)](./docs/CHANGE_LEDGER.md)
- [Production Review (`docs/FINAL_PRODUCTION_REVIEW.md`)](./docs/FINAL_PRODUCTION_REVIEW.md)

### Documentation rule
The repository should follow one simple rule:
> **If the code, tests, and documentation disagree, the documentation must be corrected or the implementation must be corrected before release.**

Historical audits should remain clearly marked as historical and should not be mistaken for the current system state.

---

## Contributing

Contributions should preserve the project's separation of concerns and security boundaries.

Before opening a pull request:
```bash
npm ci
npm run typecheck
npm test
npm run build
npm run lint
npm run prepublish:check
```

For changes affecting a documented security or lifecycle invariant, add or update a regression test and update the relevant documentation.

- Do not silently weaken tests to make a build pass.
- Do not add a public claim for a feature that is not actually implemented and tested.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for repository-specific contribution guidance.

---

## Security Reporting

Please do not disclose suspected vulnerabilities in a public issue, pull request, or discussion.

The repository currently documents a security-reporting email address in `SECURITY.md`. Before publishing or relying on this process, the maintainers should ensure that the address is a real, monitored channel or replace it with a supported private GitHub security-reporting mechanism.

See [SECURITY.md](./SECURITY.md) for the project's current security policy.

---

## License

ResolveOS is distributed under the [MIT License](./LICENSE).

Copyright © 2026 ResolveOS Contributors.

---

## Project Positioning

ResolveOS should be evaluated on what it actually provides:
- a structured technical investigation workflow;
- evidence and reasoning capture;
- domain-enforced resolution states;
- workspace-aware collaboration;
- optional AI assistance;
- offline-capable client behavior;
- security-focused application controls; and
- a self-hosted PostgreSQL-backed deployment model.

It should not be described as a hyperscale distributed platform, independently audited security product, or universal compliance solution unless separate technical evidence exists for those claims.

The goal of this README is technical accuracy, not marketing inflation.
