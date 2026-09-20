/**
 * Authentication & Session Management Routes
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase, users, userSessions, workspaces, workspaceMembers, eq, and } from '@resolveos/database';
import { SecurityCrypto, TOTPService } from '@resolveos/security';
import { RegisterInputSchema, LoginInputSchema, ChangePasswordInputSchema, TOTPVerifyInputSchema } from '@resolveos/validation';
import { AuditService } from '../services/AuditService.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

export const authRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // 1. User Registration
  server.post('/register', async (request, reply) => {
    const body = RegisterInputSchema.parse(request.body);
    const db = getDatabase();

    // Check if user already exists
    const existing = db.select().from(users).where(eq(users.email, body.email.toLowerCase())).get();
    if (existing) {
      AuditService.log('FAILED_LOGIN', { req: request, details: { reason: 'Registration email collision', email: body.email } });
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this email address already exists.',
        requestId: request.id
      });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await SecurityCrypto.hashPassword(body.password);
    const now = new Date().toISOString();

    // Create User
    db.insert(users)
      .values({
        id: userId,
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        twoFactorEnabled: false,
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now
      })
      .run();

    // Create Default Personal Workspace
    const workspaceId = crypto.randomUUID();
    db.insert(workspaces)
      .values({
        id: workspaceId,
        name: `${body.name}'s Workspace`,
        slug: `workspace-${userId.slice(0, 8)}`,
        ownerId: userId,
        retentionDays: 365,
        aiProcessingEnabled: false,
        createdAt: now,
        updatedAt: now
      })
      .run();

    db.insert(workspaceMembers)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        userId,
        role: 'OWNER',
        joinedAt: now
      })
      .run();

    // Create Session
    const sessionId = crypto.randomUUID();
    db.insert(userSessions)
      .values({
        id: sessionId,
        userId,
        userAgent: request.headers['user-agent'] || 'unknown',
        ipAddress: request.ip,
        deviceType: 'desktop',
        lastActiveAt: now,
        createdAt: now,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isRevoked: false
      })
      .run();

    const token = (server as any).jwt.sign({ id: userId, email: body.email.toLowerCase(), sessionId });
    AuditService.log('LOGIN', { req: request, userId, details: { method: 'registration' } });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return reply.status(201).send({
      user: { id: userId, email: body.email.toLowerCase(), name: body.name, twoFactorEnabled: false },
      token,
      defaultWorkspaceId: workspaceId
    });
  });

  // 2. User Login
  server.post('/login', async (request, reply) => {
    const body = LoginInputSchema.parse(request.body);
    const db = getDatabase();

    const user = db.select().from(users).where(and(eq(users.email, body.email.toLowerCase()), eq(users.deletedAt, null as any))).get();
    if (!user) {
      AuditService.log('FAILED_LOGIN', { req: request, details: { email: body.email, reason: 'User not found' } });
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password.', requestId: request.id });
    }

    const validPassword = await SecurityCrypto.verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      AuditService.log('FAILED_LOGIN', { req: request, userId: user.id, details: { reason: 'Invalid password' } });
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password.', requestId: request.id });
    }

    // 2FA Verification check if enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!body.totpCode) {
        return reply.status(200).send({ requires2FA: true, userId: user.id });
      }
      const validCode = TOTPService.verifyCode(user.twoFactorSecret, body.totpCode);
      if (!validCode) {
        AuditService.log('FAILED_LOGIN', { req: request, userId: user.id, details: { reason: 'Invalid 2FA TOTP code' } });
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid two-factor authentication code.', requestId: request.id });
      }
    }

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(userSessions)
      .values({
        id: sessionId,
        userId: user.id,
        userAgent: request.headers['user-agent'] || 'unknown',
        ipAddress: request.ip,
        deviceType: 'desktop',
        lastActiveAt: now,
        createdAt: now,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isRevoked: false
      })
      .run();

    const token = (server as any).jwt.sign({ id: user.id, email: user.email, sessionId });
    AuditService.log('LOGIN', { req: request, userId: user.id, details: { method: 'password' } });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, twoFactorEnabled: user.twoFactorEnabled },
      token
    });
  });

  // 3. User Profile
  server.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDatabase();
    const user = db.select().from(users).where(eq(users.id, request.user!.id)).get();
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Fetch user workspaces
    const memberships = db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(eq(workspaceMembers.userId, user.id), eq(workspaces.deletedAt, null as any)))
      .all();

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt
      },
      workspaces: memberships.map((m: any) => ({ ...m.workspace, role: m.role }))
    });
  });

  // 4. Logout (Revoke Current Session)
  server.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDatabase();
    if (request.user?.sessionId) {
      db.update(userSessions).set({ isRevoked: true }).where(eq(userSessions.id, request.user.sessionId)).run();
    }
    AuditService.log('SESSION_REVOKED', { req: request, userId: request.user!.id });
    reply.clearCookie('token', { path: '/' });
    return reply.send({ message: 'Successfully logged out.' });
  });

  // 5. Active Sessions List
  server.get('/sessions', { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDatabase();
    const sessions = db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.userId, request.user!.id), eq(userSessions.isRevoked, false)))
      .all();

    return reply.send(sessions.map((s: any) => ({ ...s, isCurrent: s.id === request.user!.sessionId })));
  });

  // 6. Revoke Specific Session
  server.delete('/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDatabase();
    db.update(userSessions)
      .set({ isRevoked: true })
      .where(and(eq(userSessions.id, id), eq(userSessions.userId, request.user!.id)))
      .run();

    AuditService.log('SESSION_REVOKED', { req: request, userId: request.user!.id, details: { revokedSessionId: id } });
    return reply.send({ message: 'Session successfully revoked.' });
  });
};
