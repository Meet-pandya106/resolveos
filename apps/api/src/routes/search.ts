/**
 * Global Search Routes
 * Provides multi-entity search scoped strictly to the authorized workspace.
 */

import {
	and,
	caseActions,
	caseEvidence,
	cases,
	eq,
	getDatabase,
	hypotheses,
	like,
	rootCauses,
	solutions,
} from "@resolveos/database";
import { GlobalSearchQuerySchema } from "@resolveos/validation";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate, requireWorkspaceAccess } from "../middleware/auth.js";

export const searchRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	server.addHook("preHandler", authenticate);

	server.get(
		"/:workspaceId",
		{ preHandler: [requireWorkspaceAccess()] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const parsedQuery = GlobalSearchQuerySchema.parse(request.query);
			const db = getDatabase();

			const searchTerm = `%${parsedQuery.query || ""}%`;

			// 1. Search Cases
			const matchingCases = await db
				.select({
					id: cases.id,
					title: cases.title,
					description: cases.description,
					status: cases.status,
					severity: cases.severity,
					updatedAt: cases.updatedAt,
				})
				.from(cases)
				.where(
					and(
						eq(cases.workspaceId, workspaceId),
						eq(cases.deletedAt, null as any),
						parsedQuery.query ? like(cases.title, searchTerm) : undefined,
					),
				)
				.limit(parsedQuery.limit)
				.all();

			// 2. Search Evidence
			const matchingEvidence = await db
				.select({
					id: caseEvidence.id,
					caseId: caseEvidence.caseId,
					title: caseEvidence.title,
					description: caseEvidence.description,
					type: caseEvidence.type,
				})
				.from(caseEvidence)
				.innerJoin(cases, eq(caseEvidence.caseId, cases.id))
				.where(
					and(
						eq(cases.workspaceId, workspaceId),
						parsedQuery.query
							? like(caseEvidence.title, searchTerm)
							: undefined,
					),
				)
				.limit(parsedQuery.limit)
				.all();

			// 3. Search Actions
			const matchingActions = await db
				.select({
					id: caseActions.id,
					caseId: caseActions.caseId,
					title: caseActions.title,
					status: caseActions.status,
					priority: caseActions.priority,
				})
				.from(caseActions)
				.innerJoin(cases, eq(caseActions.caseId, cases.id))
				.where(
					and(
						eq(cases.workspaceId, workspaceId),
						parsedQuery.query ? like(caseActions.title, searchTerm) : undefined,
					),
				)
				.limit(parsedQuery.limit)
				.all();

			return reply.send({
				query: parsedQuery.query,
				results: {
					cases: matchingCases,
					evidence: matchingEvidence,
					actions: matchingActions,
				},
				totalMatches:
					matchingCases.length +
					matchingEvidence.length +
					matchingActions.length,
			});
		},
	);
};
