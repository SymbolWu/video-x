import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Static } from "@sinclair/typebox";
import type {
  NewDraft,
  GroupInput,
  ImportFields,
  ImportEdit,
  ImportQuery,
  ImportRow,
  EditionTarget,
} from "@video-x/contracts";
import {
  Database,
  AppError,
  sql,
  notFound,
  conflict,
  type Transaction,
} from "../../platform/db.js";
import { publishedRelations } from "../sources/service.js";
import { replaceDictionaryLinks } from "../catalog/dictionary.js";
import { checkActive } from "../catalog/service.js";
import { activeBinding } from "../catalog/edition-files.js";
import { rootMarker, openVideo } from "./files.js";
import { activeInbox, allowedRoot, layout, problem } from "./layout.js";
import { inDownload, queueMove } from "./moves.js";
type Fields = Static<typeof ImportFields>;
type Row = Static<typeof ImportRow>;
type Target = Static<typeof EditionTarget>;
const joins = sql`FROM video_x.import_items i LEFT JOIN video_x.import_item_files b ON b.item_id=i.id LEFT JOIN video_x.media_files f ON f.id=b.file_id LEFT JOIN video_x.storage_roots r ON r.id=f.root_id LEFT JOIN video_x.import_move_plans mp ON mp.item_id=i.id LEFT JOIN video_x.storage_roots mt ON mt.id=mp.target_root LEFT JOIN LATERAL (SELECT state,error FROM video_x.import_move_runs WHERE i.id=ANY(members) AND state<>'cancelled' ORDER BY created_at DESC LIMIT 1) mr ON true LEFT JOIN LATERAL (SELECT * FROM video_x.import_lookups WHERE item_id=i.id ORDER BY created_at DESC,id DESC LIMIT 1) l ON true LEFT JOIN LATERAL (SELECT codec,width,height FROM video_x.media_streams WHERE file_id=f.id AND kind='video' ORDER BY stream_index LIMIT 1) video ON true`;

const columns = sql`b.requires_move AS "needsTarget",r.mount_path AS "sourceMount",CASE WHEN mp.item_id IS NOT NULL OR mr.state IS NOT NULL THEN jsonb_build_object('target',coalesce(mp.target_key,mt.name,'') ,'directory',coalesce(mp.target_path,''),'source',coalesce(mp.source_path,f.relative_path,''),'state',coalesce(mr.state,'planned'),'error',mr.error) END AS move,i.id,i.revision::int,i.draft-'group'-'editionTarget' AS fields,i.draft->'editionTarget' AS "editionTarget",i.draft->'group' AS "group",COALESCE(f.relative_path,'') AS "relativePath",COALESCE(f.size_bytes::text,'0') AS "sizeBytes",CASE WHEN l.id IS NOT NULL THEN jsonb_build_object('id',l.id,'provider',l.provider,'query',l.query,'state',l.state,'message',l.message,'choices',l.choices,'candidate',l.candidate,'appliedFields',l.applied_fields) END AS lookup,f.duration_ms::float8 AS "durationMs",f.container_format AS format,COALESCE(f.probe_status,'pending') AS "probeStatus",
  CASE WHEN f.id IS NULL THEN 'unbound' WHEN r.status IN ('offline','identity_mismatch') THEN 'offline' ELSE f.availability END AS availability,
  (i.reviewed_revision IS NOT NULL AND i.reviewed_revision=i.draft_revision) AS reviewed,i.published_media_id AS "publishedMediaId",
  (SELECT name FROM video_x.categories WHERE id=(i.draft->>'categoryId')::uuid) AS "categoryName",
  ARRAY(SELECT p.full_name FROM jsonb_array_elements_text(i.draft->'actorIds') WITH ORDINALITY a(id,n) JOIN video_x.people p ON p.id=a.id::uuid ORDER BY a.n) AS actors,
  ARRAY(SELECT p.full_name FROM jsonb_array_elements_text(i.draft->'directorIds') WITH ORDINALITY a(id,n) JOIN video_x.people p ON p.id=a.id::uuid ORDER BY a.n) AS directors,
  ARRAY(SELECT p.name FROM jsonb_array_elements_text(i.draft->'franchiseIds') WITH ORDINALITY a(id,n) JOIN video_x.franchises p ON p.id=a.id::uuid ORDER BY a.n) AS series,
  video.codec AS "videoCodec",video.width,video.height`;
