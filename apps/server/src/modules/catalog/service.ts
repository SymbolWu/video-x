import type { Static } from "@sinclair/typebox";
import {
  MediaPatch,
  PersonCreate,
  PersonPatch,
  FranchiseCreate,
  FranchisePatch,
  type Query,
  type MediaDto,
  type MediaDetailDto,
  type PersonDto,
  type FranchiseDto,
} from "@video-x/contracts";
import {
  Database,
  sql,
  AppError,
  notFound,
  requireChanged,
  type Transaction,
} from "../../platform/db.js";
import type { SQL } from "drizzle-orm";
import { replaceDictionaryLinks } from "./dictionary.js";
const live = sql`m.archived_at IS NULL AND m.published_at IS NOT NULL`;
const textQuery = (q: string) => "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
function categoryScope(column: SQL, id: string | undefined) {
  return id
    ? sql`${column} IN (WITH RECURSIVE tree AS (SELECT id FROM video_x.categories WHERE id=${id} UNION SELECT c.id FROM video_x.categories c JOIN tree t ON c.parent_id=t.id) SELECT id FROM tree)`
    : sql`true`;
}
function paging(q: Query) {
  const page = q.page ?? 1,
    pageSize = q.pageSize ?? 24;
  return { page, pageSize, offset: (page - 1) * pageSize };
}
function order(q: Query, columns: Record<string, SQL>, fallback: string) {
  const key = q.sort ?? fallback;
  if (!columns[key])
    throw new AppError(400, "INVALID_SORT", "当前列表不支持该排序字段");
  return sql`${columns[key]!} ${sql.raw(q.direction === "asc" ? "ASC" : "DESC")} NULLS LAST`;
}
const poster = (purpose: string) =>
  sql`(SELECT mi.asset_id FROM video_x.media_images mi JOIN video_x.assets a ON a.id=mi.asset_id AND a.state='ready' WHERE mi.media_id=m.id AND mi.purpose=${purpose} ORDER BY mi.position LIMIT 1)`;
const stateJoin = (profileId: string) =>
  sql`LEFT JOIN video_x.user_media_state u ON u.media_id=m.id AND u.profile_id=${profileId}`;
const resume = sql`(SELECT pp.position_ms FROM video_x.playback_progress pp JOIN video_x.editions ed ON ed.id=pp.edition_id AND ed.archived_at IS NULL JOIN video_x.edition_parts part ON part.id=pp.part_id JOIN video_x.media_files mf ON mf.id=part.file_id AND mf.availability='present' AND mf.content_revision=part.bound_content_revision WHERE pp.profile_id=u.profile_id AND pp.edition_id=u.resume_edition_id AND pp.completed_at IS NULL AND pp.position_ms>0 LIMIT 1)`;
const mediaSelect = (profileId: string) =>
  sql`SELECT ${poster("poster")} AS "posterId",${poster("backdrop")} AS "backdropId",${resume}::float8 AS "resumeMs",COALESCE((SELECT SUM(mf.duration_ms) FROM video_x.editions e JOIN video_x.edition_parts ep ON ep.edition_id=e.id JOIN video_x.media_files mf ON mf.id=ep.file_id WHERE e.media_id=m.id AND e.is_default AND e.archived_at IS NULL),m.declared_runtime_ms)::float8 AS "durationMs",m.id,m.title,m.summary,m.kind,m.episode_number AS "episodeNumber",m.release_year AS "releaseYear",m.primary_category_id AS "categoryId",c.name AS "categoryName",m.supports_chinese AS "supportsChinese",m.created_at::text AS "createdAt",m.revision::int,COALESCE(u.is_favorite,false) AS "isFavorite",u.rating,u.watched_at::text AS "watchedAt",COALESCE(u.revision,0)::int AS "stateRevision" FROM video_x.media_items m JOIN video_x.categories c ON c.id=m.primary_category_id LEFT JOIN video_x.user_media_state u ON u.media_id=m.id AND u.profile_id=${profileId}`;
const personSelect = (profileId: string) =>
  sql`SELECT p.portrait_asset_id AS "portraitId",p.id,p.full_name AS "fullName",p.detailed_name AS "detailedName",p.gender,p.primary_category_id AS "categoryId",c.name AS "categoryName",p.revision::int,COALESCE(u.is_favorite,false) AS "isFavorite",(SELECT count(DISTINCT cr.media_id)::int FROM video_x.credits cr JOIN video_x.media_items m ON m.id=cr.media_id WHERE cr.person_id=p.id AND cr.job='actor' AND ${live}) AS "workCount" FROM video_x.people p JOIN video_x.categories c ON c.id=p.primary_category_id LEFT JOIN video_x.user_person_state u ON u.person_id=p.id AND u.profile_id=${profileId}`;
