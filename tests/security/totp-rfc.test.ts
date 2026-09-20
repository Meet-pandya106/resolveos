import { describe, it, expect } from 'vitest';
import { TOTPService } from '../../packages/security/src/index.js';

describe('Security: RFC 6238 TOTP Authenticator Standards Compliance', () => {
  // Official RFC 6238 Appendix B test vector:
  // Seed for HMAC-SHA1: "12345678901234567890" (ASCII, 20 bytes)
  // In Base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('matches official RFC 6238 test vectors across multiple epochs', () => {
    // Epoch: 59s -> 287082
    expect(TOTPService.generateCode(rfcSecret, 59 * 1000)).toBe('287082');

    // Epoch: 1111111109s -> 081804
    expect(TOTPService.generateCode(rfcSecret, 1111111109 * 1000)).toBe('081804');

    // Epoch: 1111111111s -> 050471
    expect(TOTPService.generateCode(rfcSecret, 1111111111 * 1000)).toBe('050471');

    // Epoch: 1234567890s -> 005924
    expect(TOTPService.generateCode(rfcSecret, 1234567890 * 1000)).toBe('005924');

    // Epoch: 2000000000s -> 279037
    expect(TOTPService.generateCode(rfcSecret, 2000000000 * 1000)).toBe('279037');
  });

  it('verifies code within drift window and rejects codes outside tolerance', () => {
    const timeNow = 1700000000 * 1000;
    const code = TOTPService.generateCode(rfcSecret, timeNow);

    // Exact match
    expect(TOTPService.verifyCode(rfcSecret, code, timeNow)).toBe(true);

    // Within +1 window (+25s)
    const secret2 = TOTPService.generateSecret();
    const code2 = TOTPService.generateCode(secret2, timeNow);
    expect(TOTPService.verifyCode(secret2, code2, timeNow + 25000)).toBe(true);

    // Within -1 window (-25s)
    const secret3 = TOTPService.generateSecret();
    const code3 = TOTPService.generateCode(secret3, timeNow);
    expect(TOTPService.verifyCode(secret3, code3, timeNow - 25000)).toBe(true);

    // Outside drift window (> 60s)
    const secret4 = TOTPService.generateSecret();
    const code4 = TOTPService.generateCode(secret4, timeNow);
    expect(TOTPService.verifyCode(secret4, code4, timeNow + 90000)).toBe(false);
  });

  it('enforces replay protection against reusing the exact same token within window', () => {
    const timeNow = 1750000000 * 1000;
    const secret = TOTPService.generateSecret();
    const code = TOTPService.generateCode(secret, timeNow);

    // First use: passes
    expect(TOTPService.verifyCode(secret, code, timeNow)).toBe(true);

    // Immediate replay attempt: blocked
    expect(TOTPService.verifyCode(secret, code, timeNow + 2000)).toBe(false);
  });

  it('generates standard otpauth:// provisioning URI for QR scanners', () => {
    const uri = TOTPService.getOtpAuthUri('alice@resolveos.test', rfcSecret, 'ResolveOS');
    expect(uri).toContain('otpauth://totp/ResolveOS:alice%40resolveos.test');
    expect(uri).toContain(`secret=${rfcSecret}`);
    expect(uri).toContain('issuer=ResolveOS');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
  });

  it('generates high-entropy single-use recovery codes', () => {
    const codes = TOTPService.generateRecoveryCodes(8);
    expect(codes.length).toBe(8);
    codes.forEach(c => {
      expect(c).toMatch(/^[0-9A-F]{6}-[0-9A-F]{6}$/);
    });
    const unique = new Set(codes);
    expect(unique.size).toBe(8);
  });
});
