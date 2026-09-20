/**
 * Realtime Event Service (WebSocket)
 * Dispatches real-time case updates, collaborative notifications, and live status updates.
 * Strictly enforces server-side tenant isolation and workspace membership authorization for subscriptions.
 */

import { WebSocket } from 'ws';
import { getDatabase, workspaceMembers, cases, eq, and } from '@resolveos/database';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  workspaceIds: Set<string>;
  activeCaseId?: string | null;
}

export class RealtimeService {
  private static clients = new Set<ClientConnection>();

  static registerClient(ws: WebSocket, userId: string, initialWorkspaceId?: string): ClientConnection {
    const db = getDatabase();
    const authorizedWorkspaces = new Set<string>();

    // If initial workspace requested, verify membership before subscribing
    if (initialWorkspaceId) {
      const membership = db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, initialWorkspaceId), eq(workspaceMembers.userId, userId)))
        .get();
      if (membership) {
        authorizedWorkspaces.add(initialWorkspaceId);
      }
    }

    const client: ClientConnection = {
      ws,
      userId,
      workspaceIds: authorizedWorkspaces,
      activeCaseId: null
    };

    this.clients.add(client);

    ws.on('message', (raw) => {
      try {
        // Enforce maximum frame size limit (16KB)
        if (raw.toString().length > 16384) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Payload exceeds maximum allowed frame size (16KB)' }));
          return;
        }

        const msg = JSON.parse(raw.toString());

        if (msg.type === 'SUBSCRIBE_WORKSPACE' && msg.workspaceId) {
          const dbInstance = getDatabase();
          const membership = dbInstance
            .select()
            .from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, msg.workspaceId), eq(workspaceMembers.userId, client.userId)))
            .get();

          if (!membership) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Forbidden',
              message: 'Unauthorized workspace subscription rejected. User is not a member of this workspace.',
              workspaceId: msg.workspaceId
            }));
            return;
          }

          client.workspaceIds.add(msg.workspaceId);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', workspaceId: msg.workspaceId }));
        } else if (msg.type === 'FOCUS_CASE' && msg.caseId) {
          const dbInstance = getDatabase();
          const targetCase = dbInstance
            .select()
            .from(cases)
            .where(and(eq(cases.id, msg.caseId), eq(cases.deletedAt, null as any)))
            .get();

          if (!targetCase) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'NotFound', message: 'Case not found' }));
            return;
          }

          const membership = dbInstance
            .select()
            .from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, targetCase.workspaceId), eq(workspaceMembers.userId, client.userId)))
            .get();

          if (!membership) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Forbidden',
              message: 'Unauthorized case subscription rejected. User does not have access to the parent workspace.'
            }));
            return;
          }

          client.activeCaseId = msg.caseId;
          ws.send(JSON.stringify({ type: 'CASE_FOCUSED', caseId: msg.caseId }));
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        // Ignore malformed client message
      }
    });

    ws.on('close', () => {
      this.clients.delete(client);
    });

    return client;
  }

  static broadcastToWorkspace(workspaceId: string, eventType: string, payload: any, senderUserId?: string): void {
    const message = JSON.stringify({
      type: eventType,
      workspaceId,
      payload,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.workspaceIds.has(workspaceId)) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
        }
      }
    });
  }

  static broadcastToCase(caseId: string, eventType: string, payload: any): void {
    const message = JSON.stringify({
      type: eventType,
      caseId,
      payload,
      timestamp: new Date().toISOString()
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
      timestamp: new Date().toISOString()
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
