import { openApi30 } from "../platform/openapi.js";
import { writeFile } from "node:fs/promises";
import { createApp } from "../app.js";
import { Database } from "../platform/db.js";
const db = new Database("postgresql://unused:unused@127.0.0.1:1/unused");
const app = await createApp(db);
await writeFile(
  new URL("../../../../packages/contracts/openapi.json", import.meta.url),
  JSON.stringify(openApi30(app.swagger()), null, 2) + "\n",
);
await app.close();
await db.close();
