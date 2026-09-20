/**
 * Audit Logging Service
 * Records tamper-resistant audit logs for all security, authentication, and data privacy events
 * using cryptographic SHA-256 hash chaining.
 */

import { auditEvents, getDatabase } from "@resolveos/database";
import { AuditAction } from "@resolveos/shared";
import crypto from "crypto";
import { FastifyRequest } from "fastify";

export class AuditService {
	/**
	 * Computes SHA-256 hash of an audit event chained to previous event hash.
	 */
	static computeHash(
		previousHash: string,
		action: string,
		userId: string | null,
		details: any,
		createdAt: string,
	): string {
		const payload = `${previousHash}|${action}|${userId || ""}|${JSON.stringify(details || {})}|${createdAt}`;
		return crypto.createHash("sha256").update(payload).digest("hex");
	}

	/**
	 * Logs a security audit event with cryptographic chaining.
	 */
	static log(
		action: AuditAction,
		options: {
			req?: FastifyRequest;
			workspaceId?: string | null;
			userId?: string | null;
			ipAddress?: string;
			userAgent?: string;
			details?: Record<string, any>;
		},
	): string {
		try {
			const db = getDatabase();
			const ip =
				options.ipAddress || (options.req ? options.req.ip : "127.0.0.1");
			const agent =
				options.userAgent ||
				(options.req
					? options.req.headers["user-agent"] || "unknown"
					: "system");
			const uid =
				options.userId ||
				(options.req && (options.req as any).user
					? (options.req as any).user.id
					: null);
			const createdAt = new Date().toISOString();

			// Find last event for cryptographic hash chaining
			const lastEvents = db.select().from(auditEvents).all();
			const lastEvent =
				lastEvents.length > 0
					? (lastEvents[lastEvents.length - 1] as any)
					: null;
			const previousHash =
				lastEvent && lastEvent.hash
					? lastEvent.hash
					: "0000000000000000000000000000000000000000000000000000000000000000";
			const eventHash = this.computeHash(
				previousHash,
				action,
				uid,
				options.details,
				createdAt,
			);

			const id = crypto.randomUUID();
			db.insert(auditEvents)
				.values({
					id,
					workspaceId: options.workspaceId || null,
					userId: uid,
					action,
					ipAddress: ip,
					userAgent: agent,
					details: options.details || {},
					previousHash,
					hash: eventHash,
					createdAt,
				})
				.run();

			return eventHash;
		} catch (err) {
			console.error("[AuditService] Failed to write audit event:", err);
			return "";
		}
	}

	/**
	 * Verifies the mathematical integrity of the audit log hash chain.
	 */
	static verifyChain(): {
		valid: boolean;
		totalEvents: number;
		brokenEventId?: string;
		error?: string;
	} {
		try {
			const db = getDatabase();
			const events = db.select().from(auditEvents).all();
			if (events.length === 0) return { valid: true, totalEvents: 0 };

			let expectedPrevHash =
				"0000000000000000000000000000000000000000000000000000000000000000";

			for (const ev of events as any[]) {
				if (ev.previousHash && ev.previousHash !== expectedPrevHash) {
					return {
						valid: false,
						totalEvents: events.length,
						brokenEventId: ev.id,
						error: "Previous hash mismatch",
					};
				}
				const computed = this.computeHash(
					ev.previousHash ||
						"0000000000000000000000000000000000000000000000000000000000000000",
					ev.action,
					ev.userId,
					ev.details,
					ev.createdAt,
				);
				if (ev.hash && ev.hash !== computed) {
					return {
						valid: false,
						totalEvents: events.length,
						brokenEventId: ev.id,
						error: "Current hash payload tampered",
					};
				}
				if (ev.hash) {
					expectedPrevHash = ev.hash;
				}
			}

			return { valid: true, totalEvents: events.length };
		} catch (err: any) {
			return { valid: false, totalEvents: 0, error: err.message };
		}
	}
}
