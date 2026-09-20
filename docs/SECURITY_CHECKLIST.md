# ResolveOS — OWASP ASVS 5.0.0 Alignment Verification Checklist

This document maps implemented application security controls against relevant categories of the **OWASP Application Security Verification Standard (ASVS 5.0.0)**.

| ASVS Category | Verification Requirement | Implementation Status | Implemented Control |
|---|---|---|---|
| **V1: Architecture** | Principle of least privilege & defense in depth | Verified | Server-side authorization middleware, strict workspace boundaries |
| **V2: Authentication** | Secure password storage & brute force mitigation | Verified | `scrypt` hashing with unique salts, Fastify rate-limiting on `/api/auth` |
| **V3: Session Management** | Cryptographically random sessions & revocation | Verified | High-entropy session IDs, remote session revocation in Security Center |
| **V4: Access Control** | Object-level authorization & IDOR defense | Verified | Queries check `workspaceId` and `userId` permissions on every record |
| **V5: Malicious Input** | Schema validation & injection prevention | Verified | Centralized Zod validation on all body, query, and path parameters |
| **V6: Cryptography** | Industry-standard algorithms & no custom crypto | Verified | Native Node.js `crypto` primitives, constant-time `timingSafeEqual` |
| **V7: Error Handling** | Safe error responses without stack trace leakage | Verified | Centralized error handler returning sanitized JSON error codes |
| **V8: Data Protection** | PII redaction & secure data export | Verified | `DataRedactor` filter, JSON/CSV exports omitting credentials |
| **V9: Communications** | Secure transport & security headers | Verified | Helmet CSP, X-Content-Type-Options, Referrer-Policy, SameSite cookies |
| **V10: Malicious Files** | Upload validation & path traversal defense | Verified | `PathSanitizer` filename normalization, extension allowlists |
