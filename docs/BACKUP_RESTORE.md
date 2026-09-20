# ResolveOS — Database Backup & Disaster Recovery Guide

This document outlines the backup, restoration, and disaster recovery procedures for **ResolveOS** in single-node self-hosted deployments.

---

## 1. Database Architecture Overview

ResolveOS utilizes PostgreSQL 14+ (defaulting to PostgreSQL 16 Alpine via Docker Compose) for all persistent data storage.

* **Primary Database Service:** `postgres`
* **Default Database Name:** `resolveos` (configured via `POSTGRES_DB`)
* **Default User:** `resolveos_user` (configured via `POSTGRES_USER`)
* **Persistent Volume:** `pgdata` (`/var/lib/postgresql/data`)

---

## 2. Backup Procedures

### Method A: Docker Compose Logical Backup (Recommended)

To create a consistent logical backup of the live PostgreSQL database:

```bash
# Generate compressed binary custom-format dump
docker compose exec postgres pg_dump -U resolveos_user -Fc resolveos > ./backups/resolveos_backup_$(date +%Y%m%d_%H%M%S).dump

# Or generate plain-text SQL backup
docker compose exec postgres pg_dump -U resolveos_user resolveos > ./backups/resolveos_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Method B: Native PostgreSQL / Direct Connection

```bash
pg_dump "$DATABASE_URL" -Fc -f ./backups/resolveos_backup.dump
```

---

## 3. Restoration Runbook

### Step 1: Prepare Clean Restore Database

```bash
# Create target database if restoring to an alternative database
docker compose exec postgres createdb -U resolveos_user resolveos_restored
```

### Step 2: Restore from Backup Archive

```bash
# If restoring from custom-format dump (.dump)
docker compose exec -T postgres pg_restore -U resolveos_user -d resolveos_restored -c ./backups/resolveos_backup.dump

# If restoring from plain SQL backup (.sql)
docker compose exec -T postgres psql -U resolveos_user -d resolveos_restored < ./backups/resolveos_backup.sql
```

### Step 3: Point Application to Restored Database

Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgres://resolveos_user:YOUR_SECURE_PASSWORD@postgres:5432/resolveos_restored
```

Restart the API container:
```bash
docker compose restart resolveos-api
```

### Step 4: Verify Application Health and Data Integrity

```bash
# Verify health and database readiness
curl http://localhost:4000/health
curl http://localhost:4000/readiness

# Verify audit trail integrity
npm run audit:verify
```

---

## 4. Automated Backup Drill Script

ResolveOS includes an automated verification script to test backup and restore mechanics:

```bash
node scripts/test-backup-restore.cjs
```
