// Safe pg import for environments where it might be bundled for client
import type { Pool, PoolConfig } from "pg";

// Dummy Pool class for browser environment to prevent crashes during import
class DummyPool {
  conn: any;
  constructor(config?: any) { }
  async connect() { return this; }
  async query() { return { rows: [] }; }
  async end() { }
  on() { }
  release() { }
}

let PgPool: typeof Pool;

// Dynamic import to prevent bundler from trying to bundle 'pg' for client
if (typeof window === "undefined") {
  try {
    // We use require to avoid static analysis by Vite/Webpack for the client bundle
    // checking for process to ensure we are in node
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const pg = await import("pg");
      PgPool = pg.Pool;
    }
  } catch (e) {
    console.warn("Failed to load pg module", e);
  }
}

function getDbConfig(): PoolConfig {
  if (typeof process === 'undefined') return {} as PoolConfig;

  // Ensure password is always a string (required by PostgreSQL client)
  // PostgreSQL SCRAM authentication requires password to be a string, not undefined/null
  const passwordEnv = process.env.DB_PASSWORD;
  let password: string;

  if (passwordEnv === undefined || passwordEnv === null) {
    password = "";
  } else {
    // Explicitly convert to string to ensure type safety
    password = String(passwordEnv);
  }

  // Validate that password is actually a string type
  if (typeof password !== "string") {
    // Don't throw in browser
    if (typeof window !== "undefined") return {} as PoolConfig;
    throw new Error("Database password must be a string");
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "homeassistant",
    user: process.env.DB_USER || "postgres",
    password: password,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Lazy initialization - create pool only when first accessed
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (PgPool) {
      pool = new PgPool(getDbConfig());
      pool.on("error", (err: Error) => {
        console.error("Unexpected error on idle client", err);
        process.exit(-1);
      });
    } else {
      // Return dummy pool for browser or if pg failed to load
      pool = new DummyPool() as unknown as Pool;
    }
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  try {
    const res = await getPool().query(text, params);
    return res.rows;
  } catch (error) {
    // Only log errors in development
    if (typeof process !== 'undefined' && process.env.NODE_ENV === "development") {
      console.error("Database query error", { text, error });
    }
    throw error;
  }
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Export pool for backward compatibility (lazy initialization)
// This ensures the pool is only created after env vars are loaded
export default new Proxy({} as Pool, {
  get(_target, prop) {
    const poolInstance = getPool();
    const value = poolInstance[prop as keyof Pool];
    // Bind methods to the pool instance
    if (typeof value === "function") {
      return value.bind(poolInstance);
    }
    return value;
  }
});

