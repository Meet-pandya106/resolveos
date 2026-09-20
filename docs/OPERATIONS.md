# ResolveOS — Production Operations & Observability Guide

## 1. Observability Architecture

ResolveOS exports telemetry and health signals for SRE and operations monitoring:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY SIGNALS                             │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Health Signals  │ /health (Liveness) • /readiness (Database Readiness) │
│ Structured Logs │ JSON formatted with Request IDs and Error Stack Traces│
│ Rate Limiting   │ Header telemetry: X-RateLimit-Limit, Remaining, Reset│
│ Real-Time Stats │ Active WebSocket connections and Workspace Channels  │
│ Security Audits │ Tamper-evident SHA-256 Audit Log Chaining           │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Health & Readiness Probe Configuration (Kubernetes / ECS)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readiness
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
```

---

## 3. SLA, SLO & Error Budget

| Metric | Target SLO | Measurement Method | Alerting Threshold |
|---|---|---|---|
| **API Availability** | **99.9%** (3 nines) | Percentage of non-5xx requests over 30d window | Availability < 99.8% over 1h |
| **p95 Request Latency** | **< 200ms** | Response duration for `/api/*` endpoints | p95 > 350ms for 5m |
| **p99 Request Latency** | **< 500ms** | Response duration for complex search/case loads | p99 > 800ms for 5m |
| **Offline Sync Accuracy** | **100%** | Zero silent overwrites or discarded mutations | Any unresolved sync conflict |
