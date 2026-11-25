import { readFile, statfs } from "node:fs/promises";
import { sql, type Database } from "../../platform/db.js";
import { rootMarker } from "../imports/files.js";
import { allowedRoot } from "../imports/layout.js";

type Space = { total: number; used: number; available: number };
type RegisteredRoot = { name: string; path: string; marker: string };

const maxSnapshotAgeMs = 180_000;

function isSpace(value: unknown): value is Space {
  if (typeof value !== "object" || value === null) return false;
  const { total, used, available } = value as Space;
  return (
    [total, used, available].every(Number.isSafeInteger) &&
    total > 0 &&
    used >= 0 &&
    available >= 0 &&
    used + available <= total
  );
}

async function readHostSnapshot() {
  const file = process.env.VIDEO_X_HOST_STORAGE_SNAPSHOT;
  if (!file) return null;
  try {
    const { checkedAt, volumes } = JSON.parse(await readFile(file, "utf8"));
    const age = Date.now() - Date.parse(checkedAt);
    if (
      !Number.isFinite(age) ||
      age < -5000 ||
      age > maxSnapshotAgeMs ||
      !Array.isArray(volumes)
    )
      return null;
    const spaces = new Map<string, Space>();
    for (const entry of volumes) {
      if (typeof entry?.marker === "string" && isSpace(entry.space)) {
        spaces.set(entry.marker, entry.space);
      }
    }
    return { checkedAt: new Date(checkedAt).toISOString(), spaces };
  } catch {
    return null;
  }
}

async function nativeSpace(path: string): Promise<Space | null> {
  try {
    const fs = await statfs(path, { bigint: true });
    return {
      total: Number(fs.blocks * fs.bsize),
      used: Number((fs.blocks - fs.bfree) * fs.bsize),
      available: Number(fs.bavail * fs.bsize),
    };
  } catch {
    return null;
  }
}

async function liveState(path: string, expected?: string) {
  const marker = await rootMarker(path).catch(() => null);
  return !marker
    ? "offline"
    : !expected
      ? "unregistered"
      : marker !== expected
        ? "mismatch"
        : "online";
}

export async function observeStorage(db: Database, root: string) {
  const [registered, host] = await Promise.all([
    db.query<RegisteredRoot>(sql`SELECT name, mount_path AS path, expected_marker AS marker
      FROM video_x.storage_roots WHERE archived_at IS NULL ORDER BY name, id`),
    readHostSnapshot(),
  ]);
  const compose = process.env.VIDEO_X_DEPLOYMENT === "compose";
  const expected = registered.find((item) => item.path === root)?.marker;
  const [state, mediaRoots] = await Promise.all([
    liveState(root, expected),
    Promise.all(
      registered
        .filter((item) => item.path !== root && allowedRoot(root, item.path))
        .map(async (item) => {
          const state = await liveState(item.path, item.marker);
          let space: Space | null = null;
          let capacityCheckedAt: string | null = null;
          if (state === "online") {
            // The container's shared filesystem can return the same synthetic capacity for distinct disks.
            space = compose
              ? (host?.spaces.get(item.marker) ?? null)
              : await nativeSpace(item.path);
            if (space)
              capacityCheckedAt = compose
                ? host!.checkedAt
                : new Date().toISOString();
          }
          return {
            name: item.name,
            path: item.path,
            state,
            space,
            capacityCheckedAt,
          };
        }),
    ),
  ]);
  return {
    media: { path: root, state, space: null },
    // Keep the existing capacity-only field for older clients.
    disks: mediaRoots.flatMap((disk) =>
      disk.space ? [{ name: disk.name, path: disk.path, ...disk.space }] : [],
    ),
    mediaRoots,
  };
}
