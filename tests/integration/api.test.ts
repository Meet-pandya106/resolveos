import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "../../apps/api/src/index.js";
import {
	closeDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("Integration: Complete Problem Resolution Lifecycle", () => {
	let token: string;
	let workspaceId: string;
	let caseId: string;
	let solutionId: string;
	let actionId: string;

	beforeAll(async () => {
		initDatabase(":memory:");
		await server.ready();
	});

	afterAll(async () => {
		await server.close();
		closeDatabase();
	});

	it("1. Registers user and initializes personal workspace", async () => {
		const res = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "devon.architect@resolveos.test",
				password: "Password#2026Secure!",
				name: "Devon Architect",
			},
		});

		expect(res.statusCode).toBe(201);
		const body = JSON.parse(res.payload);
		expect(body.token).toBeDefined();
		expect(body.defaultWorkspaceId).toBeDefined();
		token = body.token;
		workspaceId = body.defaultWorkspaceId;
	});

	it("2. Creates a critical incident problem case", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				title: "Production API Gateway Latency Spike",
				description: "p99 latency degraded from 180ms to 4800ms",
				severity: "CRITICAL",
				incidentMode: true,
			},
		});

		expect(res.statusCode).toBe(201);
		const body = JSON.parse(res.payload);
		expect(body.id).toBeDefined();
		caseId = body.id;
	});

	it("3. Updates problem statement and calculates completeness score", async () => {
		const res = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				problemStatement: {
					title: "Gateway Latency Surge",
					statement:
						"The checkout gateway experienced severe response degradation during traffic surge.",
					expectedBehavior: "Transactions acknowledge under 250ms at p99.",
					observedBehavior:
						"Latency surged to 4.85 seconds with connection exhaustion.",
					impact: "$48,000 delayed revenue.",
					affectedUsers: "Over 14,000 checkout attempts globally.",
				},
			},
		});

		expect(res.statusCode).toBe(200);

		const getCase = await server.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
		});
		const body = JSON.parse(getCase.payload);
		expect(body.problemQuality.score).toBeGreaterThan(60);
	});

	it("4. Attaches evidence artifacts", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/evidence`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				title: "Datadog Latency Flamegraph",
				description: "Shows 4.2s blocking in connection pool",
				type: "LOG",
				confidence: "VERIFIED",
			},
		});

		expect(res.statusCode).toBe(201);
	});

	it("5. Records 5-Whys root cause analysis", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/root-causes`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				method: "FIVE_WHYS",
				whyLevel: 1,
				statement: "Why did timeout occur? -> Connection pool was saturated",
				isConfirmed: true,
			},
		});

		expect(res.statusCode).toBe(201);
	});

	it("6. Proposes solutions and computes weighted matrix scores", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/solutions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				name: "PgBouncer Connection Pooler",
				description: "Deploy connection pooler in transaction mode",
				costScore: 2,
				effortScore: 2,
				riskScore: 1,
				impactScore: 5,
			},
		});

		expect(res.statusCode).toBe(201);
		solutionId = JSON.parse(res.payload).id;
	});

	it("7. Logs an immutable decision with chosen solution", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/decisions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				context: "Connection saturation during promotional sale",
				chosenSolutionId: solutionId,
				reasoning:
					"PgBouncer immediately decouples pod concurrency spikes from backend DB limits.",
				assumptions: ["Transaction pooling mode is compatible with ORM"],
				risks: ["2-second connection pause during rolling restart"],
			},
		});

		expect(res.statusCode).toBe(201);
		expect(JSON.parse(res.payload).revision).toBe(1);
	});

	it("8. Schedules and completes a corrective action", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/actions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				title: "Deploy PgBouncer Helm Chart",
				priority: "URGENT",
				status: "TODO",
			},
		});

		expect(res.statusCode).toBe(201);
		actionId = JSON.parse(res.payload).id;

		// Complete action
		const completeRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/actions/${actionId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "DONE" },
		});
		expect(completeRes.statusCode).toBe(200);
	});

	it("9. Registers a verification criterion and marks it PASSED", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/verifications`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				expectedResult:
					"p99 latency < 200ms during synthetic load test of 5k RPS",
				observedResult: "Stabilized at 142ms at p99 with 0 timeouts",
				status: "PASSED",
			},
		});

		expect(res.statusCode).toBe(201);
	});

	it("10. Transitions case through INVESTIGATING -> VERIFYING -> RESOLVED", async () => {
		// 1. OPEN -> INVESTIGATING
		await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "INVESTIGATING" },
		});

		// 2. INVESTIGATING -> VERIFYING
		await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "VERIFYING" },
		});

		// 3. VERIFYING -> RESOLVED
		const resolveRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "RESOLVED" },
		});

		expect(resolveRes.statusCode).toBe(200);
	});

	it("11. Generates and publishes retrospective", async () => {
		const res = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/retrospective`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				whatHappened:
					"Payment API gateway suffered latency degradation during flash sale.",
				whatCausedIt: "Database connection pool starvation.",
				whatSolvedIt: "Implemented PgBouncer in transaction mode.",
			},
		});

		expect(res.statusCode).toBe(201);
	});

	it("12. Executes global authorized search", async () => {
		const res = await server.inject({
			method: "GET",
			url: `/api/search/${workspaceId}?query=Latency`,
			headers: { authorization: `Bearer ${token}` },
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.payload);
		expect(body.totalMatches).toBeGreaterThan(0);
		expect(body.results.cases.length).toBeGreaterThan(0);
	});

	it("13. Exports workspace data in JSON and CSV without sensitive secrets", async () => {
		const jsonRes = await server.inject({
			method: "POST",
			url: `/api/privacy/export/${workspaceId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { format: "JSON" },
		});

		expect(jsonRes.statusCode).toBe(200);
		const exportData = JSON.parse(jsonRes.payload);
		expect(exportData.casesCount).toBeGreaterThan(0);
		expect(JSON.stringify(exportData)).not.toContain("passwordHash");
		expect(JSON.stringify(exportData)).not.toContain("jwtSecret");

		const csvRes = await server.inject({
			method: "POST",
			url: `/api/privacy/export/${workspaceId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { format: "CSV" },
		});

		expect(csvRes.statusCode).toBe(200);
		expect(csvRes.headers["content-type"]).toBe("text/csv");
	});

	it("14. Logs out and revokes active session", async () => {
		const res = await server.inject({
			method: "POST",
			url: "/api/auth/logout",
			headers: { authorization: `Bearer ${token}` },
		});

		expect(res.statusCode).toBe(200);

		// Subsequent authenticated request with revoked session fails
		const testReq = await server.inject({
			method: "GET",
			url: "/api/auth/me",
			headers: { authorization: `Bearer ${token}` },
		});
		expect(testReq.statusCode).toBe(401);
	});
});
