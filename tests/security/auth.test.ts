import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../../apps/api/src/index.js';
import { initDatabase, closeDatabase } from '../../packages/database/src/index.js';
import { TOTPService } from '../../packages/security/src/index.js';

describe('Security: Authentication, 2FA MFA Lifecycle, Recovery Codes & Session Revocation', () => {
  let userToken: string;
  let userEmail = 'mfa.user@resolveos.test';
  let userPassword = 'Password#Secure99!';
  let totpSecret: string;
  let recoveryCodes: string[] = [];

  beforeAll(async () => {
    initDatabase(':memory:');
    await server.ready();

    // Register user
    const reg = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: userEmail, password: userPassword, name: 'MFA User' }
    });
    userToken = JSON.parse(reg.payload).token;
  });

  afterAll(async () => {
    await server.close();
    closeDatabase();
  });

  it('1. Generates 2FA setup secret and provisioning URI', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/2fa/setup',
      headers: { authorization: `Bearer ${userToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.secret).toBeDefined();
    expect(body.otpAuthUri).toContain('otpauth://totp/ResolveOS');
    totpSecret = body.secret;
  });

  it('2. Rejects 2FA activation with invalid code', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/2fa/enable',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { secret: totpSecret, code: '000000' }
    });

    expect(res.statusCode).toBe(400);
  });

  it('3. Activates 2FA with valid code and generates 8 recovery codes', async () => {
    const validCode = TOTPService.generateCode(totpSecret);
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/2fa/enable',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { secret: totpSecret, code: validCode }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.recoveryCodes.length).toBe(8);
    recoveryCodes = body.recoveryCodes;
  });

  it('4. Login requires 2FA challenge when 2FA is active', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: userEmail, password: userPassword }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.requires2FA).toBe(true);
    expect(body.token).toBeUndefined();
  });

  it('5. Completes 2FA login with valid TOTP code', async () => {
    // Generate code in adjacent window (+30s) to demonstrate clock tolerance and avoid replay rejection
    const validCode = TOTPService.generateCode(totpSecret, Date.now() + 30000);
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: userEmail, password: userPassword, totpCode: validCode }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeDefined();
    expect(body.user.twoFactorEnabled).toBe(true);
  });

  it('6. Completes login using a single-use recovery code and burns it', async () => {
    const codeToUse = recoveryCodes[0];
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: userEmail, password: userPassword, recoveryCode: codeToUse }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeDefined();

    // Replay attempt with same recovery code must be rejected
    const replayRes = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: userEmail, password: userPassword, recoveryCode: codeToUse }
    });
    expect(replayRes.statusCode).toBe(401);
  });

  it('7. Revokes all user sessions via logout-all', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/logout-all',
      headers: { authorization: `Bearer ${userToken}` }
    });

    expect(res.statusCode).toBe(200);

    // Old token should now be rejected as session is revoked
    const meRes = await server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${userToken}` }
    });
    expect(meRes.statusCode).toBe(401);
  });
});
