/**
 * @resolveos/database
 * Canonical Production PostgreSQL engine with connection pooling, migrations, and ACID transactions,
 * accompanied by a zero-dependency high-performance in-memory transactional driver for unit testing.
 */

import fs from "fs";
import path from "path";
import pg from "pg";
import {
	aiOutputs,
	aiRequests,
	apiKeys,
	auditEvents,
	caseActions,
	caseActivities,
	caseEvidence,
	caseQuestions,
	cases,
	consentRecords,
	decisions,
	evidenceAttachments,
	evidenceRelationships,
	exportJobs,
	hypotheses,
	notifications,
	organizations,
	privacyRequests,
	retrospectives,
	rootCauses,
	solutions,
	syncEvents,
	userSessions,
	users,
	verifications,
	workspaceMembers,
	workspaces,
} from "./schema.js";

export {
	aiOutputs,
	aiRequests,
	apiKeys,
	auditEvents,
	caseActions,
	caseActivities,
	caseEvidence,
	caseQuestions,
	cases,
	consentRecords,
	decisions,
	evidenceAttachments,
	evidenceRelationships,
	exportJobs,
	hypotheses,
	notifications,
	organizations,
	privacyRequests,
	retrospectives,
	rootCauses,
	solutions,
	syncEvents,
	userSessions,
	users,
	verifications,
	workspaceMembers,
	workspaces,
};

export type TableRef = { tableName: string };

// Query Helpers
export interface SQLCondition {
	(row: any): boolean;
	field?: string;
	val?: any;
	op?: "eq" | "and" | "or" | "like";
	conditions?: SQLCondition[];
}

export function eq(field: any, val: any): SQLCondition {
	const colName =
		typeof field === "string" ? field : field?.name || String(field);
	const cond: SQLCondition = (row: any) => {
		if (val === null || val === undefined) {
			return row[colName] === null || row[colName] === undefined;
		}
		return row[colName] === val;
	};
	cond.field = colName;
	cond.val = val;
	cond.op = "eq";
	return cond;
}

export function and(
	...conditions: Array<SQLCondition | undefined>
): SQLCondition {
	const active = conditions.filter(Boolean) as SQLCondition[];
	const cond: SQLCondition = (row: any) => active.every((c) => c(row));
	cond.op = "and";
	cond.conditions = active;
	return cond;
}

export function or(
	...conditions: Array<SQLCondition | undefined>
): SQLCondition {
	const active = conditions.filter(Boolean) as SQLCondition[];
	const cond: SQLCondition = (row: any) => active.some((c) => c(row));
	cond.op = "or";
	cond.conditions = active;
	return cond;
}

export function like(field: any, pattern: string): SQLCondition {
	const colName =
		typeof field === "string" ? field : field?.name || String(field);
	const regexPattern = pattern.replace(/%/g, ".*");
	const regex = new RegExp(regexPattern, "i");
	const cond: SQLCondition = (row: any) => {
		const val = String(row[colName] || "");
		return regex.test(val);
	};
	cond.field = colName;
	cond.val = pattern;
	cond.op = "like";
	return cond;
}

export function desc(field: any) {
	return {
		field: typeof field === "string" ? field : field?.name || String(field),
		order: "desc",
	};
}

export function asc(field: any) {
	return {
		field: typeof field === "string" ? field : field?.name || String(field),
		order: "asc",
	};
}

export interface DatabaseDriver {
	select(selectFields?: any): any;
	insert(table: TableRef): any;
	update(table: TableRef): any;
	delete(table: TableRef): any;
	transaction<T>(fn: (tx: DatabaseDriver) => Promise<T>): Promise<T>;
	close(): Promise<void>;
	isPostgres(): boolean;
}

// =========================================================================
// 1. Transactional In-Memory / Local Storage Store (Testing & Dev Fallback)
// =========================================================================

export class MemoryStore implements DatabaseDriver {
	private tables = new Map<string, any[]>();
	private filePath: string | null = null;

	constructor(filePath?: string) {
		if (filePath && filePath !== ":memory:" && !filePath.includes("://")) {
			this.filePath = filePath.endsWith(".json")
				? filePath
				: `${filePath}.json`;
			this.loadFromFile();
		}
	}

	isPostgres(): boolean {
		return false;
	}

