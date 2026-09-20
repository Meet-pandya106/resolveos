# RESOLVEOS — MASTER LEGAL & REGULATORY SPECIFICATION (v1.0.0)
========================================================================================
    ARCHITECTURAL GOVERNANCE, DATA PRIVACY, EVIDENTIARY DEFICIENCY,
    AND COMPLIANCE BLUEPRINT
    Applicable Law: EU GDPR • US CCPA/CPRA • India DPDP Act 2023 • HIPAA • PCI-DSS
========================================================================================

## 1. PRODUCT CLASSIFICATION & ARCHITECTURAL NATURE

### 1.1 Software Characterization
ResolveOS is an open-source, local-first, privacy-first Problem Resolution Operating System (the "Software"). The Software is distributed under the MIT License as standalone application software for on-premises deployment, private cloud installation, or self-hosted execution.

### 1.2 Zero-SaaS Default Standing
Unlike multi-tenant centralized Software-as-a-Service (SaaS) platforms:
1. **Zero Host Control**: The author, copyright holders, and code contributors maintain **zero administrative access, zero persistent network backdoors, and zero telemetry collection** over deployed instances.
2. **Local Data Residence**: By default, all problem statements, telemetry dumps, heap snapshots, 5-Whys causality graphs, solutions, verification records, and user credentials reside solely within the customer's self-managed filesystem or private database storage.
3. **No Centralized Data Custodianship**: ResolveOS developers do not act as data brokers, data stewards, or centralized data custodians of customer operational records.

---

## 2. DATA PROTECTION & PRIVACY COMPLIANCE

### 2.1 Roles Under Global Data Privacy Regulations
When deployed within an enterprise or commercial entity:
- **Customer as Data Controller**: The deploying organization acts as the **Data Controller** (under Art. 4(7) EU GDPR and equivalent provisions under UK GDPR, CCPA/CPRA, and Data Fiduciary under India DPDP Act 2023). The Customer determines the categories of data collected, purpose of investigation, and case retention windows.
- **ResolveOS as Software Provider**: Because ResolveOS operates locally without telemetry or remote ingestion servers, ResolveOS authors **do not process personal data on behalf of the customer** and do not act as a Data Processor unless a separate commercial Support and Processing Agreement (DPA) is executed.

### 2.2 Alignment with Major Data Privacy Frameworks

#### A. European Union General Data Protection Regulation (GDPR - Regulation (EU) 2016/679)
1. **Data Minimization (Art. 5(1)(c))**: The schema captures only necessary identity fields (`email`, `scrypt`-hashed password, display `name`). No behavioral telemetry, third-party cookies, or fingerprinting scripts are packaged.
2. **Storage Limitation (Art. 5(1)(e))**: Enforced configurable retention thresholds (`retentionDays` on `workspaces` table, defaulting to 365 days) with automated database pruning hooks.
3. **Integrity and Confidentiality (Art. 5(1)(f))**: Passwords encrypted using `scrypt` (N=16384, r=8, p=1). Constant-time cryptographic comparison (`crypto.timingSafeEqual`) prevents side-channel analysis.
4. **Right to Erasure / "To Be Forgotten" (Art. 17)**: Fully operational irreversible account deletion endpoint (`DELETE /api/privacy/account`) that invalidates active JWT sessions, drops recovery credentials, and anonymizes personal markers.
5. **Right to Data Portability (Art. 20)**: One-click export engine (`POST /api/privacy/export/:workspaceId`) generates machine-readable JSON and tabular CSV dumps omitting cryptographic secret hashes.

#### B. California Consumer Privacy Act & CPRA (Cal. Civ. Code § 1798.100 et seq.)
- **"Do Not Sell or Share My Personal Information"**: ResolveOS has zero advertising integrations, zero tracking pixels, and does not sell, trade, or share user personal information for cross-context behavioral advertising.

#### C. India Digital Personal Data Protection Act (DPDP 2023)
- Explicit consent records captured in `consent_records` table with versioning, granular purpose binding (`AI_PROCESSING`, `ERROR_LOGGING`), and instant revocation mechanisms in compliance with Sections 6 and 8 of the DPDP Act.

---

## 3. AUTOMATED PII & SECRETS SANITIZATION (HIPAA & PCI-DSS ALIGNMENT)

### 3.1 DataRedactor Architecture
To support organizations subject to strict regulatory oversight when investigating security incidents, ResolveOS features an automated, server-side redaction engine (`DataRedactor`):

| Target Classification | Redaction Mask | Regulatory Reference |
| :--- | :--- | :--- |
| **Email Addresses** | `[EMAIL_REDACTED]` | GDPR Art. 4(1); HIPAA Safe Harbor 45 CFR § 164.514(b)(2)(i)(G) |
| **Authentication Secrets / API Keys** | `[SECRET_REDACTED]` | OWASP ASVS 5.0 V3.2; SOC 2 CC6.1 |
| **Primary Account Numbers (PAN)** | `[CARD_REDACTED]` | PCI-DSS v4.0 Requirement 3.4 (Masking PAN) |
| **JSON Web Tokens (JWT)** | `[JWT_REDACTED]` | NIST SP 800-63B Authenticator Requirements |
| **Private IP Infrastructure** | `[IP_REDACTED]` | NIST SP 800-53 SC-7 Boundary Protection |

