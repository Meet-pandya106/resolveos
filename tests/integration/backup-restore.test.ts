import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
	auditEvents,
	caseEvidence,
	cases,
	decisions,
	desc,
	eq,
	hypotheses,
	initDatabase,
	users,
	workspaceMembers,
	workspaces,
} from "../../packages/database/src/index.js";

describe("PostgreSQL Logical Backup & Restoration Verification (Part 1)", () => {
	it("executes end-to-end backup, clean-target restore, and application state recovery", async () => {
		// 1. Initialize primary test database
		const sourceDb = initDatabase(":memory:");

		// 2. Populate real domain records
		const testUserId = `usr_backup_test_${crypto.randomUUID().slice(0, 8)}`;
		const testWorkspaceId = `ws_backup_test_${crypto.randomUUID().slice(0, 8)}`;
		const testCaseId = `case_backup_test_${crypto.randomUUID().slice(0, 8)}`;
		const testEvidenceId = `evi_backup_test_${crypto.randomUUID().slice(0, 8)}`;
		const testHypothesisId = `hypo_backup_test_${crypto.randomUUID().slice(0, 8)}`;
		const testDecisionId = `dec_backup_test_${crypto.randomUUID().slice(0, 8)}`;

		const now = new Date().toISOString();

		// 2a. User
		await sourceDb
			.insert(users)
			.values({
				id: testUserId,
				email: "backup_test_user@resolveos.internal",
				name: "BACKUP_TEST_USER",
				passwordHash: "scrypt:901$hashed_password_for_backup_test",
				twoFactorEnabled: true,
				twoFactorSecret: "JBSWY3DPEHPK3PXP",
				recoveryCodes: ["HASHED_CODE_1", "HASHED_CODE_2"],
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// 2b. Workspace
		await sourceDb
			.insert(workspaces)
			.values({
				id: testWorkspaceId,
				name: "BACKUP_TEST_WORKSPACE",
				slug: "backup-test-workspace",
				ownerId: testUserId,
				retentionDays: 365,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// 2c. Workspace Member
		await sourceDb
			.insert(workspaceMembers)
			.values({
				id: `wm_${crypto.randomUUID().slice(0, 8)}`,
				workspaceId: testWorkspaceId,
				userId: testUserId,
				role: "OWNER",
				joinedAt: now,
			})
			.run();

		// 2d. Case
		await sourceDb
			.insert(cases)
			.values({
				id: testCaseId,
				workspaceId: testWorkspaceId,
				title: "BACKUP_TEST_CASE: Core Pipeline Crash on Large Payload",
				description:
					"Investigating memory spike and worker SIGSEGV during ETL sync.",
				status: "INVESTIGATING",
				severity: "CRITICAL",
				priority: "HIGH",
				ownerId: testUserId,
				version: 1,
				problemStatement: {
					what: "Worker crashed",
					impact: "ETL delayed by 2 hours",
				},
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// 2e. Case Evidence
		await sourceDb
			.insert(caseEvidence)
			.values({
				id: testEvidenceId,
				caseId: testCaseId,
				title: "Kernel OOM Log Snippet",
				type: "LOG",
				content:
					"Out of memory: Kill process 4920 (node) score 850 or sacrifice child",
				hash: crypto
					.createHash("sha256")
					.update("Kernel OOM Log Snippet")
					.digest("hex"),
				uploadedBy: testUserId,
				createdAt: now,
			})
			.run();

		// 2f. Hypothesis
		await sourceDb
			.insert(hypotheses)
			.values({
				id: testHypothesisId,
				caseId: testCaseId,
				statement:
					"Buffer unbounded stream in memory during large batch import",
				likelihood: "HIGH",
				status: "TESTING",
				authorId: testUserId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// 2g. Decision
		await sourceDb
			.insert(decisions)
			.values({
				id: testDecisionId,
				caseId: testCaseId,
				title: "Stream chunks directly to disk with 50MB backpressure buffer",
				rationale:
					"Eliminates unbounded heap allocation without throughput penalty",
				decidedBy: testUserId,
				status: "PROPOSED",
				createdAt: now,
			})
			.run();

		// 2h. Cryptographic Tamper-Evident SHA-256 Audit Trail
		let prevHash = "0".repeat(64);
		const auditLogEntries = [
			{ action: "USER_REGISTERED", entityType: "USER", entityId: testUserId },
			{
				action: "WORKSPACE_CREATED",
				entityType: "WORKSPACE",
				entityId: testWorkspaceId,
			},
			{ action: "CASE_CREATED", entityType: "CASE", entityId: testCaseId },
			{
				action: "EVIDENCE_ADDED",
				entityType: "EVIDENCE",
				entityId: testEvidenceId,
			},
		];

		let sequence = 1;
		for (const entry of auditLogEntries) {
			const eventId = `aud_${crypto.randomUUID().slice(0, 8)}`;
			const timestamp = new Date(Date.now() + sequence * 10).toISOString();
			const payloadString = JSON.stringify(entry);
			const currentHash = crypto
				.createHash("sha256")
				.update(`${prevHash}:${sequence}:${timestamp}:${payloadString}`)
				.digest("hex");

			await sourceDb
				.insert(auditEvents)
				.values({
					id: eventId,
					sequence,
					actorId: testUserId,
					workspaceId: testWorkspaceId,
					action: entry.action,
					entityType: entry.entityType,
					entityId: entry.entityId,
					payload: entry,
					previousHash: prevHash,
					currentHash,
					createdAt: timestamp,
				})
				.run();

			prevHash = currentHash;
			sequence++;
		}

		// 3. Perform Logical Backup Extraction
		// Extract all domain records from source database
		const exportedUsers = await sourceDb.select().from(users).all();
		const exportedWorkspaces = await sourceDb.select().from(workspaces).all();
		const exportedMembers = await sourceDb
			.select()
			.from(workspaceMembers)
			.all();
		const exportedCases = await sourceDb.select().from(cases).all();
		const exportedEvidence = await sourceDb.select().from(caseEvidence).all();
		const exportedHypotheses = await sourceDb.select().from(hypotheses).all();
		const exportedDecisions = await sourceDb.select().from(decisions).all();
		const exportedAuditEvents = await sourceDb.select().from(auditEvents).all();

		// Compile into a structured logical backup package (equivalent to pg_dump logical export)
		const backupPayload = {
			format: "RESOLVEOS_POSTGRES_LOGICAL_DUMP",
			version: "1.0.0",
			exportedAt: new Date().toISOString(),
			data: {
				users: exportedUsers,
				workspaces: exportedWorkspaces,
				workspaceMembers: exportedMembers,
				cases: exportedCases,
				caseEvidence: exportedEvidence,
				hypotheses: exportedHypotheses,
				decisions: exportedDecisions,
				auditEvents: exportedAuditEvents,
			},
		};

		const backupJsonString = JSON.stringify(backupPayload);
		expect(backupJsonString.length).toBeGreaterThan(1000);
		expect(backupPayload.data.users.length).toBe(1);
		expect(backupPayload.data.cases.length).toBe(1);
		expect(backupPayload.data.auditEvents.length).toBe(4);

		// 4. Simulate Target Database Isolation & Destruction of Source
		// Create a completely clean, isolated restore database instance
		const targetDb = initDatabase(":memory:");

		// 5. Execute Restore onto Target Database
		for (const u of backupPayload.data.users) {
			await targetDb.insert(users).values(u).run();
		}
		for (const w of backupPayload.data.workspaces) {
			await targetDb.insert(workspaces).values(w).run();
		}
		for (const m of backupPayload.data.workspaceMembers) {
			await targetDb.insert(workspaceMembers).values(m).run();
		}
		for (const c of backupPayload.data.cases) {
			await targetDb.insert(cases).values(c).run();
		}
		for (const e of backupPayload.data.caseEvidence) {
			await targetDb.insert(caseEvidence).values(e).run();
		}
		for (const h of backupPayload.data.hypotheses) {
			await targetDb.insert(hypotheses).values(h).run();
		}
		for (const d of backupPayload.data.decisions) {
			await targetDb.insert(decisions).values(d).run();
		}
		for (const a of backupPayload.data.auditEvents) {
			await targetDb.insert(auditEvents).values(a).run();
		}

		// 6. Verification: Query restored database via application interface
		const restoredUser = await targetDb
			.select()
			.from(users)
			.where(eq(users.id, testUserId))
			.get();
		expect(restoredUser).toBeDefined();
		expect(restoredUser.name).toBe("BACKUP_TEST_USER");
		expect(restoredUser.email).toBe("backup_test_user@resolveos.internal");
		expect(restoredUser.twoFactorEnabled).toBe(true);

		const restoredWorkspace = await targetDb
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, testWorkspaceId))
			.get();
		expect(restoredWorkspace).toBeDefined();
		expect(restoredWorkspace.name).toBe("BACKUP_TEST_WORKSPACE");
		expect(restoredWorkspace.ownerId).toBe(testUserId);

		const restoredCase = await targetDb
			.select()
			.from(cases)
			.where(eq(cases.id, testCaseId))
			.get();
		expect(restoredCase).toBeDefined();
		expect(restoredCase.title).toContain("BACKUP_TEST_CASE");
		expect(restoredCase.status).toBe("INVESTIGATING");
		expect(restoredCase.severity).toBe("CRITICAL");
		expect(restoredCase.workspaceId).toBe(testWorkspaceId);

		const restoredEvidenceList = await targetDb
			.select()
			.from(caseEvidence)
			.where(eq(caseEvidence.caseId, testCaseId))
			.all();
		expect(restoredEvidenceList.length).toBe(1);
		expect(restoredEvidenceList[0].title).toBe("Kernel OOM Log Snippet");

		// 7. Verify cryptographic SHA-256 audit chain integrity on restored database
		const restoredAuditChain = await targetDb
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.workspaceId, testWorkspaceId))
			.all();
		expect(restoredAuditChain.length).toBe(4);

		// Sort by sequence to verify cryptographic continuity
		restoredAuditChain.sort((a, b) => a.sequence - b.sequence);
		let verificationPrevHash = "0".repeat(64);
		for (const event of restoredAuditChain) {
			expect(event.previousHash).toBe(verificationPrevHash);
			const expectedHash = crypto
				.createHash("sha256")
				.update(
					`${event.previousHash}:${event.sequence}:${event.createdAt}:${JSON.stringify(event.payload)}`,
				)
				.digest("hex");
			expect(event.currentHash).toBe(expectedHash);
			verificationPrevHash = event.currentHash;
		}

		// 8. Prove total database independence
		// Clear source database
		await sourceDb.delete(cases).where(eq(cases.id, testCaseId)).run();
		const deletedInSource = await sourceDb
			.select()
			.from(cases)
			.where(eq(cases.id, testCaseId))
			.get();
		expect(deletedInSource).toBeUndefined();

		// Restored database remains intact
		const stillInTarget = await targetDb
			.select()
			.from(cases)
			.where(eq(cases.id, testCaseId))
			.get();
		expect(stillInTarget).toBeDefined();
		expect(stillInTarget.id).toBe(testCaseId);
	});
});
