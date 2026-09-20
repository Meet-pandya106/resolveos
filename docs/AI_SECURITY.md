# ResolveOS — AI Security, Evidence Grounding & Prompt Defense

## 1. AI Architecture Overview

ResolveOS treats Artificial Intelligence strictly as an **investigative decision-support tool**, never as an authoritative decision-maker.

```text
                                  ┌──────────────────────────────┐
                                  │      UNTRUSTED EVIDENCE      │
                                  │  (APM Logs, Flamegraphs, UI) │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     DATA REDACTION ENGINE    │
                                  │   (Masks Keys, PII, IPs)     │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │  PROMPT ISOLATION BOUNDARY   │
                                  │  <SYSTEM> vs <UNTRUSTED_DATA>│
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │      AI GATEWAY ROUTER       │
                                  │ (Local Heuristic / LLM API)  │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     EVIDENCE GROUNDING       │
                                  │ (Mandatory Citations & Flags)│
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │    HUMAN-IN-THE-LOOP UI      │
                                  │  (Explicit "AI-Suggested")   │
                                  └──────────────────────────────┘
```

---

## 2. Core Non-Authoritative Guardrails

1. **No Autonomous State Mutation**: The AI engine cannot resolve cases, mark verifications passed, or delete evidence.
2. **Explicit Labeling**: All AI suggestions are badged with `[AI-Suggested]` and `isHumanVerified: false`.
3. **Mandatory Evidence Citations**: Every generated hypothesis must reference one or more active `evidenceCitations` IDs.
4. **Prompt Injection Boundary**: All user-provided case details and logs are encapsulated inside `<UNTRUSTED_EVIDENCE_DATA>` tags. System instructions explicitly command the model to treat content within these tags as passive data, preventing instruction hijack attacks.

---

## 3. Automated PII & Secrets Scrubbing

Before any prompt is formed or dispatched:
- **API Keys & Secrets**: Replaced with `[SECRET_REDACTED]`.
- **Emails**: Replaced with `[EMAIL_REDACTED]`.
- **IP Addresses**: Replaced with `[IP_REDACTED]`.
- **JWTs & Session Tokens**: Replaced with `[JWT_REDACTED]`.
- **URL Credentials**: Replaced with `[URL_CREDENTIALS_REDACTED]`.
