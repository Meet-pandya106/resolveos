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

	it("computes valid SHA-256 hash chains for successive security events", () => {
		const h1 = AuditService.log("LOGIN", {
			userId: "u-1",
			details: { ip: "1.2.3.4" },
		});
		const h2 = AuditService.log("ROLE_CHANGED", {
			userId: "u-1",
			workspaceId: "w-1",
			details: { role: "ADMIN" },
		});
		const h3 = AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			workspaceId: "w-1",
			details: { format: "JSON" },
		});

		expect(h1).toHaveLength(64);
		expect(h2).toHaveLength(64);
		expect(h3).toHaveLength(64);

		const verification = AuditService.verifyChain();
		expect(verification.valid).toBe(true);
		expect(verification.totalEvents).toBe(3);
	});

	it("detects tampering when an audit event payload is modified in place", () => {
		AuditService.log("LOGIN", { userId: "u-1", details: { ip: "1.1.1.1" } });
		AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			details: { format: "JSON" },
		});

		const db = getDatabase();
		const allEvents = db.select().from(auditEvents).all();
		expect(allEvents.length).toBe(2);

		// Maliciously tamper with the details of the second event directly in database
		(allEvents[1] as any).details = { format: "MALICIOUS_CSV_EXPORT" };

		const verification = AuditService.verifyChain();
		expect(verification.valid).toBe(false);
		expect(verification.error).toBe("Current hash payload tampered");
	});

	it("detects tampering when a block is spliced or previousHash is forged", () => {
		AuditService.log("LOGIN", { userId: "u-1" });
		AuditService.log("CASE_EXPORTED", {
			userId: "u-1",
			details: { title: "Case A" },
		});

		const db = getDatabase();
		const allEvents = db.select().from(auditEvents).all();

		// Maliciously modify the previousHash pointer
		(allEvents[1] as any).previousHash =
			"forged_hash_00000000000000000000000000000000000000000000000000000000";

		const verification = AuditService.verifyChain();
		expect(verification.valid).toBe(false);
		expect(verification.error).toBe("Previous hash mismatch");
	});
});
