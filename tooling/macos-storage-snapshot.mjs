import { execFile, spawnSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function diskInfo(identifier) {
  const { stdout } = await exec(
    "/usr/sbin/diskutil",
    ["info", "-plist", identifier],
    {
      timeout: 4000,
      maxBuffer: 131072,
    },
  );
  const converted = spawnSync(
    "/usr/bin/plutil",
    ["-convert", "json", "-o", "-", "-"],
    {
      input: stdout,
      encoding: "utf8",
      timeout: 2000,
    },
  );
  if (converted.status !== 0)
    throw Error("Could not parse macOS volume information");
  return JSON.parse(converted.stdout);
}

const [destination, ...mounts] = process.argv.slice(2);
if (process.platform !== "darwin" || !destination) {
  throw Error(
    "Usage on macOS: node macos-storage-snapshot.mjs <snapshot-directory> [mounted volume roots for initial registration]",
  );
}

await mkdir(destination, { recursive: true });
const config = path.join(destination, "volume-identities.json");
if (mounts.length) {
  const identities = await Promise.all(
    mounts.map(async (mount) => {
      if (path.dirname(mount) !== "/Volumes")
        throw Error("Expected a macOS volume root");
      const info = await diskInfo(mount);
      const marker = (await readFile(path.join(mount, ".video-x-root"), "utf8"))
        .trim()
        .toLowerCase();
      if (
        info.MountPoint !== mount ||
        !info.VolumeUUID ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(marker)
      ) {
        throw Error("Volume identity could not be verified");
      }
      return { mount, uuid: info.VolumeUUID, marker };
    }),
  );
  await writeFile(config, JSON.stringify(identities) + "\n", { flag: "wx" });
}

const identities = JSON.parse(await readFile(config, "utf8"));
const volumes = await Promise.allSettled(
  identities.map(async ({ mount, uuid, marker }) => {
    const info = await diskInfo(uuid);
    if (info.MountPoint !== mount || info.VolumeUUID !== uuid)
      throw Error("Volume unmounted");
    const total = info.APFSContainerSize ?? info.TotalSize;
    const available = info.APFSContainerFree ?? info.FreeSpace;
    if (
      ![total, available].every(Number.isSafeInteger) ||
      total <= 0 ||
      available < 0 ||
      available > total
    )
      throw Error("Capacity unavailable");
    return { marker, space: { total, used: total - available, available } };
  }),
);
const snapshot = {
  checkedAt: new Date().toISOString(),
  volumes: volumes.flatMap((entry) =>
    entry.status === "fulfilled" ? [entry.value] : [],
  ),
};
const staging = path.join(destination, ".storage-" + process.pid + ".json");
await writeFile(staging, JSON.stringify(snapshot) + "\n", {
  flag: "wx",
  mode: 0o644,
});
await rename(staging, path.join(destination, "storage.json"));
