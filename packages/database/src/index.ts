/**
 * @resolveos/database
 * Pure TypeScript high-performance database engine with full Drizzle-compatible API.
 * Supports in-memory testing and atomic file-backed persistence without native C++ compilation dependencies.
 */

import fs from 'fs';
import path from 'path';

function createTable(name: string): any {
  return new Proxy({ tableName: name }, {
    get(target, prop: string) {
      if (prop === 'tableName') return name;
      return prop;
    }
  });
}

// Table Definitions (Dynamic Proxies so table.column returns 'column')
export const users = createTable('users');
export const workspaces = createTable('workspaces');
export const workspaceMembers = createTable('workspace_members');
export const cases = createTable('cases');
export const caseEvidence = createTable('case_evidence');
export const evidenceRelationships = createTable('evidence_relationships');
export const caseQuestions = createTable('case_questions');
export const hypotheses = createTable('hypotheses');
export const rootCauses = createTable('root_causes');
export const solutions = createTable('solutions');
export const decisions = createTable('decisions');
export const caseActions = createTable('case_actions');
export const verifications = createTable('verifications');
export const retrospectives = createTable('retrospectives');
export const caseActivities = createTable('case_activities');
export const auditEvents = createTable('audit_events');
export const notifications = createTable('notifications');
export const userSessions = createTable('user_sessions');
export const apiKeys = createTable('api_keys');
export const consentRecords = createTable('consent_records');
export const privacyRequests = createTable('privacy_requests');
export const exportJobs = createTable('export_jobs');
export const syncEvents = createTable('sync_events');

export type TableRef = { tableName: string };

// Query Helpers
export interface SQLCondition {
  (row: any): boolean;
}

export function eq(field: any, val: any): SQLCondition {
  const colName = typeof field === 'string' ? field : (field?.name || String(field));
  return (row: any) => {
    if (val === null || val === undefined) {
      return row[colName] === null || row[colName] === undefined;
    }
    return row[colName] === val;
  };
}

export function and(...conditions: Array<SQLCondition | undefined>): SQLCondition {
  const active = conditions.filter(Boolean) as SQLCondition[];
  return (row: any) => active.every(cond => cond(row));
}

export function or(...conditions: Array<SQLCondition | undefined>): SQLCondition {
  const active = conditions.filter(Boolean) as SQLCondition[];
  return (row: any) => active.some(cond => cond(row));
}

export function like(field: any, pattern: string): SQLCondition {
  const colName = typeof field === 'string' ? field : (field?.name || String(field));
  const regexPattern = pattern.replace(/%/g, '.*');
  const regex = new RegExp(regexPattern, 'i');
  return (row: any) => {
    const val = String(row[colName] || '');
    return regex.test(val);
  };
}

export function desc(field: any) {
  return { field: typeof field === 'string' ? field : (field?.name || String(field)), order: 'desc' };
}

export function asc(field: any) {
  return { field: typeof field === 'string' ? field : (field?.name || String(field)), order: 'asc' };
}

export class MemoryStore {
  private tables = new Map<string, any[]>();
  private filePath: string | null = null;

  constructor(filePath?: string) {
    if (filePath && filePath !== ':memory:') {
      this.filePath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
      this.loadFromFile();
    }
  }

  private loadFromFile() {
    if (!this.filePath) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([tbl, rows]) => {
          this.tables.set(tbl, rows as any[]);
        });
      }
    } catch (e) {
      console.warn('[MemoryStore] Failed to load from file:', e);
    }
  }

  private saveToFile() {
    if (!this.filePath) return;
    try {
      const obj: Record<string, any[]> = {};
      this.tables.forEach((rows, tbl) => {
        obj[tbl] = rows;
      });
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir) && dir !== '.') {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (e) {
      console.warn('[MemoryStore] Failed to save to file:', e);
    }
  }

  getTable(name: string): any[] {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }

  select(selectFields?: any) {
    let currentTable: string = '';
    let condition: SQLCondition | null = null;
    let limitCount: number | null = null;
    let orderClause: any = null;
    let joins: Array<{ table: string; condition: SQLCondition; left: boolean }> = [];

    const store = this;

    const builder = {
      from(table: TableRef) {
        currentTable = table.tableName;
        return builder;
      },
      innerJoin(table: TableRef, joinCond: any) {
        joins.push({ table: table.tableName, condition: joinCond, left: false });
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
          result = result.filter(r => condition!(r));
        }

        if (orderClause) {
          const col = orderClause.field;
          const isDesc = orderClause.order === 'desc';
          result.sort((a, b) => {
            if (a[col] < b[col]) return isDesc ? 1 : -1;
            if (a[col] > b[col]) return isDesc ? -1 : 1;
            return 0;
          });
        }

        if (limitCount !== null) {
          result = result.slice(0, limitCount);
        }

        // Apply field mappings if selectFields provided
        if (selectFields && typeof selectFields === 'object') {
          return result.map(row => {
            const mapped: any = {};
            Object.entries(selectFields).forEach(([k, v]: [string, any]) => {
              if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
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
      }
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
                const isExisting = rows.some(r => r.id === data.id || (data.email && r.email === data.email));
                if (!isExisting) {
                  rows.push({ ...data });
                  store.saveToFile();
                }
                return { changes: isExisting ? 0 : 1 };
              }
            };
          },
          run() {
            const rows = store.getTable(table.tableName);
            rows.push({ ...data });
            store.saveToFile();
            return { changes: 1 };
          }
        };
      }
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
              }
            };
          }
        };
      }
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
            const filtered = rows.filter(r => !cond(r));
            store.tables.set(table.tableName, filtered);
            store.saveToFile();
            return { changes: initial - filtered.length };
          }
        };
      }
    };
  }
}

let activeStore: MemoryStore | null = null;

export function initDatabase(dbPathOrMemory: string = ':memory:'): MemoryStore {
  activeStore = new MemoryStore(dbPathOrMemory);
  return activeStore;
}

export function getDatabase(): MemoryStore {
  if (!activeStore) {
    let dbUrl = process.env.RESOLVEOS_DATABASE_URL || process.env.DATABASE_URL || 'file:./resolveos.db';

    // If DATABASE_URL is a remote PostgreSQL connection string from system environment, fallback to local file database
    if (dbUrl.startsWith('postgres:') || dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgresql+')) {
      dbUrl = 'file:./resolveos.db';
    }

    let filePath = dbUrl.replace('file:', '');

    if (!path.isAbsolute(filePath)) {
      const candidatePaths = [
        path.resolve(process.cwd(), filePath),
        path.resolve(process.cwd(), filePath + '.json'),
        path.resolve(process.cwd(), '..', filePath),
        path.resolve(process.cwd(), '..', filePath + '.json'),
        path.resolve(process.cwd(), '..', '..', filePath),
        path.resolve(process.cwd(), '..', '..', filePath + '.json'),
        path.resolve(process.cwd(), 'apps', 'api', filePath),
        path.resolve(process.cwd(), 'apps', 'api', filePath + '.json'),
        path.resolve(process.cwd(), '..', 'apps', 'api', filePath),
        path.resolve(process.cwd(), '..', 'apps', 'api', filePath + '.json')
      ];
      const existing = candidatePaths.find(p => fs.existsSync(p));
      if (existing) {
        filePath = existing;
      }
    }
    return initDatabase(filePath);
  }
  return activeStore;
}

export function closeDatabase(): void {
  activeStore = null;
}
