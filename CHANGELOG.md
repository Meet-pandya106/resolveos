# Changelog

All notable changes to **ResolveOS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-20

### Added
- **Core Problem Resolution Lifecycle**: Complete 12-stage engineering pipeline (Problem Definition with live Quality Score meter, Symptoms, Evidence attachments, Inquiry, Hypotheses, 5-Whys Root Cause, Solution Matrix, Decision Log, Actions Kanban, Verification Engine, and Retrospectives).
- **Incident Command Center**: Accelerated triage view for critical production incidents.
- **Interactive 3D Case Network**: Three.js WebGL 2.0 visualization mapping relational problem dependencies.
- **Privacy & Security Governance**:
  - PII & Secrets redaction filter for emails, API keys, passwords, JWTs, and IP addresses.
  - Granular consent management for optional local logging and AI processing.
  - One-click workspace data export in open JSON and CSV formats.
  - Irreversible account erasure with password re-authentication.
  - RFC 6238 TOTP Two-Factor Authentication with recovery codes.
  - Active device session tracking and one-click remote revocation.
- **Offline-First Resilience**: Local mutation queue with automatic reconnect synchronization and 3-way conflict resolution.
- **Authenticated Real-Time WebSockets**: Token-verified WebSocket connection for live collaborative case updates.
- **Automated Test Suite**: 98 Vitest tests across 19 suites spanning domain logic, cryptographic security, IDOR regression, backup/restore, and end-to-end API flows.
- **DevOps & Containers**: Multi-stage Dockerfile and Docker Compose configuration with non-root execution (`USER node`) and container healthchecks.
