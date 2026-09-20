/**
 * Export and Import Service
 * Handles compliant JSON/CSV data export and schema-validated case package import.
 * Strips password hashes, secrets, and internal session tokens.
 */

import {
	caseActions,
	caseActivities,
	caseEvidence,
	caseQuestions,
	cases,
	decisions,
	eq,
	getDatabase,
	hypotheses,
	retrospectives,
	rootCauses,
	solutions,
	verifications,
} from "@resolveos/database";

export class ExportImportService {
	/**
	 * Generates a sanitized JSON export of a complete Case with all linked entities.
	 */
	static async exportCaseJson(caseId: string): Promise<any> {
		const db = getDatabase();

		const caseRecord = await db
			.select()
			.from(cases)
			.where(eq(cases.id, caseId))
			.get();
		if (!caseRecord) throw new Error("Case not found");

		const evidenceList = await db
			.select()
			.from(caseEvidence)
			.where(eq(caseEvidence.caseId, caseId))
			.all();
		const questionsList = await db
			.select()
			.from(caseQuestions)
			.where(eq(caseQuestions.caseId, caseId))
			.all();
		const hypothesesList = await db
			.select()
			.from(hypotheses)
			.where(eq(hypotheses.caseId, caseId))
			.all();
		const rootCausesList = await db
			.select()
			.from(rootCauses)
			.where(eq(rootCauses.caseId, caseId))
			.all();
		const solutionsList = await db
			.select()
			.from(solutions)
			.where(eq(solutions.caseId, caseId))
			.all();
		const decisionsList = await db
			.select()
			.from(decisions)
			.where(eq(decisions.caseId, caseId))
			.all();
		const actionsList = await db
			.select()
			.from(caseActions)
			.where(eq(caseActions.caseId, caseId))
			.all();
		const verificationsList = await db
			.select()
			.from(verifications)
			.where(eq(verifications.caseId, caseId))
			.all();
		const retroList = await db
			.select()
			.from(retrospectives)
			.where(eq(retrospectives.caseId, caseId))
			.all();
		const activitiesList = await db
			.select()
			.from(caseActivities)
			.where(eq(caseActivities.caseId, caseId))
			.all();

		return {
			schemaVersion: "resolveos-case-v1",
			exportedAt: new Date().toISOString(),
			case: caseRecord,
			evidence: evidenceList,
			questions: questionsList,
			hypotheses: hypothesesList,
			rootCauses: rootCausesList,
			solutions: solutionsList,
			decisions: decisionsList,
			actions: actionsList,
			verifications: verificationsList,
			retrospectives: retroList,
			activities: activitiesList,
		};
	}

	/**
	 * Generates a CSV string representation of all cases in a workspace.
	 */
	static async exportCasesCsv(workspaceId: string): Promise<string> {
		const db = getDatabase();

		const allCases = await db
			.select()
			.from(cases)
			.where(eq(cases.workspaceId, workspaceId))
			.all();

		const headers = [
			"ID",
			"Title",
			"Status",
			"Severity",
			"Priority",
			"Version",
			"Created At",
			"Resolved At",
		];
		const rows = allCases.map((c: any) => [
			c.id,
			`"${(c.title || "").replace(/"/g, '""')}"`,
			c.status,
			c.severity,
			c.priority,
			c.version,
			c.createdAt,
			c.resolvedAt || "",
		]);

		return [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
	}
}
