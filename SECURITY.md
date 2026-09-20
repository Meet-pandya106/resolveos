# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Architecture & Defenses

ResolveOS is built with security-by-design and defense-in-depth:
- **Authentication & MFA**: RFC 6238 TOTP with sliding window drift protection and replay attack prevention. Passwords hashed using Node.js crypto `scrypt` with 16-byte random salts.
- **Tenant Isolation & IDOR/BOLA Protection**: All 26 case lifecycle sub-resource endpoints strictly enforce workspace ownership verification at the database boundary.
- **Cryptographic Audit Chain**: SHA-256 hash-chained event ledger guarantees tamper-evident activity logging.
- **Zero-SSRF Guard**: Strict validation against IPv4/IPv6 private ranges (RFC 1918, ULA `fc00::/7`, link-local `fe80::/10`), cloud metadata endpoints (`169.254.169.254`), and DNS rebinding protection.
- **Path Sanitization**: Recursive traversal stripping and separator normalization preventing arbitrary file access.
- **Prompt Injection Defense & PII Redaction**: Adversarial tag neutralization and automatic redaction of API keys, credit cards, emails, and phone numbers before AI analysis.
- **WebSocket Security**: Authentication verified at handshake, workspace subscription validation, and 16KB frame limit enforcement.

For complete architectural details, see [docs/SECURITY.md](docs/SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Reporting a Vulnerability

If you discover a security vulnerability in ResolveOS, please report it responsibly:

1. **Do not create a public issue, discussion, or pull request.**
2. Email your findings to **`security@resolveos.local`**.
3. Please include:
   - Vulnerability category (e.g., IDOR, SSRF, Injection, Auth Bypass)
   - Step-by-step reproduction instructions or proof-of-concept
   - Impact assessment and suggested remediation

We commit to acknowledging reports within 48 hours, triaging within 3 business days, and releasing coordinated patches within 14 business days.
