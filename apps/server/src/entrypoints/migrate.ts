import { migrate } from "drizzle-orm/node-postgres/migrator";
import { config, migrationsPath } from "../platform/config.js";
import { Database } from "../platform/db.js";
import { migrateQueue } from "../platform/queue.js";
if (!config.databaseUrl) throw Error("DATABASE_URL is required");
const db = new Database(config.databaseUrl);
const client = await db.pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(72649001)");
  await migrate(db.orm, { migrationsFolder: migrationsPath });
  await migrateQueue(config.databaseUrl);
  console.log("video-x migrations applied");
} finally {
  await client.query("SELECT pg_advisory_unlock(72649001)");
  client.release();
  await db.close();
}