	private loadFromFile() {
		if (!this.filePath) return;
		try {
			if (fs.existsSync(this.filePath)) {
				const raw = fs.readFileSync(this.filePath, "utf8");
				const data = JSON.parse(raw);
				Object.entries(data).forEach(([tbl, rows]) => {
					this.tables.set(tbl, rows as any[]);
				});
			}
		} catch (e) {
			console.warn("[MemoryStore] Failed to load from file:", e);
		}
	}

	saveToFile() {
		if (!this.filePath) return;
		try {
			const obj: Record<string, any[]> = {};
			this.tables.forEach((rows, tbl) => {
				obj[tbl] = rows;
			});
			const dir = path.dirname(this.filePath);
			if (!fs.existsSync(dir) && dir !== ".") {
				fs.mkdirSync(dir, { recursive: true });
			}
			const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
			fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), "utf8");
			fs.renameSync(tmpPath, this.filePath);
		} catch (e) {
			console.warn("[MemoryStore] Failed to save to file:", e);
		}
	}

	getTable(name: string): any[] {
		if (!this.tables.has(name)) {
			this.tables.set(name, []);
		}
		return this.tables.get(name)!;
	}

	async transaction<T>(fn: (tx: DatabaseDriver) => Promise<T>): Promise<T> {
		// Snapshot state for atomic rollback on failure
		const snapshot = new Map<string, any[]>();
		this.tables.forEach((rows, tbl) => {
			snapshot.set(tbl, JSON.parse(JSON.stringify(rows)));
		});

		try {
			const result = await fn(this);
			this.saveToFile();
			return result;
		} catch (err) {
			// Rollback to snapshot
			this.tables.clear();
			snapshot.forEach((rows, tbl) => {
				this.tables.set(tbl, rows);
			});
			throw err;
		}
	}

	select(selectFields?: any) {
		let currentTable: string = "";
		let condition: SQLCondition | null = null;
		let limitCount: number | null = null;
		let orderClause: any = null;
		const joins: Array<{
			table: string;
			condition: SQLCondition;
			left: boolean;
		}> = [];

		const store = this;

		const builder = {
			from(table: TableRef) {
				currentTable = table.tableName;
				return builder;
			},
			innerJoin(table: TableRef, joinCond: any) {
				joins.push({
					table: table.tableName,
					condition: joinCond,
					left: false,
				});
				return builder;
			},
			leftJoin(table: TableRef, joinCond: any) {
				joins.push({ table: table.tableName, condition: joinCond, left: true });
				return builder;
			},
			where(cond?: SQLCondition) {
				if (cond) condition = cond;
				return builder;
			},
			orderBy(order: any) {
				orderClause = order;
				return builder;
			},
			limit(n: number) {
				limitCount = n;
				return builder;
			},
			all(): any[] {
				const rows = store.getTable(currentTable);
				let result = rows.slice();

				if (condition) {
					result = result.filter((r) => condition!(r));
				}

				if (orderClause) {
					const col = orderClause.field;
					const isDesc = orderClause.order === "desc";
					result.sort((a, b) => {
						if (a[col] < b[col]) return isDesc ? 1 : -1;
						if (a[col] > b[col]) return isDesc ? -1 : 1;
						return 0;
					});
				}

				if (limitCount !== null) {
					result = result.slice(0, limitCount);
				}

				if (selectFields && typeof selectFields === "object") {
					return result.map((row) => {
						const mapped: any = {};
						Object.entries(selectFields).forEach(([k, v]: [string, any]) => {
							if (typeof v === "object" && v !== null && !Array.isArray(v)) {
								mapped[k] = row[k] || v;
							} else {
								mapped[k] = row[k] !== undefined ? row[k] : row[v];
							}
						});
						return { ...row, ...mapped };
					});
				}

				return result;
			},
			get(): any | undefined {
				const res = builder.all();
				return res.length > 0 ? res[0] : undefined;
			},
		};

		return builder;
	}

	insert(table: TableRef) {
		const store = this;
		return {
			values(data: any) {
				return {
					onConflictDoNothing() {
						return {
							run() {
								const rows = store.getTable(table.tableName);
								const isExisting = rows.some(
									(r) =>
										r.id === data.id || (data.email && r.email === data.email),
								);
								if (!isExisting) {
									rows.push({ ...data });
									store.saveToFile();
								}
								return { changes: isExisting ? 0 : 1 };
							},
						};
					},
					run() {
						const rows = store.getTable(table.tableName);
						rows.push({ ...data });
						store.saveToFile();
						return { changes: 1 };
					},
				};
			},
		};
	}

	update(table: TableRef) {
		const store = this;
		return {
			set(updates: any) {
				return {
					where(cond: SQLCondition) {
						return {
							run() {
								const rows = store.getTable(table.tableName);
								let changes = 0;
								rows.forEach((row, idx) => {
									if (cond(row)) {
										rows[idx] = { ...row, ...updates };
										changes++;
									}
								});
								if (changes > 0) store.saveToFile();
								return { changes };
							},
						};
					},
				};
			},
		};
	}

	delete(table: TableRef) {
		const store = this;
		return {
			where(cond: SQLCondition) {
				return {
					run() {
						const rows = store.getTable(table.tableName);
						const initial = rows.length;
						const filtered = rows.filter((r) => !cond(r));
						store.tables.set(table.tableName, filtered);
						store.saveToFile();
						return { changes: initial - filtered.length };
					},
				};
			},
		};
	}

	async close(): Promise<void> {
		this.saveToFile();
	}
}

