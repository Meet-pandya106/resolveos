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

ResolveOS provides an automated verification drill for single-node backup and restoration validation:
```bash
# 1. Execute automated backup and restoration verification script
node scripts/test-backup-restore.cjs

# 2. Manual Docker Compose Drill:
# a. Dump live production database
docker compose exec postgres pg_dump -U resolveos_user -Fc resolveos > ./backups/drill_backup.dump

# b. Create isolated drill sandbox database
docker compose exec postgres createdb -U resolveos_user resolveos_drill

# c. Restore into drill database
docker compose exec -T postgres pg_restore -U resolveos_user -d resolveos_drill -c ./backups/drill_backup.dump

# d. Verify data integrity and audit log hash chain
docker compose exec postgres psql -U resolveos_user -d resolveos_drill -c "SELECT COUNT(*) FROM cases; SELECT COUNT(*) FROM audit_events;"
```

