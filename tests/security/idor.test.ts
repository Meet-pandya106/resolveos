import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../../apps/api/src/index.js';
import { initDatabase, closeDatabase } from '../../packages/database/src/index.js';

describe('Security: Comprehensive Cross-Tenant IDOR & BOLA Regression Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let workspaceAId: string;
  let workspaceBId: string;
  let caseAId: string;
  let evidenceAId: string;
  let hypothesisAId: string;
  let actionAId: string;

  beforeAll(async () => {
    initDatabase(':memory:');
    await server.ready();

    // 1. Register User A in Workspace A
    const regA = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@idor.test', password: 'Password#1234A', name: 'Alice Tenant A' }
    });
    const bodyA = JSON.parse(regA.payload);
    userAToken = bodyA.token;
    workspaceAId = bodyA.defaultWorkspaceId;

    // 2. Register User B in Workspace B
    const regB = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'bob@idor.test', password: 'Password#1234B', name: 'Bob Tenant B' }
    });
    const bodyB = JSON.parse(regB.payload);
    userBToken = bodyB.token;
    workspaceBId = bodyB.defaultWorkspaceId;

    // 3. Alice creates a Case in Workspace A
    const caseRes = await server.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceAId}/cases`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { title: 'Secret Vulnerability Report', severity: 'CRITICAL', description: 'Zero-day exploit notes' }
    });
    caseAId = JSON.parse(caseRes.payload).id;

    // 4. Alice attaches Evidence to Case A
    const evRes = await server.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceAId}/cases/${caseAId}/evidence`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        title: 'Network Packet Dump',
        description: 'Exfiltration payload capture',
        type: 'LOG',
        capturedAt: new Date().toISOString()
      }
    });
    evidenceAId = JSON.parse(evRes.payload).id;

    // 5. Alice creates a Hypothesis in Case A
    const hypRes = await server.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceAId}/cases/${caseAId}/hypotheses`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { description: 'Compromised service account token', confidence: 'HIGH', status: 'UNTESTED' }
    });
    hypothesisAId = JSON.parse(hypRes.payload).id;

    // 6. Alice creates an Action in Case A
    const actRes = await server.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceAId}/cases/${caseAId}/actions`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { title: 'Rotate root cryptographic secrets', priority: 'URGENT' }
    });
    actionAId = JSON.parse(actRes.payload).id;
  });

  afterAll(async () => {
    await server.close();
    closeDatabase();
  });

  it('blocks User B from fetching Alice Case A details directly', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceAId}/cases/${caseAId}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('blocks User B from accessing Alice Case A via Bob workspace URL (Nested IDOR)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceBId}/cases/${caseAId}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    expect(res.statusCode).toBe(404);
  });

  it('blocks User B from reading Alice Evidence via IDOR', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceBId}/cases/${caseAId}/evidence`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    expect(res.statusCode).toBe(404);
  });

  it('blocks User B from posting Evidence to Alice Case via IDOR', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceBId}/cases/${caseAId}/evidence`,
      headers: { authorization: `Bearer ${userBToken}` },
      payload: {
        title: 'Tampered Log',
        description: 'Injected falsified evidence',
        type: 'LOG',
        capturedAt: new Date().toISOString()
      }
    });
    expect(res.statusCode).toBe(404);
  });

  it('blocks User B from reading Alice Hypotheses via IDOR', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceBId}/cases/${caseAId}/hypotheses`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    expect(res.statusCode).toBe(404);
  });

  it('blocks User B from mutating Alice Action via IDOR', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceBId}/cases/${caseAId}/actions/${actionAId}`,
      headers: { authorization: `Bearer ${userBToken}` },
      payload: { status: 'DONE' }
    });
    expect(res.statusCode).toBe(404);
  });

  it('blocks User B from exporting Workspace A data dump (Export IDOR)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/privacy/export/${workspaceAId}`,
      headers: { authorization: `Bearer ${userBToken}` },
      payload: { format: 'JSON' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('blocks User B from triggering AI analysis on Alice Case (AI IDOR)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/ai/${workspaceBId}/cases/${caseAId}/analyze`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    // Should be blocked either by AI settings or case-not-found
    expect([403, 404]).toContain(res.statusCode);
  });
});
