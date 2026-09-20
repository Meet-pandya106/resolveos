# RESOLVEOS

<div align="center">

### **Turn messy problems into structured solutions.**

A privacy-first, local-first Problem Resolution Operating System for engineering, security, and operations teams.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black?logo=fastify)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-95%20Passed-brightgreen)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/Security-Hardened-success)](./docs/SECURITY.md)
[![License](https://img.shields.io/badge/License-MIT-purple)](./LICENSE)

</div>

---

## 🎯 The Core Problem

Engineering and operational teams encounter high-consequence problems every day, but critical context is scattered across disparate notes, chat messages, dashboards, screenshots, logs, and verbal assumptions.

**ResolveOS** transforms ambiguous, chaotic incidents into an auditable, structured resolution pipeline:

```text
Problem Definition
       ↓
Symptom Quantification
       ↓
Evidence Corroboration
       ↓
Inquiry & Questions
       ↓
Competing Hypotheses
       ↓
Root Cause Analysis (5-Whys & Fishbone)
       ↓
Multi-Criteria Solution Matrix
       ↓
Decision Log (Immutable Revisions)
       ↓
Action Plan (Kanban & Deadlines)
       ↓
Verification Engine (Expected vs Observed)
       ↓
Case Resolution (Enforced Invariants)
       ↓
Post-Incident Retrospective
```

---

## 👥 Who Is ResolveOS For? (Target Personas & Use Cases)

ResolveOS is engineered for organizations and teams that cannot afford ambiguous guesswork, lost diagnostic context, or unverified outage conclusions:

| Persona / Role | Core Pain Points Solved by ResolveOS | Primary Capabilities Used |
| :--- | :--- | :--- |
| **Site Reliability Engineers (SREs) & Incident Commanders** | Chaotic Slack war-rooms during Sev-1 outages; untracked investigative leads; premature case closure without empirical proof. | • Real-Time Incident Command Radar<br>• Enforced Verification Invariant (Blocked without PASSED test or signed Owner override)<br>• Automated Retrospective Synthesis |
| **Security Operations & Incident Responders (SecOps / DFIR)** | Leaking credentials, tokens, and PII in ticket trackers; legal challenges to digital chain-of-custody during breach investigations. | • Automated Server-Side PII/Secret Redactor (`DataRedactor`)<br>• Tamper-Evident SHA-256 Audit Trails (FRE 902 / ISO 27037)<br>• SSRFGuard (IPv4/IPv6 ULA + DNS Rebinding Protection) |
| **Software Architects & Engineering Leads** | Flaky distributed bugs; recurring architectural regressions; lost rationale when developers depart. | • 12-Stage Scientific Resolution Lifecycle<br>• Recursive 5-Whys Causality Chains & Ishikawa Diagrams<br>• Immutable Architectural Decision Records (ADRs) |
| **Platform & Infrastructure Engineers** | Hard-to-reproduce memory leaks, network partition anomalies, and multi-component dependency deadlocks. | • Multi-Criteria Weighted Solution Matrix (Cost, Effort, Risk, Impact, Time)<br>• WebGL 2.0 3D Relational Problem Graph<br>• Offline Mutation Queue with 3-Way Differential Merge |
| **Compliance, CISOs & Data Protection Officers (DPOs)** | Multi-jurisdictional privacy audits (GDPR, CCPA, DPDP); unvetted third-party telemetry; lack of auditability for regulators. | • Zero-Telemetry Architecture (No tracking beacons)<br>• 1-Click JSON/CSV Data Portability<br>• Right to Erasure / Automated Personal Data Anonymization |

---

## 🖼️ Visual Guide & System Walkthrough

| Incident Operations Center & Telemetry | WebGL 2.0 3D Relational Problem Mesh |
| :---: | :---: |
| ![Operations Dashboard](docs/images/04-operations-dashboard.png) | ![3D Case Network](docs/images/09-3d-case-mesh.png) |

| Workspace Configuration & 12-Stage Governance | Privacy & Data Governance Center |
| :---: | :---: |
| ![Workspace Settings](docs/images/10-workspace-settings.png) | ![Privacy Center](docs/images/12-privacy-center.png) |

| Problem Resolution Case Registry & Stream |
| :---: |
| ![Case Registry Stream](docs/images/05-case-list.png) |

> 💡 *All screenshots reflect the live ResolveOS UI running locally at `http://localhost:5173` with dark cyber-mesh aesthetics and zero-telemetry enforcement.*

---

## ✨ Key Features & Capabilities

### 🛡️ Privacy by Design & Zero Tracking
- **Zero Behavioral Trackers**: No Google Analytics, no third-party telemetry, no marketing beacons.
- **Data Minimization**: Collects only strictly necessary operational state.
- **Privacy Center**: Granular consent management for optional local logging and AI processing.
- **PII & Secrets Redaction Engine**: Automatically redacts emails, API keys, passwords, JWTs, and credit card numbers before any optional AI processing.
- **Full Data Portability**: Instant one-click workspace export in structured JSON and CSV formats.
- **Account Erasure**: Permanent account deletion with password re-authentication and personal data anonymization.

### 🔬 Structured Problem Resolution Lifecycle
- **Problem Statement Quality Meter**: Real-time mathematical completeness scoring (0–100%) with actionable missing field suggestions.
- **Evidence Management**: Corroborate observations, documents, screenshots, APM logs, measurements, and user reports with confidence ratings.
- **Competing Hypotheses Matrix**: Evaluate alternative theories side-by-side (`UNTESTED`, `SUPPORTED`, `WEAKENED`, `REJECTED`, `CONFIRMED`).
- **Root Cause Analysis Suite**: Recursive **5-Whys** causality chains and **Ishikawa Fishbone** categorical diagrams.
- **Multi-Criteria Solution Matrix**: Normalizes Cost, Effort, Risk, Impact, and Time-to-implement to calculate weighted viability scores.
- **Immutable Decision Log**: Records architectural decisions with context, chosen solution, assumptions, and revision history.
- **Verification Engine**: Prevents premature case resolution by enforcing measurable `PASSED` acceptance criteria before allowing transition to `RESOLVED` (requires explicit Owner override reason otherwise).

### ⚡ Offline-First Architecture & Real-time Collaboration
- **Offline Mutation Queue**: Seamlessly queue updates in IndexedDB / local storage during network interruptions.
- **3-Way Conflict Detector**: Intelligent field-level diffing when synchronizing local offline edits with the cloud.
- **Real-Time WebSockets**: Instant live updates across team members collaborating on the same case with workspace authorization and 16KB frame limit.
- **Interactive 3D Case Network**: Three.js WebGL visualizer rendering interconnected problem nodes, evidence links, and action chains.

### 🔒 Enterprise Security & Governance
- **Password Hashing**: Cryptographically secure `scrypt` hashing with 16-byte unique salts and constant-time comparison.
- **Session Governance**: Device session tracking with one-click remote session revocation.
- **Two-Factor Authentication (2FA)**: RFC 6238 compliant TOTP generator with sliding-window replay protection and single-use burn-on-use recovery codes.
- **SSRF Defense Guard**: Blocks private IPv4/IPv6 ranges, link-local addresses, IPv6 ULA (`fc00::/7`), and cloud instance metadata (`169.254.169.254`) with DNS rebinding protection.
- **IDOR / Tenant Isolation**: Strict server-side workspace authorization across all 26 case sub-resource endpoints.
- **Tamper-Evident SHA-256 Audit Trail**: Cryptographically chained activity logging for all security events.
- **Dual Database Architecture**: Canonical PostgreSQL engine with connection pooling and migrations for production; ultra-fast in-memory engine for unit testing.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 20+ (tested on Node v20, v22)
- npm 9+
- PostgreSQL 14+ (Required for persistent production & self-hosted deployments)
- Docker & Docker Compose (Optional, for instant 1-command container deployment)

### 1. Clone & Configure
```bash
# Clone the repository
git clone https://github.com/Meet-pandya106/resolveos.git
cd resolveos

# Copy environment configuration template
cp .env.example .env

# Generate secure random secrets for JWT and Session encryption:
# Linux/macOS: openssl rand -hex 32
# Windows PowerShell: -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

### 2. Configure Database
ResolveOS uses a canonical production PostgreSQL driver with ACID transaction pooling.

**Option A: Local Docker PostgreSQL**
```bash
# Launch persistent PostgreSQL container
docker compose up -d postgres
```

**Option B: Existing PostgreSQL Instance**
Set `DATABASE_URL` in your `.env`:
```env
DATABASE_URL=postgres://resolveos_user:your_secure_password@localhost:5432/resolveos
```

### 3. Install & Build
```bash
# Install workspace dependencies
npm install

# Build all packages and web frontend
npm run build

# Populate initial schema and synthetic demo incident data
npm run db:seed
```

### 4. Launch Development Server
```bash
# Starts Fastify Backend (Port 4000) and Vite Web App (Port 5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Credentials (Local Exploration)

| Field | Value |
|---|---|
| **Email** | `demo@resolveos.local` |
| **Password** | `ResolveOS#Demo2026!` |
| **Quick Fill** | Click **"Fill Demo Credentials"** on the login screen |

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl + K** | Open Global Command Palette & Unified Search |
| **Esc** | Close active modals, drawers, or command palette |
| **M** | Toggle dark / light theme |

---

## 🧪 Testing & Verification

ResolveOS includes 95 automated tests across 18 suites covering domain logic, cryptographic security, IDOR regression, concurrency, and end-to-end API flows:

```bash
# Run all Vitest suites
npm test

# Run unit tests only
npm run test:unit

# Run security regression tests (IDOR, Role Escalation, SSRF, TOTP, WebSocket)
npm run test:security

# Run production readiness acceptance checks (19 Gates)
npm run readiness:check
```

---

## 🏗️ Monorepo Architecture

```text
resolveos/
├── packages/
│   ├── shared/       # Domain models, enums, DTOs, API event schemas
│   ├── domain/       # Case state machine, Problem scoring, 5-Whys, Solution matrix
│   ├── validation/   # Zod validation schemas for all inputs & exports
│   ├── security/     # Scrypt crypto, RFC 6238 TOTP, PII redaction, SSRF guard
│   └── database/     # Canonical PostgreSQL + in-memory store, DDL migrations, pooling
├── apps/
│   ├── api/          # Fastify backend, REST API, WebSockets, Audit, Export/Import
│   └── web/          # React 18 SPA, Zustand, TanStack Query, Three.js 3D graph
├── tests/
│   ├── unit/         # Unit tests for domain logic & security primitives
│   ├── integration/  # End-to-end lifecycle API integration tests
│   ├── security/     # Security regression tests (IDOR, SSRF, TOTP, AI injection)
│   └── e2e/          # 12-Stage resolution lifecycle tests
└── docs/             # Technical, Security, Disaster Recovery, and Audit documentation
```

---

## 📄 Documentation Index

- [Production Architecture Guide (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [Baseline Production Audit (PRODUCTION_AUDIT.md)](./docs/PRODUCTION_AUDIT.md)
- [Claims & Verification Matrix (CLAIMS.md)](./docs/CLAIMS.md)
- [Engineering Change Ledger (CHANGE_LEDGER.md)](./docs/CHANGE_LEDGER.md)
- [Canonical Database & Migration Guide (DATABASE.md)](./docs/DATABASE.md)
- [Threat Model & Attack Surface (THREAT_MODEL.md)](./docs/THREAT_MODEL.md)
- [Security Architecture & Controls (SECURITY.md)](./docs/SECURITY.md)
- [AI Security & Defense-in-Depth (AI_SECURITY.md)](./docs/AI_SECURITY.md)
- [Disaster Recovery & Business Continuity (DISASTER_RECOVERY.md)](./docs/DISASTER_RECOVERY.md)
- [Deployment Runbook (DEPLOYMENT.md)](./docs/DEPLOYMENT.md)
- [Operations & Observability Runbook (OPERATIONS.md)](./docs/OPERATIONS.md)
- [Privacy Policy & Data Rights (PRIVACY.md)](./docs/PRIVACY.md)
- [Testing & Quality Assurance Guide (TESTING.md)](./docs/TESTING.md)
- [Comprehensive Production Review & Audit (FINAL_PRODUCTION_REVIEW.md)](./docs/FINAL_PRODUCTION_REVIEW.md)

---

## ⚠️ Scope & Known Architectural Boundaries

ResolveOS is designed as a focused, standalone self-hosted platform for normal real-world engineering and security teams. In alignment with open-source design principles, the following architectural boundaries are intentional:

- **Deployment Topology**: Single-node instance (API + PostgreSQL + Web frontend). Multi-region clustering, distributed consensus, and Kubernetes operators are not required and are out of scope.
- **WebSocket Ticket Store**: Process-local Map with 60s TTL and auto-pruning. Suitable for single-instance deployments without requiring external Redis/PubSub infrastructure.
- **TOTP Replay Protection**: Sliding-window replay protection cache is kept process-local.
- **AI Processing**: Completely optional. Defaults to off; ships with an offline deterministic rules engine that runs with zero external API calls or telemetry.
- **Authentication**: JWT signed with 7-day expiration coupled with mandatory per-request database session lookup and immediate revocation capability. Enterprise SAML/SSO is not implemented.

---

## ⚖️ License & Open Source Notice

ResolveOS is open-source software licensed under the [MIT License](./LICENSE).

© 2026 ResolveOS Contributors.
