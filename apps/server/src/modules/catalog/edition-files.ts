import {
  AppError,
  type Database,
  type Transaction,
  conflict,
  notFound,
  sql,
} from "../../platform/db.js";
import { openVideo, probeVideo, rootMarker } from "../imports/files.js";
import { allowedRoot } from "../imports/layout.js";

type Reader = Pick<Transaction, "query">;
type Binding = {
  id: string;
  file_id: string;
  root_id: string;
  title: string;
  volume: string;
  revision: number;
  file_revision: string;
  is_default: boolean;
  archived_at: Date | null;
  part_count: number;
  mount_path: string;
  expected_marker: string;
  relative_path: string;
  size_bytes: string;
  mtime_ns: string;
  content_revision: string;
  bound_content_revision: string;
  root_archived: Date | null;
  cut: string | null;
  language: string | null;
  notes: string | null;
};

export async function editionBinding(
  tx: Reader,
  mediaId: string,
  editionId: string,
) {
  const [row] = await tx.query<Binding>(sql`
    SELECT e.id,e.revision::int,e.is_default,e.archived_at,e.cut,e.language,e.notes,
      p.file_id,p.bound_content_revision,f.root_id,m.title,r.name AS volume,
      (SELECT count(*)::int FROM video_x.edition_parts WHERE edition_id=e.id) AS part_count,
      f.revision AS file_revision,f.content_revision,f.relative_path,f.size_bytes,f.mtime_ns,
      r.mount_path,r.expected_marker,r.archived_at AS root_archived
    FROM video_x.editions e
    JOIN video_x.media_items m ON m.id=e.media_id
    JOIN video_x.edition_parts p ON p.edition_id=e.id AND p.part_no=1
    JOIN video_x.media_files f ON f.id=p.file_id
    JOIN video_x.storage_roots r ON r.id=f.root_id
    WHERE e.id=${editionId} AND m.id=${mediaId}
      AND m.archived_at IS NULL AND m.published_at IS NOT NULL
  `);
  if (!row) throw notFound();
  if (row.part_count !== 1)
    throw new AppError(
      409,
      "MULTIPART_EDITION",
      "此版本包含多个文件，暂不支持单文件维护。",
    );
  return row;
}

export async function activeBinding(
  tx: Reader,
  mediaId: string,
  editionId: string,
  revision: number,
) {
  const row = await editionBinding(tx, mediaId, editionId);
  if (row.archived_at || row.revision !== revision) throw conflict();
  return row;
}

async function inspect(root: string, row: Binding) {
  if (row.root_archived || !allowedRoot(root, row.mount_path))
    return { status: "offline" } as const;
  if (
    (await rootMarker(row.mount_path).catch(() => null)) !== row.expected_marker
  )
    return { status: "offline" } as const;
  if (row.content_revision !== row.bound_content_revision)
    return { status: "changed" } as const;
  let current: Awaited<ReturnType<typeof openVideo>>;
  try {
    current = await openVideo(row.mount_path, row.relative_path);
  } catch (e) {
    return {
      status:
        (e as NodeJS.ErrnoException).code === "ENOENT"
          ? "missing"
          : "unreadable",
    } as const;
  }
  try {
    if (current.size !== row.size_bytes || current.mtime !== row.mtime_ns)
      return { status: "changed" } as const;
    const facts = await probeVideo(current.file, row.relative_path).catch(
      (error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
          throw new AppError(503, "NO_PROBE", "服务端缺少 FFprobe。");
        return null;
      },
    );
    const after = await current.file.stat({ bigint: true });
    if (
      after.size.toString() !== current.size ||
      after.mtimeNs.toString() !== current.mtime
    )
      return { status: "changed" } as const;
    return facts
      ? ({ status: "present", facts } as const)
      : ({ status: "probe_failed" } as const);
  } finally {
    await current.file.close();
  }
}

