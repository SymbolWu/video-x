import { Database } from "../../src/platform/db.js";
import { runMove } from "../../src/modules/imports/moves.js";
const [root, id] = process.argv.slice(2),
  url = process.env.DATABASE_URL;
if (
  !root ||
  !id ||
  !url ||
  !/^\/video_x_test_[0-9a-f]+$/.test(new URL(url).pathname)
)
  throw Error("Isolated integration database required");
const db = new Database(url);
await runMove(db, root, id, async (bytes) => {
  if (bytes >= 1048576) process.kill(process.pid, "SIGKILL");
});
await db.close();
