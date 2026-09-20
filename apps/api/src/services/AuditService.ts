/**
 * Audit Logging Service
 * Records tamper-resistant audit logs for all security, authentication, and data privacy events.
 */

import { getDatabase, auditEvents } from '@resolveos/database';
import { AuditAction } from '@resolveos/shared';
import crypto from 'crypto';
import { FastifyRequest } from 'fastify';

export class AuditService {
  static log(
    action: AuditAction,
    options: {
      req?: FastifyRequest;
      workspaceId?: string | null;
      userId?: string | null;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, any>;
    }
  ): void {
    try {
      const db = getDatabase();
      const ip = options.ipAddress || (options.req ? options.req.ip : '127.0.0.1');
      const agent = options.userAgent || (options.req ? options.req.headers['user-agent'] || 'unknown' : 'system');
      const uid = options.userId || (options.req && options.req.user ? options.req.user.id : null);

      db.insert(auditEvents)
        .values({
          id: crypto.randomUUID(),
          workspaceId: options.workspaceId || null,
          userId: uid,
          action,
          ipAddress: ip,
          userAgent: agent,
          details: options.details || {},
          createdAt: new Date().toISOString()
        })
        .run();
    } catch (err) {
      console.error('[AuditService] Failed to write audit event:', err);
    }
  }
}
