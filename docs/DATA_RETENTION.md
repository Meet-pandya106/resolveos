# ResolveOS — Data Retention & Automated Purge Policy

## 1. Overview & Data Minimization
In accordance with GDPR Article 5(1)(e) and DPDP standards, ResolveOS retains personal and operational data only for as long as necessary to fulfill its problem-resolution and governance purposes.

---

## 2. Retention Schedules

| Data Category | Default Retention Period | Automated Action at Expiry | User Controls |
|---|---|---|---|
| **Active Problem Cases** | Lifetime of Case | Retained while active | Archive / Delete |
| **Archived Cases** | Workspace Configured (Default: 365 Days) | Scheduled for permanent deletion | Immediate Purge |
| **User Sessions** | 7 Days of Inactivity | Automatically invalidated and revoked | One-click Remote Revocation |
| **Security Audit Logs** | 90 Days | Rotated and purged | Read-Only Export |
| **Local Offline Queue** | Cleared upon successful synchronization | Automatically drained | Manual Queue Clear |
| **Deleted User Accounts** | Immediate Anonymization | Name, email, and 2FA secrets replaced with synthetic tokens | Irreversible |

---

## 3. Account Erasure Protocol

When an account deletion request is authenticated:
1. All session tokens are marked `isRevoked: true`.
2. The user's `email` is overwritten with `deleted_<uuid>@anonymized.local`.
3. The user's `name` is overwritten with `Deleted User`.
4. Password hashes and two-factor secrets are overwritten.
5. An immutable `ACCOUNT_DELETED` audit event is logged.
