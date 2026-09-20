# ResolveOS — Test Strategy, Matrix & Invariant Verification

ResolveOS enforces an extensive multi-layered automated testing regime. Every critical domain rule, security boundary, and state invariant is covered by automated regression tests.

---

## 1. Test Suite Architecture

| Test Category | File Path | Scope & Tested Invariants |
|---|---|---|
| **Domain Logic** | `tests/unit/domain.test.ts` | Case state machine transitions, Problem statement quality scoring, Solution matrix weighted scoring, 5-Whys tree construction. |
| **Cryptographic Security** | `tests/unit/security.test.ts` | `scrypt` password hashing, constant-time `timingSafeEqual`, TOTP generation & drift window, SSRF URL defense, PII redaction patterns. |
| **API Lifecycle Integration** | `tests/integration/api.test.ts` | Full 12-stage problem resolution pipeline: Registration → Case Creation → Evidence → Root Cause → Decision → Action → Verification → Resolution → Retro → Export. |
| **Security Regression** | `tests/security/security-regression.test.ts` | IDOR isolation, cross-workspace multi-tenant barriers, SQL injection defense, privilege escalation prevention, resolution gate enforcement. |
| **Cryptographic Audit** | `tests/security/tamper-audit.test.ts` | SHA-256 hash chaining, detection of in-place row tampering, detection of block splicing/forged previousHash pointers. |
| **AI Prompt Injection** | `tests/security/prompt-injection.test.ts` | Untrusted evidence delimiter isolation, credential redaction prior to prompt generation, non-authoritative grounding citations. |
| **Concurrency & Sync** | `tests/security/concurrency.test.ts` | Base/Local/Remote 3-way differential merge, non-conflicting field reconciliation, detection of concurrent field collisions. |

---

## 2. Running Test Suites

```bash
# Run all Vitest suites in parallel
npm test

# Run with coverage report
npx vitest run --coverage

# Run specific security regression suite
npx vitest run tests/security/tamper-audit.test.ts
```