const franchiseSelect = sql`SELECT ARRAY(SELECT mi.asset_id FROM video_x.franchise_items fi JOIN video_x.media_images mi ON mi.media_id=fi.media_id AND mi.purpose='poster' AND mi.position=1 WHERE fi.franchise_id=f.id ORDER BY fi.position LIMIT 3) AS "coverIds",f.cover_asset_id AS "coverId",f.id,f.name,f.description,f.primary_category_id AS "categoryId",c.name AS "categoryName",f.revision::int,(SELECT count(*)::int FROM video_x.franchise_items fi JOIN video_x.media_items m ON m.id=fi.media_id WHERE fi.franchise_id=f.id AND ${live}) AS "workCount" FROM video_x.franchises f JOIN video_x.categories c ON c.id=f.primary_category_id`;
export class Catalog {
  constructor(private db: Database) {}
  categories() {
    return this.db.query<{
      id: string;
      name: string;
      parentId: string | null;
      isVisible: boolean;
      revision: number;
    }>(
      sql`SELECT id,name,parent_id AS "parentId",is_visible AS "isVisible",revision::int FROM video_x.categories WHERE archived_at IS NULL ORDER BY position,id`,
    );
  }
  async categoryVisibility(id: string, revision: number, visible: boolean) {
    const rows = await this.db.query(
      sql`UPDATE video_x.categories SET is_visible=${visible} WHERE id=${id} AND archived_at IS NULL AND revision=${revision} RETURNING id`,
    );
    await requireChanged(rows, () =>
      this.db.query(
        sql`SELECT id FROM video_x.categories WHERE id=${id} AND archived_at IS NULL`,
      ),
    );
    return (await this.categories()).find((c) => c.id === id)!;
  }
  async createCategory(name: string) {
    const [item] = await this.db.query<{ id: string }>(
      sql`INSERT INTO video_x.categories(code,name,position) VALUES('c_'||replace(gen_random_uuid()::text,'-',''),${name.trim()},1) RETURNING id`,
    );
    return (await this.categories()).find((x) => x.id === item!.id)!;
  }
  archive(profile: string) {
    return this.db
      .query(sql`SELECT id,name,kind,archived_at::text AS "archivedAt" FROM (
      SELECT id,title AS name,'影片' AS kind,archived_at FROM video_x.media_items WHERE archived_at IS NOT NULL
      UNION ALL SELECT id,full_name,'演员',archived_at FROM video_x.people WHERE archived_at IS NOT NULL
      UNION ALL SELECT id,name,'系列',archived_at FROM video_x.franchises WHERE archived_at IS NOT NULL
      UNION ALL SELECT id,name,'分类',archived_at FROM video_x.categories WHERE archived_at IS NOT NULL
      UNION ALL SELECT id,name,'收藏夹',archived_at FROM video_x.collections WHERE profile_id=${profile} AND archived_at IS NOT NULL
    ) a ORDER BY archived_at DESC,id LIMIT 100`);
  }
  async facts(profileId: string) {
    const [row] = await this.db
      .query(sql`SELECT count(*) FILTER(WHERE m.parent_id IS NULL)::int films,count(*) FILTER(WHERE u.is_favorite)::int favorites,count(*) FILTER(WHERE u.watched_at IS NOT NULL)::int watched,
      (SELECT count(*)::int FROM video_x.people WHERE archived_at IS NULL) actors,(SELECT count(*)::int FROM video_x.franchises WHERE archived_at IS NULL) series,
      COALESCE(array_agg(DISTINCT m.release_year ORDER BY m.release_year DESC) FILTER(WHERE m.release_year IS NOT NULL),'{}') years
      FROM video_x.media_items m ${stateJoin(profileId)} WHERE ${live}`);
    return row!;
  }
  async listMedia(profileId: string, q: Query) {
    const relation =
      q.actorId ||
      q.franchiseId ||
      q.collectionId ||
      q.favorite ||
      q.watched ||
      q.resumable;
    const level = q.episodesOnly
      ? sql`m.kind='episode'`
      : relation || q.includeEpisodes
        ? sql`true`
        : sql`m.parent_id IS NULL`;
    const where = sql`${live} AND ${level}
    AND ${q.favorite === undefined ? sql`true` : sql`COALESCE(u.is_favorite,false)=${q.favorite}`}
    AND ${q.watched === undefined ? sql`true` : sql`(u.watched_at IS NOT NULL)=${q.watched}`}
    AND ${q.year ? sql`m.release_year=${q.year}` : sql`true`}
    AND ${q.ratingMin ? sql`u.rating>=${q.ratingMin}` : sql`true`} AND ${q.unrated ? sql`u.rating IS NULL` : sql`true`}
    AND ${q.resumable ? sql`${resume} IS NOT NULL` : sql`true`} AND ${categoryScope(sql`m.primary_category_id`, q.categoryId)} AND ${q.q ? sql`(m.title ILIKE ${textQuery(q.q)} OR EXISTS(SELECT 1 FROM video_x.media_identifiers mi WHERE mi.media_id=m.id AND mi.normalized_value ILIKE ${textQuery(q.q.normalize("NFKC"))}) OR EXISTS(SELECT 1 FROM video_x.credits cr JOIN video_x.people p ON p.id=cr.person_id WHERE cr.media_id=m.id AND (p.full_name ILIKE ${textQuery(q.q)} OR p.detailed_name ILIKE ${textQuery(q.q)})))` : sql`true`} AND ${q.actorId ? sql`EXISTS(SELECT 1 FROM video_x.credits cr WHERE cr.media_id=m.id AND cr.person_id=${q.actorId} AND cr.job='actor')` : sql`true`} AND ${q.franchiseId ? sql`EXISTS(SELECT 1 FROM video_x.franchise_items fi WHERE fi.media_id=m.id AND fi.franchise_id=${q.franchiseId})` : sql`true`} AND ${q.collectionId ? sql`EXISTS(SELECT 1 FROM video_x.collection_items ci JOIN video_x.collections cl ON cl.id=ci.collection_id WHERE ci.media_id=m.id AND cl.id=${q.collectionId} AND cl.profile_id=${profileId} AND cl.archived_at IS NULL)` : sql`true`}`;
    const p = paging(q),
      sort = order(
        q,
        {
          createdAt: sql`m.created_at`,
          name: sql`m.title`,
          year: sql`m.release_year`,
          rating: sql`u.rating`,
          lastPlayed: sql`u.last_played_at`,
        },
        "createdAt",
      );
    const items = await this.db.query<MediaDto>(
      sql`${mediaSelect(profileId)} WHERE ${where} ORDER BY ${sort},m.id LIMIT ${p.pageSize} OFFSET ${p.offset}`,
    );
    const [count] = await this.db.query<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM video_x.media_items m ${stateJoin(profileId)} WHERE ${where}`,
    );
    return { items, total: count!.total, page: p.page, pageSize: p.pageSize };
  }
  async listManagementMedia(profileId: string, q: Query) {
    const page = await this.listMedia(profileId, q);
    if (page.items.length === 0) return { ...page, items: [] };

    const ids = sql.join(page.items.map((item) => sql`(${item.id}::uuid)`), sql`, `);
    const summaries = await this.db.query<{
      id: string;
      identifier: string | null;
      actorNames: string[];
      editionCount: number;
      fileCount: number;
      needsFileCheck: boolean;
    }>(sql`
      WITH selection(id) AS (VALUES ${ids})
      SELECT s.id,
        (SELECT value FROM video_x.media_identifiers
          WHERE media_id = s.id AND is_primary LIMIT 1) AS identifier,
        ARRAY(SELECT p.full_name FROM video_x.credits c
          JOIN video_x.people p ON p.id = c.person_id AND p.archived_at IS NULL
          WHERE c.media_id = s.id AND c.job = 'actor' ORDER BY c.position, p.id) AS "actorNames",
        files.*
      FROM selection s CROSS JOIN LATERAL (
        SELECT count(DISTINCT e.id)::int AS "editionCount",
          count(DISTINCT f.id)::int AS "fileCount",
          coalesce(bool_or(f.id IS NULL OR f.availability <> 'present'
            OR f.probe_status <> 'succeeded' OR f.content_revision <> part.bound_content_revision
            OR r.status IS DISTINCT FROM 'online' OR r.archived_at IS NOT NULL), false) AS "needsFileCheck"
        FROM video_x.editions e
        LEFT JOIN video_x.edition_parts part ON part.edition_id = e.id
        LEFT JOIN video_x.media_files f ON f.id = part.file_id
        LEFT JOIN video_x.storage_roots r ON r.id = f.root_id
        WHERE e.media_id = s.id AND e.archived_at IS NULL
      ) files
    `);
    const byId = new Map(summaries.map((row) => [row.id, row]));
    return { ...page, items: page.items.map((m) => ({ ...m, ...byId.get(m.id)! })) };
  }
  async detail(profileId: string, id: string): Promise<MediaDetailDto> {
    const [m] = await this.db.query<MediaDto & { notes: string | null }>(
      sql`${mediaSelect(profileId)} WHERE m.id=${id} AND ${live}`,
    );
    if (!m) throw notFound();
    const [notes] = await this.db.query<{
      notes: string | null;
      linkedFileCount: number;
      releaseDate: string | null;
      identifier: string | null;
    }>(
      sql`SELECT notes,release_date::text AS "releaseDate",(SELECT value FROM video_x.media_identifiers WHERE media_id=${id} AND is_primary LIMIT 1) identifier,(SELECT count(DISTINCT part.file_id)::int FROM video_x.editions ed JOIN video_x.edition_parts part ON ed.id=part.edition_id WHERE ed.media_id=${id} AND ed.archived_at IS NULL) AS "linkedFileCount" FROM video_x.media_items WHERE id=${id}`,
    );
    const actors = await this.db.query<PersonDto>(
      sql`${personSelect(profileId)} WHERE p.archived_at IS NULL AND EXISTS(SELECT 1 FROM video_x.credits cr WHERE cr.media_id=${id} AND cr.person_id=p.id AND cr.job='actor') ORDER BY (SELECT min(cr.position) FROM video_x.credits cr WHERE cr.media_id=${id} AND cr.person_id=p.id AND cr.job='actor'),p.id`,
    );
    const franchises = await this.db.query<FranchiseDto>(
      sql`${franchiseSelect} WHERE f.archived_at IS NULL AND EXISTS(SELECT 1 FROM video_x.franchise_items fi WHERE fi.media_id=${id} AND fi.franchise_id=f.id) ORDER BY f.name,f.id`,
    );
    return {
      ...m,
      tagIds: (
        await this.db.query(
          sql`SELECT tag_id id FROM video_x.media_tags WHERE media_id=${id} ORDER BY tag_id`,
        )
      ).map((r) => r.id),
      studioIds: (
        await this.db.query(
          sql`SELECT organization_id id FROM video_x.media_organizations WHERE media_id=${id} AND role='studio' ORDER BY organization_id`,
        )
      ).map((r) => r.id),
      episodes:
        m.kind === "group"
          ? await this.db.query<MediaDto>(
              sql`${mediaSelect(profileId)} WHERE m.parent_id=${id} AND ${live} ORDER BY m.episode_number,m.id`,
            )
          : [],
      notes: notes!.notes,
      releaseDate: notes!.releaseDate,
      identifier: notes!.identifier,
      linkedFileCount: notes!.linkedFileCount,
      actors,
      franchises,
    };
  }
  async listPeople(profileId: string, q: Query) {
    rejectRelationFilters(q);
    const where = sql`p.archived_at IS NULL AND ${categoryScope(sql`p.primary_category_id`, q.categoryId)} AND ${q.q ? sql`(p.full_name ILIKE ${textQuery(q.q)} OR p.detailed_name ILIKE ${textQuery(q.q)})` : sql`true`}`;
    const p = paging(q),
      sort = order(
        q,
        {
          createdAt: sql`p.created_at`,
          name: sql`p.full_name`,
          count: sql`"workCount"`,
        },
        "count",
      );
    const items = await this.db.query<PersonDto>(
      sql`${personSelect(profileId)} WHERE ${where} ORDER BY ${sort},p.id LIMIT ${p.pageSize} OFFSET ${p.offset}`,
    );
    const [count] = await this.db.query<{ total: number }>(
      sql`SELECT count(*)::int total FROM video_x.people p WHERE ${where}`,
    );
    return { items, total: count!.total, page: p.page, pageSize: p.pageSize };
  }
  async listFranchises(q: Query) {
    rejectRelationFilters(q);
    const where = sql`f.archived_at IS NULL AND ${categoryScope(sql`f.primary_category_id`, q.categoryId)} AND ${q.q ? sql`(f.name ILIKE ${textQuery(q.q)} OR f.description ILIKE ${textQuery(q.q)})` : sql`true`}`;
    const p = paging(q),
      sort = order(
        q,
        {
          createdAt: sql`f.created_at`,
          name: sql`f.name`,
          count: sql`"workCount"`,
        },
        "count",
      );
    const items = await this.db.query<FranchiseDto>(
      sql`${franchiseSelect} WHERE ${where} ORDER BY ${sort},f.id LIMIT ${p.pageSize} OFFSET ${p.offset}`,
    );
    const [count] = await this.db.query<{ total: number }>(
      sql`SELECT count(*)::int total FROM video_x.franchises f WHERE ${where}`,
    );
    return { items, total: count!.total, page: p.page, pageSize: p.pageSize };
  }
  async person(profileId: string, id: string) {
    const [p] = await this.db.query<PersonDto>(
      sql`${personSelect(profileId)} WHERE p.id=${id} AND p.archived_at IS NULL`,
    );
    if (!p) throw notFound();
    return p;
  }
  async franchise(id: string) {
    const [f] = await this.db.query<FranchiseDto>(
      sql`${franchiseSelect} WHERE f.id=${id} AND f.archived_at IS NULL`,
    );
    if (!f) throw notFound();
    return f;
  }
  async createPerson(profileId: string, input: Static<typeof PersonCreate>) {
    const [row] = await this.db.query<{ id: string }>(
      sql`INSERT INTO video_x.people(portrait_asset_id,full_name,detailed_name,gender,primary_category_id) VALUES(${input.portraitId ?? null},${input.fullName.trim()},${input.detailedName ?? null},${input.gender ?? "unknown"},${input.categoryId}) RETURNING id`,
    );
    return this.person(profileId, row!.id);
  }
  async createFranchise(input: Static<typeof FranchiseCreate>) {
    const [row] = await this.db.query<{ id: string }>(
      sql`INSERT INTO video_x.franchises(cover_asset_id,name,description,primary_category_id) VALUES(${input.coverId ?? null},${input.name.trim()},${input.description ?? null},${input.categoryId}) RETURNING id`,
    );
    return this.franchise(row!.id);
  }
  async patchPerson(
    profileId: string,
    id: string,
    input: Static<typeof PersonPatch>,
  ) {
    const values = updates(input, {
      portraitId: "portrait_asset_id",
      fullName: "full_name",
      detailedName: "detailed_name",
      gender: "gender",
      categoryId: "primary_category_id",
    });
    if (!values.length)
      throw new AppError(400, "EMPTY_PATCH", "请提交需要修改的内容");
    const rows = await this.db.query(
      sql`UPDATE video_x.people SET ${sql.join(values, sql`, `)} WHERE id=${id} AND revision=${input.expectedRevision} AND archived_at IS NULL RETURNING id`,
    );
    await requireChanged(rows, () =>
      this.db.query(
        sql`SELECT id FROM video_x.people WHERE id=${id} AND archived_at IS NULL`,
      ),
    );
    return this.person(profileId, id);
  }
  async patchFranchise(id: string, input: Static<typeof FranchisePatch>) {
    const values = updates(input, {
      coverId: "cover_asset_id",
      name: "name",
      description: "description",
      categoryId: "primary_category_id",
    });
    if (!values.length)
      throw new AppError(400, "EMPTY_PATCH", "请提交需要修改的内容");
    const rows = await this.db.query(
      sql`UPDATE video_x.franchises SET ${sql.join(values, sql`, `)} WHERE id=${id} AND revision=${input.expectedRevision} AND archived_at IS NULL RETURNING id`,
    );
    await requireChanged(rows, () =>
      this.db.query(
        sql`SELECT id FROM video_x.franchises WHERE id=${id} AND archived_at IS NULL`,
      ),
    );
    return this.franchise(id);
  }
  async patchMedia(
    profileId: string,
    id: string,
    input: Static<typeof MediaPatch>,
  ) {
    const values = updates(input, {
      title: "title",
      summary: "summary",
      notes: "notes",
      categoryId: "primary_category_id",
      supportsChinese: "supports_chinese",
    });
    if (
      !values.length &&
      !input.actorIds &&
      !input.franchiseIds &&
      input.tagIds === undefined &&
      input.studioIds === undefined &&
      input.posterId === undefined &&
      input.backdropId === undefined
    )
      throw new AppError(400, "EMPTY_PATCH", "请提交需要修改的内容");
    await this.db.transaction(async (tx) => {
      const changed = await tx.query<{ revision: number }>(
        sql`UPDATE video_x.media_items SET ${values.length ? sql.join(values, sql`, `) : sql`title=title`} WHERE id=${id} AND revision=${input.expectedRevision} AND archived_at IS NULL AND published_at IS NOT NULL RETURNING revision::int`,
      );
      await requireChanged(changed, () =>
        tx.query(
          sql`SELECT id FROM video_x.media_items WHERE id=${id} AND archived_at IS NULL AND published_at IS NOT NULL`,
        ),
      );
      for (const [purpose, assetId] of [
        ["poster", input.posterId],
        ["backdrop", input.backdropId],
      ] as const) {
        if (assetId === undefined) continue;
        await tx.query(
          sql`DELETE FROM video_x.media_images WHERE media_id=${id} AND purpose=${purpose} AND position=1`,
        );
        if (assetId)
          await tx.query(
            sql`INSERT INTO video_x.media_images(media_id,asset_id,purpose,position,is_manual) VALUES(${id},${assetId},${purpose},1,true)`,
          );
      }
      if (input.actorIds) {
        await checkActive(tx, "people", input.actorIds);
        await tx.query(
          sql`DELETE FROM video_x.credits WHERE media_id=${id} AND job='actor'`,
        );
        for (const [n, personId] of input.actorIds.entries())
          await tx.query(
            sql`INSERT INTO video_x.credits(media_id,person_id,job,position,is_manual) VALUES(${id},${personId},'actor',${n},true)`,
          );
      }
      if (input.franchiseIds) {
        await checkActive(tx, "franchises", input.franchiseIds);
        const existing = await tx.query<{ franchise_id: string }>(
          sql`SELECT franchise_id FROM video_x.franchise_items WHERE media_id=${id}`,
        );
        const affected = [
          ...new Set([
            ...existing.map((x) => x.franchise_id),
            ...input.franchiseIds,
          ]),
        ].sort();
        for (const f of affected)
          await tx.query(
            sql`SELECT id FROM video_x.franchises WHERE id=${f} FOR UPDATE`,
          );
        for (const f of existing)
          if (!input.franchiseIds.includes(f.franchise_id))
            await tx.query(
              sql`DELETE FROM video_x.franchise_items WHERE franchise_id=${f.franchise_id} AND media_id=${id}`,
            );
        for (const f of input.franchiseIds)
          await tx.query(
            sql`INSERT INTO video_x.franchise_items(franchise_id,media_id,position,is_manual) SELECT ${f},${id},COALESCE(MAX(position),0)+1,true FROM video_x.franchise_items WHERE franchise_id=${f} ON CONFLICT(franchise_id,media_id) DO NOTHING`,
          );
        for (const f of affected)
          await tx.query(
            sql`UPDATE video_x.franchises SET name=name WHERE id=${f}`,
          );
      }
      await replaceDictionaryLinks(tx, id, input);
      await tx.emit({ mediaId: id, revision: changed[0]!.revision });
    });
    return this.detail(profileId, id);
  }
}
function updates(input: object, fields: Record<string, string>) {
  const record = input as Record<string, unknown>;
  return Object.entries(fields)
    .filter(([key]) => Object.hasOwn(record, key))
    .map(([key, column]) => sql`${sql.identifier(column)}=${record[key]}`);
}
export async function checkActive(
  tx: Pick<Transaction, "query">,
  table: "people" | "franchises" | "media_items" | "tags" | "organizations",
  ids: string[],
) {
  if (!ids.length) return;
  const rows = await tx.query(
    sql`SELECT id FROM ${sql.identifier("video_x")}.${sql.identifier(table)} WHERE id IN (${sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )}) AND archived_at IS NULL AND ${table === "media_items" ? sql`published_at IS NOT NULL` : sql`true`}`,
  );
  if (rows.length !== ids.length)
    throw new AppError(400, "INVALID_RELATION", "部分关联资料不存在或已归档");
}
function rejectRelationFilters(q: Query) {
  if (q.actorId || q.franchiseId || q.collectionId)
    throw new AppError(400, "INVALID_FILTER", "当前列表不支持影片关系筛选");
}
