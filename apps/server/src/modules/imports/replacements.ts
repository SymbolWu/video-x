import path from "node:path";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import type { Static } from "@sinclair/typebox";
import type {
  CheckReplacementName,
  InspectReplacement,
  SubmitReplacement,
} from "@video-x/contracts";
import { activeBinding } from "../catalog/edition-files.js";
import {
  AppError,
  conflict,
  sql,
  type Database,
  type Transaction,
} from "../../platform/db.js";
import { openVideo, probeVideo, rootMarker } from "./files.js";
import {
  activeInbox,
  checkTarget,
  directory,
  layout,
  problem,
  relative,
} from "./layout.js";
import { queueMove } from "./moves.js";
import { storeProbe } from "./scan.js";
import { Imports } from "./service.js";

type Reader = Pick<Transaction, "query">;
type Location = Awaited<ReturnType<typeof activeBinding>>;
type Inspect = Static<typeof InspectReplacement>;
type Name = Static<typeof CheckReplacementName>;
type Submit = Static<typeof SubmitReplacement>;
type Source = Pick<Inspect, "volumeId" | "relativePath">;

const fileStem = (title: string) =>
  title
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001F\u007F]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^[. ]+|[. ]+$/gu, "") || "影片";
const reservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const trimBytes = (stem: string, max: number) => {
  const chars = Array.from(stem);
  while (Buffer.byteLength(chars.join("")) > max) chars.pop();
  return chars.join("").replace(/[. ]+$/gu, "");
};

function nameProblem(stem: string, extension: string) {
  if (!stem) return "请输入文件名。";
  if (
    stem.trim() !== stem ||
    /^[.]|[.]$/u.test(stem) ||
    /[<>:"/\\|?*\u0000-\u001F\u007F]/u.test(stem) ||
    reservedName.test(stem)
  )
    return "文件名含保留字符、名称或首尾的空格与点。";
  if (/\.(?:mp4|mkv)$/iu.test(stem))
    return "扩展名随源文件保留，请只输入文件名主体。";
  if (Buffer.byteLength(stem + extension) > 255)
    return "文件名过长，请缩短后重试。";
  return null;
}

function parent(relativePath: string) {
  const dir = path.posix.dirname(relativePath);
  return dir === "." ? "" : dir;
}

async function replacementTarget(db: Reader, root: string, old: Location) {
  const dir = parent(old.relative_path);
  const target = layout(root)?.targets.find(
    (t) =>
      t.root === old.mount_path &&
      (!t.dir || dir === t.dir || dir.startsWith(t.dir + "/")),
  );
  if (old.root_archived || !target)
    throw problem("原文件所在目录未配置为可写入库位置。");
  const inbox = await activeInbox(db, root);
  if (
    (inbox?.mount === target.root &&
      (dir === inbox.dir || dir.startsWith(inbox.dir + "/"))) ||
    checkTarget(
      root,
      target,
      path.posix.relative(target.dir || ".", dir || "."),
    ) !== dir
  )
    throw problem("下载目录不能作为整理目标。");
  if (
    (await rootMarker(old.mount_path).catch(() => null)) !== old.expected_marker
  )
    throw problem("原文件所在媒体盘离线或盘标识不符。");
  const absolute = await directory(old.mount_path, dir).catch(() => {
    throw problem("原文件所在目录无法读取。");
  });
  return { target, dir, absolute };
}

async function openDownload(
  db: Reader,
  root: string,
  source: Source,
  expected?: string,
) {
  const inbox = await activeInbox(db, root);
  if (
    !inbox?.id ||
    inbox.id !== source.volumeId ||
    !relative(source.relativePath).startsWith(inbox.dir + "/")
  )
    throw problem("下载目录已变更或文件不在下载目录内，请重新选择。");
  const [disk] = await db.query(
    sql`SELECT expected_marker FROM video_x.storage_roots WHERE id=${inbox.id} AND archived_at IS NULL`,
  );
  if (
    !disk ||
    (await rootMarker(inbox.mount).catch(() => null)) !== disk.expected_marker
  )
    throw problem("下载目录所在媒体盘离线或盘标识不符。");
  const opened = await openVideo(inbox.mount, source.relativePath).catch(() => {
    throw problem("找不到或无法读取所选 MP4 / MKV 文件。");
  });
  const fileVersion = opened.size + ":" + opened.mtime;
  if (expected && expected !== fileVersion) {
    await opened.file.close();
    throw problem("源文件已改变，请重新选择并检测。");
  }
  return { ...opened, fileVersion, volume: inbox.volume };
}

async function inspectVideo(
  source: Awaited<ReturnType<typeof openDownload>>,
  relativePath: string,
) {
  try {
    const facts = await probeVideo(source.file, relativePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new AppError(503, "NO_PROBE", "服务端缺少 FFprobe。");
      throw problem("无法读取所选文件的视频流，请选择其他文件。");
    });
    const after = await source.file.stat({ bigint: true });
    if (
      after.size.toString() !== source.size ||
      after.mtimeNs.toString() !== source.mtime
    )
      throw problem("源文件仍在变化，请等下载完成后重试。");
    return facts;
  } finally {
    await source.file.close();
  }
}

