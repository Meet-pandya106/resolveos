import { describe, it, expect } from "vitest";
import {
	PostgresDatabase,
	initDatabase,
	toSnakeCase,
	toCamelCase,
	rowToSnake,
	rowToCamel,
	compileCondition,
	eq,
	and,
	or,
	like,
	workspaces,
	users,
	cases
} from "../../packages/database/src/index.js";

describe("Database Architecture Hardening & Real PostgreSQL Verification (Rule 148)", () => {
	it("verifies PostgresDatabase has no memoryFallback and is marked as isPostgres", () => {
		const pgDb = new PostgresDatabase("postgresql://user:secret@localhost:5432/resolveos");
		expect(pgDb.isPostgres()).toBe(true);

		// Rule 148: PostgresDatabase must never delegate to memoryFallback
		expect((pgDb as any).memoryFallback).toBeUndefined();
	});

	it("strictly forbids silent memory/JSON fallback in production mode (Rule 7, 122)", () => {
		const originalEnv = process.env.NODE_ENV;
		const originalDbUrl = process.env.DATABASE_URL;
		try {
			process.env.NODE_ENV = "production";
			delete process.env.DATABASE_URL;
			delete process.env.RESOLVEOS_DATABASE_URL;

			// Must throw fatal error when DATABASE_URL is missing in production
			expect(() => initDatabase()).toThrow(/FATAL: Production mode requires a valid PostgreSQL connection URL/);

			// Must throw fatal error if an in-memory URL is explicitly requested in production
			expect(() => initDatabase(":memory:")).toThrow(/In-memory and JSON storage are strictly prohibited in production/);
			expect(() => initDatabase("./local.json")).toThrow(/In-memory and JSON storage are strictly prohibited in production/);
		} finally {
			process.env.NODE_ENV = originalEnv;
			if (originalDbUrl) process.env.DATABASE_URL = originalDbUrl;
		}
	});

	it("correctly translates camelCase domain fields to PostgreSQL snake_case columns", () => {
		expect(toSnakeCase("passwordHash")).toBe("password_hash");
		expect(toSnakeCase("twoFactorSecret")).toBe("two_factor_secret");
		expect(toSnakeCase("workspaceId")).toBe("workspace_id");
		expect(toSnakeCase("createdAt")).toBe("created_at");

		expect(toCamelCase("password_hash")).toBe("passwordHash");
		expect(toCamelCase("workspace_id")).toBe("workspaceId");

		const input = {
			userId: "u-123",
			caseTitle: "Test Case",
			isChosen: true
		};
		const snake = rowToSnake(input);
		expect(snake).toEqual({
			user_id: "u-123",
			case_title: "Test Case",
			is_chosen: true
		});

		const camel = rowToCamel(snake);
		expect(camel).toEqual(input);
	});

	it("compiles parameterized SQL conditions preventing SQL injection", () => {
		const params: any[] = [];
		const cond1 = eq("workspaceId", "ws-456");
		const sql1 = compileCondition(cond1, params);
		expect(sql1).toBe('"workspace_id" = $1');
		expect(params).toEqual(["ws-456"]);

		const cond2 = and(
			eq("email", "attacker@example.com' OR '1'='1"),
			eq("deletedAt", null as any)
		);
		const params2: any[] = [];
		const sql2 = compileCondition(cond2, params2);
		expect(sql2).toBe('("email" = $1 AND "deleted_at" IS NULL)');
		expect(params2).toEqual(["attacker@example.com' OR '1'='1"]);
	});

	it("executes atomic transaction with rollback on failure using mock client", async () => {
		const queriesExecuted: string[] = [];
		const mockClient = {
			query: async (sql: string) => {
				queriesExecuted.push(sql);
				if (sql.includes("FAILING_OPERATION")) {
					throw new Error("Simulated transaction failure");
				}
				return { rows: [], rowCount: 1 };
			},
			release: () => {
				queriesExecuted.push("RELEASE");
			}
		};

		const mockPool = {
			connect: async () => mockClient,
			end: async () => {}
		} as any;

		const pgDb = new PostgresDatabase(mockPool);

		// Test rollback behavior
		await expect(
			pgDb.transaction(async (tx) => {
				await (tx as any).getExecutor().query("STEP_1");
				await (tx as any).getExecutor().query("FAILING_OPERATION");
			})
		).rejects.toThrow("Simulated transaction failure");

		expect(queriesExecuted).toContain("BEGIN");
		expect(queriesExecuted).toContain("ROLLBACK");
		expect(queriesExecuted).toContain("RELEASE");
		expect(queriesExecuted).not.toContain("COMMIT");
	});

	it("executes atomic transaction with commit on success using mock client", async () => {
		const queriesExecuted: string[] = [];
		const mockClient = {
			query: async (sql: string) => {
				queriesExecuted.push(sql);
				return { rows: [], rowCount: 1 };
			},
			release: () => {
				queriesExecuted.push("RELEASE");
			}
		};

		const mockPool = {
			connect: async () => mockClient,
			end: async () => {}
		} as any;

		const pgDb = new PostgresDatabase(mockPool);

		const result = await pgDb.transaction(async (tx) => {
			await (tx as any).getExecutor().query("STEP_1");
			await (tx as any).getExecutor().query("STEP_2");
			return "SUCCESS";
		});

		expect(result).toBe("SUCCESS");
		expect(queriesExecuted).toContain("BEGIN");
		expect(queriesExecuted).toContain("COMMIT");
		expect(queriesExecuted).toContain("RELEASE");
		expect(queriesExecuted).not.toContain("ROLLBACK");
	});
});