const blocked = sql`(f.id IS NULL OR l.state IN ('queued','running') OR f.probe_status<>'succeeded' OR f.availability<>'present' OR r.status IN('offline','identity_mismatch'))`;
export class Imports {
  constructor(
    private db: Database,
    private root: string,
  ) {}
  async list(q: Static<typeof ImportQuery>) {
    const page = q.page ?? 1,
      pageSize = q.pageSize ?? 24;
    const download = await activeInbox(this.db, this.root);
    const filters = {
      episode: sql`(i.draft ? 'group' OR f.relative_path ~* '(part|ep)[ _.-]*[0-9]+|[上下][篇部集]|第[一二三四五六七八九十0-9]+集')`,
      all: sql`true`,
      unbound: sql`f.id IS NULL`,
      lookupFailed: sql`l.state='failed'`,
      retrieved: sql`l.state='succeeded'`,
      pending: sql`i.reviewed_revision IS NULL AND i.stage<>'published'`,
      missing: sql`(i.draft->>'posterId' IS NULL OR nullif(btrim(i.draft->>'summary'),'') IS NULL OR i.draft->>'releaseDate' IS NULL OR (jsonb_array_length(i.draft->'actorIds')=0 AND coalesce(jsonb_array_length(i.draft->'sourceNames'->'actors'),0)=0) OR i.draft->>'categoryId'='20000000-0000-4000-8000-000000000001')`,
      reviewed: sql`i.reviewed_revision IS NOT NULL AND i.stage<>'published'`,
      failed: sql`f.probe_status='failed'`,
      blocked: sql`(${blocked} OR mr.error IS NOT NULL OR (b.requires_move AND mp.item_id IS NULL AND i.published_media_id IS NULL) OR (${download ? sql`i.published_media_id IS NULL AND mp.item_id IS NULL AND r.mount_path=${download.mount} AND starts_with(f.relative_path,${download.dir + "/"})` : sql`false`}))`,
      published: sql`i.stage='published'`,
    };
    const term = q.q?.trim() ?? "";
    const pattern = "%" + term.replace(/[%_\\]/g, "\\$&") + "%";
    const where = sql`i.merged_into_id IS NULL AND ${q.groupId ? sql`i.draft->'group'->>'id'=${q.groupId}` : sql`true`} AND (${filters[q.status ?? "all"]}) AND (${filters[q.stage ?? "all"]}) AND ${term ? sql`(i.draft->>'title' ILIKE ${pattern} OR i.draft->>'identifier' ILIKE ${pattern} OR f.relative_path ILIKE ${pattern} OR EXISTS(SELECT 1 FROM video_x.people p WHERE ((i.draft->'actorIds') ? p.id::text OR (i.draft->'directorIds') ? p.id::text) AND p.full_name ILIKE ${pattern}))` : sql`true`}`;
    const items = await this.db.query<Row>(
      sql`SELECT ${columns} ${joins} WHERE ${where} ORDER BY i.created_at DESC,i.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    );
    const [info] = await this.db.query(
      sql`SELECT (SELECT count(*)::int ${joins} WHERE ${where}) total,EXISTS(SELECT 1 FROM video_x.import_batches WHERE finished_at IS NULL) scanning,EXISTS(SELECT 1 FROM video_x.import_lookups WHERE state IN ('queued','running')) AS "lookingUp",COALESCE((SELECT status FROM video_x.storage_roots WHERE mount_path=${this.root} LIMIT 1),'unregistered') AS "rootStatus"`,
    );
    return {
      rootPath: this.root,
      items: items.map((r) => this.describe(r)),
      page,
      pageSize,
      total: info!.total,
      scanning: info!.scanning,
      lookingUp: info!.lookingUp,
      rootStatus: info!.rootStatus,
    };
  }
  async createDraft(profile: string, input: Static<typeof NewDraft>) {
    const title = input.title.trim();
    if (!title)
      throw new AppError(400, "TITLE_REQUIRED", "请先填写片名或编号。");
    return this.db.transaction(async (tx) => {
      const [batch] = await tx.query(
        sql`INSERT INTO video_x.import_batches(library_id,created_by,mode,finished_at) SELECT '10000000-0000-4000-8000-000000000001',account_id,'manual',now() FROM video_x.profiles WHERE id=${profile} RETURNING id`,
      );
      const fields: Fields = {
        title,
        identifier: input.identifier?.trim() || null,
        categoryId: "20000000-0000-4000-8000-000000000001",
        releaseYear: Number(input.releaseDate.slice(0, 4)),
        releaseDate: input.releaseDate,
        supportsChinese: null,
        summary: null,
        notes: null,
        actorIds: [],
        franchiseIds: [],
      };
      await this.validateFields(tx, fields);
      const [item] = await tx.query(
        sql`INSERT INTO video_x.import_items(batch_id,item_key,execution_status,draft) VALUES(${batch!.id},${randomUUID()},'waiting_user',${JSON.stringify(fields)}::jsonb) RETURNING id`,
      );
      return this.row(tx, item!.id);
    });
  }
  private describe(r: Row & { sourceMount?: string }) {
    return {
      ...r,
      move: r.move
        ? {
            ...r.move,
            target:
              layout(this.root)?.targets.find((t) => t.key === r.move!.target)
                ?.label ?? r.move.target,
          }
        : null,
      needsTarget:
        !r.publishedMediaId &&
        !r.move &&
        (!!r.needsTarget ||
          (r.sourceMount === this.root &&
            inDownload(this.root, r.relativePath))),
    };
  }
  get(id: string) {
    return this.row(this.db, id);
  }
  async row(tx: Pick<Transaction, "query">, id: string) {
    const [row] = await tx.query<Row>(
      sql`SELECT ${columns} ${joins} WHERE i.id=${id} AND i.merged_into_id IS NULL`,
    );
    if (!row) throw notFound();
    return this.describe(row);
  }
  async preview(id: string) {
    const [row] = await this.db.query(
      sql`SELECT f.relative_path,f.size_bytes,f.mtime_ns,f.container_format,r.mount_path,r.expected_marker
        FROM video_x.import_items i
        JOIN video_x.import_item_files b ON b.item_id=i.id
        JOIN video_x.media_files f ON f.id=b.file_id
        JOIN video_x.storage_roots r ON r.id=f.root_id
        WHERE i.id=${id} AND i.stage='ready' AND i.merged_into_id IS NULL
          AND i.reviewed_revision=i.draft_revision AND NOT (i.draft ? 'group')
          AND f.availability='present' AND f.probe_status='succeeded' AND r.archived_at IS NULL
          AND NOT EXISTS(SELECT 1 FROM video_x.import_move_runs run WHERE i.id=ANY(run.members) AND run.state IN ('queued','running','cleanup'))`,
    );
    if (!row) throw notFound();
    const unavailable = () =>
      new AppError(
        409,
        "FILE_UNAVAILABLE",
        "候选文件不可用，请重新扫描并核对。",
      );
    if (
      !allowedRoot(this.root, row.mount_path) ||
      (await rootMarker(row.mount_path).catch(() => null)) !==
        row.expected_marker
    )
      throw unavailable();
    const opened = await openVideo(row.mount_path, row.relative_path).catch(
      () => {
        throw unavailable();
      },
    );
    if (opened.size !== row.size_bytes || opened.mtime !== row.mtime_ns) {
      await opened.file.close();
      throw unavailable();
    }
    return {
      file: opened.file,
      size: Number(opened.size),
      mime:
        row.container_format === "matroska" ? "video/x-matroska" : "video/mp4",
    };
  }
  private async validateFields(tx: Transaction, fields: Fields) {
    if (!fields.releaseDate)
      throw new AppError(
        400,
        "DATE_REQUIRED",
        "请填写完整的发行日期（年、月、日）。",
      );
    if (!fields.title.trim())
      throw new AppError(400, "TITLE_REQUIRED", "请填写片名");
    if (
      !(
        await tx.query(
          sql`SELECT id FROM video_x.categories WHERE id=${fields.categoryId} AND archived_at IS NULL`,
        )
      ).length
    )
      throw notFound();
    if (
      fields.releaseDate &&
      (Number(fields.releaseDate.slice(0, 4)) !== fields.releaseYear ||
        fields.releaseYear < 1800 ||
        fields.releaseYear > 2500)
    )
      throw new AppError(400, "INVALID_DATE", "发行日期必须与发行年份一致。");
    await checkActive(tx, "people", fields.directorIds ?? []);
    await checkActive(tx, "tags", fields.tagIds ?? []);
    await checkActive(tx, "organizations", fields.studioIds ?? []);
    await checkActive(tx, "people", fields.actorIds);
    await checkActive(tx, "franchises", fields.franchiseIds);
  }
  edit(id: string, input: Static<typeof ImportEdit>) {
    return this.db.transaction(async (tx) => {
      await this.validateFields(tx, input.fields);
      const [item] =
        await tx.query(sql`UPDATE video_x.import_items SET draft=draft || ${JSON.stringify({ ...input.fields, title: input.fields.title.trim() })}::jsonb,
        draft_revision=draft_revision+1,reviewed_at=null,reviewed_by=null,reviewed_revision=null,stage=CASE WHEN stage='ready' THEN 'probed' ELSE stage END WHERE id=${id} AND revision=${input.expectedRevision} AND stage<>'published' AND merged_into_id IS NULL RETURNING id`);
      if (!item) throw conflict();
      return this.row(tx, id);
    });
  }
  async group(input: Static<typeof GroupInput>, existingId?: string) {
    const groupId = existingId ?? randomUUID(),
      title = input.title.trim();
    if (
      !title ||
      (input.sourceId && !input.members.some((m) => m.id === input.sourceId)) ||
      new Set(input.members.map((x) => x.id)).size !== input.members.length
    )
      throw new AppError(
        400,
        "INVALID_GROUP",
        "请填写容器名称并选择不同的分集。",
      );
    return this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      if (existingId) {
        const [{ total }] = (await tx.query(
          sql`SELECT count(*)::int AS total FROM video_x.import_items WHERE draft->'group'->>'id'=${existingId}`,
        )) as [{ total: number }];
        if (total !== input.members.length) throw conflict();
      }
      const membership = existingId
        ? sql`draft->'group'->>'id'=${existingId}`
        : sql`NOT(draft ? 'group')`;
      for (const [n, m] of input.members.entries()) {
        const [ok] = await tx.query(
          sql`UPDATE video_x.import_items SET draft=jsonb_set(draft,'{group}',${JSON.stringify({ id: groupId, title, sourceId: input.sourceId ?? input.members[0]!.id, position: n + (input.startNumber ?? 1) })}::jsonb),draft_revision=draft_revision+1,reviewed_revision=null,reviewed_at=null,reviewed_by=null,stage=CASE WHEN stage='ready' THEN 'probed' ELSE stage END WHERE id=${m.id} AND revision=${m.revision} AND stage<>'published' AND merged_into_id IS NULL AND NOT (draft ? 'editionTarget') AND EXISTS(SELECT 1 FROM video_x.import_item_files b WHERE b.item_id=import_items.id) AND ${membership} RETURNING id`,
        );
        if (!ok) throw conflict();
      }
      return { id: groupId };
    });
  }
  ungroup(id: string) {
    return this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      const rows = await tx.query(
        sql`UPDATE video_x.import_items SET draft=draft-'group',draft_revision=draft_revision+1,reviewed_revision=null,reviewed_at=null,reviewed_by=null,stage=CASE WHEN stage='ready' THEN 'probed' ELSE stage END WHERE draft->'group'->>'id'=${id} AND stage<>'published' RETURNING id`,
      );
      if (!rows.length) throw conflict();
      return { id };
    });
  }
  decide(
    id: string,
    revision: number,
    profile: string,
    publish: boolean,
    edition?: Target,
  ) {
    return this.db.transaction(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(72649009)`);
      if (edition) {
        const row = await this.row(tx, id);
        const name = edition.name.trim();
        if (!name || row.group) throw problem("请选择单个文件并填写版本名称。");
        if (
          row.editionTarget &&
          (row.editionTarget.mediaId !== edition.mediaId ||
            row.editionTarget.name !== name ||
            row.editionTarget.replacement?.editionId !==
              edition.replacement?.editionId ||
            row.editionTarget.replacement?.expectedRevision !==
              edition.replacement?.expectedRevision)
        )
          throw conflict();
        if (row.publishedMediaId) {
          if (row.publishedMediaId === edition.mediaId && row.editionTarget)
            return row;
          throw conflict();
        }
        if (!row.reviewed) throw problem("请先在录入工作台人工核对文件。");
        const [target] = await tx.query(
          sql`SELECT m.id,m.release_date FROM video_x.media_items m JOIN video_x.import_items i ON i.id=${id} JOIN video_x.import_batches b ON b.id=i.batch_id AND b.library_id=m.library_id WHERE m.id=${edition.mediaId} AND m.kind IN ('movie','video','episode') AND m.published_at IS NOT NULL AND m.archived_at IS NULL FOR UPDATE OF m`,
        );
        if (!target) throw problem("目标作品不可用。");
        if (
          !edition.replacement &&
          (!target.release_date || !row.fields.releaseDate)
        )
          throw new AppError(
            400,
            "DATE_REQUIRED",
            "请先补齐作品和草稿的发行日期。",
          );
        if (edition.replacement) {
          const binding = await activeBinding(
            tx,
            edition.mediaId,
            edition.replacement.editionId,
            edition.replacement.expectedRevision,
          );
          const [move] = await tx.query(sql`
            SELECT target_root,target_path FROM video_x.import_move_plans WHERE item_id=${id}
          `);
          if (
            !move ||
            move.target_root !== binding.root_id ||
            path.posix.dirname(move.target_path) !==
              path.posix.dirname(binding.relative_path)
          )
            throw problem("替换文件必须入库到原文件所在目录。");
          const [duplicate] = await tx.query(sql`
            SELECT 1 FROM video_x.import_item_files b
            JOIN video_x.edition_parts p ON p.file_id=b.file_id
            WHERE b.item_id=${id}
          `);
          if (duplicate)
            throw problem("候选文件已绑定播放版本，请选择其他文件。");
          const [pending] = await tx.query(sql`
            SELECT 1 FROM video_x.import_move_runs run
            JOIN video_x.import_items other ON other.id=ANY(run.members)
            WHERE run.state IN ('queued','running','cleanup') AND other.id<>${id}
              AND other.draft->'editionTarget'->'replacement'->>'editionId'=${edition.replacement.editionId}
          `);
          if (pending) throw problem("这个版本已有替换任务，请等待任务完成。");
        }
        if (!row.editionTarget) {
          const running = await tx.query(
            sql`SELECT id FROM video_x.import_move_runs WHERE ${id}::uuid=ANY(members) AND state NOT IN ('done','cancelled')`,
          );
          if (running.length)
            throw problem("此文件已有整理任务，请等待任务完成。");
          const [changed] = await tx.query(
            sql`UPDATE video_x.import_items SET draft=jsonb_set(draft,'{editionTarget}',${JSON.stringify({ mediaId: edition.mediaId, name, replacement: edition.replacement })}::jsonb) WHERE id=${id} AND revision=${revision} RETURNING revision::int`,
          );
          if (!changed) throw conflict();
          revision = changed.revision;
        } else revision = row.revision;
      }
      if (publish && (await queueMove(tx, this.root, id, revision, profile)))
        return this.row(tx, id);
      return this.decideTx(tx, id, revision, profile, publish);
    });
  }
  async decideTx(
    tx: Transaction,
    id: string,
    revision: number,
    profile: string,
    publish: boolean,
  ): Promise<Row> {
    const row = await this.row(tx, id);
    if (row.needsTarget) throw problem("请先设置下载文件的整理目标。");
    if (!publish || !row.group || row.publishedMediaId)
      return this.decideOne(tx, id, revision, profile, publish);
    if (row.revision !== revision) throw conflict();
    const members = await tx.query(
      sql`SELECT i.id,i.revision::int,i.reviewed_revision,i.draft_revision,i.draft,b.library_id FROM video_x.import_items i JOIN video_x.import_batches b ON b.id=i.batch_id WHERE i.draft->'group'->>'id'=${row.group.id} ORDER BY (i.draft->'group'->>'position')::int`,
    );
    if (
      members.length < 2 ||
      members.some(
        (m) => !m.reviewed_revision || m.reviewed_revision !== m.draft_revision,
      )
    )
      throw new AppError(
        409,
        "REVIEW_GROUP",
        "请先逐集确认全部草稿，再发布整个容器。",
      );
    const first =
      members.find((m) => m.id === m.draft.group.sourceId) ?? members[0]!;
    const d = first.draft as Fields,
      parent = row.group.id;
    await tx.query(
      sql`INSERT INTO video_x.media_items(id,library_id,kind,title,primary_category_id,summary,release_year,release_date,release_precision,supports_chinese,published_at) VALUES(${parent},${first.library_id},'group',${row.group.title},${d.categoryId},${d.summary},${d.releaseYear},${d.releaseDate ?? null},${d.releaseDate ? "day" : d.releaseYear ? "year" : "unknown"},${d.supportsChinese},now())`,
    );
    await this.attachMetadata(tx, parent, d);
    for (const member of members)
      await this.decideOne(
        tx,
        member.id,
        member.revision,
        profile,
        true,
        member.draft.group,
      );
    return this.row(tx, id);
  }
  private async attachMetadata(tx: Transaction, media: string, d: Fields) {
    d = await publishedRelations(tx, d);
    for (const [i, asset] of (d.stillIds ?? []).entries())
      await tx.query(
        sql`INSERT INTO video_x.media_images(media_id,asset_id,purpose,position,is_manual) VALUES(${media},${asset},'still',${i + 1},true)`,
      );
    await replaceDictionaryLinks(tx, media, d);
    for (const [purpose, assetId] of [
      ["poster", d.posterId],
      ["backdrop", d.backdropId],
    ] as const)
      if (assetId)
        await tx.query(
          sql`INSERT INTO video_x.media_images(media_id,asset_id,purpose,position,is_manual) VALUES(${media},${assetId},${purpose},1,true)`,
        );
    for (const [pos, person] of (d.directorIds ?? []).entries())
      await tx.query(
        sql`INSERT INTO video_x.credits(media_id,person_id,job,position,is_manual) VALUES(${media},${person},'director',${pos + 1},true)`,
      );
    for (const [pos, actor] of d.actorIds.entries())
      await tx.query(
        sql`INSERT INTO video_x.credits(media_id,person_id,job,position,is_manual) VALUES(${media},${actor},'actor',${pos + 1},true)`,
      );
    for (const series of [...d.franchiseIds].sort()) {
      await tx.query(
        sql`SELECT id FROM video_x.franchises WHERE id=${series} FOR UPDATE`,
      );
      await tx.query(
        sql`INSERT INTO video_x.franchise_items(franchise_id,media_id,position,is_manual) SELECT ${series},${media},COALESCE(max(position),0)+1,true FROM video_x.franchise_items WHERE franchise_id=${series}`,
      );
      await tx.query(
        sql`UPDATE video_x.franchises SET name=name WHERE id=${series}`,
      );
    }
  }
  private async decideOne(
    tx: Transaction,
    id: string,
    revision: number,
    profile: string,
    publish: boolean,
    group?: { id: string; position: number },
  ) {
    // Scanner writes file then draft; decisions lock in the same order.
    const [f] = await tx.query(
      sql`SELECT f.*,r.mount_path,r.expected_marker,r.library_id FROM video_x.media_files f JOIN video_x.import_item_files b ON b.file_id=f.id JOIN video_x.storage_roots r ON r.id=f.root_id WHERE b.item_id=${id} FOR UPDATE OF f`,
    );
    const [i] = await tx.query(
      sql`SELECT * FROM video_x.import_items WHERE id=${id} FOR UPDATE`,
    );
    if (!i || i.merged_into_id) throw notFound();
    if (!f)
      throw new AppError(
        409,
        "FILE_REQUIRED",
        "请先绑定视频文件，再核对并发布。",
      );
    if (
      (
        await tx.query(
          sql`SELECT id FROM video_x.import_lookups WHERE item_id=${id} AND state IN ('queued','running')`,
        )
      ).length
    )
      throw new AppError(
        409,
        "LOOKUP_RUNNING",
        "资料正在抓取，完成后请再核对。",
      );
    if (i.stage === "published" && publish) return this.row(tx, id);
    if (i.stage === "published" || Number(i.revision) !== revision)
      throw conflict();
    if (
      publish &&
      (!i.reviewed_revision || i.reviewed_revision !== i.draft_revision)
    )
      throw new AppError(409, "REVIEW_REQUIRED", "请先人工确认当前草稿。");
    const d = i.draft as Fields;
    let valid = false;
    if (
      allowedRoot(this.root, f.mount_path) &&
      f.probe_status === "succeeded" &&
      f.availability === "present"
    ) {
      try {
        if ((await rootMarker(f.mount_path)) === f.expected_marker) {
          const current = await openVideo(f.mount_path, f.relative_path);
          try {
            valid =
              current.size === f.size_bytes && current.mtime === f.mtime_ns;
          } finally {
            await current.file.close();
          }
        }
      } catch {
        valid = false;
      }
    }
    if (!valid)
      throw new AppError(
        409,
        "FILE_UNAVAILABLE",
        "文件离线、内容已更换或探测失败。请重新扫描后核对。",
      );
    if (!publish || !i.draft.editionTarget?.replacement)
      await this.validateFields(tx, d);
    if (!publish) {
      await tx.query(
        sql`UPDATE video_x.import_items SET stage='ready',reviewed_revision=draft_revision,reviewed_at=now(),reviewed_by=(SELECT account_id FROM video_x.profiles WHERE id=${profile}) WHERE id=${id}`,
      );
    } else {
      const target = i.draft.editionTarget as Target | undefined;
      let previous: Awaited<ReturnType<typeof activeBinding>> | undefined;
      let media: string, mediaKind: string, isDefault: boolean;
      let mediaRevision = 1;
      if (target) {
        if (group || i.draft.group)
          throw problem("分集组不能作为追加版本发布。");
        const [m] = await tx.query(
          sql`UPDATE video_x.media_items SET title=title WHERE id=${target.mediaId} AND library_id=${f.library_id} AND published_at IS NOT NULL AND archived_at IS NULL AND kind IN ('movie','episode','video') RETURNING id,kind,revision::int`,
        );
        if (!m) throw problem("无法追加到目标作品。");
        media = m.id;
        mediaKind = m.kind;
        mediaRevision = m.revision;
        if (target.replacement) {
          previous = await activeBinding(
            tx,
            media,
            target.replacement.editionId,
            target.replacement.expectedRevision,
          );
          if (
            f.root_id !== previous.root_id ||
            path.posix.dirname(f.relative_path) !==
              path.posix.dirname(previous.relative_path)
          )
            throw problem("替换文件必须入库到原文件所在目录。");
          isDefault = previous.is_default;
          await tx.query(
            sql`UPDATE video_x.editions SET archived_at=now() WHERE id=${previous.id}`,
          );
        } else {
          const existing = await tx.query(
            sql`SELECT id FROM video_x.editions WHERE media_id=${media} AND is_default AND archived_at IS NULL`,
          );
          isDefault = !existing.length;
        }
      } else {
        const [m] = await tx.query(
          sql`INSERT INTO video_x.media_items(library_id,kind,parent_id,parent_kind,episode_number,title,primary_category_id,summary,notes,release_year,release_date,release_precision,supports_chinese,published_at) VALUES(${f.library_id},${group ? "episode" : "movie"},${group?.id ?? null},${group ? "group" : null},${group?.position ?? null},${d.title},${d.categoryId},${d.summary},${d.notes},${d.releaseYear},${d.releaseDate ?? null},${d.releaseDate ? "day" : d.releaseYear ? "year" : "unknown"},${d.supportsChinese},now()) RETURNING id`,
        );
        media = m!.id;
        mediaKind = group ? "episode" : "movie";
        isDefault = true;
        const identifier = d.identifier?.trim();
        if (identifier)
          await tx.query(
            sql`INSERT INTO video_x.media_identifiers(media_id,scheme,value,normalized_value,is_primary) VALUES(${media},'catalog-number',${identifier},${identifier.normalize("NFKC").toUpperCase()},true)`,
          );
        await this.attachMetadata(tx, media, d);
      }
      const [v] = await tx.query(
        sql`INSERT INTO video_x.editions(media_id,media_kind,name,is_default,cut,language,notes) VALUES(${media},${mediaKind},${target?.name ?? "原版"},${isDefault},${previous?.cut ?? null},${previous?.language ?? null},${previous?.notes ?? null}) RETURNING id`,
      );
      await tx.query(
        sql`INSERT INTO video_x.edition_parts(edition_id,part_no,file_id,bound_content_revision) VALUES(${v!.id},1,${f.id},${f.content_revision})`,
      );
      await tx.query(
        sql`UPDATE video_x.import_items SET stage='published',execution_status='completed',published_media_id=${media},published_edition_id=${v!.id},published_at=now() WHERE id=${id}`,
      );
      await tx.emit({ mediaId: media, revision: mediaRevision });
    }
    return this.row(tx, id);
  }
}
