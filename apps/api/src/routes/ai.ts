/**
 * Privacy-Preserving AI Assistant Routes
 */

import {
	and,
	caseEvidence,
	cases,
	consentRecords,
	eq,
	getDatabase,
	workspaces,
} from "@resolveos/database";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate, requireWorkspaceAccess } from "../middleware/auth.js";
import { AIService } from "../services/AIService.js";

export const aiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
	server.addHook("preHandler", authenticate);

	server.post(
		"/:workspaceId/cases/:caseId/analyze",
		{ preHandler: [requireWorkspaceAccess()] },
		async (request, reply) => {
			const { workspaceId, caseId } = request.params as {
				workspaceId: string;
				caseId: string;
			};
			const db = getDatabase();

			// 1. Verify Workspace AI Permission
			const ws = await db
				.select()
				.from(workspaces)
				.where(eq(workspaces.id, workspaceId))
				.get();
			if (!ws || !ws.aiProcessingEnabled) {
				return reply.status(403).send({
					statusCode: 403,
					error: "Forbidden",
					message: "AI processing is disabled for this workspace in Settings.",
					requestId: request.id,
				});
			}

			// 2. Verify User Consent
			const consent = await db
				.select()
				.from(consentRecords)
				.where(
					and(
						eq(consentRecords.userId, request.user!.id),
						eq(consentRecords.consentType, "AI_PROCESSING"),
					),
				)
				.get();

			if (!consent || consent.status !== "GRANTED") {
				return reply.status(403).send({
					statusCode: 403,
					error: "Forbidden",
					message:
						"Explicit user consent for AI processing is required. Please enable in Privacy Center.",
					requestId: request.id,
				});
			}

			// 3. Load Case Data scoped to workspace
			const caseRecord = await db
				.select()
				.from(cases)
				.where(
					and(
						eq(cases.id, caseId),
						eq(cases.workspaceId, workspaceId),
						eq(cases.deletedAt, null as any),
					),
				)
				.get();
			if (!caseRecord) {
				return reply
					.status(404)
					.send({
						statusCode: 404,
						error: "Not Found",
						message: "Case not found in this workspace.",
						requestId: request.id,
					});
			}

			const evidenceList = await db
				.select()
				.from(caseEvidence)
				.where(eq(caseEvidence.caseId, caseId))
				.all();

			// 4. Run Privacy-Preserving Analysis with Redaction
			const analysis = await AIService.analyzeCase({
				title: caseRecord.title,
				description: caseRecord.description,
				problemStatement: caseRecord.problemStatement as any,
				evidenceList: evidenceList as any,
			});

			return reply.send({
				caseId,
				processedWithPrivacyRedaction: true,
				analysis,
			});
		},
	);
};
