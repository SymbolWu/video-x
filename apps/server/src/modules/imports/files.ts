import { constants } from "node:fs";
import { open, opendir, realpath, type FileHandle } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { AppError } from "../../platform/db.js";

export const mediaExtension = /\.(?:mkv|mp4) *$/i;
const invalidRoot = () =>
  new AppError(
    409,
    "ROOT_OFFLINE",
    "媒体目录未挂载或缺少 .video-x-root 标识。",
  );
export async function rootMarker(root: string) {
  let marker: FileHandle | undefined;
  try {
    marker = await open(
      path.join(root, ".video-x-root"),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const info = await marker.stat();
    if (!info.isFile() || info.size > 80) throw invalidRoot();
    const value = (await marker.readFile("utf8")).trim().toLowerCase();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        value,
      )
    )
      throw invalidRoot();
    return value;
  } catch {
    throw invalidRoot();
  } finally {
    await marker?.close();
  }
}
export async function* videoPaths(
  root: string,
  relative = "",
): AsyncGenerator<string> {
  const base = await realpath(root),
    dir = path.join(base, relative);
  if ((await realpath(dir)) !== dir) throw invalidRoot();
  const entries = await opendir(dir);
  for await (const entry of entries) {
    if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
    const item = path.join(relative, entry.name);
    if (item.includes("\\") || Buffer.byteLength(item) > 2048) continue;
    if (entry.isDirectory()) yield* videoPaths(base, item);
    else if (entry.isFile() && mediaExtension.test(item)) yield item;
  }
}
export async function openVideo(root: string, relative: string) {
  const base = await realpath(root),
    target = path.resolve(base, relative);
  if (
    !target.startsWith(base + path.sep) ||
    !mediaExtension.test(relative) ||
    (await realpath(target)) !== target
  )
    throw invalidRoot();
  const file = await open(
    target,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const stat = await file.stat({ bigint: true });
    if (!stat.isFile() || (await realpath(target)) !== target)
      throw invalidRoot();
    return { file, size: stat.size.toString(), mtime: stat.mtimeNs.toString() };
  } catch (e) {
    await file.close();
    throw e;
  }
}
interface Track {
  index: number;
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  channels?: number;
  tags?: { language?: string };
  disposition?: { attached_pic?: number };
}
interface Probe {
  format?: { duration?: string; format_name?: string };
  streams?: Track[];
}
export async function probeVideo(file: FileHandle, relative: string) {
  // Some legacy files carry a valid Matroska container under an MP4 filename.
  // Peek without advancing the shared descriptor passed to ffprobe below.
  const signature = Buffer.alloc(8);
  const { bytesRead } = await file.read(signature, 0, signature.length, 0);
  const isMatroska = bytesRead >= 4 && signature.readUInt32BE(0) === 0x1a45dfa3;
  const isIsoMedia =
    bytesRead === 8 && signature.toString("ascii", 4, 8) === "ftyp";
  const format =
    isMatroska || (!isIsoMedia && !/\.mp4 *$/i.test(relative))
      ? "matroska"
      : "mov";
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-f",
        format,
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        "/dev/fd/3",
      ],
      { stdio: ["ignore", "pipe", "ignore", file.fd] },
    );
    const chunks: Buffer[] = [];
    let count = 0;
    const timeout = setTimeout(() => proc.kill("SIGKILL"), 30000);
    proc.stdout!.on("data", (data: Buffer) => {
      count += data.length;
      if (count > 2 * 1024 * 1024) proc.kill("SIGKILL");
      else chunks.push(data);
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(Error("PROBE_FAILED"));
    });
  });
  const result: Probe = JSON.parse(bytes.toString());
  const duration = Math.round(Number(result.format?.duration) * 1000);
  if (
    !Number.isSafeInteger(duration) ||
    duration <= 0 ||
    !result.streams?.some(
      (s) => s.codec_type === "video" && !s.disposition?.attached_pic,
    )
  )
    throw Error("NO_PLAYABLE_VIDEO");
  return {
    duration,
    format: format === "mov" ? "mp4" : "matroska",
    tracks: result.streams.filter((s) =>
      ["audio", "video", "subtitle", "attachment", "data"].includes(
        s.codec_type,
      ),
    ),
  };
}
