import path from "node:path";
import { constants } from "node:fs";
import {
  open,
  link,
  unlink,
  mkdir,
  statfs,
  realpath,
  type FileHandle,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { openVideo, rootMarker } from "./files.js";
import {
  checkTarget,
  directory,
  maybeStat,
  problem,
  targetFor,
} from "./layout.js";
import { Database, sql, type Transaction } from "../../platform/db.js";
type BigStat = NonNullable<Awaited<ReturnType<typeof maybeStat>>>;
type Identity = { ino: string; birth: string };
type Scratch = { partial?: Identity; final?: Identity };
export interface MoveFile {
  item_id: string;
  file_id: string;
  source_path: string;
  target_path: string;
  target_key: string;
  source_mount: string;
  target_mount: string;
  source_marker: string;
  target_marker: string;
  size_bytes: string;
  mtime_ns: string;
  create_dir: boolean;
  run_id: string;
  scratch: Scratch | null;
  verified: { identity: Identity; mtime: string; digest: string } | null;
  cleaned: boolean;
}
export async function filePlans(db: Pick<Transaction, "query">, run: string) {
  return db.query<MoveFile>(
    sql`SELECT p.*,f.size_bytes::text,f.mtime_ns::text,s.mount_path source_mount,s.expected_marker source_marker,t.mount_path target_mount,t.expected_marker target_marker FROM video_x.import_move_plans p JOIN video_x.media_files f ON f.id=p.file_id JOIN video_x.storage_roots s ON s.id=p.source_root JOIN video_x.storage_roots t ON t.id=p.target_root WHERE p.run_id=${run} ORDER BY p.item_id`,
  );
}
const identity = (s: BigStat): Identity => ({
  ino: String(s.ino),
  birth: String(s.birthtimeNs),
});
const matches = (s: BigStat | null, i: Identity | undefined) =>
  !!s &&
  s.isFile() &&
  !!i &&
  String(s.ino) === i.ino &&
  String(s.birthtimeNs) === i.birth;
async function syncDir(dir: string) {
  const f = await open(dir, "r");
  try {
    await f.sync();
  } finally {
    await f.close();
  }
}
async function digest(file: FileHandle) {
  const hash = createHash("sha256");
  for await (const chunk of file.createReadStream({
    autoClose: false,
    start: 0,
  }))
    hash.update(chunk);
  return hash.digest("hex");
}
async function targetDirectory(primary: string, p: MoveFile) {
  const t = targetFor(primary, p.target_key);
  const parent =
    path.posix.dirname(p.target_path) === "."
      ? ""
      : path.posix.dirname(p.target_path);
  const sub = path.relative(t.dir || ".", parent || ".");
  if (
    t.root !== p.target_mount ||
    checkTarget(primary, t, sub) !== parent ||
    (await rootMarker(t.root)) !== p.target_marker
  )
    throw problem("目标配置或卷标识已变更。");
  if (p.create_dir && !(await maybeStat(path.join(t.root, parent)))) {
    const above = path.dirname(parent);
    const base = await directory(t.root, above === "." ? "" : above);
    await mkdir(path.join(base, path.basename(parent))).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
    await syncDir(base);
  }
  return directory(t.root, parent);
}
// Comparing the parent directory identities also covers case-insensitive and bind-mounted aliases.
async function distinctLocation(srcPath: string, destDir: string) {
  const [from, to] = await Promise.all([
    maybeStat(path.dirname(srcPath)),
    maybeStat(destDir),
  ]);
  if (
    !from?.isDirectory() ||
    !to?.isDirectory() ||
    (from.dev === to.dev && from.ino === to.ino)
  )
    throw problem("源文件和整理目标指向同一目录，已停止移动。");
}
const unsupported = (e: unknown) =>
  ["EXDEV", "EPERM", "EOPNOTSUPP", "ENOTSUP", "EMLINK"].includes(
    (e as NodeJS.ErrnoException).code ?? "",
  );
type Step = (bytes: number) => Promise<void>;
async function copyFrom(
  source: FileHandle,
  dest: FileHandle,
  size: number,
  step?: Step,
) {
  let offset = Number((await dest.stat({ bigint: true })).size);
  if (offset > size) throw problem("暂存文件长度异常。");
  const buffer = Buffer.alloc(1024 * 1024);
  while (offset < size) {
    const { bytesRead } = await source.read(
      buffer,
      0,
      Math.min(buffer.length, size - offset),
      offset,
    );
    if (!bytesRead) throw problem("复制时源文件发生变化。");
    let done = 0;
    while (done < bytesRead) {
      const n = await dest.write(buffer, done, bytesRead - done, offset + done);
      if (!n.bytesWritten) throw problem("目标磁盘写入失败。");
      done += n.bytesWritten;
    }
    offset += bytesRead;
    if (step) await step(offset);
  }
  await dest.sync();
}
async function ownedOutput(
  db: Database,
  p: MoveFile,
  file: string,
  key: keyof Scratch,
) {
  const saved = p.scratch?.[key],
    prior = await maybeStat(file);
  if (prior && !matches(prior, saved))
    throw problem("目标或暂存位置已被其他文件占用：" + path.basename(file));
  const fd = await open(
    file,
    constants.O_RDWR |
      constants.O_NOFOLLOW |
      (prior ? 0 : constants.O_CREAT | constants.O_EXCL),
    0o600,
  );
  try {
    const current = await fd.stat({ bigint: true });
    if (prior && !matches(current, saved)) throw problem("目标文件身份改变。");
    if (!prior) {
      p.scratch = { ...p.scratch, [key]: identity(current) };
      await db.query(
        sql`UPDATE video_x.import_move_plans SET scratch=${JSON.stringify(p.scratch)}::jsonb WHERE item_id=${p.item_id}`,
      );
      await syncDir(path.dirname(file));
    }
    return fd;
  } catch (e) {
    await fd.close();
    throw e;
  }
}
export async function stageFile(
  db: Database,
  primary: string,
  p: MoveFile,
  step?: Step,
) {
  if (
    p.source_mount !== primary ||
    (await rootMarker(primary)) !== p.source_marker
  )
    throw problem("源盘离线或标识不符。");
  const src = await openVideo(primary, p.source_path).catch((error) => {
    if (error.code === "ENOENT")
      throw problem("找不到待整理的源文件。请检查录入时登记的位置，再重试。");
    throw error;
  });
  try {
    if (src.size !== p.size_bytes || src.mtime !== p.mtime_ns)
      throw problem("源文件已改变，请重新探测。");
    const dir = await targetDirectory(primary, p),
      dest = path.join(dir, path.basename(p.target_path));
    const original = await src.file.stat({ bigint: true }),
      here = await maybeStat(dir);
    const srcPath = path.join(await realpath(primary), p.source_path);
    await distinctLocation(srcPath, dir);
    const existing = await maybeStat(dest);
    const sameSource =
      !!existing &&
      existing.dev === original.dev &&
      matches(existing, identity(original));
    const owned =
      matches(existing, p.scratch?.partial) ||
      matches(existing, p.scratch?.final) ||
      matches(existing, p.verified?.identity);
    if (existing && !sameSource && !owned)
      throw problem("目标已有同名文件：" + path.basename(dest));
    let linked = sameSource;
    if (!existing && here?.dev === original.dev) {
      try {
        await link(srcPath, dest);
        linked = true;
      } catch (e) {
        if (!unsupported(e)) throw e;
      }
    }
    const tmp = path.join(
      dir,
      ".video-x-" + p.run_id + "-" + p.item_id + ".part",
    );
    if (
      (!existing && !linked) ||
      (existing && p.scratch?.final && !p.verified)
    ) {
      const part = await ownedOutput(db, p, tmp, "partial");
      try {
        const remain = original.size - (await part.stat({ bigint: true })).size;
        const space = await statfs(dir, { bigint: true });
        if (space.bavail * space.bsize < remain)
          throw problem("目标盘空间不足。");
        await copyFrom(src.file, part, Number(original.size), step);
        if ((await digest(src.file)) !== (await digest(part))) {
          await part.truncate(0);
          await part.sync();
          throw problem("暂存内容校验失败，重试将重新复制。");
        }
        try {
          if (!existing) await link(tmp, dest);
          else if (!p.scratch?.final) throw problem("目标文件发生变化。");
        } catch (e) {
          if (!unsupported(e)) throw e;
          const out = await ownedOutput(db, p, dest, "final");
          try {
            await copyFrom(part, out, Number(original.size));
          } finally {
            await out.close();
          }
        }
        if (existing && p.scratch?.final) {
          const out = await ownedOutput(db, p, dest, "final");
          try {
            await copyFrom(part, out, Number(original.size));
          } finally {
            await out.close();
          }
        }
      } finally {
        await part.close();
      }
    }
    const checked = await openVideo(p.target_mount, p.target_path);
    try {
      const target = await checked.file.stat({ bigint: true });
      const hash = await digest(src.file);
      if (
        target.size !== original.size ||
        (linked &&
          (target.dev !== original.dev ||
            !matches(target, identity(original)))) ||
        (!linked && (await digest(checked.file)) !== hash) ||
        (await src.file.stat({ bigint: true })).mtimeNs !== original.mtimeNs ||
        (await checked.file.stat({ bigint: true })).mtimeNs !== target.mtimeNs
      )
        throw problem("源和目标文件校验不一致。");
      await syncDir(dir);
      await db.query(
        sql`UPDATE video_x.import_move_plans SET verified=${JSON.stringify({ identity: identity(target), source: identity(original), sourceMtime: String(original.mtimeNs), mtime: String(target.mtimeNs), digest: hash })}::jsonb WHERE item_id=${p.item_id}`,
      );
    } finally {
      await checked.file.close();
    }
  } finally {
    await src.file.close();
  }
}
export async function cleanSource(db: Database, primary: string, p: MoveFile) {
  if (p.cleaned) return;
  const dir = await targetDirectory(primary, p);
  if (
    !p.verified ||
    p.source_mount !== primary ||
    (await rootMarker(primary)) !== p.source_marker
  )
    throw problem("源文件清理等待对应磁盘。");
  const v = p.verified as NonNullable<typeof p.verified> & {
    source: Identity;
    sourceMtime: string;
  };
  const dst = await openVideo(p.target_mount, p.target_path);
  try {
    if (
      !matches(await dst.file.stat({ bigint: true }), v.identity) ||
      (await digest(dst.file)) !== v.digest
    )
      throw problem("目标身份或内容改变，保留源文件。");
    const srcPath = path.join(await realpath(primary), p.source_path);
    if (await maybeStat(srcPath)) {
      await distinctLocation(srcPath, dir);
      const src = await openVideo(primary, p.source_path);
      try {
        if (
          !matches(await src.file.stat({ bigint: true }), v.source) ||
          src.mtime !== v.sourceMtime ||
          (await digest(src.file)) !== v.digest ||
          !matches(await maybeStat(srcPath), v.source) ||
          !matches(
            await maybeStat(path.join(dir, path.basename(p.target_path))),
            v.identity,
          ) ||
          String((await dst.file.stat({ bigint: true })).mtimeNs) !== v.mtime
        )
          throw problem("源文件已被替换，保留该文件。");
        await unlink(srcPath);
        await syncDir(path.dirname(srcPath));
      } finally {
        await src.file.close();
      }
    }
    const tmp = path.join(
      dir,
      ".video-x-" + p.run_id + "-" + p.item_id + ".part",
    );
    if (matches(await maybeStat(tmp), p.scratch?.partial)) {
      await unlink(tmp);
      await syncDir(dir);
    }
    await db.query(
      sql`UPDATE video_x.import_move_plans SET cleaned=true WHERE item_id=${p.item_id}`,
    );
  } finally {
    await dst.file.close();
  }
}
