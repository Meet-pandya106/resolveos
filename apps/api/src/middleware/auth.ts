/**
 * Fastify Authentication & Authorization Middleware
 * Enforces server-side authentication, workspace membership verification, role-based access control,
 * and robust IDOR prevention.
 */

import {
	and,
	eq,
	getDatabase,
	userSessions,
	users,
	workspaceMembers,
	workspaces,
} from "@resolveos/database";
import { UserRole } from "@resolveos/shared";
import { FastifyReply, FastifyRequest } from "fastify";

export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string;
	sessionId?: string;
}

declare module "@fastify/jwt" {
	interface FastifyJWT {
		user: AuthenticatedUser;
	}
}

declare module "fastify" {
	interface FastifyRequest {
		workspaceMember?: {
			workspaceId: string;
			role: UserRole;
		};
	}
}

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		let token: string | undefined;

		// 1. Check Authorization Bearer header
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			token = authHeader.substring(7);
		}

		// 2. Check Cookie fallback
		if (!token && (request as any).cookies?.token) {
			token = (request as any).cookies.token;
		}

		if (!token) {
			return reply.status(401).send({
				statusCode: 401,
				error: "Unauthorized",
				message: "Authentication required. No valid session or token provided.",
				requestId: request.id,
			});
		}

		// Verify JWT payload
		const decoded = (await (request as any).jwtVerify()) as {
			id: string;
			email: string;
			sessionId?: string;
		};
		const db = getDatabase();

		// Check user exists and is not soft-deleted
		const user = await db
			.select()
			.from(users)
			.where(and(eq(users.id, decoded.id), eq(users.deletedAt, null as any)))
			.get();
		if (!user) {
			return reply.status(401).send({
				statusCode: 401,
				error: "Unauthorized",
				message: "User account not found or deactivated.",
				requestId: request.id,
			});
		}

		// If session ID is present, verify session has not been revoked
		if (decoded.sessionId) {
			const session = await db
				.select()
				.from(userSessions)
				.where(
					and(
						eq(userSessions.id, decoded.sessionId),
						eq(userSessions.isRevoked, false),
					),
				)
				.get();

			if (!session) {
				return reply.status(401).send({
					statusCode: 401,
					error: "Unauthorized",
					message: "Session has been revoked or expired.",
					requestId: request.id,
				});
			}

			// Verify session expiration timestamp
			if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
				await db.update(userSessions)
					.set({ isRevoked: true })
					.where(eq(userSessions.id, decoded.sessionId))
					.run();
				return reply.status(401).send({
					statusCode: 401,
					error: "Unauthorized",
					message: "Session has expired. Please sign in again.",
					requestId: request.id,
				});
			}

			// Update session last active time
			await db.update(userSessions)
				.set({ lastActiveAt: new Date().toISOString() })
				.where(eq(userSessions.id, decoded.sessionId))
				.run();
		}

		(request as any).user = {
			id: user.id,
			email: user.email,
			name: user.name,
			sessionId: decoded.sessionId,
		};
	} catch (err: any) {
		return reply.status(401).send({
			statusCode: 401,
			error: "Unauthorized",
			message: "Invalid or expired authentication token.",
			requestId: request.id,
		});
	}
}

/**
 * Ensures user is a member of the workspace specified in params or query,
 * and attaches workspace role to request.
 */
export function requireWorkspaceAccess(
	allowedRoles: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const user = (request as any).user as AuthenticatedUser | undefined;
		if (!user) {
			return reply
				.status(401)
				.send({
					statusCode: 401,
					error: "Unauthorized",
					message: "Authentication required",
					requestId: request.id,
				});
		}

		const params = request.params as any;
		const query = request.query as any;
		const workspaceId = params.workspaceId || params.id || query.workspaceId;

		if (!workspaceId) {
			return reply
				.status(400)
				.send({
					statusCode: 400,
					error: "Bad Request",
					message: "Workspace ID required",
					requestId: request.id,
				});
		}

		const db = getDatabase();
		const membership = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, user.id),
				),
			)
			.get();

		if (!membership) {
			// Return 403 Forbidden
			return reply.status(403).send({
				statusCode: 403,
				error: "Forbidden",
				message: "You do not have access to this workspace.",
				requestId: request.id,
			});
		}

		const userRole = membership.role as UserRole;
		if (!allowedRoles.includes(userRole)) {
			return reply.status(403).send({
				statusCode: 403,
				error: "Forbidden",
				message: `Insufficient permissions. Required: ${allowedRoles.join(", ")}, Current: ${userRole}`,
				requestId: request.id,
			});
		}

		request.workspaceMember = {
			workspaceId,
			role: userRole,
		};
	};
}
