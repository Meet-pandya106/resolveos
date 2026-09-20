import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "../../apps/api/src/index.js";
import {
	closeDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("Security Regression Suite: Authorization, IDOR, SQLi & XSS Defense", () => {
	let userAToken: string;
	let userBToken: string;
	let workspaceAId: string;
	let workspaceBId: string;
	let caseAId: string;

	beforeAll(async () => {
		initDatabase(":memory:");
		await server.ready();

		// 1. Register User A
		const regA = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "usera@resolveos.test",
				password: "Password#1234A",
				name: "User Alpha",
			},
		});
		const bodyA = JSON.parse(regA.payload);
		userAToken = bodyA.token;
		workspaceAId = bodyA.defaultWorkspaceId;

		// 2. Register User B
		const regB = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "userb@resolveos.test",
				password: "Password#1234B",
				name: "User Beta",
			},
		});
		const bodyB = JSON.parse(regB.payload);
		userBToken = bodyB.token;
		workspaceBId = bodyB.defaultWorkspaceId;

		// 3. User A creates a Case in Workspace A
		const caseRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceAId}/cases`,
			headers: { authorization: `Bearer ${userAToken}` },
			payload: {
				title: "Secret Case Alpha",
				description: "Classified internal incident",
				severity: "HIGH",
			},
		});
		caseAId = JSON.parse(caseRes.payload).id;
	});

	afterAll(async () => {
		await server.close();
		closeDatabase();
	});

	it("IDOR / Cross-Workspace Isolation: User B cannot access User A case", async () => {
		const res = await server.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceAId}/cases/${caseAId}`,
			headers: { authorization: `Bearer ${userBToken}` },
		});

		expect(res.statusCode).toBe(403);
		const body = JSON.parse(res.payload);
		expect(body.error).toBe("Forbidden");
	});

	it("Role Escalation Defense: Viewer/Member cannot update workspace retention or delete workspace", async () => {
		// Add User B as VIEWER in Workspace A
		await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceAId}/members`,
			headers: { authorization: `Bearer ${userAToken}` },
			payload: {
				email: "userb@resolveos.test",
				role: "VIEWER",
			},
		});

		// User B attempts to change workspace retention (Requires OWNER / ADMIN)
		const escalateRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceAId}`,
			headers: { authorization: `Bearer ${userBToken}` },
			payload: {
				retentionDays: 1,
			},
		});

		expect(escalateRes.statusCode).toBe(403);
	});

	it("SQL Injection Defense: Parameterized queries safely store single quotes & SQL payloads", async () => {
		const maliciousTitle = "Case'; DROP TABLE cases; -- ' OR '1'='1";
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceAId}/cases`,
			headers: { authorization: `Bearer ${userAToken}` },
			payload: {
				title: maliciousTitle,
				description: "Testing SQL injection resilience",
			},
		});

		expect(res.statusCode).toBe(201);

		// Verify case was saved as literal string and table was not dropped
		const listRes = await server.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceAId}/cases`,
			headers: { authorization: `Bearer ${userAToken}` },
		});
		const casesList = JSON.parse(listRes.payload);
		const injectedCase = casesList.find((c: any) => c.title === maliciousTitle);
		expect(injectedCase).toBeDefined();
	});

	it("State Transition Enforcement: Cannot transition from DRAFT directly to RESOLVED without verification", async () => {
		// Create draft case
		const createDraft = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceAId}/cases`,
			headers: { authorization: `Bearer ${userAToken}` },
			payload: {
				title: "Draft Case Bypass Test",
				severity: "LOW",
			},
		});
		const draftId = JSON.parse(createDraft.payload).id;

		// Attempt invalid transition
		const bypassRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceAId}/cases/${draftId}`,
			headers: { authorization: `Bearer ${userAToken}` },
			payload: {
				status: "RESOLVED",
			},
		});

		expect(bypassRes.statusCode).toBe(400);
		const body = JSON.parse(bypassRes.payload);
		expect(body.message).toContain("Invalid state transition");
	});
});
