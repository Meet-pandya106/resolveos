import { beforeEach, describe, expect, it } from "vitest";
import { AuditService } from "../../apps/api/src/services/AuditService.js";
import {
	auditEvents,
	getDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("Tamper-Evident Cryptographic Audit Log", () => {
	beforeEach(() => {
		initDatabase();
	});

	it("computes valid SHA-256 hash chains for successive security events", async () => {
		const h1 = await AuditService.log("LOGIN", {
			userId: "u-1",
			details: { ip: "1.2.3.4" },
		});
		const h2 = await AuditService.log("ROLE_CHANGED", {
			userId: "u-1",
			workspaceId: "w-1",
			details: { role: "ADMIN" },
		});
		const h3 = await AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			workspaceId: "w-1",
			details: { format: "JSON" },
		});

		expect(h1).toHaveLength(64);
		expect(h2).toHaveLength(64);
		expect(h3).toHaveLength(64);

		const verification = await AuditService.verifyChain();
		expect(verification.valid).toBe(true);
		expect(verification.totalEvents).toBe(3);
	});

	it("detects tampering when an audit event payload is modified in place", async () => {
		await AuditService.log("LOGIN", { userId: "u-1", details: { ip: "1.1.1.1" } });
		await AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			details: { format: "JSON" },
		});

		const db = getDatabase();
		const allEvents = await db.select().from(auditEvents).all();
		expect(allEvents.length).toBe(2);

		// Maliciously tamper with the details of the second event directly in database
		(allEvents[1] as any).details = { format: "MALICIOUS_CSV_EXPORT" };

		const verification = await AuditService.verifyChain();
		expect(verification.valid).toBe(false);
		expect(verification.error).toBe("Current hash payload tampered");
	});

	it("detects tampering when a block is spliced or previousHash is forged", async () => {
		await AuditService.log("LOGIN", { userId: "u-1" });
		await AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			details: { title: "Case A" },
		});

		const db = getDatabase();
		const allEvents = await db.select().from(auditEvents).all();

		// Maliciously modify the previousHash pointer
		(allEvents[1] as any).previousHash =
			"forged_hash_00000000000000000000000000000000000000000000000000000000";

		const verification = await AuditService.verifyChain();
		expect(verification.valid).toBe(false);
		expect(verification.error).toBe("Previous hash mismatch");
	});

	it("preserves cryptographic chain validity under concurrent audit log writes (Rule 21, 22)", async () => {
		const writePromises = Array.from({ length: 10 }, (_, i) =>
			AuditService.log("LOGIN", {
				userId: `user-${i}`,
				details: { sequence: i, timestamp: Date.now() },
			}),
		);

		const hashes = await Promise.all(writePromises);
		expect(hashes.length).toBe(10);
		hashes.forEach((h) => expect(h).toHaveLength(64));

		const verification = await AuditService.verifyChain();
		expect(verification.valid).toBe(true);
		expect(verification.totalEvents).toBe(10);
	});
});
