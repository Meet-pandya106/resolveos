import { describe, expect, it } from "vitest";
import { PathSanitizer } from "../../packages/security/src/index.js";

describe("Security: Path Traversal & Filename Sanitizer", () => {
	it("strips standard relative path traversal tokens", () => {
		expect(PathSanitizer.sanitizeFilename("../../etc/passwd")).toBe(
			"etc_passwd",
		);
		expect(PathSanitizer.sanitizeFilename("..\\..\\windows\\system32")).toBe(
			"windows_system32",
		);
	});

	it("eliminates recursive nested traversal tokens (e.g. ....//)", () => {
		expect(PathSanitizer.sanitizeFilename("....//....//secret.txt")).toBe(
			"secret.txt",
		);
		expect(PathSanitizer.sanitizeFilename("..././..././config.json")).toBe(
			"config.json",
		);
	});

	it("handles URL-encoded traversal tokens and null bytes", () => {
		expect(PathSanitizer.sanitizeFilename("%2e%2e%2f%2e%2e%2fhosts")).toBe(
			"hosts",
		);
		expect(PathSanitizer.sanitizeFilename("safe.png\0.exe")).toBe(
			"safe.png.exe",
		);
	});

	it("replaces dangerous filesystem characters with underscore", () => {
		expect(PathSanitizer.sanitizeFilename("report:final<1>|test?.pdf")).toBe(
			"report_final_1__test_.pdf",
		);
	});

	it("falls back to safe default if filename is empty or only traversal tokens", () => {
		expect(PathSanitizer.sanitizeFilename("../..")).toBe("unnamed_attachment");
		expect(PathSanitizer.sanitizeFilename("")).toBe("unnamed_attachment");
	});
});