async function availableSource(db: Reader, source: Source) {
  const [used] = await db.query(sql`
    SELECT CASE WHEN EXISTS (SELECT 1 FROM video_x.edition_parts WHERE file_id=f.id)
      THEN '这个文件已绑定播放版本，请选择其他文件。'
      ELSE '这个文件已有录入草稿，请先处理工作台中的记录。' END AS message
    FROM video_x.media_files f
    WHERE f.root_id=${source.volumeId} AND f.relative_path=${source.relativePath}
      AND (EXISTS (SELECT 1 FROM video_x.edition_parts WHERE file_id=f.id)
        OR EXISTS (SELECT 1 FROM video_x.import_item_files b JOIN video_x.import_items i ON i.id=b.item_id
          WHERE b.file_id=f.id AND i.merged_into_id IS NULL AND i.execution_status<>'cancelled'))`);
  if (used) throw problem(used.message);
}

async function checkName(
  db: Reader,
  rootId: string,
  dest: Awaited<ReturnType<typeof replacementTarget>>,
  stem: string,
  extension: string,
) {
  const issue = nameProblem(stem, extension);
  if (issue) return { path: null, error: issue };
  const filename = stem.normalize("NFC") + extension;
  const target = path.posix.join(dest.dir, filename);
  if (Buffer.byteLength(target) > 2048)
    return { path: null, error: "入库路径过长，请缩短文件名。" };
  const [reserved] = await db.query(sql`
    SELECT relative_path FROM video_x.media_files WHERE root_id=${rootId} AND lower(normalize(relative_path))=lower(normalize(${target}))
    UNION ALL
    SELECT target_path FROM video_x.import_move_plans WHERE target_root=${rootId} AND lower(normalize(target_path))=lower(normalize(${target})) AND NOT cleaned LIMIT 1`);
  const nameKey = filename.toLowerCase();
  const exists = (await readdir(dest.absolute)).some(
    (entry) => entry.normalize("NFC").toLowerCase() === nameKey,
  );
  if (reserved || exists)
    return {
      path: null,
      error: "原目录已存在或已预留这个文件名，请改用其他名称。",
    };
  return { path: target, error: null };
}

export class Replacements {
  private imports: Imports;
  constructor(
    private db: Database,
    private root: string,
  ) {
    this.imports = new Imports(db, root);
  }

  async inspect(mediaId: string, editionId: string, input: Inspect) {
    const old = await activeBinding(
      this.db,
      mediaId,
      editionId,
      input.expectedRevision,
    );
    await availableSource(this.db, input);
    const source = await openDownload(this.db, this.root, input);
    const facts = await inspectVideo(source, input.relativePath);
    const track = facts.tracks.find(
      (t) => t.codec_type === "video" && !t.disposition?.attached_pic,
    );
    const extension = path.posix
      .extname(input.relativePath.trimEnd())
      .toLowerCase();
    let stem = trimBytes(
      fileStem(old.title),
      255 - Buffer.byteLength(extension),
    );
    if (reservedName.test(stem))
      stem = "影片 " + trimBytes(stem, 248 - Buffer.byteLength(extension));
    const suffix = track?.height ? " - " + track.height + "p" : " - 新版";
    const withSuffix =
      trimBytes(stem, 255 - Buffer.byteLength(suffix + extension)) + suffix;
    if (
      (stem + extension).toLocaleLowerCase() ===
      path.posix
        .basename(old.relative_path)
        .normalize("NFC")
        .toLocaleLowerCase()
    )
      stem = withSuffix;
    return {
      requestId: randomUUID(),
      relativePath: input.relativePath,
      volume: source.volume,
      fileVersion: source.fileVersion,
      format: facts.format,
      width: track?.width ?? null,
      height: track?.height ?? null,
      videoCodec: track?.codec_name ?? null,
      durationMs: facts.duration,
      extension,
      suggestedStem: stem,
      targetDirectory: [old.volume, parent(old.relative_path)]
        .filter(Boolean)
        .join(" / "),
    };
  }

