import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, type SQL } from "drizzle-orm";
import { PgBoss } from "pg-boss";
export { sql };
export class Database {
  readonly pool: pg.Pool;
  readonly orm: ReturnType<typeof drizzle>;
  readonly boss: PgBoss;
  constructor(url: string, supervise = false) {
    this.pool = new pg.Pool({ connectionString: url, max: 8 });
    this.orm = drizzle(this.pool);
    this.boss = new PgBoss({
      connectionString: url,
      migrate: false,
      supervise,
    });
  }
  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    statement: SQL,
  ): Promise<T[]> {
    return (await this.orm.execute<T>(statement)).rows as T[];
  }
  async transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const orm = drizzle(client);
      const enqueue = async (name: string, data: object) => {
        await this.boss.send(name, data, {
          db: {
            executeSql: (text: string, values?: unknown[]) =>
              client.query(text, values),
          },
        });
      };
      const result = await run({
        enqueue,
        query: async <R extends pg.QueryResultRow = pg.QueryResultRow>(
          q: SQL,
        ) => (await orm.execute<R>(q)).rows as R[],
        emit: (data) => enqueue("catalog.changed", data),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.boss.stop();
    await this.pool.end();
  }
}
export interface Transaction {
  enqueue(name: string, data: object): Promise<void>;
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(q: SQL): Promise<T[]>;
  emit(data: { mediaId: string; revision: number }): Promise<void>;
}
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const notFound = () =>
  new AppError(404, "NOT_FOUND", "资料不存在或已归档");
export const conflict = () =>
  new AppError(409, "REVISION_CONFLICT", "资料已被修改，请刷新后重新核对");
export async function requireChanged(
  rows: unknown[],
  lookup: () => Promise<unknown[]>,
) {
  if (!rows.length) {
    if (!(await lookup()).length) throw notFound();
    throw conflict();
  }
}
