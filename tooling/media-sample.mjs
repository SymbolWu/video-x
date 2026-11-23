// Explicit local development fixture. Never scans or writes the user's existing media collection.
import { mkdir, open, link, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../.runtime/media-inbox", import.meta.url));
await mkdir(root, { recursive: true });
async function createOnly(name, write) {
  const temp = join(root, "." + randomUUID());
  try {
    await write(temp);
    try {
      await link(temp, join(root, name));
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  } finally {
    await unlink(temp).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
await createOnly(".video-x-root", async (file) => {
  const h = await open(file, "wx", 0o644);
  try {
    await h.writeFile(randomUUID() + "\n");
  } finally {
    await h.close();
  }
});
await createOnly("播放验收样片.mp4", async (file) => {
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    "22",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "-f",
    "mp4",
    file,
  ]);
});
console.log("本地验收样片已准备，可在管理端扫描。");
