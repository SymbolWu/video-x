import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url)),
  runtime = join(root, ".runtime"),
  data = join(runtime, "postgres"),
  socket = join(runtime, "pgsocket"),
  pwfile = join(runtime, "pg-password");
const bin = process.env.VIDEO_X_PG_BIN ?? "/opt/homebrew/opt/postgresql@16/bin";
const tool = (name) => (existsSync(join(bin, name)) ? join(bin, name) : name);
const run = (name, args, extra = {}) => {
  const r = spawnSync(tool(name), args, { stdio: "inherit", ...extra });
  if (r.status !== 0) throw Error(`${name} failed (${r.status})`);
};
if (process.argv[2] === "stop") {
  if (
    existsSync(data) &&
    spawnSync(tool("pg_ctl"), ["-D", data, "status"], { stdio: "ignore" })
      .status === 0
  )
    run("pg_ctl", ["-D", data, "stop", "-m", "fast"]);
  process.exit(0);
}
mkdirSync(runtime, { recursive: true, mode: 0o700 });
mkdirSync(socket, { recursive: true, mode: 0o700 });
if (!existsSync(data)) {
  if (existsSync(join(root, ".env")))
    throw Error(
      "An .env already exists; configure/start its database explicitly. Refusing to replace configuration.",
    );
  writeFileSync(pwfile, randomBytes(24).toString("hex"), { mode: 0o600 });
  run("initdb", [
    "-D",
    data,
    "-U",
    "video_x",
    "--auth=scram-sha-256",
    "--pwfile=" + pwfile,
    "--encoding=UTF8",
    "--locale=C",
  ]);
}
if (!existsSync(pwfile))
  throw Error(
    "Missing project database credentials; restore .runtime/pg-password.",
  );
const password = readFileSync(pwfile, "utf8").trim();
if (
  spawnSync(tool("pg_ctl"), ["-D", data, "status"], { stdio: "ignore" })
    .status !== 0
)
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    join(runtime, "postgres.log"),
    "-o",
    `-p 54339 -h 127.0.0.1 -k ${socket}`,
    "-w",
    "start",
  ]);
const env = { ...process.env, PGPASSWORD: password };
for (const name of ["video_x_dev", "video_x_test"]) {
  const check = spawnSync(
    tool("psql"),
    [
      "-h",
      "127.0.0.1",
      "-p",
      "54339",
      "-U",
      "video_x",
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname='${name}'`,
    ],
    { encoding: "utf8", env },
  );
  if (check.status !== 0) throw Error("Project database authentication failed");
  if (check.stdout.trim() !== "1")
    run("createdb", ["-h", "127.0.0.1", "-p", "54339", "-U", "video_x", name], {
      env,
    });
}
if (!existsSync(join(root, ".env")))
  writeFileSync(
    join(root, ".env"),
    `NODE_ENV=development\nDATABASE_URL=postgresql://video_x:${password}@127.0.0.1:54339/video_x_dev\nTEST_DATABASE_URL=postgresql://video_x:${password}@127.0.0.1:54339/video_x_test\nHOST=127.0.0.1\nPORT=5120\nCOOKIE_SECURE=false\n`,
    { mode: 0o600 },
  );
chmodSync(pwfile, 0o600);
console.log(
  "Project databases ready at 127.0.0.1:54339; credentials stay in .env.",
);
