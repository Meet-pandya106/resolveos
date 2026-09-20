/**
 * @resolveos/security
 * Enterprise-grade cryptographic primitives, password hashing, TOTP MFA,
 * PII redaction, SSRF protection, and path traversal defenses.
 */

import crypto from 'crypto';

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
// 2. RFC 6238 TOTP (Time-Based One-Time Password) Authenticator
// =========================================================================

export class TOTPService {
  /**
   * Generates a base32 encoded random secret key for TOTP.
   */
  static generateSecret(length: number = 20): string {
    const bytes = crypto.randomBytes(length);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += base32Chars[bytes[i] % 32];
    }
    return secret;
  }

  /**
   * Generates a 6-digit TOTP code for the given secret at a specific counter time.
   */
  static generateCode(secret: string, timeStep: number = 30): string {
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const key = Buffer.from(secret, 'utf-8');
    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const strCode = (code % 1000000).toString().padStart(6, '0');
    return strCode;
  }

  /**
   * Verifies a TOTP code allowing ±1 time step tolerance (clock drift).
   */
  static verifyCode(secret: string, code: string, timeStep: number = 30): boolean {
    if (!code || code.length !== 6) return false;

    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
    for (let i = -1; i <= 1; i++) {
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(currentCounter + i));

      const key = Buffer.from(secret, 'utf-8');
      const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

      const offset = hmac[hmac.length - 1] & 0x0f;
      const computed =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const strCode = (computed % 1000000).toString().padStart(6, '0');
      if (crypto.timingSafeEqual(Buffer.from(strCode), Buffer.from(code))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a set of single-use recovery codes.
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
    { type: 'API_KEY', regex: /(?:sk|pk|ak|api|key|token|secret)[-_][a-zA-Z0-9_]{16,64}/gi, replacement: '[SECRET_REDACTED]' },
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
// 4. SSRF & URL Security Guard
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
   * Validates a URL against SSRF threats.
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
      if (hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
        return { safe: false, reason: 'Private/Loopback IPv6 address blocked.' };
      }

      // Check private IPv4 ranges (RFC 1918 + Link Local)
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const octet1 = parseInt(match[1], 10);
        const octet2 = parseInt(match[2], 10);

        if (octet1 === 10) return { safe: false, reason: 'Private network address (10.0.0.0/8) blocked.' };
        if (octet1 === 127) return { safe: false, reason: 'Loopback address (127.0.0.0/8) blocked.' };
        if (octet1 === 169 && octet2 === 254) return { safe: false, reason: 'Link-local / metadata address blocked.' };
        if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return { safe: false, reason: 'Private network address (172.16.0.0/12) blocked.' };
        if (octet1 === 192 && octet2 === 168) return { safe: false, reason: 'Private network address (192.168.0.0/16) blocked.' };
        if (octet1 === 0) return { safe: false, reason: 'Zero network address (0.0.0.0/8) blocked.' };
      }

      return { safe: true };
    } catch {
      return { safe: false, reason: 'Malformed URL format.' };
    }
  }
}

// =========================================================================
// 5. Path Traversal & Sanitization Defenses
// =========================================================================

export class PathSanitizer {
  /**
   * Normalizes filenames and strips dangerous path traversal sequences.
   */
  static sanitizeFilename(filename: string): string {
    // Strip ../, ..\, null bytes, control chars
    let clean = filename.replace(/(\.\.[\/\\])+/g, '');
    clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    clean = clean.replace(/[<>:"/\\|?*]/g, '_');
    clean = clean.trim();
    if (!clean) clean = 'unnamed_attachment';
    return clean;
  }
}
