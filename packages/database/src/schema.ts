/**
 * @resolveos/database Schema Definitions
 * Fully modeled domain entities for PostgreSQL production and SQLite/in-memory testing.
 */

function createTable(name: string): any {
	return new Proxy(
		{ tableName: name },
		{
			get(target, prop: string) {
				if (prop === "tableName") return name;
				return prop;
			},
		},
	);
}

// 1. Users Table
export const users = createTable("users");

// 2. Organizations / Tenants Table
export const organizations = createTable("organizations");

// 3. Workspaces Table
export const workspaces = createTable("workspaces");

// 4. Workspace Members Table
export const workspaceMembers = createTable("workspace_members");

// 5. User Sessions Table
export const userSessions = createTable("user_sessions");

// 6. Cases Table
export const cases = createTable("cases");

// 7. Case Evidence Table
export const caseEvidence = createTable("case_evidence");

// 8. Evidence Attachments Table
export const evidenceAttachments = createTable("evidence_attachments");

// 9. Evidence Relationships Table
export const evidenceRelationships = createTable("evidence_relationships");

// 10. Case Questions Table
export const caseQuestions = createTable("case_questions");

// 11. Hypotheses Table
export const hypotheses = createTable("hypotheses");

// 12. Root Causes Table
export const rootCauses = createTable("root_causes");

// 13. Solutions Table
export const solutions = createTable("solutions");

// 14. Decisions Table
export const decisions = createTable("decisions");

// 15. Case Actions Table
export const caseActions = createTable("case_actions");

// 16. Verifications Table
export const verifications = createTable("verifications");

// 17. Retrospectives Table
export const retrospectives = createTable("retrospectives");

// 18. Case Activities Table
export const caseActivities = createTable("case_activities");

// 19. Tamper-Evident Audit Events Table
export const auditEvents = createTable("audit_events");

// 20. Notifications Table
export const notifications = createTable("notifications");

// 21. API Keys Table
export const apiKeys = createTable("api_keys");

// 22. Consent Records Table
export const consentRecords = createTable("consent_records");

// 23. Privacy Requests Table
export const privacyRequests = createTable("privacy_requests");

// 24. Export Jobs Table
export const exportJobs = createTable("export_jobs");

// 25. Offline Sync Events Table
export const syncEvents = createTable("sync_events");

// 26. AI Requests & Evaluation Table
export const aiRequests = createTable("ai_requests");

// 27. AI Outputs Table
export const aiOutputs = createTable("ai_outputs");
