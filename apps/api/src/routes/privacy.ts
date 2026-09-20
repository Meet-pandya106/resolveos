/**
 * Privacy Center & Data Protection Routes
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  getDatabase,
  consentRecords,
  auditEvents,
  users,
  userSessions,
  cases,
  eq,
  and,
  desc
} from '@resolveos/database';
import { UpdateConsentInputSchema, ExportDataRequestSchema } from '@resolveos/validation';
import { SecurityCrypto } from '@resolveos/security';
import { authenticate } from '../middleware/auth.js';
import { AuditService } from '../services/AuditService.js';
import { ExportImportService } from '../services/ExportImportService.js';
import crypto from 'crypto';

export const privacyRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preHandler', authenticate);

  // 1. Get User Consent Records
  server.get('/consent', async (request, reply) => {
    const db = getDatabase();
    const records = db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, request.user!.id))
      .all();

    return reply.send(records);
  });

  // 2. Update Consent (Grant / Withdraw)
  server.post('/consent', async (request, reply) => {
    const body = UpdateConsentInputSchema.parse(request.body);
    const db = getDatabase();

    const existing = db
      .select()
      .from(consentRecords)
      .where(and(eq(consentRecords.userId, request.user!.id), eq(consentRecords.consentType, body.consentType)))
      .get();

    const now = new Date().toISOString();

    if (existing) {
      db.update(consentRecords)
        .set({
          status: body.status,
          version: body.version,
          timestamp: now
        })
        .where(eq(consentRecords.id, existing.id))
        .run();
    } else {
      db.insert(consentRecords)
        .values({
          id: crypto.randomUUID(),
          userId: request.user!.id,
          consentType: body.consentType,
          version: body.version,
          status: body.status,
          timestamp: now
        })
        .run();
    }

    AuditService.log('PRIVACY_CONSENT_UPDATED', {
      req: request,
      userId: request.user!.id,
      details: { consentType: body.consentType, status: body.status }
    });

    return reply.send({ message: `Consent for ${body.consentType} updated to ${body.status}` });
  });

  // 3. View Security Audit History
  server.get('/audit-logs', async (request, reply) => {
    const db = getDatabase();
    const logs = db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.userId, request.user!.id))
      .orderBy(desc(auditEvents.createdAt))
      .limit(50)
      .all();

    return reply.send(logs);
  });

  // 4. Export Workspace Cases (JSON / CSV)
  server.post('/export/:workspaceId', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const body = ExportDataRequestSchema.parse(request.body || {});

      AuditService.log('DATA_EXPORTED', {
        req: request,
        workspaceId,
        userId: request.user!.id,
        details: { format: body.format }
      });

      if (body.format === 'CSV') {
        const csvData = ExportImportService.exportCasesCsv(workspaceId);
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="resolveos-export-${workspaceId}.csv"`);
        return reply.send(csvData);
      }

      // Default JSON export
      const db = getDatabase();
      const caseRecords = db.select().from(cases).where(eq(cases.workspaceId, workspaceId)).all();
      const fullExport = caseRecords.map((c: any) => ExportImportService.exportCaseJson(c.id));

      return reply.send({
        workspaceId,
        exportedAt: new Date().toISOString(),
        casesCount: fullExport.length,
        cases: fullExport
      });
    } catch (err: any) {
      console.error('[Export Error]', err);
      throw err;
    }
  });

  // 5. Account Deletion Flow (Irreversible with password confirmation)
  server.delete('/account', async (request, reply) => {
    const { password } = request.body as { password?: string };
    if (!password) {
      return reply.status(400).send({ error: 'Password confirmation required for account deletion.' });
    }

    const db = getDatabase();
    const user = db.select().from(users).where(eq(users.id, request.user!.id)).get();
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const validPassword = await SecurityCrypto.verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      AuditService.log('FAILED_LOGIN', { req: request, userId: user.id, details: { reason: 'Incorrect password for deletion' } });
      return reply.status(403).send({ error: 'Invalid password. Account deletion aborted.' });
    }

    const now = new Date().toISOString();

    // Soft delete user and anonymize personal information
    db.update(users)
      .set({
        name: 'Deleted User',
        email: `deleted_${crypto.randomUUID()}@anonymized.local`,
        passwordHash: 'DELETED',
        avatarUrl: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        recoveryCodes: null,
        deletedAt: now,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .run();

    // Revoke all active sessions
    db.update(userSessions).set({ isRevoked: true }).where(eq(userSessions.userId, user.id)).run();

    AuditService.log('ACCOUNT_DELETED', { req: request, userId: user.id, details: { timestamp: now } });
    reply.clearCookie('token', { path: '/' });

    return reply.send({ message: 'Account successfully scheduled for permanent deletion and personal data anonymized.' });
  });
};