export async function touchEditionMedia(tx: Transaction, mediaId: string) {
  const [media] = await tx.query(
    sql`UPDATE video_x.media_items SET title=title WHERE id=${mediaId} RETURNING revision::int`,
  );
  await tx.emit({ mediaId, revision: media!.revision });
}

export class EditionFiles {
  constructor(
    private db: Database,
    private root: string,
  ) {}

  async check(mediaId: string, editionId: string, revision: number) {
    const binding = await activeBinding(this.db, mediaId, editionId, revision);
    const result = await inspect(this.root, binding);
    await this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      const current = await activeBinding(tx, mediaId, editionId, revision);
      if (current.file_revision !== binding.file_revision) throw conflict();
      if (result.status === "offline") return;
      // A file already registered as different content belongs to its own revision.
      if (current.content_revision !== current.bound_content_revision) return;
      const failed =
        result.status === "probe_failed" ||
        result.status === "unreadable" ||
        result.status === "changed";
      const missing = result.status === "missing";
      await tx.query(sql`UPDATE video_x.media_files SET
        availability=${missing ? "missing" : "present"},
        missing_since=CASE WHEN ${missing} THEN coalesce(missing_since,now()) ELSE null END,
        probe_status=${result.facts ? sql`'succeeded'` : failed ? sql`'failed'` : sql`probe_status`},
        probe_error_code=${result.facts ? sql`null` : failed ? sql`${result.status}` : sql`probe_error_code`},
        probed_at=CASE WHEN ${!missing} THEN now() ELSE probed_at END,
        probed_content_revision=${result.facts ? sql`content_revision` : sql`probed_content_revision`},
        container_format=coalesce(${result.facts?.format ?? null},container_format),
        duration_ms=coalesce(${result.facts?.duration ?? null},duration_ms)
        WHERE id=${current.file_id}`);
      for (const track of result.facts?.tracks ?? []) {
        await tx.query(sql`INSERT INTO video_x.media_streams(file_id,stream_index,kind,codec,language,width,height,channels)
          VALUES(${current.file_id},${track.index},${track.codec_type},${track.codec_name ?? null},${track.tags?.language ?? null},
            ${track.width || null},${track.height || null},${track.channels || null})
          ON CONFLICT(file_id,stream_index) DO NOTHING`);
      }
      await touchEditionMedia(tx, mediaId);
    });
    return { status: result.status };
  }

  async restore(mediaId: string, editionId: string, revision: number) {
    await activeBinding(this.db, mediaId, editionId, revision);
    const [link] = await this.db.query<{ id: string }>(sql`
      SELECT (draft->'editionTarget'->'replacement'->>'editionId') AS id
      FROM video_x.import_items WHERE published_edition_id=${editionId}
        AND draft->'editionTarget' ? 'replacement'
    `);
    if (!link) throw notFound();
    const previous = await editionBinding(this.db, mediaId, link.id);
    if (!previous.archived_at) throw conflict();
    if ((await inspect(this.root, previous)).status !== "present")
      throw new AppError(
        409,
        "PREVIOUS_FILE_UNAVAILABLE",
        "原文件未通过检测，当前版本仍保留。",
      );
    return this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      const current = await activeBinding(tx, mediaId, editionId, revision);
      const old = await editionBinding(tx, mediaId, previous.id);
      if (
        !old.archived_at ||
        old.revision !== previous.revision ||
        old.file_revision !== previous.file_revision
      )
        throw conflict();
      await tx.query(
        sql`UPDATE video_x.editions SET archived_at=now() WHERE id=${current.id}`,
      );
      await tx.query(
        sql`UPDATE video_x.editions SET archived_at=null,is_default=${current.is_default} WHERE id=${old.id}`,
      );
      await tx.query(sql`UPDATE video_x.media_files SET availability='present',missing_since=null,probe_status='succeeded',
        probed_content_revision=content_revision,probed_at=now(),probe_error_code=null WHERE id=${old.file_id}`);
      await touchEditionMedia(tx, mediaId);
      return { id: old.id };
    });
  }
}
