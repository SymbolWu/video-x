import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openVideo, probeVideo } from "../src/modules/imports/files.js";

test("legacy file names preserve their on-disk spelling and probe the actual supported container", async () => {
  const root = await mkdtemp(join(tmpdir(), "vx-legacy-container-"));
  try {
    for (const [format, name] of [
      ["matroska", "旧版.mp4"],
      ["mp4", "原版.mp4 "],
    ] as const) {
      const input = join(root, "sample");
      execFileSync("ffmpeg", [
        "-nostdin",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=s=32x32:d=0.2",
        "-c:v",
        "mpeg4",
        "-f",
        format,
        input,
      ]);
      await rename(input, join(root, name));
      const { file } = await openVideo(root, name);
      try {
        const probe = await probeVideo(file, name);
        assert.equal(probe.format, format);
        assert.ok(probe.duration > 0);
      } finally {
        await file.close();
      }
    }
    await assert.rejects(openVideo(root, "../原版.mp4 "));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
