import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir, stat, statfs } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pkg from "../../../package.json" with { type: "json" };
import { config } from "../../platform/config.js";
import { Database, sql } from "../../platform/db.js";
import { rootMarker } from "../imports/files.js";
import { providers } from "../sources/providers.js";

const exec = promisify(execFile);
async function capacity(path: string) {
  const fs = await statfs(path, { bigint: true });
  return {
    total: Number(fs.blocks * fs.bsize),
    used: Number((fs.blocks - fs.bfree) * fs.bsize),
    available: Number(fs.bavail * fs.bsize),
  };
}
async function mountedDisks() {
  if (process.platform !== "darwin") return [];
  const parent = await stat("/Volumes");
  const entries = await readdir("/Volumes", { withFileTypes: true });
  const found = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map(async (e) => {
        const path = join("/Volumes", e.name);
        try {
          if ((await stat(path)).dev === parent.dev) return null;
          const { stdout } = await exec(
            "/usr/sbin/diskutil",
            ["info", "-plist", path],
            { timeout: 2000, maxBuffer: 65536 },
          );
          if (!/<key>Internal<\/key>\s*<false\s*\/>/.test(stdout)) return null;
          return { name: e.name, path, ...(await capacity(path)) };
        } catch {
          return null;
        }
      }),
  );
  return found
    .filter((x) => x !== null)
    .sort((a, b) => b.available - a.available);
}
async function version(binary: "ffmpeg" | "ffprobe") {
  try {
    const { stdout } = await exec(binary, ["-version"], {
      timeout: 1800,
      maxBuffer: 32768,
    });
    return stdout.split(/\s+/)[2] ?? null;
  } catch {
    return null;
  }
}
export function readStatus(db: Database, root: string) {
  // Many browser tabs share the cheap, short-lived observation.
  let last: ReturnType<typeof inspect> | undefined,
    expires = 0;
  async function inspect() {
    const [
      facts,
      marker,
      mediaSpace,
      disks,
      writable,
      artExists,
      ffmpeg,
      ffprobe,
      instances,
    ] = await Promise.all([
      db.query(sql`SELECT (SELECT expected_marker FROM video_x.storage_roots WHERE mount_path=${root} AND archived_at IS NULL LIMIT 1) expected,
        (SELECT count(*)::int FROM video_x.import_items WHERE merged_into_id IS NULL AND stage<>'published') pending,
        (SELECT coalesce(sum(size_bytes),0)::float8 FROM video_x.assets WHERE state='ready') bytes,
        current_setting('server_version') AS pg`),
      rootMarker(root).catch(() => null),
      capacity(root).catch(() => null),
      mountedDisks().catch(() => null),
      access(config.artRoot, constants.W_OK).then(
        () => true,
        () => false,
      ),
      stat(config.artRoot).then(
        (s) => s.isDirectory(),
        () => false,
      ),
      version("ffmpeg"),
      version("ffprobe"),
      db.boss.getInstances().catch(() => null),
    ]);
    const workers = instances?.filter(
      (i) =>
        i.live &&
        i.workers.some(
          (w) => w.queue === "media.scan" || w.queue === "metadata.lookup",
        ),
    );
    const seen = workers
      ?.map((w) => w.heartbeatOn.getTime())
      .sort((a, b) => b - a)[0];
    const mediaState = !marker
      ? "offline"
      : facts[0]!.expected && facts[0]!.expected !== marker
        ? "mismatch"
        : facts[0]!.expected
          ? "online"
          : "unregistered";
    return {
      checkedAt: new Date().toISOString(),
      media: {
        path: root,
        state: mediaState,
        space: mediaState === "online" ? mediaSpace : null,
      },
      disks,
      art: {
        path: config.artRoot,
        bytes: facts[0]!.bytes,
        state: !artExists ? "unavailable" : writable ? "writable" : "readonly",
      },
      pending: facts[0]!.pending,
      postgres: facts[0]!.pg,
      worker: workers
        ? {
            count: workers.length,
            lastSeen: seen ? new Date(seen).toISOString() : null,
          }
        : null,
      ffprobe,
      ffmpeg,
      version: pkg.version,
      compose: process.env.VIDEO_X_DEPLOYMENT === "compose",
      listenHost: config.host,
      origins: [...config.allowedOrigins],
      sources: [...providers.values()].map((p) => p.name),
    };
  }
  return () => {
    if (!last || Date.now() >= expires) {
      expires = Date.now() + 5000;
      last = inspect().catch((e) => {
        last = undefined;
        throw e;
      });
    }
    return last;
  };
}
