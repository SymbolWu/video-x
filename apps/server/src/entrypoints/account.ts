import readline from "node:readline/promises";
import { Writable } from "node:stream";
import { config } from "../platform/config.js";
import { Database } from "../platform/db.js";
import { createAccount } from "../modules/identity/service.js";
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const cli = readline.createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
});
try {
  const username =
    process.env.VIDEO_X_INITIAL_USERNAME ?? (await cli.question("用户名: "));
  let password = process.env.VIDEO_X_INITIAL_PASSWORD;
  if (!password) {
    process.stdout.write("密码（12～128 位，输入不回显）: ");
    muted = true;
    try {
      password = await cli.question("");
    } finally {
      muted = false;
      process.stdout.write("\n");
    }
  }
  cli.close();
  const db = new Database(config.databaseUrl);
  try {
    await createAccount(db, username, password, "我的片库");
    console.log("管理员账号已创建");
  } finally {
    await db.close();
  }
} finally {
  cli.close();
}
