/**
 * ResolveOS — Automated Backup & Restore Verification Drill
 * Validates logical backup extraction, clean database restoration, referential integrity,
 * and cryptographic audit chain verification.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('          RESOLVEOS BACKUP & RESTORE VERIFICATION DRILL         ');
console.log('================================================================\n');

async function runBackupRestoreDrill() {
  const { initDatabase, users, workspaces, workspaceMembers, cases, caseEvidence, hypotheses, decisions, auditEvents, eq } = await import('../packages/database/dist/index.js');

  console.log('[STEP 1/7] Initializing Source Production Database Instance...');
  const sourceDb = initDatabase(':memory:');

  console.log('[STEP 2/7] Injecting Production Test Data (User, Workspace, Case, Evidence, Audit Trail)...');
  const now = new Date().toISOString();
  const testUserId = 'usr_backup_drill_' + crypto.randomUUID().slice(0, 8);
  const testWorkspaceId = 'ws_backup_drill_' + crypto.randomUUID().slice(0, 8);
  const testCaseId = 'case_backup_drill_' + crypto.randomUUID().slice(0, 8);
  const testEvidenceId = 'evi_backup_drill_' + crypto.randomUUID().slice(0, 8);

  await sourceDb.insert(users).values({
    id: testUserId,
    email: 'backup_drill_admin@resolveos.internal',
    name: 'BACKUP_TEST_USER',
    passwordHash: 'scrypt:901$c2VjdXJlX3Bhc3N3b3Jk',
    twoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    recoveryCodes: ['HASHED_CODE_A', 'HASHED_CODE_B'],
    createdAt: now,
    updatedAt: now,
  }).run();

  await sourceDb.insert(workspaces).values({
    id: testWorkspaceId,
    name: 'BACKUP_TEST_WORKSPACE',
    slug: 'backup-test-workspace',
    ownerId: testUserId,
    retentionDays: 365,
    createdAt: now,
    updatedAt: now,
  }).run();

  await sourceDb.insert(workspaceMembers).values({
    id: 'wm_' + crypto.randomUUID().slice(0, 8),
    workspaceId: testWorkspaceId,
    userId: testUserId,
    role: 'OWNER',
    joinedAt: now,
  }).run();

  await sourceDb.insert(cases).values({
    id: testCaseId,
    workspaceId: testWorkspaceId,
    title: 'BACKUP_TEST_CASE: PostgreSQL Cluster Failover Anomaly',
    description: 'Investigating split-brain detection during network partition.',
    status: 'INVESTIGATING',
    severity: 'CRITICAL',
    priority: 'HIGH',
    ownerId: testUserId,
    version: 1,
    problemStatement: { symptom: 'Read-only replica rejected promotion' },
    createdAt: now,
    updatedAt: now,
  }).run();

  await sourceDb.insert(caseEvidence).values({
    id: testEvidenceId,
    caseId: testCaseId,
    title: 'PostgreSQL WAL Replay Log',
    type: 'LOG',
    content: 'PANIC: could not locate a valid checkpoint record',
    hash: crypto.createHash('sha256').update('PANIC: checkpoint record').digest('hex'),
    uploadedBy: testUserId,
    createdAt: now,
  }).run();

  // Audit Hash Chain
  let prevHash = '0'.repeat(64);
  const events = [
    { action: 'USER_REGISTERED', entityType: 'USER', entityId: testUserId },
    { action: 'WORKSPACE_CREATED', entityType: 'WORKSPACE', entityId: testWorkspaceId },
    { action: 'CASE_CREATED', entityType: 'CASE', entityId: testCaseId },
    { action: 'EVIDENCE_ATTACHED', entityType: 'EVIDENCE', entityId: testEvidenceId }
  ];

  for (let i = 0; i < events.length; i++) {
    const seq = i + 1;
    const ts = new Date(Date.now() + seq * 10).toISOString();
    const curHash = crypto.createHash('sha256').update(`${prevHash}:${seq}:${ts}:${JSON.stringify(events[i])}`).digest('hex');
    await sourceDb.insert(auditEvents).values({
      id: 'aud_' + crypto.randomUUID().slice(0, 8),
      sequence: seq,
      actorId: testUserId,
      workspaceId: testWorkspaceId,
      action: events[i].action,
      entityType: events[i].entityType,
      entityId: events[i].entityId,
      payload: events[i],
      previousHash: prevHash,
      currentHash: curHash,
      createdAt: ts,
    }).run();
    prevHash = curHash;
  }
  console.log('   -> 4 Domain records & 4 SHA-256 Audit Events Created.');

  console.log('[STEP 3/7] Generating Logical Backup Archive (SQL/JSON)...');
  const backupArchive = {
    metadata: {
      generator: 'ResolveOS Backup Service v1.0.0',
      exportedAt: new Date().toISOString(),
      format: 'RESOLVEOS_LOGICAL_EXPORT',
    },
    tables: {
      users: await sourceDb.select().from(users).all(),
      workspaces: await sourceDb.select().from(workspaces).all(),
      workspaceMembers: await sourceDb.select().from(workspaceMembers).all(),
      cases: await sourceDb.select().from(cases).all(),
      caseEvidence: await sourceDb.select().from(caseEvidence).all(),
      auditEvents: await sourceDb.select().from(auditEvents).all(),
    }
  };

  const backupFile = path.resolve(__dirname, '../resolveos_backup_test.json');
  fs.writeFileSync(backupFile, JSON.stringify(backupArchive, null, 2), 'utf8');
  console.log(`   -> Backup file created at ${backupFile} (${fs.statSync(backupFile).size} bytes).`);

  console.log('[STEP 4/7] Instantiating Clean Isolated Target Database...');
  const targetDb = initDatabase(':memory:');

  console.log('[STEP 5/7] Restoring Backup Data into Target Database...');
  const parsedBackup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  for (const u of parsedBackup.tables.users) await targetDb.insert(users).values(u).run();
  for (const w of parsedBackup.tables.workspaces) await targetDb.insert(workspaces).values(w).run();
  for (const m of parsedBackup.tables.workspaceMembers) await targetDb.insert(workspaceMembers).values(m).run();
  for (const c of parsedBackup.tables.cases) await targetDb.insert(cases).values(c).run();
  for (const e of parsedBackup.tables.caseEvidence) await targetDb.insert(caseEvidence).values(e).run();
  for (const a of parsedBackup.tables.auditEvents) await targetDb.insert(auditEvents).values(a).run();
  console.log('   -> Successfully restored all tables.');

  console.log('[STEP 6/7] Verifying Application State, Referential Integrity & Audit Chain...');
  const user = await targetDb.select().from(users).where(eq(users.id, testUserId)).get();
  if (!user || user.name !== 'BACKUP_TEST_USER') throw new Error('User recovery verification failed');

  const ws = await targetDb.select().from(workspaces).where(eq(workspaces.id, testWorkspaceId)).get();
  if (!ws || ws.ownerId !== testUserId) throw new Error('Workspace ownership verification failed');

  const c = await targetDb.select().from(cases).where(eq(cases.id, testCaseId)).get();
  if (!c || c.status !== 'INVESTIGATING' || c.severity !== 'CRITICAL') throw new Error('Case recovery verification failed');

  const evi = await targetDb.select().from(caseEvidence).where(eq(caseEvidence.caseId, testCaseId)).all();
  if (evi.length !== 1 || evi[0].title !== 'PostgreSQL WAL Replay Log') throw new Error('Evidence recovery verification failed');

  const audits = await targetDb.select().from(auditEvents).where(eq(auditEvents.workspaceId, testWorkspaceId)).all();
  audits.sort((a, b) => a.sequence - b.sequence);
  let vPrev = '0'.repeat(64);
  for (const aud of audits) {
    if (aud.previousHash !== vPrev) throw new Error(`Audit hash chain broken at sequence ${aud.sequence}`);
    const exp = crypto.createHash('sha256').update(`${aud.previousHash}:${aud.sequence}:${aud.createdAt}:${JSON.stringify(aud.payload)}`).digest('hex');
    if (aud.currentHash !== exp) throw new Error(`Audit cryptographic signature mismatch at sequence ${aud.sequence}`);
    vPrev = aud.currentHash;
  }
  console.log('   -> Application entities, foreign keys, and SHA-256 audit chain 100% verified.');

  console.log('[STEP 7/7] Cleaning up temporary drill files...');
  if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);

  console.log('\n================================================================');
  console.log('>>> BACKUP & RESTORE DRILL: 100% SUCCESSFUL (VERIFIED PASS) <<<');
  console.log('================================================================\n');
}

runBackupRestoreDrill().catch((err) => {
  console.error('\n>>> BACKUP & RESTORE DRILL FAILED:', err.message);
  process.exit(1);
});
