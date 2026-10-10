/**
 * Uniform positional-SQL surface over libsql (local SQLite file / remote
 * Turso) and native Bun.SQL PostgreSQL. All SQL is generated internally with
 * `?` placeholders; only the PostgreSQL adapter rewrites them to $1..$n.
 * Transactions run on a transaction-owned connection (libsql transaction /
 * Bun SQL begin-leased connection), so writes inside a transaction commit or
 * roll back atomically and are not visible outside it.
 */
import { createClient, type Client } from '@libsql/client';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SQL } from 'bun';
import { HttpError } from './errors';

export type SqlValue = string | number | null; // booleans bound as 1/0 by callers
export type SqlRow = Record<string, unknown>;

export interface SqlConnection {
  query(sql: string, params?: SqlValue[]): Promise<SqlRow[]>;
  exec(sql: string, params?: SqlValue[]): Promise<void>;
}

export interface Database extends SqlConnection {
  readonly dialect: 'sqlite' | 'postgres';
  transaction<T>(fn: (tx: SqlConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const SQLITE_URL_SCHEMES = /^(libsql|https?|wss?|file):\/\//;

function driverEnv(env: Record<string, string | undefined>): {
  dialect: 'sqlite' | 'postgres';
  url: string;
  authToken?: string;
} {
  const driver = env.DB_DRIVER || 'sqlite';
  const dbUrl = env.DATABASE_URL;
  if (driver === 'postgres') {
    if (!dbUrl || !/^postgres(ql)?:\/\//.test(dbUrl)) {
      throw new HttpError(500, 'DB_DRIVER=postgres requires DATABASE_URL starting with postgres:// or postgresql://', 'bad_db_env');
    }
    return { dialect: 'postgres', url: dbUrl };
  }
  if (driver !== 'sqlite' && driver !== 'turso') {
    throw new HttpError(500, `Unsupported DB_DRIVER: ${driver} (expected sqlite|turso|postgres)`, 'bad_db_env');
  }
  if (dbUrl) {
    if (/^postgres(ql)?:\/\//.test(dbUrl)) {
      throw new HttpError(500, `DB_DRIVER=${driver} cannot use a postgres:// DATABASE_URL`, 'bad_db_env');
    }
    if (!SQLITE_URL_SCHEMES.test(dbUrl)) {
      throw new HttpError(500, `DB_DRIVER=${driver} requires a libsql://, https://, http://, wss:// or file:// DATABASE_URL`, 'bad_db_env');
    }
    if (driver === 'turso' && dbUrl.startsWith('file:')) {
      throw new HttpError(500, 'DB_DRIVER=turso requires a remote DATABASE_URL (libsql:// or https://)', 'bad_db_env');
    }
    return { dialect: 'sqlite', url: dbUrl, authToken: env.LIBSQL_AUTH_TOKEN || undefined };
  }
  if (driver === 'turso') {
    throw new HttpError(500, 'DB_DRIVER=turso requires DATABASE_URL (libsql:// or https://)', 'bad_db_env');
  }
  return { dialect: 'sqlite', url: 'file:' + (env.SQLITE_PATH || './data/wodwiki.db') };
}

/** libsql (local file + remote Turso) adapter. All operations are serialized
 * through one promise chain: the underlying client shares a single
 * connection, so concurrent transactions/reads could otherwise interleave
 * on it. */
function libsqlConnection(client: Client): Database {
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn);
    chain = next.then(() => undefined, () => undefined);
    return next;
  };
  return {
    dialect: 'sqlite',
    query: (sql, params = []) => serialize(() => client.execute({ sql, args: params }).then((r) => r.rows as unknown as SqlRow[])),
    exec: (sql, params = []) => serialize(async () => {
      await client.execute({ sql, args: params });
    }),
    transaction<T>(fn: (tx: SqlConnection) => Promise<T>): Promise<T> {
      return serialize(async () => {
        const tx = await client.transaction('write');
        try {
          const txConn: SqlConnection = {
            query: (sql, params = []) => tx.execute({ sql, args: params }).then((r) => r.rows as unknown as SqlRow[]),
            exec: async (sql, params = []) => {
              await tx.execute({ sql, args: params });
            },
          };
          const result = await fn(txConn);
          await tx.commit();
          return result;
        } catch (err) {
          try {
            await tx.rollback();
          } catch {
            // transaction already closed by the failed statement
          }
          throw err;
        } finally {
          tx.close();
        }
      });
    },
    close: async () => {
      await chain;
      client.close();
    },
  };
}

/** '?' → '$1..$n' in order, counter reset per query. SQL is self-generated
 * (identifiers whitelist-sanitized); data values are always bound. */
function pgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function pgConnection(sql: SQL): Database {
  const conn: SqlConnection = {
    query: async (statement, params = []) =>
      (await sql.unsafe(pgSql(statement), params)) as unknown as SqlRow[],
    exec: async (statement, params = []) => {
      await sql.unsafe(pgSql(statement), params);
    },
  };
  return {
    ...conn,
    dialect: 'postgres',
    async transaction<T>(fn: (tx: SqlConnection) => Promise<T>): Promise<T> {
      // begin() leases a dedicated connection; throw → rollback, resolve → commit.
      return sql.begin(async (tx) => {
        const txConn: SqlConnection = {
          query: (statement, params = []) => tx.unsafe(pgSql(statement), params) as unknown as Promise<SqlRow[]>,
          exec: async (statement, params = []) => {
            await tx.unsafe(pgSql(statement), params);
          },
        };
        return fn(txConn);
      });
    },
    close: async () => {
      await sql.close({ timeout: 0 });
    },
  };
}

/** Open the database selected by env. Validates DB_DRIVER/URL pairing and
 * never falls back after failure — the first query surfaces connection
 * errors to startup. */
export async function openDatabase(env: Record<string, string | undefined> = process.env): Promise<Database> {
  const cfg = driverEnv(env);
  if (cfg.dialect === 'postgres') {
    return pgConnection(new SQL({ url: cfg.url }));
  }
  if (cfg.url.startsWith('file:')) {
    const fsPath = decodeURIComponent(cfg.url.slice('file:'.length).split('?')[0]);
    await mkdir(dirname(fsPath), { recursive: true });
  }
  return libsqlConnection(createClient({ url: cfg.url, authToken: cfg.authToken }));
}
