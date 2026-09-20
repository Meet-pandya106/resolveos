/**
 * Realtime Event Service (WebSocket)
 * Dispatches real-time case updates, collaborative notifications, and live status updates.
 */

import { WebSocket } from 'ws';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  workspaceIds: Set<string>;
  activeCaseId?: string | null;
}

export class RealtimeService {
  private static clients = new Set<ClientConnection>();

  static registerClient(ws: WebSocket, userId: string, initialWorkspaceId?: string): ClientConnection {
    const client: ClientConnection = {
      ws,
      userId,
      workspaceIds: new Set(initialWorkspaceId ? [initialWorkspaceId] : []),
      activeCaseId: null
    };

    this.clients.add(client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'SUBSCRIBE_WORKSPACE' && msg.workspaceId) {
          client.workspaceIds.add(msg.workspaceId);
        } else if (msg.type === 'FOCUS_CASE') {
          client.activeCaseId = msg.caseId;
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
}
