import 'server-only';
import { Pool, types, type PoolClient } from 'pg';
import { SCHEMA, SCHEMA_VERSION } from './schema';

// NUMERIC -> number (prices fit easily); BIGINT ids -> number.
types.setTypeParser(1700, (v) => Number(v));
types.setTypeParser(20, (v) => Number(v));

const g = globalThis as unknown as { __pgPool?: Pool; __schemaReady?: Promise<void> };

function pool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Add your Neon connection string.');
  if (!g.__pgPool) {
    g.__pgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  }
  return g.__pgPool;
}

/** Creates/updates tables once per server instance. Cheap after the first run (one SELECT). */
function ensureSchema() {
  if (!g.__schemaReady) {
    g.__schemaReady = (async () => {
      const p = pool();
      await p.query('create table if not exists app_meta (key text primary key, value text not null)');
      const r = await p.query("select value from app_meta where key = 'schema_version'");
      if (Number(r.rows[0]?.value || 0) >= SCHEMA_VERSION) return;
      const c = await p.connect();
      try {
        await c.query('begin');
        await c.query('select pg_advisory_xact_lock(424242)');
        await c.query(SCHEMA);
        await c.query("insert into app_meta (key, value) values ('schema_version', $1) on conflict (key) do update set value = excluded.value", [String(SCHEMA_VERSION)]);
        await c.query('commit');
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    })().catch((e) => { g.__schemaReady = undefined; throw e; });
  }
  return g.__schemaReady;
}

export async function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const r = await pool().query(text, params);
  return r.rows as T[];
}
export async function one<T>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}
/** Run several statements atomically. */
export async function tx<T>(fn: (c: { q: <R>(t: string, p?: unknown[]) => Promise<R[]> }) => Promise<T>): Promise<T> {
  await ensureSchema();
  const c: PoolClient = await pool().connect();
  try {
    await c.query('begin');
    const res = await fn({ q: async <R,>(t: string, p: unknown[] = []) => (await c.query(t, p)).rows as R[] });
    await c.query('commit');
    return res;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
export const likeTerm = (s: string) => `%${s.trim().replace(/[\\%_]/g, (m) => '\\' + m)}%`;
