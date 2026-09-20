/**
 * @resolveos/security
 * Enterprise-grade cryptographic primitives, password hashing, RFC 6238 TOTP MFA,
 * PII redaction, SSRF protection with DNS resolution, and path traversal defenses.
 */

import crypto from 'crypto';
import dns from 'dns/promises';

// =========================================================================
// 1. Cryptographic Primitives & Password Hashing
// =========================================================================

export class SecurityCrypto {
  /**
   * Hashes a password using scrypt with a cryptographically secure 16-byte salt.
   * Format: `scrypt$salt$derivedKey`
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies a password against a hash using constant-time comparison.
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return false;
      }
      const salt = parts[1];
      const keyHex = parts[2];
      const keyBuffer = Buffer.from(keyHex, 'hex');

      return new Promise((resolve) => {
        crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) return resolve(false);
          if (keyBuffer.length !== derivedKey.length) return resolve(false);
          const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
          resolve(match);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Generates a high-entropy cryptographically secure random token (hex).
   */
  static generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes an API key for safe database storage.
   */
  static hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Masks an API key showing only a safe fingerprint.
   * e.g. "ro_live_••••••••7F3A"
   */
  static maskAPIKey(apiKey: string): string {
    if (apiKey.length < 8) return 'ro_live_••••••••';
    const suffix = apiKey.slice(-4).toUpperCase();
    return `ro_live_••••••••${suffix}`;
  }
}

// =========================================================================
// 2. RFC 6238 / RFC 4226 TOTP Authenticator (Standards Compliant)
// =========================================================================

export class TOTPService {
  private static readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  // In-memory replay cache to prevent code replay within valid drift window: "secret:counter" -> timestamp
  private static usedTokens = new Map<string, number>();

  /**
   * Encodes a raw byte buffer into RFC 3548 / RFC 4648 Base32 string (without padding).
   */
  static base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += this.BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += this.BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes an RFC 3548 / RFC 4648 Base32 string into a raw byte buffer.
   */
  static base32Decode(base32Str: string): Buffer {
    const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = this.BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) {
        throw new Error(`Invalid base32 character: ${cleaned[i]}`);
      }
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  /**
   * Generates a 20-byte random secret key encoded in Base32.
   */
  static generateSecret(byteLength: number = 20): string {
    const randomBytes = crypto.randomBytes(byteLength);
    return this.base32Encode(randomBytes);
  }

  /**
   * Generates a 6-digit TOTP code for the given Base32 secret at a specified timestamp.
   */
  static generateCode(secretBase32: string, timestampMs: number = Date.now(), timeStep: number = 30): string {
    const key = this.base32Decode(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / timeStep);

    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Verifies a TOTP code allowing ±1 time step tolerance (clock drift) with replay protection.
   */
  static verifyCode(
    secretBase32: string,
    code: string,
    timestampMs: number = Date.now(),
    timeStep: number = 30
  ): boolean {
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) return false;

    try {
      const key = this.base32Decode(secretBase32);
      const currentCounter = Math.floor(timestampMs / 1000 / timeStep);

      // Clean old replay cache items (> 3 minutes old)
      const now = Date.now();
      for (const [k, v] of this.usedTokens.entries()) {
        if (now - v > 180000) {
          this.usedTokens.delete(k);
        }
      }

      // Check windows: -1, 0, +1
      for (let i = -1; i <= 1; i++) {
        const stepCounter = currentCounter + i;
        const replayKey = `${secretBase32}:${stepCounter}:${code}`;

        // If this exact code was already used for this step window, reject replay
        if (this.usedTokens.has(replayKey)) {
          continue;
        }

        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt(stepCounter));

        const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const computed =
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff);

        const expectedCode = (computed % 1000000).toString().padStart(6, '0');

        if (crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(code))) {
          this.usedTokens.set(replayKey, now);
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Builds an otpauth:// URI for authenticator app QR code scanning.
   */
  static getOtpAuthUri(account: string, secretBase32: string, issuer: string = 'ResolveOS'): string {
    const encodedAccount = encodeURIComponent(account);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generates single-use recovery codes.
   */
  static generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }
}

// =========================================================================
// 3. Sensitive Data & PII Redaction Engine
// =========================================================================

export interface RedactionResult {
  redactedText: string;
  detectedCount: number;
  detectedTypes: string[];
}

export class DataRedactor {
  private static readonly PATTERNS = [
    { type: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
    // Matches sk-live-..., sk_live_..., api_key_..., ghp_..., xoxb-..., etc.
    {
      type: 'API_KEY',
      regex: /(?:sk|pk|ak|api|key|token|secret)[-_](?:live|test|prod|dev)?[a-zA-Z0-9_-]{12,64}/gi,
      replacement: '[SECRET_REDACTED]'
    },
    { type: 'PHONE', regex: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE_REDACTED]' },
    { type: 'CREDIT_CARD', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CARD_REDACTED]' },
    { type: 'JWT', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, replacement: '[JWT_REDACTED]' },
    { type: 'IPV4', regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, replacement: '[IP_REDACTED]' },
    { type: 'IPV6', regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, replacement: '[IPV6_REDACTED]' },
    { type: 'URL_CREDENTIALS', regex: /https?:\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9.-]+/gi, replacement: '[URL_CREDENTIALS_REDACTED]' }
  ];

