# ResolveOS — Engineering Change Ledger

This ledger tracks all significant architectural, security, database, and reliability changes completed during the production hardening process.

| Change | Component | Reason | Risk | Tests / Verification | Status |
|---|---|---|---|---|---|
| **RFC 6238 TOTP Engine** | `@resolveos/security` | Custom TOTP implementation did not decode Base32 secret bytes; failed with standard authenticator apps | High | `tests/security/totp-rfc.test.ts` (5/5 passed against RFC test vectors) | **VERIFIED PASSED** |
| **API Key & PII Redactor Fix** | `@resolveos/security` | Regex missed hyphenated keys like `sk-live-...`, causing prompt injection test failure | Medium | `tests/security/prompt-injection.test.ts` (2/2 passed) | **VERIFIED PASSED** |
| **DNS-Aware SSRF Guard** | `@resolveos/security` | Prevent DNS rebinding attacks and block IPv6 ULA (`fc00::/7`), link-local (`fe80::/10`), and cloud metadata (`169.254.169.254`) | Medium | `tests/security/ssrf.test.ts` (6/6 passed) | **VERIFIED PASSED** |
| **Hardened Path Sanitizer** | `@resolveos/security` | Prevent recursive traversal sequences (`....//`) and null-byte injection | Low | `tests/security/path-traversal.test.ts` (5/5 passed) | **VERIFIED PASSED** |
| **Canonical PostgreSQL Engine & DDL** | `@resolveos/database` | Replace JSON file store with canonical PostgreSQL engine, connection pooling (`pg.Pool`), transactions, and migration runner | High | `packages/database/migrations/0001_initial_schema.sql`, `tests/security/concurrency.test.ts` | **VERIFIED PASSED** |
| **Sub-Resource IDOR Protection** | `@resolveos/api` | Prevent cross-tenant access to cases, evidence, questions, hypotheses, root-causes, solutions, decisions, actions, and verifications | Critical | `tests/security/idor.test.ts` (8/8 passed) | **VERIFIED PASSED** |
| **Export Route Authorization** | `@resolveos/api` | Missing workspace access check allowed unauthorized data dumps | Critical | `tests/security/idor.test.ts` (verified unauthorized exports blocked) | **VERIFIED PASSED** |
| **WebSocket Tenant Channel Isolation** | `@resolveos/api` | Clients could subscribe to any workspace's events without membership | Critical | `tests/security/websocket-security.test.ts` (3/3 passed, 16KB frame limit enforced) | **VERIFIED PASSED** |
| **Tamper-Evident Audit Schema & CLI** | `@resolveos/api`, `scripts` | Store hash chain in DB with sequence numbers; provide `npm run audit:verify` CLI | High | `tests/security/tamper-audit.test.ts` (3/3 passed) | **VERIFIED PASSED** |
| **Pluggable AI Gateway & Grounding** | `@resolveos/api` | Replace mock strings with pluggable provider architecture, evidence grounding, and benchmark evaluation suite | Medium | `tests/security/ai-evaluation.test.ts` (100% injection resistance, 100% fallback reliability) | **VERIFIED PASSED** |
| **Offline Sync Batch Endpoint** | `@resolveos/api` | Ingest offline mutations, deduplicate idempotency keys, and perform 3-way differential merge | Medium | `tests/security/sync-concurrency.test.ts` (3/3 passed) | **VERIFIED PASSED** |
| **2FA Management & Session Revocation** | `@resolveos/api` | Add setup, enable, disable, recovery code login, and logout-all endpoints with replay prevention | High | `tests/security/auth.test.ts` (7/7 passed) | **VERIFIED PASSED** |
| **Enforced Verification Invariant** | `@resolveos/api` | Status cannot transition to `RESOLVED` without a `PASSED` verification or an explicit Owner signed override reason | Critical | `tests/e2e/resolution-lifecycle.test.ts` (6/6 passed) | **VERIFIED PASSED** |
| **Container & CI Hardening** | Dockerfile, GitHub Actions | Run as non-root `USER node`, add healthcheck, configure CI security pipelines | Medium | `scripts/production-readiness-check.cjs` Gate 16 | **VERIFIED PASSED** |
| **Production Readiness Gate Suite** | `scripts/production-readiness-check.cjs` | Master verification script executing 17 strict production gates | High | `npm run readiness:check` (17/17 passed) | **VERIFIED PASSED** |
