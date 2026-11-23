import { createApp } from "../app.js";
import { Database } from "../platform/db.js";
import { config } from "../platform/config.js";
if (!config.databaseUrl)
  throw Error("Set DATABASE_URL before starting the server");
const db = new Database(config.databaseUrl);
await db.boss.start();
const app = await createApp(db, true);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void app
      .close()
      .then(() => db.close())
      .then(() => process.exit(0));
  });
await app.listen({ host: config.host, port: config.port });