// Helper mapping functions between camelCase and snake_case for PostgreSQL
export function toSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(str: string): string {
	return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

export function rowToCamel(row: any): any {
	if (!row || typeof row !== "object") return row;
	const out: Record<string, any> = {};
	for (const [k, v] of Object.entries(row)) {
		out[toCamelCase(k)] = v;
	}
	return out;
}

export function rowToSnake(row: any): any {
	if (!row || typeof row !== "object") return row;
	const out: Record<string, any> = {};
	for (const [k, v] of Object.entries(row)) {
		out[toSnakeCase(k)] = v;
	}
	return out;
}

export function compileCondition(
	cond: SQLCondition,
	params: any[],
): string {
	if (!cond) return "1=1";
	if (cond.op === "eq") {
		const col = toSnakeCase(cond.field || "");
		if (cond.val === null || cond.val === undefined) {
			return `"${col}" IS NULL`;
		}
		params.push(cond.val);
		return `"${col}" = $${params.length}`;
	}
	if (cond.op === "like") {
		const col = toSnakeCase(cond.field || "");
		const regexPattern = String(cond.val).replace(/%/g, "%");
		params.push(regexPattern);
		return `"${col}" ILIKE $${params.length}`;
	}
	if (cond.op === "and") {
		const sub = (cond.conditions || [])
			.map((c) => compileCondition(c, params))
			.filter(Boolean);
		return sub.length > 0 ? `(${sub.join(" AND ")})` : "1=1";
	}
	if (cond.op === "or") {
		const sub = (cond.conditions || [])
			.map((c) => compileCondition(c, params))
			.filter(Boolean);
		return sub.length > 0 ? `(${sub.join(" OR ")})` : "1=1";
	}
	return "1=1";
}

// =========================================================================
// 2. Canonical Production PostgreSQL Driver (Zero Memory Fallback)
// =========================================================================

export class PostgresSelectBuilder {
	private clientOrPool: pg.Pool | pg.PoolClient;
	private tableName = "";
	private condition: SQLCondition | null = null;
	private orderClause: { field: string; order: "asc" | "desc" } | null = null;
	private limitCount: number | null = null;
	private offsetCount: number | null = null;

	constructor(clientOrPool: pg.Pool | pg.PoolClient) {
		this.clientOrPool = clientOrPool;
	}

	from(table: TableRef) {
		this.tableName = toSnakeCase(table.tableName);
		return this;
	}

	where(cond?: SQLCondition) {
		if (cond) this.condition = cond;
		return this;
	}

	orderBy(order: any) {
		if (order) this.orderClause = order;
		return this;
	}

	limit(n: number) {
		this.limitCount = n;
		return this;
	}

	offset(n: number) {
		this.offsetCount = n;
		return this;
	}

	private buildSql(forCount = false): { sql: string; params: any[] } {
		const params: any[] = [];
		let sql = forCount
			? `SELECT COUNT(*)::int as count FROM "${this.tableName}"`
			: `SELECT * FROM "${this.tableName}"`;
		if (this.condition) {
			const whereSql = compileCondition(this.condition, params);
			if (whereSql && whereSql !== "1=1") {
				sql += ` WHERE ${whereSql}`;
			}
		}
		if (!forCount) {
			if (this.orderClause) {
				const col = toSnakeCase(this.orderClause.field);
				const dir = this.orderClause.order === "desc" ? "DESC" : "ASC";
				sql += ` ORDER BY "${col}" ${dir}`;
			}
			if (this.limitCount !== null) {
				params.push(this.limitCount);
				sql += ` LIMIT $${params.length}`;
			}
			if (this.offsetCount !== null) {
				params.push(this.offsetCount);
				sql += ` OFFSET $${params.length}`;
			}
		}
		return { sql, params };
	}

	async all(): Promise<any[]> {
		const { sql, params } = this.buildSql();
		const res = await this.clientOrPool.query(sql, params);
		return res.rows.map(rowToCamel);
	}

	async get(): Promise<any | undefined> {
		this.limitCount = 1;
		const { sql, params } = this.buildSql();
		const res = await this.clientOrPool.query(sql, params);
		return res.rows.length > 0 ? rowToCamel(res.rows[0]) : undefined;
	}

	async count(): Promise<number> {
		const { sql, params } = this.buildSql(true);
		const res = await this.clientOrPool.query(sql, params);
		return res.rows[0]?.count || 0;
	}
}

export class PostgresInsertBuilder {
	private clientOrPool: pg.Pool | pg.PoolClient;
	private tableName: string;

	constructor(clientOrPool: pg.Pool | pg.PoolClient, table: TableRef) {
		this.clientOrPool = clientOrPool;
		this.tableName = toSnakeCase(table.tableName);
	}

	values(recordOrRecords: any | any[]) {
		const records = Array.isArray(recordOrRecords)
			? recordOrRecords
			: [recordOrRecords];
		const clientOrPool = this.clientOrPool;
		const tableName = this.tableName;

		return {
			async run(): Promise<{ changes: number; row?: any; rows?: any[] }> {
				if (records.length === 0) return { changes: 0 };
				const insertedRows: any[] = [];
				for (const record of records) {
					const snakeRow = rowToSnake(record);
					const cols = Object.keys(snakeRow);
					const params: any[] = [];
					const placeholders: string[] = [];

					cols.forEach((col, idx) => {
						let val = snakeRow[col];
						if (val !== null && typeof val === "object" && !(val instanceof Date)) {
							val = JSON.stringify(val);
						}
						params.push(val);
						placeholders.push(`$${idx + 1}`);
					});

					const sql = `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
					const res = await clientOrPool.query(sql, params);
					if (res.rows.length > 0) {
						insertedRows.push(rowToCamel(res.rows[0]));
					}
				}
				return {
					changes: insertedRows.length,
					row: insertedRows[0],
					rows: insertedRows,
				};
			},
		};
	}
}

export class PostgresUpdateBuilder {
	private clientOrPool: pg.Pool | pg.PoolClient;
	private tableName: string;

	constructor(clientOrPool: pg.Pool | pg.PoolClient, table: TableRef) {
		this.clientOrPool = clientOrPool;
		this.tableName = toSnakeCase(table.tableName);
	}

	set(updates: Record<string, any>) {
		const clientOrPool = this.clientOrPool;
		const tableName = this.tableName;

		return {
			where(cond: SQLCondition) {
				return {
					async run(): Promise<{ changes: number }> {
						const snakeUpdates = rowToSnake(updates);
						const cols = Object.keys(snakeUpdates);
						if (cols.length === 0) return { changes: 0 };

						const params: any[] = [];
						const setClauses: string[] = [];

						cols.forEach((col) => {
							let val = snakeUpdates[col];
							if (val !== null && typeof val === "object" && !(val instanceof Date)) {
								val = JSON.stringify(val);
							}
							params.push(val);
							setClauses.push(`"${col}" = $${params.length}`);
						});

						const whereSql = compileCondition(cond, params);
						let sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")}`;
						if (whereSql && whereSql !== "1=1") {
							sql += ` WHERE ${whereSql}`;
						}

						const res = await clientOrPool.query(sql, params);
						return { changes: res.rowCount || 0 };
					},
				};
			},
		};
	}
}

