import { describe, it, expect } from 'vitest';
import { SSRFGuard } from '../../packages/security/src/index.js';

describe('Security: SSRF & URL Security Guard', () => {
  it('blocks loopback and localhost variants', () => {
    expect(SSRFGuard.isSafeUrl('http://localhost:8080').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://127.0.0.1:3000').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://[::1]:80').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://0.0.0.0').safe).toBe(false);
  });

  it('blocks cloud instance metadata endpoints', () => {
    expect(SSRFGuard.isSafeUrl('http://169.254.169.254/latest/meta-data/').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://metadata.google.internal/computeMetadata/v1/').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://instance-data/latest/meta-data/').safe).toBe(false);
  });

  it('blocks RFC 1918 private IPv4 networks', () => {
    expect(SSRFGuard.isSafeUrl('http://10.0.0.1/admin').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://172.16.0.1/api').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://172.31.255.255/').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://192.168.1.1/router').safe).toBe(false);
  });

  it('blocks private and link-local IPv6 ranges', () => {
    expect(SSRFGuard.isSafeUrl('http://[fe80::1]/test').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://[fc00::1]/test').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('http://[fd12:3456:789a:1::1]/').safe).toBe(false);
  });

  it('blocks non-HTTP protocols', () => {
    expect(SSRFGuard.isSafeUrl('file:///etc/passwd').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('gopher://127.0.0.1:70/').safe).toBe(false);
    expect(SSRFGuard.isSafeUrl('ftp://example.com/file').safe).toBe(false);
  });

  it('allows public HTTPS URLs', () => {
    expect(SSRFGuard.isSafeUrl('https://api.github.com/repos').safe).toBe(true);
    expect(SSRFGuard.isSafeUrl('https://example.com/webhook').safe).toBe(true);
  });
});
