import path from "node:path";
import { lstat, realpath, readdir, statfs } from "node:fs/promises";
import {
  AppError,
  sql,
  type Database,
  type Transaction,
} from "../../platform/db.js";
import { mediaExtension, rootMarker } from "./files.js";
export const problem = (s: string) => new AppError(409, "STORAGE_CONFLICT", s);
export interface Target {
  key: string;
  label: string;
  root: string;
  dir: string;
  limit: number;
}
export function relative(value: string, allowEmpty = false) {
  if (value === "" && allowEmpty) return value;
  if (
    !value ||
    Buffer.byteLength(value) > 2048 ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value) ||
    value.split("/").some((s) => !s || s.startsWith("."))
  )
    throw problem("目录或文件路径无效。");
  return value;
}
export function layout(root: string): {
  inbox: string | null;
  targets: Target[];
  readRoots: string[];
  pickerOnly: boolean;
} | null {
  const raw = process.env.VIDEO_X_STORAGE_LAYOUT;
  if (!raw) return null;
  const cfg = JSON.parse(raw);
  const targets: Target[] = cfg.targets.map((t: Target) => ({
    ...t,
    root: t.root ?? root,
    dir: relative(t.dir, true),
    limit: t.limit ?? 50,
  }));
  if (
    !targets.length ||
    new Set(targets.map((t) => t.key)).size !== targets.length ||
    targets.some(
      (t) =>
        !t.label ||
        !t.key ||
        !path.isAbsolute(t.root) ||
        !Number.isSafeInteger(t.limit) ||
        t.limit < 0,
    )
  )
    throw problem("整理目录配置无效。");
  return {
    inbox: cfg.inbox ? relative(cfg.inbox) : null,
    targets,
    readRoots: (cfg.readRoots ?? []).filter(
      (s: unknown) => typeof s === "string" && path.isAbsolute(s),
    ),
    pickerOnly: cfg.pickerOnly === true,
  };
}
export function allowedRoot(primary: string, candidate: string) {
  return (
    candidate === primary ||
    !!layout(primary)?.readRoots.includes(candidate) ||
    !!layout(primary)?.targets.some((t) => t.root === candidate)
  );
}
export function targetFor(root: string, key: string) {
  const t = layout(root)?.targets.find((t) => t.key === key);
  if (!t) throw problem("请选择已配置的目标位置。");
  return t;
}
export function checkTarget(root: string, t: Target, sub: string) {
  const dest = path.join(t.dir, relative(sub, true));
  const inbox = layout(root)!.inbox;
  if (
    inbox &&
    t.root === root &&
    (dest === inbox || dest.startsWith(inbox + "/"))
  )
    throw problem("下载箱不能作为整理目标。");
  return dest === "." ? "" : dest;
}
export async function directory(root: string, sub: string) {
  relative(sub, true);
  const base = await realpath(root),
    abs = path.join(base, sub);
  if ((await realpath(abs)) !== abs || !(await lstat(abs)).isDirectory())
    throw problem("目录不可用或为符号链接。");
  return abs;
}
export async function listDirectory(root: string, sub: string) {
  const dir = await directory(root, sub);
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        !e.name.startsWith(".") &&
        !e.name.includes("\\") &&
        (e.isDirectory() || (e.isFile() && mediaExtension.test(e.name))),
    )
    .map((e) => ({ name: e.name, folder: e.isDirectory() }))
    .sort(
      (a, b) =>
        Number(b.folder) - Number(a.folder) ||
        a.name.localeCompare(b.name, "zh", { numeric: true }),
    );
}
type Reader = Pick<Transaction, "query">;
type DownloadRoot = {
  id: string;
  name: string;
  status: string;
  mount_path: string;
  download_directory: string | null;
  expected_marker: string;
};

async function downloadRoots(db: Reader, root: string, cfg = layout(root)) {
  const paths = cfg?.readRoots.length ? cfg.readRoots : [root];
  const rows = await db.query<DownloadRoot>(sql`
    SELECT id,name,status,mount_path,download_directory,expected_marker
    FROM video_x.storage_roots
    WHERE archived_at IS NULL
      AND mount_path IN (SELECT jsonb_array_elements_text(${JSON.stringify(paths)}::jsonb))
    ORDER BY name,id`);
  return rows;
}

export async function activeInbox(db: Reader, root: string) {
  const cfg = layout(root);
  if (!cfg) return null;
  const volumes = await downloadRoots(db, root, cfg);
  const saved = volumes.find((v) => v.download_directory);
  if (saved)
    return {
      mount: saved.mount_path,
      dir: saved.download_directory!,
      volume: saved.name,
      id: saved.id,
    };
  if (cfg.readRoots.length || !cfg.inbox) return null;
  return {
    mount: root,
    dir: cfg.inbox,
    volume: path.basename(root),
    id: volumes[0]?.id,
  };
}

