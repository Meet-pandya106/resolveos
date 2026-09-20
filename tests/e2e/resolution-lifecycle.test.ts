import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "../../apps/api/src/index.js";
import { AuditService } from "../../apps/api/src/services/AuditService.js";
import {
	closeDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("E2E: Complete 12-Stage Problem Resolution Lifecycle & Verification Gate", () => {
	let token: string;
	let workspaceId: string;
	let caseId: string;
	let solutionId: string;
	let verificationId: string;

	beforeAll(async () => {
		initDatabase(":memory:");
		await server.ready();

		// 1. User Registration
		const reg = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "commander@resolveos.test",
				password: "Password#Incident2026!",
				name: "Incident Commander",
			},
		});
		expect(reg.statusCode).toBe(201);
		const body = JSON.parse(reg.payload);
		token = body.token;
		workspaceId = body.defaultWorkspaceId;
	});

	afterAll(async () => {
		await server.close();
		closeDatabase();
	});

	it("Stage 1 & 2: Creates incident case with Problem Statement & Quality Scoring", async () => {
		const caseRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				title: "High Latency Spike in Checkout Microservice",
				description:
					"P99 response time degraded from 150ms to 4200ms during flash sale.",
				severity: "CRITICAL",
				priority: "URGENT",
				incidentMode: true,
				problemStatement: {
					title: "Checkout Latency Degradation",
					statement:
						"The checkout payment gateway encounters extreme queue latency under high traffic bursts.",
					expectedBehavior:
						"Average latency under 200ms and P99 under 500ms at 5000 RPS.",
					observedBehavior:
						"Average latency spikes to 3800ms and P99 exceeds 7000ms with timeout dropouts.",
					impact:
						"4.2% drop in transaction conversion rate and customer support escalation.",
					affectedUsers: "All customers attempting credit card checkouts.",
					frequency: "INTERMITTENT",
					environment: "production-us-east-1",
				},
			},
		});

		expect(caseRes.statusCode).toBe(201);
		caseId = JSON.parse(caseRes.payload).id;

		const getRes = await server.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
		});

		const caseItem = JSON.parse(getRes.payload);
		expect(caseItem.problemQuality).toBeDefined();
		expect(caseItem.problemQuality.score).toBeGreaterThan(60);
		expect(["ACTIONABLE", "COMPREHENSIVE"]).toContain(
			caseItem.problemQuality.rating,
		);
	});

	it("Stage 3 & 4: Attaches empirical Evidence and links Questions", async () => {
		// Attach APM evidence
		const evRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/evidence`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				title: "Datadog APM Trace Histogram",
				description:
					"Downstream payment processor HTTP connection pool saturated at 100% capacity.",
				type: "MEASUREMENT",
				source: "Datadog APM",
				confidence: "HIGH",
				capturedAt: new Date().toISOString(),
				tags: ["apm", "latency", "database"],
			},
		});
		expect(evRes.statusCode).toBe(201);

		// Ask investigative question
		const qRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/questions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				question:
					"Did the recent deployment v2.14 modify the HTTP client socket timeout settings?",
			},
		});
		expect(qRes.statusCode).toBe(201);
		const qId = JSON.parse(qRes.payload).id;

		// Answer question
		const ansRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/questions/${qId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				answer:
					"Yes, PR #419 increased socket timeout from 2s to 30s, causing connection pool starvation.",
			},
		});
		expect(ansRes.statusCode).toBe(200);
	});

	it("Stage 5 & 6: Evaluates Hypotheses and records 5-Whys Root Cause Analysis", async () => {
		// Create hypothesis
		const hypRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/hypotheses`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				description:
					"Increased client timeout caused hung worker threads to exhaust connection pool.",
				confidence: "HIGH",
				status: "CONFIRMED",
			},
		});
		expect(hypRes.statusCode).toBe(201);

		// Record 5-Whys
		const rcRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/root-causes`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				method: "FIVE_WHYS",
				whyLevel: 1,
				statement:
					"Payment microservice worker threads were stuck in TCP FIN_WAIT state.",
				isConfirmed: true,
			},
		});
		expect(rcRes.statusCode).toBe(201);
	});

	it("Stage 7 & 8: Scores Solutions Matrix and logs immutable Decision ADR", async () => {
		// Propose solution
		const solRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/solutions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				name: "Revert HTTP client timeout and configure circuit breaker",
				description:
					"Restore 2000ms socket timeout and enable fail-fast circuit breaker pattern.",
				impactScore: 5,
				effortScore: 1,
				riskScore: 1,
				costScore: 1,
				timeToImplementDays: 1,
			},
		});
		expect(solRes.statusCode).toBe(201);
		solutionId = JSON.parse(solRes.payload).id;

		// Log decision
		const decRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/decisions`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				context:
					"Need immediate latency mitigation before upcoming weekend sale.",
				chosenSolutionId: solutionId,
				reasoning: "Highest impact-to-effort ratio; zero risk rollback option.",
			},
		});
		expect(decRes.statusCode).toBe(201);
		expect(JSON.parse(decRes.payload).revision).toBe(1);
	});

	it("Stage 9 & 10: Enforces Verification Gate before allowing case resolution", async () => {
		// 1. Transition case to INVESTIGATING
		await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "INVESTIGATING" },
		});

		// 2. Transition case to VERIFYING
		await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "VERIFYING" },
		});

		// 3. Register Verification Criteria (Initially PENDING)
		const verRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/verifications`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				expectedResult:
					"Load test at 5000 RPS demonstrates P99 latency < 450ms for 15 consecutive minutes.",
				status: "PENDING",
			},
		});
		expect(verRes.statusCode).toBe(201);
		verificationId = JSON.parse(verRes.payload).id;

		// 4. Attempt to resolve WITHOUT passing verification -> Must fail with 400 Bad Request
		const prematureRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "RESOLVED" },
		});
		expect(prematureRes.statusCode).toBe(400);
		expect(JSON.parse(prematureRes.payload).message).toContain("verification");

		// 5. Complete verification and mark PASSED
		const passRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/verifications`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				expectedResult:
					"Load test at 5000 RPS demonstrates P99 latency < 450ms.",
				observedResult:
					"P99 stabilized at 182ms over 30 minutes with 0 connection timeouts.",
				status: "PASSED",
			},
		});
		expect(passRes.statusCode).toBe(201);

		// 6. Now transition to RESOLVED must succeed
		const resolveRes = await server.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}`,
			headers: { authorization: `Bearer ${token}` },
			payload: { status: "RESOLVED" },
		});
		expect(resolveRes.statusCode).toBe(200);
	});

	it("Stage 11 & 12: Publishes Retrospective and validates cryptographic audit log", async () => {
		// Publish retrospective
		const retroRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/cases/${caseId}/retrospective`,
			headers: { authorization: `Bearer ${token}` },
			payload: {
				whatHappened:
					"Checkout service suffered connection pool starvation due to socket timeout change.",
				whatCausedIt:
					"PR #419 increased socket timeout to 30s without adjusting pool capacity.",
				whatSolvedIt:
					"Reverted socket timeout to 2s and deployed defensive circuit breaker.",
			},
		});
		expect(retroRes.statusCode).toBe(201);

		// Validate audit chain integrity
		const auditStatus = await AuditService.verifyChain();
		expect(auditStatus.valid).toBe(true);
		expect(auditStatus.totalEvents).toBeGreaterThan(0);
	});
});
