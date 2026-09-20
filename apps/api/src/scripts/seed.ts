/**
 * ResolveOS Demo Seed Generator
 * Populates database with synthetic demo data for local exploration.
 */

import {
	caseActions,
	caseActivities,
	caseEvidence,
	caseQuestions,
	cases,
	closeDatabase,
	decisions,
	hypotheses,
	initDatabase,
	retrospectives,
	rootCauses,
	solutions,
	users,
	verifications,
	workspaceMembers,
	workspaces,
} from "@resolveos/database";
import { SecurityCrypto } from "@resolveos/security";
import crypto from "crypto";

async function seed() {
	console.log("[SEED] Initializing database and generating demo cases...");
	const db = initDatabase("./resolveos.db");

	const now = new Date().toISOString();

	// 1. Create Primary Demo User
	const demoUserId = "00000000-0000-0000-0000-000000000001";
	const demoPasswordHash = await SecurityCrypto.hashPassword(
		"ResolveOS#Demo2026!",
	);

	db.insert(users)
		.values({
			id: demoUserId,
			email: "demo@resolveos.local",
			passwordHash: demoPasswordHash,
			name: "Devon Vance (Principal Architect)",
			avatarUrl: null,
			twoFactorEnabled: false,
			isEmailVerified: true,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// 2. Create Second Team Member
	const teamUserId = "00000000-0000-0000-0000-000000000002";
	db.insert(users)
		.values({
			id: teamUserId,
			email: "alex.chen@resolveos.local",
			passwordHash: demoPasswordHash,
			name: "Alex Chen (Site Reliability Engineer)",
			avatarUrl: null,
			twoFactorEnabled: false,
			isEmailVerified: true,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// 3. Create Main Demo Workspace
	const workspaceId = "00000000-0000-0000-0000-000000000010";
	db.insert(workspaces)
		.values({
			id: workspaceId,
			name: "Acme Cloud Reliability & Operations",
			slug: "acme-reliability",
			description:
				"Primary workspace resolving critical distributed systems incidents and engineering problems.",
			ownerId: demoUserId,
			retentionDays: 365,
			aiProcessingEnabled: true,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	db.insert(workspaceMembers)
		.values({
			id: crypto.randomUUID(),
			workspaceId,
			userId: demoUserId,
			role: "OWNER",
			joinedAt: now,
		})
		.onConflictDoNothing()
		.run();

	db.insert(workspaceMembers)
		.values({
			id: crypto.randomUUID(),
			workspaceId,
			userId: teamUserId,
			role: "ADMIN",
			joinedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// 4. Case 1: Payment Checkout Gateway Latency Spike (Critical Incident)
	const case1Id = "00000000-0000-0000-0000-000000000101";
	db.insert(cases)
		.values({
			id: case1Id,
			workspaceId,
			title: "Production API Latency Spike on Payment Checkout Gateway",
			description:
				"p99 latency degraded from 180ms to 4,800ms during peak promotion event, causing checkout drop-offs.",
			status: "RESOLVED",
			severity: "CRITICAL",
			priority: "URGENT",
			ownerId: demoUserId,
			incidentMode: true,
			version: 5,
			problemStatement: {
				title: "Payment Gateway Latency Degradation",
				statement:
					"During the global anniversary sale, the primary payment checkout API cluster experienced severe response latency spikes exceeding 4.8 seconds, leading to a 38% increase in gateway connection timeouts.",
				affectedUsers:
					"Over 14,000 checkout attempts globally across web and mobile platforms.",
				startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
				expectedBehavior:
					"Payment gateway transactions acknowledge within 250ms at p99 under 5,000 RPS load.",
				observedBehavior:
					"p99 latency surged to 4.85 seconds with connection pool exhaustion errors in service logs.",
				impact:
					"Estimated $48,000 in delayed conversions and degraded user satisfaction score.",
				severity: "CRITICAL",
				frequency: "INTERMITTENT",
				environment: "Production Kubernetes Cluster us-east-1",
				knownConstraints:
					"Third-party acquiring bank API SLA is 300ms. No database schema modifications permitted during active sale.",
				completenessScore: 95,
			},
			createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
			updatedAt: now,
			resolvedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Evidence for Case 1
	const ev1Id = crypto.randomUUID();
	db.insert(caseEvidence)
		.values({
			id: ev1Id,
			caseId: case1Id,
			title: "Datadog APM Latency Trace Breakdown",
			description:
				"Flame graph proves 4.2 seconds spent blocked waiting on PostgreSQL connection pool acquisition.",
			type: "LOG",
			source: "APM Telemetry us-east-1",
			capturedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
			uploadedBy: demoUserId,
			confidence: "VERIFIED",
			tags: ["latency", "database", "connection-pool"],
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// 5-Whys Root Cause for Case 1
	db.insert(rootCauses)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			method: "FIVE_WHYS",
			whyLevel: 1,
			statement:
				"Why did checkout timeout? → Database connection pool was completely saturated.",
			isConfirmed: true,
			identifiedBy: demoUserId,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	db.insert(rootCauses)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			method: "FIVE_WHYS",
			whyLevel: 2,
			statement:
				"Why was connection pool saturated? → Long-running unindexed queries locked table rows during surge.",
			isConfirmed: true,
			identifiedBy: demoUserId,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Solutions for Case 1
	const sol1Id = crypto.randomUUID();
	db.insert(solutions)
		.values({
			id: sol1Id,
			caseId: case1Id,
			name: "PgBouncer Connection Pooling + Composite B-Tree Index",
			description:
				"Deploy stateless connection pooler with transaction pooling mode and add composite index on (merchant_id, created_at).",
			costScore: 2,
			effortScore: 2,
			riskScore: 1,
			impactScore: 5,
			timeToImplementDays: 1,
			reversibility: "HIGH",
			isChosen: true,
			proposedBy: demoUserId,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Decision for Case 1
	db.insert(decisions)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			context: "Connection pool starvation during flash promotion",
			chosenSolutionId: sol1Id,
			reasoning:
				"PgBouncer immediately decouples application pod spikes from PostgreSQL backend thread limits.",
			assumptions: [
				"Transaction pooling mode is compatible with ORM prepared statements",
			],
			risks: ["Brief 2-second connection pause during rolling restart"],
			decisionMakerId: demoUserId,
			revision: 1,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Action for Case 1
	db.insert(caseActions)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			title: "Deploy PgBouncer config and apply concurrent index",
			description:
				"Execute rolling deployment of pgbouncer helm chart in us-east-1.",
			ownerId: teamUserId,
			priority: "URGENT",
			status: "DONE",
			completedAt: now,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Verification for Case 1
	db.insert(verifications)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			expectedResult:
				"p99 latency remains under 200ms during synthetic load test of 8,000 RPS.",
			observedResult:
				"Load test verified p99 latency stabilized at 142ms with 0 connection timeouts.",
			status: "PASSED",
			verifiedBy: demoUserId,
			verifiedAt: now,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// Retrospective for Case 1
	db.insert(retrospectives)
		.values({
			id: crypto.randomUUID(),
			caseId: case1Id,
			whatHappened:
				"Payment API gateway suffered severe latency degradation due to database connection saturation during promotional traffic.",
			whatCausedIt:
				"Direct pod-to-database connections without a proxy pooler allowed concurrency spikes to exhaust max_connections.",
			whatSolvedIt:
				"Implemented PgBouncer in transaction mode and added missing query indices.",
			whatWeMissed:
				"Synthetic stress tests prior to the sale only simulated cached read queries rather than write checkouts.",
			whatToMonitor:
				"PgBouncer active client wait queue depth and PostgreSQL backend connection count alarms at 70% threshold.",
			preventiveActions:
				"Enforce connection pooler deployment as a standard architectural requirement for all customer-facing microservices.",
			authorId: demoUserId,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	// 5. Case 2: CI Pipeline Docker Build Flakiness
	const case2Id = "00000000-0000-0000-0000-000000000102";
	db.insert(cases)
		.values({
			id: case2Id,
			workspaceId,
			title: "CI/CD Deployment Pipeline Docker Layer Cache Flakiness",
			description:
				"Random build failures occurring in GitHub Actions runner matrix due to npm registry rate limits.",
			status: "INVESTIGATING",
			severity: "HIGH",
			priority: "HIGH",
			ownerId: teamUserId,
			incidentMode: false,
			version: 2,
			problemStatement: {
				title: "CI Runner Registry Rate Limiting",
				statement:
					"Pull requests fail intermittently with HTTP 429 Too Many Requests from public package registries during concurrent CI runs.",
				affectedUsers:
					"All engineering teams triggering pull request verification checks.",
				severity: "HIGH",
				frequency: "INTERMITTENT",
				completenessScore: 78,
			},
			createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
			updatedAt: now,
		})
		.onConflictDoNothing()
		.run();

	console.log("[SEED] Demo data generated successfully.");
	console.log("   Demo Login: demo@resolveos.local");
	console.log("   Demo Password: ResolveOS#Demo2026!");
	closeDatabase();
}

seed().catch((err) => {
	console.error("[SEED] Error generating seed data:", err);
	process.exit(1);
});