export class PostgresDeleteBuilder {
	private clientOrPool: pg.Pool | pg.PoolClient;
	private tableName: string;

	constructor(clientOrPool: pg.Pool | pg.PoolClient, table: TableRef) {
		this.clientOrPool = clientOrPool;
		this.tableName = toSnakeCase(table.tableName);
	}

	where(cond: SQLCondition) {
		const clientOrPool = this.clientOrPool;
		const tableName = this.tableName;

		return {
			async run(): Promise<{ changes: number }> {
				const params: any[] = [];
				const whereSql = compileCondition(cond, params);
				let sql = `DELETE FROM "${tableName}"`;
				if (whereSql && whereSql !== "1=1") {
					sql += ` WHERE ${whereSql}`;
				}
				const res = await clientOrPool.query(sql, params);
				return { changes: res.rowCount || 0 };
			},
		};
	}
}

export class PostgresDatabase implements DatabaseDriver {
	private pool: pg.Pool;
	private client?: pg.PoolClient;

	constructor(connectionStringOrPool: string | pg.Pool, client?: pg.PoolClient) {
		if (typeof connectionStringOrPool === "string") {
			this.pool = new pg.Pool({
				connectionString: connectionStringOrPool,
				max: parseInt(process.env.PG_POOL_MAX || "20", 10),
				idleTimeoutMillis: 30000,
				connectionTimeoutMillis: 5000,
			});
		} else {
			this.pool = connectionStringOrPool;
		}
		this.client = client;
	}

