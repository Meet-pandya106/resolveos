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
	private static writeMutex: Promise<any> = Promise.resolve();
	private static lastTimestamp = 0;

	private static getMonotonicTimestamp(): string {
		let now = Date.now();
		if (now <= this.lastTimestamp) {
			now = this.lastTimestamp + 1;
		}
		this.lastTimestamp = now;
		return new Date(now).toISOString();
	}

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
	static async log(
		action: AuditAction,
		options: {
			req?: FastifyRequest;
			workspaceId?: string | null;
			userId?: string | null;
			ipAddress?: string;
			userAgent?: string;
			details?: Record<string, any>;
			isCritical?: boolean;
		},
	): Promise<string> {
		// Acquire mutex for atomic chain serialization (Rule 21, 22)
		const prev = this.writeMutex;
		let release: () => void;
		this.writeMutex = new Promise<void>((r) => {
			release = r;
		});
		await prev;

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
			const createdAt = this.getMonotonicTimestamp();

			// Use transaction for atomic chain serialization (concurrency protection)
			return await db.transaction(async (tx) => {
				// Bounded query: find latest event by createdAt DESC limit 1
				const lastEvent = await tx
					.select()
					.from(auditEvents)
					.orderBy({ field: "createdAt", order: "desc" })
					.limit(1)
					.get();

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
				await tx
					.insert(auditEvents)
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
			});
		} catch (err: any) {
			console.error("[AuditService] Failed to write audit event:", err);
			if (options.isCritical) {
				throw new Error(
					`Critical audit event write failed for action ${action}: ${err.message}`,
				);
			}
			return "";
		} finally {
			release!();
		}
	}

	/**
	 * Verifies the mathematical integrity of the audit log hash chain.
	 */
	static async verifyChain(): Promise<{
		valid: boolean;
		totalEvents: number;
		brokenEventId?: string;
		error?: string;
	}> {
		try {
			const db = getDatabase();
			const events = await db
				.select()
				.from(auditEvents)
				.orderBy({ field: "createdAt", order: "asc" })
				.all();
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
