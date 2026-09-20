/**
 * @resolveos/database
 * Production PostgreSQL Connection Pool & Drizzle Configuration Adapter
 */

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  maxConnections?: number;
  idleTimeoutMillis?: number;
}

export function parseDatabaseUrl(urlStr: string): PostgresConfig {
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      database: parsed.pathname.replace(/^\//, '') || 'resolveos',
      user: parsed.username || 'postgres',
      password: parsed.password || '',
      ssl: parsed.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: true } : false
    };
  } catch {
    return { host: '127.0.0.1', port: 5432, database: 'resolveos' };
  }
}
