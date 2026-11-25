import path from "node:path";
import { Database, AppError, sql } from "../../platform/db.js";
import { rootMarker, openVideo, probeVideo, videoPaths } from "./files.js";

import { activeInbox, layout, problem } from "./layout.js";
const library = "10000000-0000-4000-8000-000000000001";
export async function startScan(db: Database, root: string, profile: string) {
  if (layout(root)?.pickerOnly) throw problem("请在下载目录选择要导入的文件。");
  const marker = await rootMarker(root);
  return db.transaction(async (tx) => {
    await tx.query(
      sql`INSERT INTO video_x.storage_roots(library_id,name,mount_path,expected_marker) VALUES(${library},'本地媒体目录',${root},${marker}) ON CONFLICT(library_id,mount_path) DO NOTHING`,
    );
    const [r] = await tx.query(
      sql`SELECT id,expected_marker FROM video_x.storage_roots WHERE library_id=${library} AND mount_path=${root} FOR UPDATE`,
    );
    if (r!.expected_marker !== marker)
      throw new AppError(409, "WRONG_ROOT", "媒体盘标识已改变，请挂回原盘。");
    const [active] = await tx.query(
      sql`SELECT id FROM video_x.import_batches WHERE root_id=${r!.id} AND finished_at IS NULL AND mode='scan'`,
    );
    if (active) return { id: active.id as string };
    const [b] = await tx.query(
      sql`INSERT INTO video_x.import_batches(library_id,root_id,created_by,mode) SELECT ${library},${r!.id},account_id,'scan' FROM video_x.profiles WHERE id=${profile} RETURNING id`,
    );
    await tx.enqueue("media.scan", { batchId: b!.id });
    return { id: b!.id as string };
  });
}
export async function manualFile(
  db: Database,
  root: string,
  profile: string,
  relative: string,
  target?: { id: string; revision: number },
  expectedInbox?: string,
  inboxVolumeId?: string,
) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.split("/").some((p) => p === ".." || p === "." || !p) ||
    relative.includes("\\")
  )
    throw new AppError(400, "INVALID_PATH", "请填写媒体目录内的相对文件路径。");
  const inbox = await activeInbox(db, root);
  if (
    (expectedInbox !== undefined || layout(root)?.pickerOnly) &&
    (!inbox ||
      (expectedInbox !== undefined && inbox.dir !== expectedInbox) ||
      (inboxVolumeId !== undefined && inbox.id !== inboxVolumeId) ||
      !relative.startsWith(inbox.dir + "/"))
  )
    throw problem("下载目录已改变或文件位于目录之外，请重新选择。");
  const requiresMove = !!inbox && relative.startsWith(inbox.dir + "/");
  const mount = requiresMove ? inbox.mount : root;
  const marker = await rootMarker(mount);
  try {
    const { file } = await openVideo(mount, relative);
    await file.close();
  } catch {
    throw new AppError(
      400,
      "INVALID_FILE",
      "找不到此 MP4 / MKV 文件，请核对相对路径。",
    );
  }
  const batch = await db.transaction(async (tx) => {
    await tx.query(
      sql`INSERT INTO video_x.storage_roots(library_id,name,mount_path,expected_marker) VALUES(${library},'本地媒体目录',${mount},${marker}) ON CONFLICT(library_id,mount_path) DO NOTHING`,
    );
    const [r] = await tx.query(
      sql`SELECT id,expected_marker FROM video_x.storage_roots WHERE library_id=${library} AND mount_path=${mount}`,
    );
    if (r?.expected_marker !== marker)
      throw new AppError(409, "WRONG_ROOT", "媒体盘标识已改变。");
    const [b] = await tx.query(
      sql`INSERT INTO video_x.import_batches(library_id,root_id,created_by,mode,finished_at) SELECT ${library},${r.id},account_id,'selected_files',now() FROM video_x.profiles WHERE id=${profile} RETURNING id`,
    );
    return { id: b!.id, root: r.id };
  });
  await catalogFile(
    db,
    mount,
    batch.root,
    batch.id,
    relative,
    target,
    requiresMove,
  );
  if (target) return { id: target.id };
  const [i] = await db.query(
    sql`SELECT i.id,i.stage FROM video_x.media_files f JOIN video_x.import_item_files l ON l.file_id=f.id JOIN video_x.import_items i ON i.id=l.item_id WHERE f.root_id=${batch.root} AND f.relative_path=${relative} ORDER BY i.created_at DESC LIMIT 1`,
  );
  if (!i || i.stage === "published")
    throw new AppError(
      409,
      "ALREADY_IN_LIBRARY",
      "这个文件已经入库，请到影片资料库编辑。",
    );
  return { id: i.id as string };
}
export async function storeProbe(
  tx: Pick<Database, "query">,
  rootId: string,
  relative: string,
  size: string,
  mtime: string,
  facts?: Awaited<ReturnType<typeof probeVideo>>,
) {
  const state = facts ? "succeeded" : "failed";
  const [f] =
    await tx.query(sql`INSERT INTO video_x.media_files AS f(root_id,relative_path,file_kind,size_bytes,mtime_ns,probe_status,probed_content_revision,probed_at,probe_error_code,container_format,duration_ms)
  VALUES(${rootId},${relative},'video',${size},${mtime},${state},1,now(),${facts ? null : "INVALID_MEDIA"},${facts?.format ?? null},${facts?.duration ?? null})
  ON CONFLICT(root_id,relative_path) DO UPDATE SET
  content_revision=f.content_revision+((f.size_bytes,f.mtime_ns) IS DISTINCT FROM (excluded.size_bytes,excluded.mtime_ns))::int,
  probed_content_revision=f.content_revision+((f.size_bytes,f.mtime_ns) IS DISTINCT FROM (excluded.size_bytes,excluded.mtime_ns))::int,
  size_bytes=excluded.size_bytes,mtime_ns=excluded.mtime_ns,availability='present',missing_since=null,last_seen_at=now(),probe_status=excluded.probe_status,probed_at=now(),probe_error_code=excluded.probe_error_code,container_format=excluded.container_format,duration_ms=excluded.duration_ms RETURNING id`);
  await tx.query(sql`DELETE FROM video_x.media_streams WHERE file_id=${f!.id}`);
  for (const t of facts?.tracks ?? [])
    await tx.query(
      sql`INSERT INTO video_x.media_streams(file_id,stream_index,kind,codec,language,width,height,channels) VALUES(${f!.id},${t.index},${t.codec_type},${t.codec_name ?? null},${t.tags?.language ?? null},${t.width || null},${t.height || null},${t.channels || null})`,
    );
  return f!;
}

