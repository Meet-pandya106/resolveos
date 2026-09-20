# ResolveOS — Security Policy & Vulnerability Disclosure

## 1. Security Architecture & Defense-in-Depth

ResolveOS implements defense-in-depth across every architectural layer:

- **Authentication**: Passwords hashed with `scrypt` (N=16384, r=8, p=1) and 16-byte random salts. Constant-time comparisons (`crypto.timingSafeEqual`) prevent timing side-channel attacks.
- **Session Security**: Session tokens are cryptographically random, tracked in `user_sessions`, and delivered via `HttpOnly`, `SameSite=Lax`, and `Secure` cookies.
- **WebSocket Protection**: Real-time WebSocket connections strictly require verified JWT / session authentication during handshake.
- **Tenant Isolation & IDOR Defense**: Every query against cases, evidence, hypotheses, and actions validates workspace membership and user permissions server-side.
- **SSRF Defense Guard**: Blocks all private network ranges (RFC 1918), loopback (`127.0.0.1`, `::1`), link-local (`fe80::/10`), unique local addresses (`fc00::/7`), and cloud instance metadata (`169.254.169.254`).
- **Content Security**: Helmet Content-Security-Policy (CSP) headers block unauthorized external scripts and framing.
- **PII & Secrets Redaction**: Automatically sanitizes sensitive tokens, keys, emails, and credit cards before any optional external AI processing.

---

## 2. Reporting a Vulnerability

We take the security of ResolveOS seriously. If you identify a potential security issue:

1. **Do NOT open a public GitHub issue or PR.**
2. Send a detailed report to **`security@resolveos.local`** (or your organization's security response team).
3. Include:
   - Type of vulnerability (e.g., IDOR, XSS, SSRF, Auth Bypass)
   - Step-by-step reproduction steps or proof-of-concept payload
   - Affected endpoints or components
   - Impact assessment

---

## 3. Vulnerability Response Timeline

- **Initial Acknowledgment**: Within 48 hours of receipt.
- **Triage & Reproduction**: Within 3 business days.
- **Remediation & Patch Release**: Within 14 business days depending on severity.
- **Public Disclosure**: Coordinated disclosure after fix has been published and released.

Thank you for practicing responsible disclosure and helping keep ResolveOS secure.