export async function selectInbox(
  db: Database,
  root: string,
  input: {
    dir: string;
    expected: string | null;
    volumeId?: string;
    expectedVolumeId?: string | null;
  },
) {
  const cfg = layout(root);
  if (!cfg) throw problem("尚未登记可选择的存储卷。");
  const { dir, expected, expectedVolumeId, volumeId } = input;
  relative(dir);
  await db.transaction(async (tx) => {
    await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
    const volumes = await downloadRoots(tx, root, cfg);
    const chosen = volumes.find((v) => v.id === volumeId);
    if ((!chosen && cfg.readRoots.length) || (volumeId && !chosen))
      throw problem("请从已登记的媒体盘中选择下载目录。");
    const mount = chosen?.mount_path ?? root;
    const marker = await rootMarker(mount);
    if (chosen && chosen.expected_marker !== marker)
      throw problem("已挂载磁盘与登记卷标识不符。");
    await directory(mount, dir).catch(() => {
      throw problem("此目录无法读取，请选择已挂载的目录。");
    });
    if (
      cfg.targets.some(
        (t) =>
          t.root === mount &&
          (!t.dir ||
            t.dir === dir ||
            dir.startsWith(t.dir + "/") ||
            t.dir.startsWith(dir + "/")),
      )
    )
      throw problem("下载目录和整理分类必须分别选择。");
    const previous = await activeInbox(tx, root);
    const id =
      chosen?.id ??
      (await registerTarget(
        tx,
        { root, dir: "", key: "source", label: path.basename(root), limit: 0 },
        marker,
      ));
    if (previous?.id === id && previous.dir === dir) return;
    if (
      (previous?.dir ?? null) !== expected ||
      (cfg.readRoots.length &&
        (previous?.id ?? null) !== (expectedVolumeId ?? null))
    )
      throw problem("下载目录已修改，请重新打开选择器。");
    if (previous?.id) {
      await tx.query(sql`UPDATE video_x.import_item_files b SET requires_move=true
        FROM video_x.media_files f,video_x.import_items i
        WHERE i.id=b.item_id AND i.published_media_id IS NULL AND f.id=b.file_id
          AND f.root_id=${previous.id} AND starts_with(f.relative_path,${previous.dir + "/"})`);
    }
    await tx.query(sql`UPDATE video_x.storage_roots
      SET download_directory=CASE WHEN id=${id} THEN ${dir} ELSE null END
      WHERE id=${id} OR (download_directory IS NOT NULL AND
        id IN (SELECT jsonb_array_elements_text(${JSON.stringify(volumes.map((v) => v.id))}::jsonb)::uuid))`);
  });
  return browse(db, root, {});
}