### 3.2 Sub-Processor Transmission Defense
In the event an external AI assistant or remote language model is integrated into a workspace:
1. Redaction occurs **prior to serialization and egress**, ensuring secrets never leave the enterprise boundary in plaintext.
2. The user interface provides a live pre-transmission redaction preview.

---

## 4. EVIDENTIARY CHAIN OF CUSTODY & LEGAL DEFICIT REPAIR

### 4.1 Legal Defensibility of Incident Records
During post-incident forensic reviews, insurance claims, or regulatory investigations (e.g., FTC, SEC cybersecurity disclosure rules, or civil litigation):
1. **Admissibility Under FRE 803(6) (Records of Regularly Conducted Activity)**: ResolveOS records problem formulation, evidence corroboration, and verification outcomes as contemporaneous, systematically maintained electronic records.
2. **Self-Authenticating Digital Records (FRE 902(13) & 902(14))**:
   - Each state mutation is bound to an immutable audit record in `case_activities` and `audit_events`.
   - Records capture `timestamp` (ISO 8601 UTC), authenticated `userId`, client IP, user agent, and monotonic `version` integer.
   - Version concurrency checks (`expectedVersion`) guarantee that conflicting edits cannot overwrite evidentiary findings silently.
3. **ISO/IEC 27037:2012 Alignment**: Evidence artifacts attached to cases maintain original file metadata, checksum fingerprints, and cryptographic confidence ratings.

### 4.2 Enforced Resolution Invariant as a Compliance Guard
A frequent source of corporate liability is declaring an incident "resolved" without objective evidence:
- **ResolveOS Invariant Rule**: A transition of a Case to `RESOLVED` status is physically blocked at the schema and state machine layer unless at least one associated empirical verification item has an outcome of `PASSED`.
- **Audit Value**: Provides defensible proof that root-cause remediation was empirically tested prior to operational sign-off.

---

## 5. CRYPTOGRAPHIC SPECIFICATIONS & EXPORT COMPLIANCE

### 5.1 Cryptography Inventory
ResolveOS implements the following cryptographic algorithms:
- **Password Hashing**: `scrypt` (N=16384, r=8, p=1, salt length = 16 bytes, key length = 64 bytes).
- **API Secret Storage**: SHA-256 one-way hashing; masked display (`ro_live_••••••••XXXX`).
- **Two-Factor Authentication**: RFC 6238 Time-Based One-Time Password (TOTP) algorithm using HMAC-SHA1.
- **Authentication Tokens**: Standard JSON Web Tokens (JWT) signed via HMAC-SHA256 (Fastify JWT).
- **Side-Channel Timing Defense**: `crypto.timingSafeEqual` applied to all token and signature comparisons.

### 5.2 U.S. Export Administration Regulations (EAR) Classification
The Software incorporates standard open-source cryptographic algorithms for data protection and user authentication:
- **Classification**: **ECCN 5D002** / **5D992.c** (Mass Market Software / Publicly Available Software under EAR § 742.15(b)).
- **Unrestricted Public Distribution**: Under EAR § 734.3(b)(3), publicly available open-source software without royalty restrictions is not subject to EAR license requirements for standard commercial release.

---

## 6. INTELLECTUAL PROPERTY & OPEN-SOURCE LICENSING

### 6.1 MIT License Terms
ResolveOS is released under the terms of the **MIT License**:

```
Copyright (c) 2026 ResolveOS Authors & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### 6.2 Disclaimer of Warranty & Limitation of Liability
```
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 6.3 Operational Risk Allocation
1. **Critical Infrastructure Disclaimers**: ResolveOS is an investigative and documentation tool. Deploying organizations retain sole responsibility for testing, validating, and executing operational remediations on production systems.
2. **No Legal or Forensic Representation**: ResolveOS does not provide formal legal advice, attorney-client privileged protection, or statutory immunity from regulatory sanction.

---

## 7. SUMMARY COMPLIANCE MATRIX

| Regulatory / Standard Requirement | ResolveOS Architectural Feature | Verification Evidence |
| :--- | :--- | :--- |
| **OWASP ASVS 5.0 V2.1** (Password Security) | `scrypt` hashing with 16-byte random salts | `tests/unit/security.test.ts` (PASS) |
| **OWASP ASVS 5.0 V2.8** (Timing Attacks) | `crypto.timingSafeEqual` on all credentials | `tests/security/security-regression.test.ts` (PASS) |
| **OWASP ASVS 5.0 V12.5** (SSRF Defense) | `SSRFGuard` blocking private IP/cloud metadata | `tests/unit/security.test.ts` (PASS) |
| **OWASP ASVS 5.0 V4.1** (IDOR Defense) | Server-side workspace & case-bound scoping | `tests/security/security-regression.test.ts` (PASS) |
| **GDPR Art. 17** (Right to Erasure) | Automated account & identity anonymization | `apps/api/src/routes/privacy.ts` (PASS) |
| **GDPR Art. 20** (Data Portability) | Structured JSON / CSV workspace export | `apps/api/src/services/ExportImportService.ts` (PASS) |
| **PCI-DSS 4.0 Req 3.4** (Secret Redaction) | Automated `DataRedactor` regex sanitizer | `packages/security/src/index.ts` (PASS) |
| **FRE 902 / ISO 27037** (Integrity) | Monotonic versioning & immutable audit trails | `packages/database/src/schema.ts` (PASS) |
| **Premature Closure Prevention** | Enforced verification invariant before resolution | `packages/domain/src/index.ts` (PASS) |

---
*Document Version: 1.0.0 — Effective Date: September 20, 2026*
