import { describe, expect, it } from "vitest";
import {
	DataRedactor,
	PathSanitizer,
	SecurityCrypto,
	SSRFGuard,
	TOTPService,
} from "../../packages/security/src/index.js";

describe("Security: Password Hashing & Verification", () => {
	it("hashes passwords with unique random salts", async () => {
		const hash1 = await SecurityCrypto.hashPassword("SuperSecret123!");
		const hash2 = await SecurityCrypto.hashPassword("SuperSecret123!");
		expect(hash1).not.toEqual(hash2);
		expect(hash1.startsWith("scrypt$")).toBe(true);
	});

	it("verifies correct passwords and rejects incorrect passwords", async () => {
		const hash = await SecurityCrypto.hashPassword("ValidPassword#2026");
		const isValid = await SecurityCrypto.verifyPassword(
			"ValidPassword#2026",
			hash,
		);
		const isInvalid = await SecurityCrypto.verifyPassword(
			"WrongPassword#2026",
			hash,
		);
		expect(isValid).toBe(true);
		expect(isInvalid).toBe(false);
	});
});

describe("Security: Sensitive Data & PII Redaction", () => {
	it("redacts emails, API keys, phone numbers, and IP addresses", () => {
		const rawText =
			"Contact devon@company.com with key sk-abcdef1234567890123456 at 192.168.1.50 or call (555) 123-4567";
		const res = DataRedactor.redact(rawText);

		expect(res.detectedCount).toBe(4);
		expect(res.detectedTypes).toContain("EMAIL");
		expect(res.detectedTypes).toContain("API_KEY");
		expect(res.detectedTypes).toContain("PHONE");
		expect(res.detectedTypes).toContain("IPV4");

		expect(res.redactedText).not.toContain("devon@company.com");
		expect(res.redactedText).not.toContain("sk-abcdef1234567890123456");
		expect(res.redactedText).not.toContain("192.168.1.50");
		expect(res.redactedText).toContain("[EMAIL_REDACTED]");
		expect(res.redactedText).toContain("[SECRET_REDACTED]");
	});
});

describe("Security: RFC 6238 TOTP Authenticator", () => {
	it("generates valid 6-digit codes and verifies them against secret", () => {
		const secret = TOTPService.generateSecret();
		const code = TOTPService.generateCode(secret);
		expect(code.length).toBe(6);

		const isValid = TOTPService.verifyCode(secret, code);
		expect(isValid).toBe(true);

		const isInvalid = TOTPService.verifyCode(secret, "000000");
		expect(isInvalid).toBe(false);
	});
});

describe("Security: SSRF & URL Security Guard", () => {
	it("blocks localhost, loopback, private IPv4, and metadata IP addresses", () => {
		expect(SSRFGuard.isSafeUrl("http://localhost:8080/admin").safe).toBe(false);
		expect(SSRFGuard.isSafeUrl("http://127.0.0.1:4000/api").safe).toBe(false);
		expect(
			SSRFGuard.isSafeUrl("http://169.254.169.254/latest/meta-data").safe,
		).toBe(false);
		expect(SSRFGuard.isSafeUrl("http://10.0.0.5/secrets").safe).toBe(false);
		expect(SSRFGuard.isSafeUrl("http://192.168.1.1/router").safe).toBe(false);
		expect(SSRFGuard.isSafeUrl("ftp://example.com/file").safe).toBe(false);
		expect(SSRFGuard.isSafeUrl("javascript:alert(1)").safe).toBe(false);
	});

	it("allows valid public HTTPS endpoints", () => {
		expect(SSRFGuard.isSafeUrl("https://api.github.com/repos").safe).toBe(true);
		expect(SSRFGuard.isSafeUrl("https://www.example.com/status").safe).toBe(
			true,
		);
	});
});

describe("Security: Path Sanitizer", () => {
	it("strips path traversal sequences from filenames", () => {
		expect(PathSanitizer.sanitizeFilename("../../etc/passwd")).toBe(
			"etc_passwd",
		);
		expect(
			PathSanitizer.sanitizeFilename("..\\..\\windows\\system32\\cmd.exe"),
		).toBe("windows_system32_cmd.exe");
	});
});
