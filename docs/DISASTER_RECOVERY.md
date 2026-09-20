# ResolveOS — Disaster Recovery & Business Continuity Plan

**Document Version:** 1.0.0  
**Target RPO (Recovery Point Objective):** < 1 hour  
**Target RTO (Recovery Time Objective):** < 30 minutes  

---

## 1. Disaster Scenarios & Playbooks

### Scenario A: Primary Database Corruption or Data Center Failure
1. **Detection**: Health check alert triggers when `/readiness` returns 503 (database connection timeout).
2. **Failover Procedure**:
   ```bash
   # Promote read-replica / Standby PostgreSQL instance
   pg_ctl promote -D /var/lib/postgresql/data
   
   # Update application DATABASE_URL environment variable
   export DATABASE_URL="postgres://resolveos_app:SECURE_PASS@standby-db.internal:5432/resolveos"
   
   # Restart Fastify backend instances
   docker compose restart resolveos-api
   ```
3. **Verification**: Execute `GET /readiness` to confirm healthy database ping.

### Scenario B: Cryptographic Key Compromise (JWT / Session Secret)
1. **Immediate Revocation**:
   ```bash
   # Generate new 64-byte high-entropy secrets
   NEW_JWT_SECRET=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")
   NEW_SESSION_SECRET=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")
   
   # Update running containers
   export JWT_SECRET=$NEW_JWT_SECRET
   export SESSION_SECRET=$NEW_SESSION_SECRET
   docker compose up -d --no-deps resolveos-api
   ```
2. **Session Purge**: All active user sessions are invalidated immediately, forcing re-authentication across all clients.

---

## 2. Automated Backup Verification Drill

ResolveOS enforces a weekly backup restoration drill:
```bash
# 1. Download latest compressed dump
LATEST_BACKUP=$(aws s3 ls s3://resolveos-backups/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://resolveos-backups/$LATEST_BACKUP ./test_restore.dump

# 2. Restore to isolated drill sandbox database
createdb -h localhost -U postgres resolveos_drill
pg_restore -h localhost -U postgres -d resolveos_drill -v ./test_restore.dump

# 3. Verify data integrity and audit log hash chain
psql -h localhost -U postgres -d resolveos_drill -c "SELECT COUNT(*) FROM cases; SELECT COUNT(*) FROM audit_events;"
```