	isPostgres(): boolean {
		return true;
	}

	getPool(): pg.Pool {
		return this.pool;
	}

	private getExecutor(): pg.Pool | pg.PoolClient {
		return this.client || this.pool;
	}

	async migrate(): Promise<void> {
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

			const migrationFile = path.resolve(
				__dirname,
				"../migrations/0001_initial_schema.sql",
			);
			if (fs.existsSync(migrationFile)) {
				const sql = fs.readFileSync(migrationFile, "utf8");
				await client.query(sql);
				await client.query(
					`INSERT INTO _migrations (name) VALUES ('0001_initial_schema.sql') ON CONFLICT DO NOTHING`,
				);
			}
			await client.query("COMMIT");
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	}

	async transaction<T>(fn: (tx: DatabaseDriver) => Promise<T>): Promise<T> {
		if (this.client) {
			// Already inside a transaction, run function directly
			return fn(this);
		}
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			const txDriver = new PostgresDatabase(this.pool, client);
			const result = await fn(txDriver);
			await client.query("COMMIT");
			return result;
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	}

	select(selectFields?: any): any {
		return new PostgresSelectBuilder(this.getExecutor());
	}

	insert(table: TableRef): any {
		return new PostgresInsertBuilder(this.getExecutor(), table);
	}

	update(table: TableRef): any {
		return new PostgresUpdateBuilder(this.getExecutor(), table);
	}

	delete(table: TableRef): any {
		return new PostgresDeleteBuilder(this.getExecutor(), table);
	}

	async close(): Promise<void> {
		if (!this.client) {
			await this.pool.end();
		}
	}
}

// =========================================================================
// 3. Database Singleton Lifecycle
// =========================================================================

let activeDb: DatabaseDriver | null = null;

export function initDatabase(dbUrlOrPath?: string): DatabaseDriver {
	let url = dbUrlOrPath;
	if (!url) {
		if (process.env.NODE_ENV === "production") {
			url = process.env.DATABASE_URL || process.env.RESOLVEOS_DATABASE_URL;
			if (
				!url ||
				(!url.startsWith("postgres:") &&
					!url.startsWith("postgresql:") &&
					!url.startsWith("postgresql+"))
			) {
				throw new Error(
					"FATAL: Production mode requires a valid PostgreSQL connection URL via DATABASE_URL. In-memory storage is strictly prohibited in production.",
				);
			}
		} else if (process.env.NODE_ENV === "test") {
			url = ":memory:";
		} else {
			url =
				process.env.DATABASE_URL ||
				process.env.RESOLVEOS_DATABASE_URL ||
				":memory:";
		}
	} else if (
		process.env.NODE_ENV === "production" &&
		(url === ":memory:" || url.endsWith(".json"))
	) {
		throw new Error(
			"FATAL: Production mode requires a valid PostgreSQL connection URL. In-memory and JSON storage are strictly prohibited in production.",
		);
	}

	if (
		url.startsWith("postgres:") ||
		url.startsWith("postgresql:") ||
		url.startsWith("postgresql+")
	) {
		const pgUrl = url.replace(
			/^postgresql\+[a-zA-Z0-9_-]+:\/\//,
			"postgresql://",
		);
		activeDb = new PostgresDatabase(pgUrl);
		return activeDb;
	}

	activeDb = new MemoryStore(url);
	return activeDb;
}

export function getDatabase(): DatabaseDriver {
	if (!activeDb) {
		return initDatabase();
	}
	return activeDb;
}

export function closeDatabase(): void {
	if (activeDb) {
		activeDb.close();
		activeDb = null;
	}
}

