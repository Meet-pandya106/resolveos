/**
 * Offline Synchronization & 3-Way Differential Merge Route
 * Ingests offline batched mutations, enforces idempotency, and resolves conflicts using 3-way merge.
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase, cases, caseEvidence, caseActions, syncEvents, eq, and } from '@resolveos/database';
import { ConflictResolver } from '@resolveos/domain';
import { authenticate, requireWorkspaceAccess } from '../middleware/auth.js';
import crypto from 'crypto';

export interface SyncMutationItem {
  idempotencyKey: string;
  entityType: 'CASE' | 'EVIDENCE' | 'ACTION';
  entityId: string;
  action: 'CREATE' | 'UPDATE';
  baseSnapshot?: any;
  localSnapshot: any;
  clientTimestamp: number;
}

export const syncRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preHandler', authenticate);

  server.post('/:workspaceId/sync', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = request.body as { mutations?: SyncMutationItem[] };
    const mutations = body?.mutations || [];

    const db = getDatabase();
    const results: any[] = [];

    for (const item of mutations) {
      if (!item.idempotencyKey || !item.entityType || !item.entityId) {
        results.push({ idempotencyKey: item.idempotencyKey, status: 'REJECTED', reason: 'Malformed mutation parameters' });
        continue;
      }

      // 1. Idempotency Check
      const existingSync = db.select().from(syncEvents).where(eq(syncEvents.idempotencyKey, item.idempotencyKey)).get();
      if (existingSync) {
        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'IDEMPOTENT_IGNORED',
          message: 'Mutation already applied previously'
        });
        continue;
      }

      // 2. Process CASE Entity
      if (item.entityType === 'CASE') {
        const remote = db
          .select()
          .from(cases)
          .where(and(eq(cases.id, item.entityId), eq(cases.workspaceId, workspaceId)))
          .get();

        if (!remote && item.action === 'UPDATE') {
          results.push({ idempotencyKey: item.idempotencyKey, status: 'NOT_FOUND', reason: 'Case does not exist in this workspace' });
          continue;
        }

        if (remote && item.baseSnapshot) {
          // Perform 3-way differential merge
          const merge = ConflictResolver.mergeEntities(item.baseSnapshot, item.localSnapshot, remote);
          if (merge.hasConflicts) {
            results.push({
              idempotencyKey: item.idempotencyKey,
              status: 'CONFLICT',
              conflictingFields: merge.conflictingFields,
              merged: merge.merged
            });
            continue;
          }

          // Apply clean merge
          db.update(cases)
            .set({
              ...merge.merged,
              updatedAt: new Date().toISOString()
            })
            .where(eq(cases.id, item.entityId))
            .run();
        } else if (item.action === 'CREATE' && !remote) {
          db.insert(cases)
            .values({
              ...item.localSnapshot,
              id: item.entityId,
              workspaceId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .run();
        }
      }

      // 3. Record Sync Event for Audit & Idempotency
      db.insert(syncEvents)
        .values({
          id: crypto.randomUUID(),
          idempotencyKey: item.idempotencyKey,
          workspaceId,
          entityType: item.entityType,
          entityId: item.entityId,
          action: item.action,
          payload: item.localSnapshot,
          clientTimestamp: item.clientTimestamp,
          syncedAt: new Date().toISOString()
        })
        .run();

      results.push({
        idempotencyKey: item.idempotencyKey,
        status: 'APPLIED',
        syncedAt: new Date().toISOString()
      });
    }

    return reply.send({
      workspaceId,
      totalReceived: mutations.length,
      appliedCount: results.filter(r => r.status === 'APPLIED').length,
      conflictCount: results.filter(r => r.status === 'CONFLICT').length,
      results
    });
  });
};
