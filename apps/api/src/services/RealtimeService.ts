/**
 * Realtime Event Service (WebSocket)
 * Dispatches real-time case updates, collaborative notifications, and live status updates.
 * Strictly enforces server-side tenant isolation and workspace membership authorization for subscriptions.
 */

import {
	and,
	cases,
	eq,
	getDatabase,
	workspaceMembers,
} from "@resolveos/database";
import crypto from "crypto";
import { WebSocket } from "ws";

interface ClientConnection {
	ws: WebSocket;
	userId: string;
	workspaceIds: Set<string>;
	activeCaseId?: string | null;
}

interface WsTicketRecord {
	userId: string;
	expiresAt: number;
}

export class RealtimeService {
	private static clients = new Set<ClientConnection>();
	private static wsTickets = new Map<string, WsTicketRecord>();

	/**
	 * Issues a short-lived, single-use ticket for secure WebSocket handshake without long-lived tokens in URLs.
	 * Scope limitation: Process-local Map for single-instance standalone deployments.
	 */
	static issueTicket(userId: string): { ticket: string; expiresInSeconds: number } {
		// Prune expired tickets to prevent memory leakage
		const now = Date.now();
		for (const [t, rec] of this.wsTickets.entries()) {
			if (now > rec.expiresAt) {
				this.wsTickets.delete(t);
			}
		}

		const ticket = crypto.randomBytes(32).toString("hex");
		this.wsTickets.set(ticket, {
			userId,
			expiresAt: now + 60000, // 60s TTL
		});
		return { ticket, expiresInSeconds: 60 };
	}

	/**
	 * Validates and atomically consumes (burns) a one-time ticket.
	 */
	static consumeTicket(ticket: string): string | null {
		const record = this.wsTickets.get(ticket);
		if (!record) return null;
		this.wsTickets.delete(ticket); // Burn on use
		if (Date.now() > record.expiresAt) {
			return null;
		}
		return record.userId;
	}

	static async registerClient(
		ws: WebSocket,
		userId: string,
		initialWorkspaceId?: string,
	): Promise<ClientConnection> {
		const db = getDatabase();
		const authorizedWorkspaces = new Set<string>();

		// If initial workspace requested, verify membership before subscribing
		if (initialWorkspaceId) {
			const membership = await db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, initialWorkspaceId),
						eq(workspaceMembers.userId, userId),
					),
				)
				.get();
			if (membership) {
				authorizedWorkspaces.add(initialWorkspaceId);
			}
		}

		const client: ClientConnection = {
			ws,
			userId,
			workspaceIds: authorizedWorkspaces,
			activeCaseId: null,
		};

		this.clients.add(client);

		ws.on("message", async (raw) => {
			try {
				// Enforce maximum frame size limit (16KB)
				if (raw.toString().length > 16384) {
					ws.send(
						JSON.stringify({
							type: "ERROR",
							message: "Payload exceeds maximum allowed frame size (16KB)",
						}),
					);
					return;
				}

				const msg = JSON.parse(raw.toString());

				if (msg.type === "SUBSCRIBE_WORKSPACE" && msg.workspaceId) {
					const dbInstance = getDatabase();
					const membership = await dbInstance
						.select()
						.from(workspaceMembers)
						.where(
							and(
								eq(workspaceMembers.workspaceId, msg.workspaceId),
								eq(workspaceMembers.userId, client.userId),
							),
						)
						.get();

					if (!membership) {
						ws.send(
							JSON.stringify({
								type: "ERROR",
								error: "Forbidden",
								message:
									"Unauthorized workspace subscription rejected. User is not a member of this workspace.",
								workspaceId: msg.workspaceId,
							}),
						);
						return;
					}

					client.workspaceIds.add(msg.workspaceId);
					ws.send(
						JSON.stringify({
							type: "SUBSCRIBED",
							workspaceId: msg.workspaceId,
						}),
					);
				} else if (msg.type === "FOCUS_CASE" && msg.caseId) {
					const dbInstance = getDatabase();
					const targetCase = await dbInstance
						.select()
						.from(cases)
						.where(
							and(eq(cases.id, msg.caseId), eq(cases.deletedAt, null as any)),
						)
						.get();

					if (!targetCase) {
						ws.send(
							JSON.stringify({
								type: "ERROR",
								error: "NotFound",
								message: "Case not found",
							}),
						);
						return;
					}

					const membership = await dbInstance
						.select()
						.from(workspaceMembers)
						.where(
							and(
								eq(workspaceMembers.workspaceId, targetCase.workspaceId),
								eq(workspaceMembers.userId, client.userId),
							),
						)
						.get();

					if (!membership) {
						ws.send(
							JSON.stringify({
								type: "ERROR",
								error: "Forbidden",
								message:
									"Unauthorized case subscription rejected. User does not have access to the parent workspace.",
							}),
						);
						return;
					}

					client.activeCaseId = msg.caseId;
					ws.send(JSON.stringify({ type: "CASE_FOCUSED", caseId: msg.caseId }));
				} else if (msg.type === "PING") {
					ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
				}
			} catch (err) {
				// Ignore malformed client message
			}
		});

		ws.on("close", () => {
			this.clients.delete(client);
		});

		return client;
	}

	static broadcastToWorkspace(
		workspaceId: string,
		eventType: string,
		payload: any,
		senderUserId?: string,
	): void {
		const message = JSON.stringify({
			type: eventType,
			workspaceId,
			payload,
			timestamp: new Date().toISOString(),
		});

		this.clients.forEach((client) => {
			if (client.workspaceIds.has(workspaceId)) {
				if (client.ws.readyState === WebSocket.OPEN) {
					client.ws.send(message);
				}
			}
		});
	}

	static broadcastToCase(
		caseId: string,
		eventType: string,
		payload: any,
	): void {
		const message = JSON.stringify({
			type: eventType,
			caseId,
			payload,
			timestamp: new Date().toISOString(),
		});

		this.clients.forEach((client) => {
			if (client.activeCaseId === caseId) {
				if (client.ws.readyState === WebSocket.OPEN) {
					client.ws.send(message);
				}
			}
		});
	}

	static sendToUser(userId: string, eventType: string, payload: any): void {
		const message = JSON.stringify({
			type: eventType,
			payload,
			timestamp: new Date().toISOString(),
		});

		this.clients.forEach((client) => {
			if (client.userId === userId) {
				if (client.ws.readyState === WebSocket.OPEN) {
					client.ws.send(message);
				}
			}
		});
	}

	static getClientCount(): number {
		return this.clients.size;
	}
}
