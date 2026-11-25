import path from "node:path";
import {
  Database,
  sql,
  conflict,
  type Transaction,
} from "../../platform/db.js";
import { Imports } from "./service.js";
import {
  layout,
  maybeStat,
  problem,
  targetFor,
  listDirectory,
} from "./layout.js";
import { filePlans, stageFile, cleanSource } from "./move-files.js";
export const inDownload = (root: string, relative: string) => {
  const cfg = layout(root);
  return !!cfg?.inbox && relative.startsWith(cfg.inbox + "/");
};
export async function queueMove(
  tx: Transaction,
  root: string,
  id: string,
  expected: number,
  profile: string,
) {
  const [prior] = await tx.query(
    sql`SELECT id,state FROM video_x.import_move_runs WHERE ${id}::uuid=ANY(members) AND state NOT IN ('done','cancelled') ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
  );
  if (prior) {
    if (prior.state === "failed" || prior.state === "cleanup") {
      await tx.query(
        sql`UPDATE video_x.import_move_runs SET state=CASE WHEN state='failed' THEN 'queued' ELSE state END,error=null WHERE id=${prior.id}`,
      );
      await tx.enqueue("media.move", { id: prior.id });
    }
    return true;
  }
  const [current] = await tx.query(
    sql`SELECT draft->'group'->>'id' grp,draft->'editionTarget' ? 'replacement' replacement,published_media_id,revision::int FROM video_x.import_items WHERE id=${id}`,
  );
  if (!current || current.published_media_id) return false;
  if (current.revision !== expected) throw conflict();
  const rows = await tx.query(
    sql`SELECT s.mount_path source_mount,b.requires_move,i.id,i.reviewed_revision,i.draft_revision,i.draft->>'releaseDate' release_date,p.target_path,r.mount_path,f.relative_path FROM video_x.import_items i LEFT JOIN video_x.import_move_plans p ON p.item_id=i.id LEFT JOIN video_x.import_item_files b ON b.item_id=i.id LEFT JOIN video_x.media_files f ON f.id=b.file_id LEFT JOIN video_x.storage_roots s ON s.id=f.root_id LEFT JOIN video_x.storage_roots r ON r.id=p.target_root WHERE ${current.grp ? sql`i.draft->'group'->>'id'=${current.grp}` : sql`i.id=${id}`} ORDER BY i.id FOR UPDATE OF i`,
  );
  for (const row of rows) {
    if (
      !row.target_path &&
      (row.requires_move ||
        (row.source_mount === root &&
          inDownload(root, row.relative_path ?? "")))
    )
      throw problem("请先设置下载文件的整理目标。");
  }
  if (!rows.some((row) => row.target_path)) return false;
  for (const row of rows) {
    if (!row.reviewed_revision || row.reviewed_revision !== row.draft_revision)
      throw problem("请先人工核对全部待发布草稿。");
    if (!current.replacement && !row.release_date)
      throw problem("请先补齐全部草稿的发行日期。");
    if (
      row.target_path &&
      (await maybeStat(path.join(row.mount_path, row.target_path)))
    )
      throw problem("目标已有同名文件：" + path.basename(row.target_path));
  }
  const ids = rows.map((r) => r.id);
  const [run] = await tx.query(
    sql`INSERT INTO video_x.import_move_runs(item_id,profile_id,members,state) VALUES(${id},${profile},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::uuid),'queued') RETURNING id`,
  );
  await tx.query(
    sql`UPDATE video_x.import_move_plans SET run_id=${run!.id} WHERE item_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::uuid)`,
  );
  await tx.enqueue("media.move", { id: run!.id });
  return true;
}
async function checkCapacity(db: Database, root: string, run: string) {
  const files = await filePlans(db, run),
    dirs = new Set<string>();
  for (const p of files) {
    const t = targetFor(root, p.target_key);
    const folder =
      path.dirname(p.target_path) === "." ? "" : path.dirname(p.target_path);
    const key = p.target_mount + "/" + folder;
    if (dirs.has(key) || !t.limit) continue;
    dirs.add(key);
    const disk = (await maybeStat(key))
      ? (await listDirectory(p.target_mount, folder))
          .filter((e) => !e.folder)
          .map((e) => e.name)
      : [];
    const reserved = await db.query(
      sql`SELECT target_path FROM video_x.import_move_plans p JOIN video_x.storage_roots r ON r.id=p.target_root WHERE r.mount_path=${p.target_mount} AND NOT p.cleaned AND regexp_replace(target_path,'[^/]+$','')=${folder ? folder + "/" : ""}`,
    );
    if (
      new Set([...disk, ...reserved.map((x) => path.basename(x.target_path))])
        .size > t.limit
    )
      throw problem("目标目录视频数量超过 " + t.limit + " 个。");
  }
}
export async function runMove(
  db: Database,
  root: string,
  id: string,
  step?: (bytes: number) => Promise<void>,
) {
  const lock = await db.pool.connect();
  try {
    await lock.query("SELECT pg_advisory_lock(hashtextextended($1,17))", [id]);
    const [run] = await db.query(
      sql`SELECT run.*,i.draft->'editionTarget'->'replacement'->>'editionId' AS replacement_id
      FROM video_x.import_move_runs run JOIN video_x.import_items i ON i.id=run.item_id WHERE run.id=${id}`,
    );
    if (!run || !["queued", "running", "cleanup"].includes(run.state)) return;
    try {
      if (run.state !== "cleanup") {
        await db.query(
          sql`UPDATE video_x.import_move_runs SET state='running',error=null WHERE id=${id}`,
        );
        if (!run.replacement_id) await checkCapacity(db, root, id);
        else {
          const [valid] = await db.query(sql`
            SELECT 1 FROM video_x.editions old
            JOIN video_x.edition_parts part ON part.edition_id=old.id AND part.part_no=1
            JOIN video_x.media_files file ON file.id=part.file_id
            JOIN video_x.import_move_plans plan ON plan.item_id=${run.item_id}
            WHERE old.id=${run.replacement_id} AND old.archived_at IS NULL
              AND file.root_id=plan.target_root
              AND regexp_replace(file.relative_path,'[^/]+$','')=regexp_replace(plan.target_path,'[^/]+$','')`);
          if (!valid) throw problem("原版本的文件位置已变更，请重新选择。");
        }
        for (const p of await filePlans(db, id))
          await stageFile(db, root, p, step);
        await db.transaction(async (tx) => {
          await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
          await tx.query(
            sql`UPDATE video_x.media_files f SET root_id=p.target_root,relative_path=p.target_path,mtime_ns=(p.verified->>'mtime')::bigint,last_seen_at=now() FROM video_x.import_move_plans p WHERE p.file_id=f.id AND p.run_id=${id} AND p.verified IS NOT NULL`,
          );
          const [draft] = await tx.query(
            sql`SELECT revision::int FROM video_x.import_items WHERE id=${run.item_id}`,
          );
          await new Imports(db, root).decideTx(
            tx,
            run.item_id,
            draft!.revision,
            run.profile_id,
            true,
          );
          await tx.query(
            sql`UPDATE video_x.import_move_runs SET state='cleanup',error=null WHERE id=${id}`,
          );
        });
      }
      for (const p of await filePlans(db, id)) await cleanSource(db, root, p);
      await db.query(
        sql`UPDATE video_x.import_move_runs SET state='done',error=null WHERE id=${id}`,
      );
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      const msg =
        code === "EEXIST"
          ? "目标已有同名文件。"
          : code === "ENOSPC"
            ? "目标盘空间不足。"
            : e instanceof Error
              ? e.message
              : "整理失败，请检查文件后重试。";
      await db.query(
        sql`UPDATE video_x.import_move_runs SET state=CASE WHEN state='cleanup' THEN state ELSE 'failed' END,error=${msg.slice(0, 350)} WHERE id=${id}`,
      );
    }
  } finally {
    try {
      await lock.query("SELECT pg_advisory_unlock(hashtextextended($1,17))", [
        id,
      ]);
    } finally {
      lock.release();
    }
  }
}
export async function recoverMoves(db: Database) {
  const runs = await db.query(
    sql`SELECT id FROM video_x.import_move_runs WHERE state IN ('queued','running','cleanup')`,
  );
  for (const r of runs) await db.boss.send("media.move", { id: r.id });
}
