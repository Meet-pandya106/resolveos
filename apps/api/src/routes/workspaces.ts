/**
 * Workspace Management & Member Administration Routes
 */

import {
	and,
	apiKeys,
	eq,
	getDatabase,
	users,
	workspaceMembers,
	workspaces,
} from "@resolveos/database";
import { SecurityCrypto } from "@resolveos/security";
import {
	AddMemberInputSchema,
	CreateAPIKeyInputSchema,
	CreateWorkspaceInputSchema,
	UpdateWorkspaceInputSchema,
} from "@resolveos/validation";
import crypto from "crypto";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate, requireWorkspaceAccess } from "../middleware/auth.js";
import { AuditService } from "../services/AuditService.js";

export const workspaceRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	server.addHook("preHandler", authenticate);

	// 1. List User Workspaces
	server.get("/", async (request, reply) => {
		const db = getDatabase();
		const list = db
			.select({
				workspace: workspaces,
				role: workspaceMembers.role,
			})
			.from(workspaceMembers)
			.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(
				and(
					eq(workspaceMembers.userId, request.user!.id),
					eq(workspaces.deletedAt, null as any),
				),
			)
			.all();

		return reply.send(
			list.map((item: any) => ({ ...item.workspace, role: item.role })),
		);
	});

	// 2. Create Workspace
	server.post("/", async (request, reply) => {
		const body = CreateWorkspaceInputSchema.parse(request.body);
		const db = getDatabase();
		const workspaceId = crypto.randomUUID();
		const slug = body.slug || `ws-${crypto.randomBytes(4).toString("hex")}`;
		const now = new Date().toISOString();

		db.insert(workspaces)
			.values({
				id: workspaceId,
				name: body.name,
				slug,
				description: body.description,
				ownerId: request.user!.id,
				retentionDays: body.retentionDays || 365,
				aiProcessingEnabled: body.aiProcessingEnabled || false,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(workspaceMembers)
			.values({
				id: crypto.randomUUID(),
				workspaceId,
				userId: request.user!.id,
				role: "OWNER",
				joinedAt: now,
			})
			.run();

		AuditService.log("ROLE_CHANGED", {
			req: request,
			workspaceId,
			details: { action: "create_workspace", role: "OWNER" },
		});

		return reply.status(201).send({
			id: workspaceId,
			name: body.name,
			slug,
			role: "OWNER",
		});
	});

	// 3. Get Workspace by ID
	server.get(
		"/:workspaceId",
		{ preHandler: [requireWorkspaceAccess()] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const db = getDatabase();
			const ws = db
				.select()
				.from(workspaces)
				.where(eq(workspaces.id, workspaceId))
				.get();
			if (!ws) return reply.status(404).send({ error: "Workspace not found" });
			return reply.send({ ...ws, role: request.workspaceMember!.role });
		},
	);

	// 4. Update Workspace Settings (Owner / Admin only)
	server.patch(
		"/:workspaceId",
		{ preHandler: [requireWorkspaceAccess(["OWNER", "ADMIN"])] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const body = UpdateWorkspaceInputSchema.parse(request.body);
			const db = getDatabase();
			const now = new Date().toISOString();

			db.update(workspaces)
				.set({
					...body,
					updatedAt: now,
				})
				.where(eq(workspaces.id, workspaceId))
				.run();

			return reply.send({ message: "Workspace updated successfully" });
		},
	);

	// 5. List Workspace Members
	server.get(
		"/:workspaceId/members",
		{ preHandler: [requireWorkspaceAccess()] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const db = getDatabase();

			const members = db
				.select({
					id: workspaceMembers.id,
					role: workspaceMembers.role,
					joinedAt: workspaceMembers.joinedAt,
					user: {
						id: users.id,
						name: users.name,
						email: users.email,
						avatarUrl: users.avatarUrl,
					},
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId))
				.all();

			return reply.send(members);
		},
	);

	// 6. Invite / Add Workspace Member (Owner / Admin only)
	server.post(
		"/:workspaceId/members",
		{ preHandler: [requireWorkspaceAccess(["OWNER", "ADMIN"])] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const body = AddMemberInputSchema.parse(request.body);
			const db = getDatabase();

			const targetUser = db
				.select()
				.from(users)
				.where(eq(users.email, body.email.toLowerCase()))
				.get();
			if (!targetUser) {
				return reply.status(404).send({
					statusCode: 404,
					error: "Not Found",
					message: "No registered user found with that email address.",
					requestId: request.id,
				});
			}

			const existingMember = db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.userId, targetUser.id),
					),
				)
				.get();

			if (existingMember) {
				return reply
					.status(409)
					.send({ error: "User is already a member of this workspace." });
			}

			const memberId = crypto.randomUUID();
			const now = new Date().toISOString();

			db.insert(workspaceMembers)
				.values({
					id: memberId,
					workspaceId,
					userId: targetUser.id,
					role: body.role,
					joinedAt: now,
				})
				.run();

			AuditService.log("ROLE_CHANGED", {
				req: request,
				workspaceId,
				details: { addedUserId: targetUser.id, role: body.role },
			});

			return reply
				.status(201)
				.send({ message: "Member added successfully", memberId });
		},
	);

	// 7. List Workspace API Keys
	server.get(
		"/:workspaceId/api-keys",
		{ preHandler: [requireWorkspaceAccess(["OWNER", "ADMIN"])] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const db = getDatabase();
			const keys = db
				.select()
				.from(apiKeys)
				.where(
					and(
						eq(apiKeys.workspaceId, workspaceId),
						eq(apiKeys.isRevoked, false),
					),
				)
				.all();
			return reply.send(
				keys.map((k: any) => ({
					id: k.id,
					name: k.name,
					keyFingerprint: k.keyFingerprint,
					scopes: k.scopes,
					createdAt: k.createdAt,
					lastUsedAt: k.lastUsedAt,
				})),
			);
		},
	);

	// 8. Create Workspace API Key
	server.post(
		"/:workspaceId/api-keys",
		{ preHandler: [requireWorkspaceAccess(["OWNER", "ADMIN"])] },
		async (request, reply) => {
			const { workspaceId } = request.params as { workspaceId: string };
			const body = CreateAPIKeyInputSchema.parse(request.body);
			const db = getDatabase();

			// Generate secret API key
			const rawSecret = `ro_live_${crypto.randomBytes(24).toString("hex")}`;
			const keyHash = SecurityCrypto.hashAPIKey(rawSecret);
			const keyFingerprint = SecurityCrypto.maskAPIKey(rawSecret);

			const apiKeyId = crypto.randomUUID();
			const now = new Date().toISOString();

			db.insert(apiKeys)
				.values({
					id: apiKeyId,
					workspaceId,
					name: body.name,
					keyHash,
					keyFingerprint,
					scopes: body.scopes,
					createdBy: request.user!.id,
					createdAt: now,
					isRevoked: false,
				})
				.run();

			AuditService.log("API_KEY_CREATED", {
				req: request,
				workspaceId,
				details: { keyName: body.name, fingerprint: keyFingerprint },
			});

			// Return the secret ONCE to the user
			return reply.status(201).send({
				id: apiKeyId,
				name: body.name,
				keyFingerprint,
				secretKey: rawSecret,
				notice:
					"Store this secret key safely. It will never be displayed again.",
			});
		},
	);
};