  async check(mediaId: string, editionId: string, input: Name) {
    const old = await activeBinding(
      this.db,
      mediaId,
      editionId,
      input.expectedRevision,
    );
    try {
      const file = await openDownload(
        this.db,
        this.root,
        input,
        input.fileVersion,
      );
      await file.file.close();
      const dest = await replacementTarget(this.db, this.root, old);
      return checkName(
        this.db,
        old.root_id,
        dest,
        input.stem,
        path.posix.extname(input.relativePath.trimEnd()).toLowerCase(),
      );
    } catch (error) {
      if (error instanceof AppError)
        return { path: null, error: error.message };
      throw error;
    }
  }

  async preview(source: Source, version: string, format: "mp4" | "matroska") {
    const opened = await openDownload(this.db, this.root, source, version);
    return {
      file: opened.file,
      size: Number(opened.size),
      mime: format === "mp4" ? "video/mp4" : "video/x-matroska",
    };
  }

  async submit(
    mediaId: string,
    editionId: string,
    profile: string,
    input: Submit,
  ) {
    // Retrying an HTTP response after the worker has moved the source must remain idempotent.
    const prior = (reader: Reader) =>
      reader.query(sql`
      SELECT id FROM video_x.import_items
      WHERE id=${input.requestId} AND draft->'editionTarget'->>'mediaId'=${mediaId}
        AND draft->'editionTarget'->'replacement'->>'editionId'=${editionId}`);
    if ((await prior(this.db)).length) return this.imports.get(input.requestId);
    const source = await openDownload(
      this.db,
      this.root,
      input,
      input.fileVersion,
    );
    const facts = await inspectVideo(source, input.relativePath);
    return this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      if ((await prior(tx)).length)
        return this.imports.row(tx, input.requestId);
      const old = await activeBinding(
        tx,
        mediaId,
        editionId,
        input.expectedRevision,
      );
      const [pending] = await tx.query(sql`
        SELECT 1 FROM video_x.import_move_runs run JOIN video_x.import_items i ON i.id=run.item_id
        WHERE run.state IN ('queued','running','cleanup')
          AND i.draft->'editionTarget'->'replacement'->>'editionId'=${editionId}`);
      if (pending) throw problem("这个版本已有替换任务，请等待任务完成。");
      await availableSource(tx, input);
      const dest = await replacementTarget(tx, this.root, old);
      const file = await openDownload(tx, this.root, input, input.fileVersion);
      await file.file.close();
      const result = await checkName(
        tx,
        old.root_id,
        dest,
        input.stem,
        path.posix.extname(input.relativePath.trimEnd()).toLowerCase(),
      );
      if (!result.path) throw problem(result.error ?? "无法确认目标文件名。");
      const [batch] = await tx.query(sql`
        INSERT INTO video_x.import_batches(library_id,root_id,created_by,mode,finished_at)
        SELECT r.library_id,r.id,p.account_id,'selected_files',now() FROM video_x.storage_roots r
        JOIN video_x.profiles p ON p.id=${profile} WHERE r.id=${input.volumeId}
        RETURNING id,created_by`);
      if (!batch) throw conflict();
      const [media] = await tx.query(sql`
        SELECT m.title,m.primary_category_id,m.release_date::text,m.release_year,m.supports_chinese,e.name edition_name
        FROM video_x.media_items m JOIN video_x.editions e ON e.media_id=m.id WHERE e.id=${editionId}`);
      const draft = {
        title: media!.title,
        categoryId: media!.primary_category_id,
        summary: null,
        notes: null,
        releaseDate: media!.release_date,
        releaseYear: media!.release_year,
        supportsChinese: media!.supports_chinese,
        actorIds: [],
        franchiseIds: [],
        editionTarget: {
          mediaId,
          name: media!.edition_name,
          replacement: { editionId, expectedRevision: input.expectedRevision },
        },
      };
      const stored = await storeProbe(
        tx,
        input.volumeId,
        input.relativePath,
        file.size,
        file.mtime,
        facts,
      );
      const [item] = await tx.query(sql`
        INSERT INTO video_x.import_items(id,batch_id,item_key,stage,execution_status,draft,reviewed_revision,reviewed_at,reviewed_by)
        VALUES(${input.requestId},${batch.id},${input.relativePath},'ready','waiting_user',${JSON.stringify(draft)}::jsonb,1,now(),${batch.created_by})
        RETURNING id,revision::int`);
      await tx.query(sql`INSERT INTO video_x.import_item_files(item_id,file_id,part_no,requires_move)
        VALUES(${item!.id},${stored.id},1,true)`);
      await tx.query(sql`INSERT INTO video_x.import_move_plans(item_id,file_id,source_root,source_path,target_root,target_path,target_key)
        VALUES(${item!.id},${stored.id},${input.volumeId},${input.relativePath},${old.root_id},${result.path},${dest.target.key})`);
      await queueMove(tx, this.root, item!.id, item!.revision, profile);
      return this.imports.row(tx, item!.id);
    });
  }
}
