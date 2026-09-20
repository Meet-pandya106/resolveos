# RESOLVEOS

<div align="center">

### **Turn messy problems into structured solutions.**

A privacy-first, local-first Problem Resolution Operating System for engineering, security, and operations teams.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black?logo=fastify)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-33%20Passed-brightgreen)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-purple)](#)

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
- **Verification Engine**: Prevents premature case resolution by enforcing measurable `PASSED` acceptance criteria before allowing transition to `RESOLVED`.

### ⚡ Offline-First Architecture & Real-time Collaboration
- **Offline Mutation Queue**: Seamlessly queue updates in IndexedDB / local storage during network interruptions.
- **3-Way Conflict Detector**: Intelligent field-level diffing when synchronizing local offline edits with the cloud.
- **Real-Time WebSockets**: Instant live updates across team members collaborating on the same case.
- **Interactive 3D Case Network**: Three.js WebGL visualizer rendering interconnected problem nodes, evidence links, and action chains.

### 🔒 Enterprise Security & Governance
- **Password Hashing**: Cryptographically secure `scrypt` hashing with 16-byte unique salts and constant-time comparison.
- **Session Governance**: Device session tracking with one-click remote session revocation.
- **Two-Factor Authentication (2FA)**: RFC 6238 compliant TOTP generator with single-use recovery codes.
- **SSRF Defense Guard**: Blocks private IPv4/IPv6 ranges, link-local addresses, and cloud instance metadata endpoints (`169.254.169.254`).
- **IDOR / Tenant Isolation**: Strict server-side workspace authorization and object-level permission verification.
- **Security Audit Trail**: Immutable logging of logins, role updates, session revocations, and data exports.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 18+ (tested on Node v20, v22, v24)
- npm 9+

### 1. Clone & Install
```bash
# Navigate to project directory
cd resolveos

# Install dependencies across all workspace packages
npm install
```

### 2. Populate Demo Data
```bash
# Seed synthetic demo cases (Payment Latency Surge, CI Pipeline Flakiness)
npm run db:seed
```

### 3. Launch Development Server
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

ResolveOS comes with a comprehensive test suite covering domain logic, cryptographic security, IDOR regression, and end-to-end API flows:

```bash
# Run all Vitest suites
npm test

# Run unit tests only
npm run test:unit

# Run security regression tests (IDOR, Role Escalation, SQLi, State Machine)
npm run test:security
```

---

## 🏗️ Monorepo Architecture

```text
resolveos/
├── packages/
│   ├── shared/       # Domain models, enums, DTOs, API event schemas
│   ├── domain/       # Case state machine, Problem scoring, 5-Whys, Solution matrix
│   ├── validation/   # Zod validation schemas for all inputs & exports
│   ├── security/     # Scrypt crypto, TOTP MFA, PII redaction, SSRF guard
│   └── database/     # Portable database engine, Drizzle schema, indices
├── apps/
│   ├── api/          # Fastify backend, REST API, WebSockets, Audit, Export/Import
│   └── web/          # React 18 SPA, Zustand, TanStack Query, Three.js 3D graph
├── tests/
│   ├── unit/         # Unit tests for domain logic & security primitives
│   ├── integration/  # End-to-end lifecycle API integration tests
│   └── security/     # Security regression tests (IDOR, SQLi, Auth bypass)
└── docs/             # Technical, Security, and Legal Privacy documentation
```

---

## 📄 Documentation Index

- [Architecture Guide (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [Threat Model & Attack Surface Analysis (THREAT_MODEL.md)](./docs/THREAT_MODEL.md)
- [Security Architecture & Controls (SECURITY.md)](./docs/SECURITY.md)
- [OWASP ASVS Verification Checklist (SECURITY_CHECKLIST.md)](./docs/SECURITY_CHECKLIST.md)
- [Privacy Policy & Data Rights (PRIVACY_POLICY.md)](./docs/PRIVACY_POLICY.md)
- [Data Retention & Deletion Policy (DATA_RETENTION.md)](./docs/DATA_RETENTION.md)
- [Subprocessors Transparency Table (SUBPROCESSORS.md)](./docs/SUBPROCESSORS.md)
- [Deployment & Operations Guide (DEPLOYMENT.md)](./docs/DEPLOYMENT.md)

---

## ⚖️ License & Open Source Notice

ResolveOS is open-source software licensed under the [MIT License](./LICENSE).

© 2026 ResolveOS Contributors.
