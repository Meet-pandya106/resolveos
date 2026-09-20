# ResolveOS — Privacy Policy & Data Governance

*Effective Date: September 20, 2026*

## 1. Introduction & Privacy-First Principle

**ResolveOS** is engineered around the principle of **privacy by design and data minimization**. We do not monetize user data, sell personal information, or employ third-party behavioral analytics, fingerprinting, or marketing trackers.

---

## 2. Information We Process

### A. Required Account Information
- **Email Address**: Used exclusively as your unique account identifier and for authentication.
- **Hashed Password**: Stored as a one-way cryptographic hash using `scrypt` with unique 16-byte random salts. We never store or log plaintext passwords.
- **Display Name**: Used for collaborative attribution within your authorized workspace.

### B. Operational Case & Problem Data
- Problem statements, symptom observations, evidence attachments, questions, hypotheses, root cause analyses, solution matrices, decision logs, and corrective action items created by users within their authorized workspaces.

### C. Security Audit Logs
- IP address, user agent, timestamp, and action identifier recorded in immutable audit logs to protect workspace security and audit authentication anomalies.

---

## 3. Legal Bases for Processing (GDPR / DPDP Compliance)

1. **Contractual Necessity (Art. 6(1)(b) GDPR)**: Processing account information and workspace case data necessary to deliver the ResolveOS problem-resolution workspace.
2. **Legitimate Interests (Art. 6(1)(f) GDPR)**: Maintaining security audit trails to detect brute-force attacks, IDOR attempts, and unauthorized session tampering.
3. **Explicit Consent (Art. 6(1)(a) GDPR)**: Optional local error telemetry and optional AI assistant processing require explicit, revocable user consent in the Privacy Center.

---

## 4. Third-Party Disclosures & Subprocessors

By default, ResolveOS operates **entirely locally with zero external network dependencies**. If the workspace administrator explicitly connects optional third-party integrations (such as an external LLM provider), data is pre-filtered through automated PII redaction (masking emails, API keys, passwords, JWT tokens, and IP addresses) before transmission.

For a full list of optional subprocessors, see [SUBPROCESSORS.md](./SUBPROCESSORS.md).

---

## 5. Data Retention & Erasure

- Workspaces configure custom data retention thresholds (default: 365 days).
- **Right to Erasure**: Users can permanently delete their account at any time via the Privacy Center. Account deletion immediately revokes all active sessions, clears cookies, and anonymizes personal data.
- **Data Portability**: Users can export all workspace cases, evidence, decisions, and action plans in unencrypted JSON or CSV format at any time.

---

## 6. Contact & Data Protection Officer

For privacy inquiries, data subject access requests (DSARs), or privacy feedback:
- **Email**: `privacy@resolveos.local`
- **Postal Address**: *[Insert Operator / Organization Legal Entity Address]*

*Notice: This document describes the application's intended processing practices and is provided as an open-source software template.*