export async function browse(
  db: Database,
  root: string,
  q: {
    area?: string;
    target?: string;
    volumeId?: string;
    dir?: string;
    summaryOnly?: boolean;
  },
) {
  const cfg = layout(root);
  const active = await activeInbox(db, root);
  const inbox = active?.dir ?? null;
  const targets = cfg?.targets.map(({ key, label }) => ({ key, label })) ?? [];
  if (!cfg || !q.area) {
    const volumes = cfg ? await downloadRoots(db, root, cfg) : [];
    return {
      inbox,
      volume:
        active?.volume ??
        (cfg && !cfg.readRoots.length ? path.basename(root) : undefined),
      inboxVolumeId: active?.id ?? null,
      inboxVolumes: volumes.map(({ id, name, status }) => ({
        id,
        name,
        status,
      })),
      targets,
      entries: [],
      used: 0,
      limit: 0,
    };
  }
  const t = q.area === "target" ? targetFor(root, q.target ?? "") : null;
  const sub = relative(q.dir ?? "", true);
  const selected =
    q.area === "volume" && q.volumeId
      ? (await downloadRoots(db, root, cfg)).find((v) => v.id === q.volumeId)
      : undefined;
  if (q.area === "volume" && !selected && (q.volumeId || cfg.readRoots.length))
    throw problem("请先选择一块已登记的媒体盘。");
  if (
    q.area === "inbox" &&
    (!active || (q.volumeId && q.volumeId !== active.id))
  )
    throw problem("下载目录未设置或已改变，请重新选择。");
  const mount =
    t?.root ??
    selected?.mount_path ??
    (q.area === "inbox" ? active!.mount : root);
  const marker = await rootMarker(mount);
  const [registered] = await db.query(
    sql`SELECT expected_marker FROM video_x.storage_roots WHERE mount_path=${mount} AND archived_at IS NULL`,
  );
  if (registered && registered.expected_marker !== marker)
    throw problem("已挂载磁盘与登记卷标识不符。");
  if (q.area === "volume")
    return {
      volume: selected?.name ?? path.basename(mount),
      inbox,
      targets,
      entries: (await listDirectory(mount, sub)).filter((e) => e.folder),
      used: 0,
      limit: 0,
    };
  const folder = t ? checkTarget(root, t, sub) : path.join(inbox!, sub);
  const all = await listDirectory(mount, folder);
  if (t && q.summaryOnly) {
    const directories = all
      .filter((e) => e.folder)
      .map((e) => path.join(folder, e.name));
    const used = all.filter((e) => !e.folder).length;
    let totalVideoCount = used;
    while (directories.length) {
      const parent = directories.pop()!;
      for (const entry of await listDirectory(mount, parent)) {
        if (entry.folder) directories.push(path.join(parent, entry.name));
        else totalVideoCount++;
      }
    }
    return {
      volume: path.basename(mount),
      inbox,
      targets,
      entries: [],
      used,
      totalVideoCount,
      limit: t.limit,
    };
  }
  const folders = all.filter((entry) => entry.folder);
  const countedFolders = [];
  if (t) {
    for (const entry of folders) {
      try {
        const children = await listDirectory(
          mount,
          path.join(folder, entry.name),
        );
        countedFolders.push({
          ...entry,
          videoCount: children.filter((child) => !child.folder).length,
        });
      } catch {
        // One unavailable child must not hide its readable siblings.
        countedFolders.push(entry);
      }
    }
  }
  const prefix = folder ? folder + "/" : "";
  const capacity = await statfs(path.join(mount, folder), { bigint: true });
  const drafts = t
    ? []
    : await db.query(
        sql`SELECT f.relative_path,i.id FROM video_x.media_files f JOIN video_x.storage_roots s ON s.id=f.root_id JOIN video_x.import_item_files b ON b.file_id=f.id JOIN video_x.import_items i ON i.id=b.item_id WHERE s.mount_path=${mount} AND regexp_replace(f.relative_path,'[^/]+$','')=${prefix} AND i.published_media_id IS NULL AND i.merged_into_id IS NULL`,
      );
  const byName = new Map(
    drafts.map((d) => [path.basename(d.relative_path), String(d.id)]),
  );
  const reservations = t
    ? await db.query(
        sql`SELECT p.target_path FROM video_x.import_move_plans p JOIN video_x.storage_roots s ON s.id=p.target_root WHERE s.mount_path=${mount} AND NOT p.cleaned AND regexp_replace(p.target_path,'[^/]+$','')=${prefix}`,
      )
    : [];
  const onDisk = new Set(all.filter((e) => !e.folder).map((e) => e.name));
  return {
    volume: path.basename(mount),
    inbox,
    targets,
    entries: t
      ? countedFolders
      : all.map((e) => ({ ...e, draftId: byName.get(e.name) })),
    pending: reservations.filter(
      (d) => !onDisk.has(path.basename(d.target_path)),
    ).length,
    availableBytes: String(capacity.bavail * capacity.bsize),
    used: all.filter((e) => !e.folder).length,
    limit: t?.limit ?? 0,
  };
}
export async function registerTarget(
  tx: Transaction,
  target: Target,
  expectedMarker?: string,
) {
  const marker = expectedMarker ?? (await rootMarker(target.root));
  const [r] = await tx.query(
    sql`INSERT INTO video_x.storage_roots(library_id,name,mount_path,expected_marker) VALUES('10000000-0000-4000-8000-000000000001',${target.label},${target.root},${marker}) ON CONFLICT(library_id,mount_path) DO UPDATE SET last_checked_at=now() WHERE storage_roots.expected_marker=excluded.expected_marker AND storage_roots.archived_at IS NULL RETURNING id`,
  );
  if (!r) throw problem("目标卷的标识已改变。");
  return r.id as string;
}
export async function maybeStat(file: string) {
  try {
    return await lstat(file, { bigint: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export async function setTargets(
  db: Database,
  root: string,
  input: {
    members: { id: string; revision: number }[];
    target: string;
    dir: string;
    newFolder?: string;
  },
) {
  const t = targetFor(root, input.target);
  let dir = checkTarget(root, t, input.dir);
  await directory(t.root, dir);
  if (input.newFolder) {
    if (input.newFolder.includes("/")) throw problem("请输入一个子目录名称。");
    dir = checkTarget(root, t, path.join(input.dir, relative(input.newFolder)));
  }
  const folder = path.join(await realpath(t.root), dir),
    present = await maybeStat(folder);
  const diskCount = present
    ? (await listDirectory(t.root, dir)).filter((e) => !e.folder).length
    : 0;
  return db.transaction(async (tx) => {
    await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
    const current = await activeInbox(tx, root);
    if (
      current &&
      t.root === current.mount &&
      (dir === current.dir || dir.startsWith(current.dir + "/"))
    )
      throw problem("下载目录不能作为整理目标。");
    const targetId = await registerTarget(tx, t);
    const ids = input.members.map((m) => m.id);
    if (new Set(ids).size !== ids.length) throw problem("请勿重复选择草稿。");
    for (const m of input.members) {
      const [r] = await tx.query(
        sql`SELECT i.stage,i.revision::int,b.file_id,f.relative_path,f.root_id,s.mount_path FROM video_x.import_items i JOIN video_x.import_item_files b ON i.id=b.item_id JOIN video_x.media_files f ON f.id=b.file_id JOIN video_x.storage_roots s ON s.id=f.root_id WHERE i.id=${m.id} FOR UPDATE OF i`,
      );
      if (
        !r ||
        r.stage === "published" ||
        r.revision !== m.revision ||
        !allowedRoot(root, r.mount_path)
      )
        throw problem("草稿已改变、未绑定文件或已发布。");
      const [previous] = await tx.query(
        sql`SELECT mr.id,mr.state FROM video_x.import_move_plans mp JOIN video_x.import_move_runs mr ON mr.id=mp.run_id WHERE mp.item_id=${m.id} FOR UPDATE OF mr`,
      );
      if (previous) {
        const [artifacts] = await tx.query(
          sql`SELECT 1 FROM video_x.import_move_plans WHERE run_id=${previous.id} AND (scratch IS NOT NULL OR verified IS NOT NULL) LIMIT 1`,
        );
        if (previous.state !== "failed" || artifacts)
          throw problem("当前文件已有整理任务，请从队列重试。");
        await tx.query(
          sql`UPDATE video_x.import_move_runs SET state='cancelled' WHERE id=${previous.id}`,
        );
        await tx.query(
          sql`UPDATE video_x.import_move_plans SET run_id=null WHERE run_id=${previous.id}`,
        );
      }
      const dest = path.join(dir, path.basename(r.relative_path));
      if (r.root_id === targetId && dest === r.relative_path)
        throw problem("源文件已经在目标位置。");
      const [reservedPath] = await tx.query(
        sql`SELECT item_id FROM video_x.import_move_plans WHERE target_root=${targetId} AND target_path=${dest} AND item_id<>${m.id}`,
      );
      if (reservedPath)
        throw problem("这一路径已被另一条整理计划占用：" + path.basename(dest));
      if (await maybeStat(path.join(folder, path.basename(dest))))
        throw problem("目标已有同名文件：" + path.basename(dest));
      await tx.query(
        sql`INSERT INTO video_x.import_move_plans(item_id,file_id,source_root,source_path,target_root,target_path,target_key,create_dir) VALUES(${m.id},${r.file_id},${r.root_id},${r.relative_path},${targetId},${dest},${t.key},${!present}) ON CONFLICT(item_id) DO UPDATE SET target_root=excluded.target_root,target_path=excluded.target_path,target_key=excluded.target_key,create_dir=excluded.create_dir WHERE import_move_plans.run_id IS NULL`,
      );
      const [plan] = await tx.query(
        sql`SELECT run_id FROM video_x.import_move_plans WHERE item_id=${m.id}`,
      );
      if (plan?.run_id) throw problem("计划正在执行，请先处理当前任务。");
      await tx.query(
        sql`UPDATE video_x.import_items SET draft_revision=draft_revision+1,reviewed_at=null,reviewed_by=null,reviewed_revision=null,stage='probed' WHERE id=${m.id}`,
      );
    }
    const [reserved] = await tx.query(
      sql`SELECT count(*)::int n FROM video_x.import_move_plans p JOIN video_x.import_items i ON i.id=p.item_id WHERE p.target_root=${targetId} AND regexp_replace(p.target_path,'[^/]+$','')=${dir ? dir + "/" : ""} AND i.published_media_id IS NULL`,
    );
    if (t.limit && diskCount + reserved!.n > t.limit)
      throw problem(
        "目标目录超过 " + t.limit + " 个视频的上限（含待移入文件）。",
      );
    return { count: ids.length };
  });
}
