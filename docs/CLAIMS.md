# ResolveOS — Public Claims Contract & Verification Matrix

This contract maps every significant publicly advertised claim in the README and project documentation to its technical implementation, automated verification test, and verifiable status.

**Rule**: If a claim cannot be implemented and verified, it must be removed or rewritten.

| Public Claim | Technical Implementation | Automated Verification Test | Verified Status |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Production Persistence** | `packages/database/src/index.ts`: Parameterized SQL, connection pool, transactional checkout, zero in-memory fallback in production | `tests/security/database-real-postgres.test.ts` | **PASS** |
| **Tenant Isolation & IDOR Defense** | `apps/api/src/routes/cases.ts`: Strict server-side workspace ownership check on every case and sub-resource query | `tests/security/idor.test.ts` | **PASS** |
| **Verification Gate (Enforced Invariant)** | `packages/domain/src/index.ts` & `apps/api/src/routes/cases.ts`: Case cannot reach `RESOLVED` without `PASSED` verification criteria or audited owner override | `tests/unit/domain.test.ts`, `tests/e2e/resolution-lifecycle.test.ts` | **PASS** |
| **Tamper-Evident Audit Trail** | `apps/api/src/services/AuditService.ts`: SHA-256 cryptographic hash chain stored in DB with sequence numbers; verified via `resolveos audit verify` CLI | `tests/security/tamper-audit.test.ts` | **PASS** |
| **RFC 6238 Compliant TOTP MFA** | `packages/security/src/index.ts`: Standard Base32-decoded HMAC-SHA1 calculation matching official RFC 6238 test vectors, drift window, and replay protection cache | `tests/security/totp-rfc.test.ts` | **PASS** |
| **Single-Use WebSocket Tickets** | `apps/api/src/services/RealtimeService.ts`: 60s burn-on-read tickets issued via authenticated POST endpoint; query string tokens rejected | `tests/security/websocket-security.test.ts` | **PASS** |
| **Offline-First 3-Way Merge** | `packages/domain/src/index.ts` & `apps/api/src/routes/sync.ts`: Field-level 3-way differential merge engine with explicit conflict reporting | `tests/security/concurrency.test.ts` | **PASS** |
| **Universal PII & Secrets Redaction** | `packages/security/src/index.ts` & `apps/api/src/services/AIService.ts`: 100% of user evidence, descriptions, titles redacted before reaching LLM provider | `tests/security/prompt-injection.test.ts` | **PASS** |
| **Prompt Injection Defense & Citations** | `apps/api/src/services/AIService.ts`: XML prompt isolation fences; citations validated against verified DB evidence IDs | `tests/security/prompt-injection.test.ts`, `tests/security/ai-evaluation.test.ts` | **PASS** |
| **SSRF Defense Guard** | `packages/security/src/index.ts`: Hostname parsing, private range blocking, and async DNS resolution checking | `tests/security/ssrf.test.ts` | **PASS** |
| **Path Traversal Defense** | `packages/security/src/index.ts`: Recursive traversal token stripping, null byte elimination, and filename normalization | `tests/security/path-traversal.test.ts` | **PASS** |
| **Right to Erasure / Data Portability** | `apps/api/src/routes/privacy.ts`: Password-confirmed account anonymization and authorized JSON/CSV workspace export | `tests/integration/api.test.ts` | **PASS** |
| **Strict Static Analysis with Biome** | `biome.json`: Production-grade Biome linter replacing fake echo scripts; 0 errors across monorepo | `npm run lint` / Gate 05 | **PASS** |
| **28-Step Production Acceptance Scenario** | `tests/e2e/production-scenario-28.test.ts`: Exhaustive live behavioral test executing multi-tenant isolation, decision gates, audit chain, and AI defenses | `tests/e2e/production-scenario-28.test.ts` | **PASS** |
| **Unified Async Database Contract** | `packages/database/src/index.ts` & all API routes: Both MemoryStore and PostgresDatabase expose strictly typed `Promise` contracts; all call sites awaited | `tests/security/database-real-postgres.test.ts` (Rule 9 test) | **PASS** |
| **Audit Log Concurrency Serialization** | `apps/api/src/services/AuditService.ts`: Mutex serialization and monotonic timestamps prevent race conditions and forked chains under concurrent writes | `tests/security/tamper-audit.test.ts` (concurrency test) | **PASS** |

