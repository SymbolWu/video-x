import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { promisify } from "node:util";
import pkg from "../../../package.json" with { type: "json" };
import { config } from "../../platform/config.js";
import { Database, sql } from "../../platform/db.js";
import { observeStorage } from "./storage-status.js";
import { providers } from "../sources/providers.js";

const exec = promisify(execFile);
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
    const [facts, storage, writable, artExists, ffmpeg, ffprobe, instances] =
      await Promise.all([
        db.query(sql`SELECT (SELECT count(*)::int FROM video_x.import_items WHERE merged_into_id IS NULL AND stage<>'published') pending,
        (SELECT coalesce(sum(size_bytes),0)::float8 FROM video_x.assets WHERE state='ready') bytes,
        current_setting('server_version') AS pg`),
        observeStorage(db, root),
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
    return {
      checkedAt: new Date().toISOString(),
      ...storage,
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
