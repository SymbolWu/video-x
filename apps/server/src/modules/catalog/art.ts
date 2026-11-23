import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { FastifyInstance } from "fastify";
import { Database, AppError, sql, notFound } from "../../platform/db.js";
import { config } from "../../platform/config.js";
import { IdParams } from "@video-x/contracts";
async function dimensions(
  bytes: Buffer,
  mime: string,
): Promise<{ width: number; height: number }> {
  const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from("89504e470d0a1a0a", "hex")),
    jpeg = bytes[0] === 255 && bytes[1] === 216;
  const invalid = () =>
    new AppError(400, "INVALID_IMAGE", "请选择有效的 JPEG 或 PNG 图片。");
  if (mime === "image/png" ? !png : !jpeg) throw invalid();
  const raw = await new Promise<string>((resolve, reject) => {
    const probe = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "pipe",
        "-f",
        png ? "png_pipe" : "jpeg_pipe",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0",
        "pipe:0",
      ],
      { stdio: ["pipe", "pipe", "ignore"] },
    );
    const timeout = setTimeout(() => probe.kill(), 8000);
    let output = "";
    probe.stdout.on("data", (buf) => {
      output += buf;
      if (output.length > 256) probe.kill();
    });
    probe.stdin.on("error", () => {});
    probe.stdin.end(bytes);
    probe.on("error", () => {
      clearTimeout(timeout);
      reject(new AppError(503, "NO_PROBE", "图像探测工具暂不可用。"));
    });
    probe.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output.trim());
      else reject(invalid());
    });
  });
  const [width = 0, height = 0] = raw.split(",").map(Number);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > 24000000
  )
    throw invalid();
  return { width, height };
}
export function registerArt(app: FastifyInstance, db: Database) {
  app.addContentTypeParser(
    ["image/jpeg", "image/png"],
    { parseAs: "buffer", bodyLimit: 6 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );
  app.get<{ Params: { id: string } }>(
    "/api/art/:id",
    { schema: { hide: true, params: IdParams } },
    async (req, reply) => {
      const [asset] = await db.query(
        sql`SELECT storage_key,mime_type FROM video_x.assets WHERE id=${req.params.id} AND state='ready'`,
      );
      if (!asset || !/^[a-f0-9]{64}$/.test(asset.storage_key)) throw notFound();
      try {
        const bytes = await readFile(join(config.artRoot, asset.storage_key));
        return reply
          .header("Cache-Control", "private, max-age=86400")
          .header("X-Content-Type-Options", "nosniff")
          .type(asset.mime_type)
          .send(bytes);
      } catch {
        throw notFound();
      }
    },
  );
  app.post(
    "/api/art",
    { bodyLimit: 6 * 1024 * 1024, schema: { hide: true } },
    async (req) => {
      const mime = req.headers["content-type"]?.split(";")[0];
      if (
        !Buffer.isBuffer(req.body) ||
        !["image/jpeg", "image/png"].includes(mime ?? "")
      )
        throw new AppError(415, "INVALID_IMAGE", "请选择 JPEG 或 PNG 图片。");
      return saveArtwork(db, req.body, mime!);
    },
  );
}

export async function saveArtwork(db: Database, bytes: Buffer, mime: string) {
  const hash = createHash("sha256").update(bytes).digest("hex"),
    { width, height } = await dimensions(bytes, mime!);
  await mkdir(config.artRoot, { recursive: true });
  const tmp = join(config.artRoot, randomUUID() + ".tmp");
  try {
    await writeFile(tmp, bytes, { flag: "wx", mode: 0o600 });
    await rename(tmp, join(config.artRoot, hash));
  } finally {
    await unlink(tmp).catch(() => {});
  }
  const [row] = await db.query(
    sql`INSERT INTO video_x.assets(storage_key,sha256,mime_type,size_bytes,width,height,state) VALUES(${hash},decode(${hash},'hex'),${mime},${bytes.length},${width},${height},'ready') ON CONFLICT(storage_key) DO UPDATE SET state='ready' RETURNING id`,
  );
  return { id: row!.id };
}
