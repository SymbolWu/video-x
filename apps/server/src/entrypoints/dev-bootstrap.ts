import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { config } from "../platform/config.js";
import { Database, sql } from "../platform/db.js";
import { createAccount } from "../modules/identity/service.js";
import { seedFixtures } from "../platform/fixtures.js";
if (
  process.env.NODE_ENV !== "development" ||
  !new URL(config.databaseUrl).pathname.endsWith("_dev")
)
  throw Error("Development database only");
const db = new Database(config.databaseUrl);
try {
  const [row] = await db.query<{ count: number }>(
    sql`SELECT count(*)::int count FROM video_x.accounts`,
  );
  if (row!.count === 0) {
    const password = randomBytes(24).toString("base64url");
    const path = fileURLToPath(
      new URL("../../../../.runtime/dev-access.json", import.meta.url),
    );
    await mkdir(
      fileURLToPath(new URL("../../../../.runtime/", import.meta.url)),
      { recursive: true, mode: 0o700 },
    );
    // Write exclusively before creating the account; never overwrite an existing credential file.
    await writeFile(
      path,
      JSON.stringify({ username: "owner", password }, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    await createAccount(db, "owner", password, "我的片库");
    console.log(
      "开发账号已创建；凭据仅保存在 .runtime/dev-access.json（600 权限）",
    );
  } else console.log("已存在账号，保留原凭据");
  await seedFixtures(db);
  console.log("虚构开发资料已准备；未导入视频文件");
} finally {
  await db.close();
}
