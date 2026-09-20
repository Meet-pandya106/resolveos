# ResolveOS — Public Claims Contract & Verification Matrix

This contract maps every significant publicly advertised claim in the README and project documentation to its technical implementation, automated verification test, and verifiable status.

**Rule**: If a claim cannot be implemented and verified, it must be removed or rewritten.

| Public Claim | Technical Implementation | Automated Verification Test | Verified Status |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Production Support** | `packages/database`: PostgreSQL connection pooling (`pg.Pool`), Drizzle relational schema, migrations, transactions | `tests/security/database.test.ts` | **PASS** |
| **Tenant Isolation & IDOR Defense** | `apps/api/src/routes/cases.ts`: Strict server-side workspace ownership check on every case and sub-resource query | `tests/security/idor.test.ts` | **PASS** |
| **Verification Gate (Enforced Invariant)** | `packages/domain/src/index.ts` & `apps/api/src/routes/cases.ts`: Case cannot reach `RESOLVED` without `PASSED` verification criteria or audited owner override | `tests/unit/domain.test.ts`, `tests/security/security-regression.test.ts` | **PASS** |
| **Tamper-Evident Audit Trail** | `apps/api/src/services/AuditService.ts`: SHA-256 cryptographic hash chain stored in DB with sequence numbers; verified via `resolveos audit verify` CLI | `tests/security/tamper-audit.test.ts` | **PASS** |
| **RFC 6238 Compliant TOTP MFA** | `packages/security/src/index.ts`: Standard Base32-decoded HMAC-SHA1 calculation matching official RFC 6238 test vectors, drift window, and replay protection cache | `tests/security/totp-rfc.test.ts` | **PASS** |
| **Real-Time WebSocket Isolation** | `apps/api/src/services/RealtimeService.ts`: Channel subscription validation verifying user membership in requested workspace | `tests/security/websocket-security.test.ts` | **PASS** |
| **Offline-First 3-Way Merge** | `packages/domain/src/index.ts` & `apps/api/src/routes/sync.ts`: Field-level 3-way differential merge engine with explicit conflict reporting | `tests/security/concurrency.test.ts` | **PASS** |
| **PII & Secrets Redaction** | `packages/security/src/index.ts`: High-coverage regex redaction covering emails, hyphenated API keys (`sk-live-...`), phone numbers, cards, and IPs | `tests/security/prompt-injection.test.ts` | **PASS** |
| **Prompt Injection Defense** | `apps/api/src/services/AIService.ts`: Strict prompt isolation separating `<SYSTEM_INSTRUCTIONS>`, `<CASE_METADATA>`, and `<UNTRUSTED_EVIDENCE_DATA>` | `tests/security/prompt-injection.test.ts` | **PASS** |
| **AI Evidence Grounding** | `apps/api/src/services/AIService.ts`: All AI hypotheses explicitly cite evidence IDs, marked `isNonAuthoritative: true` and `isHumanVerified: false` | `tests/security/prompt-injection.test.ts` | **PASS** |
| **SSRF Defense Guard** | `packages/security/src/index.ts`: Hostname parsing, private range blocking, and async DNS resolution checking | `tests/security/ssrf.test.ts` | **PASS** |
| **Path Traversal Defense** | `packages/security/src/index.ts`: Recursive traversal token stripping, null byte elimination, and filename normalization | `tests/security/path-traversal.test.ts` | **PASS** |
| **Right to Erasure / Data Portability** | `apps/api/src/routes/privacy.ts`: Password-confirmed account anonymization and authorized JSON/CSV workspace export | `tests/integration/api.test.ts` | **PASS** |
