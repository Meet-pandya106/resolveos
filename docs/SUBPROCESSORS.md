# ResolveOS — Subprocessors Transparency Table

By default, ResolveOS operates **entirely locally with zero external subprocessors**.

When optional external integrations are explicitly enabled by the administrator, the following subprocessors may be involved:

| Subprocessor | Purpose | Data Transmitted | Location | Optional / Required |
|---|---|---|---|---|
| **Self-Hosted PostgreSQL** | Primary relational database storage | Account and workspace case records | Customer-selected infrastructure | Configurable |
| **OpenAI / Anthropic (Optional)** | Heuristic AI hypothesis and root-cause suggestions | Redacted problem statements & evidence summaries (PII stripped) | United States | Optional (Disabled by default) |
| **Self-Hosted SMTP (Optional)** | Account verification & notification dispatch | User email address & notification body | Customer-selected infrastructure | Optional |
