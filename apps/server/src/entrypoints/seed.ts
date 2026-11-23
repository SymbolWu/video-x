import { config } from "../platform/config.js";
import { Database } from "../platform/db.js";
import { seedFixtures } from "../platform/fixtures.js";
if (
  process.env.NODE_ENV !== "development" ||
  !new URL(config.databaseUrl).pathname.endsWith("_dev")
)
  throw Error(
    "Demo fixtures are allowed only with NODE_ENV=development and a *_dev database",
  );
const db = new Database(config.databaseUrl);
try {
  await seedFixtures(db);
  console.log(
    "3 fictional development records inserted; no video files or old data were imported.",
  );
} finally {
  await db.close();
}
