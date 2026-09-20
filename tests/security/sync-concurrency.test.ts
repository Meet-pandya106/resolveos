import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "../../apps/api/src/index.js";
import {
	closeDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("Security & Offline Sync: Batch Ingestion, Idempotency & 3-Way Differential Merge", () => {
	let userToken: string;
	let workspaceId: string;
	let caseId: string;

	beforeAll(async () => {
		initDatabase(":memory:");
		await server.ready();

		// Register user
		const reg = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "sync.tester@resolveos.test",
				password: "Password#Sync2026!",
				name: "Sync Tester",
			},
		});
		const body = JSON.parse(reg.payload);
		userToken = body.token;
		workspaceId = body.defaultWorkspaceId;

		// Create baseline Case
		const caseRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: {
				title: "Distributed Database Partition",
				description: "Node cluster desynchronized",
				severity: "HIGH",
			},
		});
		caseId = JSON.parse(caseRes.payload).id;
	});

	afterAll(async () => {
		await server.close();
		closeDatabase();
	});

	it("1. Applies clean non-conflicting offline mutation batch and returns APPLIED", async () => {
		const idempotencyKey = crypto.randomUUID();
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/sync`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: {
				mutations: [
					{
						idempotencyKey,
						entityType: "CASE",
						entityId: caseId,
						action: "UPDATE",
						baseSnapshot: {
							title: "Distributed Database Partition",
							description: "Node cluster desynchronized",
						},
						localSnapshot: {
							title: "Distributed Database Partition - Triage Complete",
							description: "Node cluster desynchronized",
						},
						clientTimestamp: Date.now(),
					},
				],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.payload);
		expect(body.appliedCount).toBe(1);
		expect(body.conflictCount).toBe(0);
		expect(body.results[0].status).toBe("APPLIED");
	});

	it("2. Enforces idempotency by ignoring duplicate mutation with same idempotency key", async () => {
		const idempotencyKey = "IDEM-REPEAT-KEY-001";

		// First submission
		await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/sync`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: {
				mutations: [
					{
						idempotencyKey,
						entityType: "CASE",
						entityId: caseId,
						action: "UPDATE",
						localSnapshot: { description: "Updated description" },
						clientTimestamp: Date.now(),
					},
				],
			},
		});

		// Replay submission with same key
		const replayRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/sync`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: {
				mutations: [
					{
						idempotencyKey,
						entityType: "CASE",
						entityId: caseId,
						action: "UPDATE",
						localSnapshot: { description: "Updated description" },
						clientTimestamp: Date.now(),
					},
				],
			},
		});

		expect(replayRes.statusCode).toBe(200);
		const body = JSON.parse(replayRes.payload);
		expect(body.results[0].status).toBe("IDEMPOTENT_IGNORED");
	});

	it("3. Detects concurrent conflicting field modifications during 3-way sync", async () => {
		// 1. Mutate remote on server directly
		await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: { title: "Server Authoritative Rename" },
		});

		// 2. Submit offline mutation that diverged on the same field from stale base
		const conflictRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/sync`,
			headers: { authorization: `Bearer ${userToken}` },
			payload: {
				mutations: [
					{
						idempotencyKey: crypto.randomUUID(),
						entityType: "CASE",
						entityId: caseId,
						action: "UPDATE",
						baseSnapshot: { title: "Old Original Title" },
						localSnapshot: { title: "Client Offline Diverged Rename" },
						clientTimestamp: Date.now(),
					},
				],
			},
		});

		expect(conflictRes.statusCode).toBe(200);
		const body = JSON.parse(conflictRes.payload);
		expect(body.conflictCount).toBe(1);
		expect(body.results[0].status).toBe("CONFLICT");
		expect(body.results[0].conflictingFields).toContain("title");
	});
});