async function catalogFile(
  db: Database,
  root: string,
  rootId: string,
  batchId: string,
  relative: string,
  target?: { id: string; revision: number },
  requiresMove = false,
) {
  const { file, size, mtime } = await openVideo(root, relative);
  try {
    const reserved = async (reader: Pick<Database, "query">) =>
      (
        await reader.query(
          sql`SELECT item_id FROM video_x.import_move_plans WHERE run_id IS NOT NULL AND NOT cleaned AND ((target_root=${rootId} AND target_path=${relative}) OR (source_root=${rootId} AND source_path=${relative})) LIMIT 1`,
        )
      ).length > 0;
    if (await reserved(db)) {
      if (target) throw new AppError(409, "FILE_MOVING", "文件正在整理。");
      return;
    }
    const [existing] = await db.query(
      sql`SELECT id,size_bytes,mtime_ns,availability,probe_status FROM video_x.media_files WHERE root_id=${rootId} AND relative_path=${relative}`,
    );
    if (
      !target &&
      existing?.size_bytes === size &&
      existing.mtime_ns === mtime &&
      existing.availability === "present" &&
      existing.probe_status === "succeeded"
    ) {
      if (requiresMove)
        await db.query(
          sql`UPDATE video_x.import_item_files SET requires_move=true WHERE file_id=${existing.id} AND NOT requires_move`,
        );
      await db.query(
        sql`UPDATE video_x.media_files SET last_seen_at=now() WHERE id=${existing.id}`,
      );
      return;
    }
    let facts: Awaited<ReturnType<typeof probeVideo>> | undefined;
    try {
      facts = await probeVideo(file, relative);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT")
        throw new AppError(503, "NO_PROBE", "服务端缺少 FFprobe。");
    }
    const after = await file.stat({ bigint: true });
    if (after.size.toString() !== size || after.mtimeNs.toString() !== mtime)
      throw new AppError(409, "FILE_CHANGED", "文件正在变化，请稍后重试。");
    await db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      if (await reserved(tx)) {
        if (target) throw new AppError(409, "FILE_MOVING", "文件正在整理。");
        return;
      }
      const f = await storeProbe(tx, rootId, relative, size, mtime, facts);
      const [item] = await tx.query(
        sql`SELECT i.id,i.stage,i.reviewed_revision,i.draft_revision,iab.mode FROM video_x.import_items i JOIN video_x.import_batches iab ON iab.id=i.batch_id JOIN video_x.import_item_files b ON b.item_id=i.id WHERE b.file_id=${f!.id} FOR UPDATE OF i`,
      );
      if (target) {
        const [draft] = await tx.query(
          sql`SELECT revision::int,stage FROM video_x.import_items WHERE id=${target.id} AND merged_into_id IS NULL FOR UPDATE`,
        );
        if (
          !draft ||
          draft.stage === "published" ||
          draft.revision !== target.revision
        )
          throw new AppError(
            409,
            "REVISION_CONFLICT",
            "草稿已改变，请刷新后重试。",
          );
        if (
          (
            await tx.query(
              sql`SELECT file_id FROM video_x.import_item_files WHERE item_id=${target.id}`,
            )
          ).length
        )
          throw new AppError(409, "ALREADY_BOUND", "这条草稿已经绑定文件。");
        if (item) {
          if (
            item.mode !== "scan" ||
            item.stage === "published" ||
            Number(item.draft_revision) !== 1 ||
            item.reviewed_revision ||
            (
              await tx.query(
                sql`SELECT id FROM video_x.import_lookups WHERE item_id=${item.id} LIMIT 1`,
              )
            ).length
          )
            throw new AppError(
              409,
              "FILE_IN_USE",
              "文件已属于其他草稿或已发布作品。",
            );
          await tx.query(
            sql`UPDATE video_x.import_items SET merged_into_id=${target.id},execution_status='cancelled' WHERE id=${item.id}`,
          );
          await tx.query(
            sql`DELETE FROM video_x.import_item_files WHERE item_id=${item.id} AND file_id=${f!.id}`,
          );
        }
        await tx.query(
          sql`INSERT INTO video_x.import_item_files(item_id,file_id,part_no,requires_move) VALUES(${target.id},${f!.id},1,${requiresMove})`,
        );
        await tx.query(
          sql`UPDATE video_x.import_items SET stage=${facts ? "probed" : "discovered"},execution_status=${facts ? "waiting_user" : "failed"},error_code=${facts ? null : "INVALID_MEDIA"},draft_revision=draft_revision+1,reviewed_revision=null,reviewed_by=null,reviewed_at=null WHERE id=${target.id}`,
        );
        return;
      }
      if (item) {
        if (requiresMove && item.stage !== "published")
          await tx.query(
            sql`UPDATE video_x.import_item_files SET requires_move=true WHERE file_id=${f!.id}`,
          );
        if (item.stage !== "published")
          await tx.query(
            sql`UPDATE video_x.import_items SET stage=${facts ? "probed" : "discovered"},execution_status=${facts ? "waiting_user" : "failed"},error_code=${facts ? null : "INVALID_MEDIA"},draft_revision=draft_revision+1,reviewed_by=null,reviewed_at=null,reviewed_revision=null WHERE id=${item.id}`,
          );
        return;
      }
      const draft = {
        title: path.parse(relative).name,
        summary: null,
        notes: null,
        releaseYear: null,
        categoryId: "20000000-0000-4000-8000-000000000001",
        supportsChinese: null,
        actorIds: [],
        franchiseIds: [],
      };
      const [i] = await tx.query(
        sql`INSERT INTO video_x.import_items(batch_id,item_key,stage,execution_status,draft,error_code) VALUES(${batchId},${relative},${facts ? "probed" : "discovered"},${facts ? "waiting_user" : "failed"},${JSON.stringify(draft)}::jsonb,${facts ? null : "INVALID_MEDIA"}) RETURNING id`,
      );
      await tx.query(
        sql`INSERT INTO video_x.import_item_files(item_id,file_id,part_no,requires_move) VALUES(${i!.id},${f!.id},1,${requiresMove})`,
      );
    });
  } finally {
    await file.close();
  }
}
export async function runScan(
  db: Database,
  batchId: string,
  configuredRoot: string,
) {
  const lock = await db.pool.connect();
  try {
    // A retried job may start before its predecessor exits. Only one traversal owns the batch.
    await lock.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [
      batchId,
    ]);
    const [batch] = await db.query(
      sql`SELECT b.root_id,r.mount_path,r.expected_marker,b.created_at::text AS started FROM video_x.import_batches b JOIN video_x.storage_roots r ON r.id=b.root_id WHERE b.id=${batchId} AND b.finished_at IS NULL`,
    );
    if (!batch) return;
    let status = "unknown";
    try {
      const verify = async () => {
        status = "offline";
        if (
          batch.mount_path !== configuredRoot ||
          (await rootMarker(configuredRoot)) !== batch.expected_marker
        ) {
          status = "identity_mismatch";
          throw Error("WRONG_ROOT");
        }
        status = "unknown";
      };
      await verify();
      let partial = false;
      for await (const relative of videoPaths(configuredRoot)) {
        try {
          await catalogFile(
            db,
            configuredRoot,
            batch.root_id,
            batchId,
            relative,
          );
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code ?? "";
          if (
            !["ENOENT", "EACCES", "EPERM", "ESTALE", "FILE_CHANGED"].includes(
              code,
            )
          )
            throw error;
          partial = true;
        }
      }
      await verify();
      if (partial)
        throw new AppError(
          409,
          "PARTIAL_SCAN",
          "部分文件无法稳定读取，请重扫。",
        );
      await db.transaction(async (tx) => {
        // Only a complete traversal of the same mounted root can mark individual files missing.
        await tx.query(sql`WITH absent AS (UPDATE video_x.media_files SET availability='missing',missing_since=now() WHERE root_id=${batch.root_id} AND availability='present' AND last_seen_at<${batch.started} AND NOT EXISTS(SELECT 1 FROM video_x.import_move_plans mp WHERE mp.file_id=media_files.id AND mp.run_id IS NOT NULL AND NOT mp.cleaned) RETURNING id)
          UPDATE video_x.import_items i SET stage='discovered',execution_status='failed',error_code='FILE_MISSING',draft_revision=draft_revision+1,reviewed_revision=null,reviewed_at=null,reviewed_by=null FROM video_x.import_item_files b JOIN absent ON absent.id=b.file_id WHERE i.id=b.item_id AND i.stage<>'published'`);
        await tx.query(
          sql`UPDATE video_x.storage_roots SET status='online',last_checked_at=now(),last_complete_scan_at=now() WHERE id=${batch.root_id}`,
        );
        await tx.query(
          sql`UPDATE video_x.import_batches SET finished_at=now() WHERE id=${batchId}`,
        );
      });
    } catch (error) {
      await db.transaction(async (tx) => {
        await tx.query(
          sql`UPDATE video_x.storage_roots SET status=${status},last_checked_at=now() WHERE id=${batch.root_id}`,
        );
        await tx.query(
          sql`UPDATE video_x.import_batches SET finished_at=now() WHERE id=${batchId}`,
        );
      });
      throw error;
    }
  } finally {
    try {
      await lock.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [
        batchId,
      ]);
    } finally {
      lock.release();
    }
  }
}