  static redact(text: string): RedactionResult {
    if (!text) {
      return { redactedText: '', detectedCount: 0, detectedTypes: [] };
    }

    let redacted = text;
    let count = 0;
    const types = new Set<string>();

    for (const pattern of this.PATTERNS) {
      const matches = redacted.match(pattern.regex);
      if (matches) {
        count += matches.length;
        types.add(pattern.type);
        redacted = redacted.replace(pattern.regex, pattern.replacement);
      }
    }

    return {
      redactedText: redacted,
      detectedCount: count,
      detectedTypes: Array.from(types)
    };
  }
}

// =========================================================================
// 4. SSRF & URL Security Guard (with DNS Resolution Check)
// =========================================================================

export class SSRFGuard {
  private static readonly BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '::1',
    '[::1]',
    '0.0.0.0',
    '169.254.169.254', // AWS/GCP/Azure instance metadata
    'metadata.google.internal',
    'instance-data'
  ];

  /**
   * Synchronously checks URL string against basic SSRF patterns.
   */
  static isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
    try {
      const parsed = new URL(rawUrl);

      // Only allow http and https
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Protocol "${parsed.protocol}" is forbidden. Only HTTP/HTTPS permitted.` };
      }

      const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

      // Check blocked hostnames
      if (this.BLOCKED_HOSTS.includes(hostname) || this.BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
        return { safe: false, reason: `Access to host "${hostname}" is prohibited.` };
      }

      // Check IPv6 loopback, link-local (fe80::/10), and unique local address (fc00::/7)
      if (
        hostname === '::1' ||
        hostname.startsWith('fe80:') ||
        hostname.startsWith('fc') ||
        hostname.startsWith('fd')
      ) {
        return { safe: false, reason: 'Private/Loopback IPv6 address blocked.' };
      }

      // Check private IPv4 ranges (RFC 1918 + Link Local)
      if (this.isPrivateIPv4(hostname)) {
        return { safe: false, reason: 'Private/Loopback IPv4 network address blocked.' };
      }

      return { safe: true };
    } catch {
      return { safe: false, reason: 'Malformed URL format.' };
    }
  }

  /**
   * Asynchronously validates target URL by performing DNS resolution to ensure
   * external domains do not resolve to private or loopback IP ranges (DNS rebinding protection).
   */
  static async isSafeUrlAsync(rawUrl: string): Promise<{ safe: boolean; reason?: string }> {
    const syncCheck = this.isSafeUrl(rawUrl);
    if (!syncCheck.safe) return syncCheck;

    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

      // If hostname is already an IP, it was checked by syncCheck
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.includes(':')) {
        return syncCheck;
      }

      // Resolve DNS
      const addresses = await dns.lookup(hostname, { all: true });
      for (const record of addresses) {
        if (record.family === 4) {
          if (this.isPrivateIPv4(record.address)) {
            return { safe: false, reason: `Host resolves to private IPv4 address (${record.address}). SSRF blocked.` };
          }
        } else if (record.family === 6) {
          const ip = record.address.toLowerCase();
          if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
            return { safe: false, reason: `Host resolves to private/loopback IPv6 address (${ip}). SSRF blocked.` };
          }
        }
      }

      return { safe: true };
    } catch (err: any) {
      return { safe: false, reason: `DNS resolution failed: ${err.message}` };
    }
  }

  private static isPrivateIPv4(ipStr: string): boolean {
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ipStr.match(ipv4Regex);
    if (!match) return false;

    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    if (octet1 === 10) return true; // 10.0.0.0/8
    if (octet1 === 127) return true; // 127.0.0.0/8
    if (octet1 === 169 && octet2 === 254) return true; // 169.254.0.0/16
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true; // 172.16.0.0/12
    if (octet1 === 192 && octet2 === 168) return true; // 192.168.0.0/16
    if (octet1 === 0) return true; // 0.0.0.0/8
    return false;
  }
}

// =========================================================================
// 5. Path Traversal & Sanitization Defenses
// =========================================================================

export class PathSanitizer {
  /**
   * Recursively normalizes filenames and strips dangerous path traversal sequences.
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return 'unnamed_attachment';

    // Decode URL-encoded sequences (%2e%2e, %2f, etc.)
    let clean = filename;
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // If decode fails, proceed with raw
    }

    // Strip null bytes and control chars
    clean = clean.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

    // Normalize slashes
    clean = clean.replace(/\\/g, '/');

    // Recursively strip traversal patterns until fixpoint
    let prev = '';
    while (prev !== clean) {
      prev = clean;
      clean = clean.replace(/(\.\.\/)+/g, '');
      clean = clean.replace(/\.\./g, '');
    }

    // Collapse multiple consecutive slashes and strip leading slashes
    clean = clean.replace(/\/+/g, '/').replace(/^\/+/, '');

    // Replace invalid/dangerous characters
    clean = clean.replace(/[<>:"/|?*]/g, '_');
    clean = clean.replace(/\//g, '_');
    clean = clean.replace(/^_+|_+$/g, '');
    clean = clean.trim();
    if (!clean || clean === '.' || clean === '_') clean = 'unnamed_attachment';

    return clean;
  }
}
