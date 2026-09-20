/**
 * Authentication & Session Management Routes
 * Includes password hashing, RFC 6238 TOTP 2FA enrollment, recovery codes,
 * and comprehensive session revocation.
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
import { SecurityCrypto, TOTPService } from "@resolveos/security";
import {
	LoginInputSchema,
	RegisterInputSchema,
	TOTPDisableInputSchema,
	TOTPEnableInputSchema,
} from "@resolveos/validation";
import crypto from "crypto";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { AuditService } from "../services/AuditService.js";
import { RealtimeService } from "../services/RealtimeService.js";

export const authRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// 1. User Registration
	server.post("/register", async (request, reply) => {
		const body = RegisterInputSchema.parse(request.body);
		const db = getDatabase();

		// Check if user already exists
		const existing = await db
			.select()
			.from(users)
			.where(eq(users.email, body.email.toLowerCase()))
			.get();
		if (existing) {
			AuditService.log("FAILED_LOGIN", {
				req: request,
				details: { reason: "Registration email collision", email: body.email },
			});
			return reply.status(409).send({
				statusCode: 409,
				error: "Conflict",
				message: "An account with this email address already exists.",
				requestId: request.id,
			});
		}

		const userId = crypto.randomUUID();
		const passwordHash = await SecurityCrypto.hashPassword(body.password);
		const now = new Date().toISOString();

		// Create User
		await db.insert(users)
			.values({
				id: userId,
				email: body.email.toLowerCase(),
				passwordHash,
				name: body.name,
				twoFactorEnabled: false,
				isEmailVerified: true,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// Create Default Personal Workspace
		const workspaceId = crypto.randomUUID();
		await db.insert(workspaces)
			.values({
				id: workspaceId,
				name: `${body.name}'s Workspace`,
				slug: `workspace-${userId.slice(0, 8)}`,
				ownerId: userId,
				retentionDays: 365,
				aiProcessingEnabled: false,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		await db.insert(workspaceMembers)
			.values({
				id: crypto.randomUUID(),
				workspaceId,
				userId,
				role: "OWNER",
				joinedAt: now,
			})
			.run();

		// Create Session
		const sessionId = crypto.randomUUID();
		await db.insert(userSessions)
			.values({
				id: sessionId,
				userId,
				userAgent: request.headers["user-agent"] || "unknown",
				ipAddress: request.ip,
				deviceType: "desktop",
				lastActiveAt: now,
				createdAt: now,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				isRevoked: false,
			})
			.run();

		const token = (server as any).jwt.sign({
			id: userId,
			email: body.email.toLowerCase(),
			sessionId,
		});
		AuditService.log("LOGIN", {
			req: request,
			userId,
			details: { method: "registration" },
		});

		reply.setCookie("token", token, {
			path: "/",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 7 * 24 * 60 * 60,
		});

		return reply.status(201).send({
			user: {
				id: userId,
				email: body.email.toLowerCase(),
				name: body.name,
				twoFactorEnabled: false,
			},
			token,
			defaultWorkspaceId: workspaceId,
		});
	});

	// 2. User Login (Supports Password, TOTP, and Single-Use Recovery Codes)
	server.post("/login", async (request, reply) => {
		const body = LoginInputSchema.parse(request.body);
		const db = getDatabase();

		const user = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.email, body.email.toLowerCase()),
					eq(users.deletedAt, null as any),
				),
			)
			.get();
		if (!user) {
			AuditService.log("FAILED_LOGIN", {
				req: request,
				details: { email: body.email, reason: "User not found" },
			});
			return reply
				.status(401)
				.send({
					statusCode: 401,
					error: "Unauthorized",
					message: "Invalid email or password.",
					requestId: request.id,
				});
		}

		const validPassword = await SecurityCrypto.verifyPassword(
			body.password,
			user.passwordHash,
		);
		if (!validPassword) {
			AuditService.log("FAILED_LOGIN", {
				req: request,
				userId: user.id,
				details: { reason: "Invalid password" },
			});
			return reply
				.status(401)
				.send({
					statusCode: 401,
					error: "Unauthorized",
					message: "Invalid email or password.",
					requestId: request.id,
				});
		}

		// 2FA Verification check if enabled
		if (user.twoFactorEnabled && user.twoFactorSecret) {
			if (body.recoveryCode) {
				// Handle single-use recovery code
				let validCodes: string[] = [];
				if (Array.isArray(user.recoveryCodes)) {
					validCodes = [...user.recoveryCodes];
				} else if (typeof user.recoveryCodes === "string") {
					try {
						validCodes = JSON.parse(user.recoveryCodes);
					} catch {
						validCodes = [];
					}
				}

				const normalizedInput = body.recoveryCode.trim().toUpperCase();
				const codeIndex = validCodes.indexOf(normalizedInput);
				if (codeIndex === -1) {
					AuditService.log("FAILED_LOGIN", {
						req: request,
						userId: user.id,
						details: { reason: "Invalid recovery code" },
					});
					return reply
						.status(401)
						.send({
							statusCode: 401,
							error: "Unauthorized",
							message: "Invalid recovery code.",
							requestId: request.id,
						});
				}

				// Consume and burn the single-use recovery code
				validCodes.splice(codeIndex, 1);
				await db.update(users)
					.set({ recoveryCodes: validCodes })
					.where(eq(users.id, user.id))
					.run();
				AuditService.log("LOGIN", {
					req: request,
					userId: user.id,
					details: { method: "recovery_code" },
				});
			} else if (body.totpCode) {
				const validCode = TOTPService.verifyCode(
					user.twoFactorSecret,
					body.totpCode,
				);
				if (!validCode) {
					AuditService.log("FAILED_LOGIN", {
						req: request,
						userId: user.id,
						details: { reason: "Invalid 2FA TOTP code" },
					});
					return reply
						.status(401)
						.send({
							statusCode: 401,
							error: "Unauthorized",
							message: "Invalid two-factor authentication code.",
							requestId: request.id,
						});
				}
			} else {
				return reply.status(200).send({ requires2FA: true, userId: user.id });
			}
		}

		const sessionId = crypto.randomUUID();
		const now = new Date().toISOString();

		await db.insert(userSessions)
			.values({
				id: sessionId,
				userId: user.id,
				userAgent: request.headers["user-agent"] || "unknown",
				ipAddress: request.ip,
				deviceType: "desktop",
				lastActiveAt: now,
				createdAt: now,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				isRevoked: false,
			})
			.run();

		const token = (server as any).jwt.sign({
			id: user.id,
			email: user.email,
			sessionId,
		});
		AuditService.log("LOGIN", {
			req: request,
			userId: user.id,
			details: {
				method: body.recoveryCode
					? "recovery_code"
					: body.totpCode
						? "2fa_totp"
						: "password",
			},
		});

		reply.setCookie("token", token, {
			path: "/",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 7 * 24 * 60 * 60,
		});

		return reply.send({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				twoFactorEnabled: user.twoFactorEnabled,
			},
			token,
		});
	});

	// 3. User Profile
	server.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
		const db = getDatabase();
		const user = await db
			.select()
			.from(users)
			.where(eq(users.id, request.user!.id))
			.get();
		if (!user) return reply.status(404).send({ error: "User not found" });

		// Fetch user workspaces
		const memberships = await db
			.select({
				workspace: workspaces,
				role: workspaceMembers.role,
			})
			.from(workspaceMembers)
			.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(
				and(
					eq(workspaceMembers.userId, user.id),
					eq(workspaces.deletedAt, null as any),
				),
			)
			.all();

		return reply.send({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl,
				twoFactorEnabled: user.twoFactorEnabled,
				createdAt: user.createdAt,
			},
			workspaces: memberships.map((m: any) => ({
				...m.workspace,
				role: m.role,
			})),
		});
	});

	// 4. Logout (Revoke Current Session)
	server.post(
		"/logout",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const db = getDatabase();
			if (request.user?.sessionId) {
				await db.update(userSessions)
					.set({ isRevoked: true })
					.where(eq(userSessions.id, request.user.sessionId))
					.run();
			}
			AuditService.log("SESSION_REVOKED", {
				req: request,
				userId: request.user!.id,
			});
			reply.clearCookie("token", { path: "/" });
			return reply.send({ message: "Successfully logged out." });
		},
	);

	// 5. Logout Everywhere (Revoke All User Sessions)
	server.post(
		"/logout-all",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const db = getDatabase();
			await db.update(userSessions)
				.set({ isRevoked: true })
				.where(eq(userSessions.userId, request.user!.id))
				.run();
			AuditService.log("SESSION_REVOKED", {
				req: request,
				userId: request.user!.id,
				details: { scope: "ALL_SESSIONS" },
			});
			reply.clearCookie("token", { path: "/" });
			return reply.send({
				message: "All active sessions successfully revoked across all devices.",
			});
		},
	);

	// 6. Active Sessions List
	server.get(
		"/sessions",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const db = getDatabase();
			const sessions = await db
				.select()
				.from(userSessions)
				.where(
					and(
						eq(userSessions.userId, request.user!.id),
						eq(userSessions.isRevoked, false),
					),
				)
				.all();

			return reply.send(
				sessions.map((s: any) => ({
					...s,
					isCurrent: s.id === request.user!.sessionId,
				})),
			);
		},
	);

	// 7. Revoke Specific Session
	server.delete(
		"/sessions/:id",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const db = getDatabase();
			await db.update(userSessions)
				.set({ isRevoked: true })
				.where(
					and(
						eq(userSessions.id, id),
						eq(userSessions.userId, request.user!.id),
					),
				)
				.run();

			AuditService.log("SESSION_REVOKED", {
				req: request,
				userId: request.user!.id,
				details: { revokedSessionId: id },
			});
			return reply.send({ message: "Session successfully revoked." });
		},
	);

	// 8. 2FA Setup (Generate Secret & Provisioning URI)
	server.post(
		"/2fa/setup",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const secret = TOTPService.generateSecret();
			const otpAuthUri = TOTPService.getOtpAuthUri(
				request.user!.email,
				secret,
				"ResolveOS",
			);
			return reply.send({ secret, otpAuthUri });
		},
	);

	// 9. 2FA Enable (Verify Initial Code, Generate Recovery Codes, and Activate)
	server.post(
		"/2fa/enable",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const body = TOTPEnableInputSchema.parse(request.body);
			const db = getDatabase();

			const validCode = TOTPService.verifyCode(body.secret, body.code);
			if (!validCode) {
				return reply
					.status(400)
					.send({
						statusCode: 400,
						error: "Bad Request",
						message:
							"Invalid TOTP verification code. Please check your authenticator clock and try again.",
					});
			}

			const recoveryCodes = TOTPService.generateRecoveryCodes(8);
			await db.update(users)
				.set({
					twoFactorEnabled: true,
					twoFactorSecret: body.secret,
					recoveryCodes,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(users.id, request.user!.id))
				.run();

			AuditService.log("TWO_FACTOR_ENABLED", {
				req: request,
				userId: request.user!.id,
			});
			return reply.send({
				message: "Two-factor authentication successfully enabled.",
				recoveryCodes,
			});
		},
	);

	// 10. 2FA Disable (Requires Password and Current TOTP Confirmation)
	server.post(
		"/2fa/disable",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const body = TOTPDisableInputSchema.parse(request.body);
			const db = getDatabase();

			const user = await db
				.select()
				.from(users)
				.where(eq(users.id, request.user!.id))
				.get();
			if (!user || !user.twoFactorEnabled) {
				return reply
					.status(400)
					.send({
						error: "Two-factor authentication is not currently active.",
					});
			}

			const validPassword = await SecurityCrypto.verifyPassword(
				body.password,
				user.passwordHash,
			);
			if (!validPassword) {
				return reply.status(401).send({ error: "Incorrect password." });
			}

			const validCode = TOTPService.verifyCode(user.twoFactorSecret, body.code);
			if (!validCode) {
				return reply
					.status(400)
					.send({ error: "Invalid two-factor authentication code." });
			}

			await db.update(users)
				.set({
					twoFactorEnabled: false,
					twoFactorSecret: null,
					recoveryCodes: null,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(users.id, user.id))
				.run();

			AuditService.log("TWO_FACTOR_DISABLED", {
				req: request,
				userId: user.id,
			});
			return reply.send({
				message: "Two-factor authentication successfully disabled.",
			});
		},
	);

	// Issue short-lived, single-use ticket for WebSocket authentication (Rule 57)
	server.post(
		"/ws-ticket",
		{ preHandler: [authenticate] },
		async (request, reply) => {
			const ticketData = RealtimeService.issueTicket(request.user!.id);
			return reply.send(ticketData);
		},
	);
};
