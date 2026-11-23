import {
  sql,
  Database,
  AppError,
  conflict,
  type Transaction,
} from "../../platform/db.js";
import type { Static } from "@sinclair/typebox";
import type { DictionaryWrite } from "@video-x/contracts";
export class Dictionary {
  constructor(private db: Database) {}
  list() {
    return this.db
      .query(sql`SELECT t.id,t.name,'tag' kind,t.primary_category_id AS "categoryId",t.attribute_group detail,t.is_visible AS "isVisible",t.revision::int,(SELECT count(*)::int FROM video_x.media_tags l WHERE l.tag_id=t.id) AS "workCount" FROM video_x.tags t WHERE t.archived_at IS NULL
 UNION ALL SELECT o.id,o.name,'studio',null,o.description,true,o.revision::int,(SELECT count(DISTINCT m.media_id)::int FROM video_x.media_organizations m WHERE m.organization_id=o.id) FROM video_x.organizations o WHERE o.archived_at IS NULL ORDER BY name,id`);
  }
  async save(
    x: Static<typeof DictionaryWrite>,
    id?: string,
    revision?: number,
  ) {
    const name = x.name.trim();
    if (!name) throw new AppError(400, "EMPTY_NAME", "请填写名称。");
    let result;
    if (x.kind === "tag") {
      if (!x.categoryId || name.length > 120)
        throw new AppError(
          400,
          "INVALID_TAG",
          "标签需选择分类，名称最多 120 字。",
        );
      const normalized = name.normalize("NFKC").toLocaleLowerCase("en-US"),
        group = x.detail?.trim() || "其他";
      result = await this.db.query(
        id
          ? sql`UPDATE video_x.tags SET name=${name},normalized_name=${normalized},primary_category_id=${x.categoryId},attribute_group=${group},is_visible=${x.isVisible ?? true} WHERE id=${id} AND revision=${revision} AND archived_at IS NULL RETURNING id`
          : sql`INSERT INTO video_x.tags(name,normalized_name,primary_category_id,attribute_group,is_visible) VALUES(${name},${normalized},${x.categoryId},${group},${x.isVisible ?? true}) RETURNING id`,
      );
    } else
      result = await this.db.query(
        id
          ? sql`UPDATE video_x.organizations SET name=${name},description=${x.detail ?? null} WHERE id=${id} AND revision=${revision} AND archived_at IS NULL RETURNING id`
          : sql`INSERT INTO video_x.organizations(name,description) VALUES(${name},${x.detail ?? null}) RETURNING id`,
      );
    if (!result[0]) throw conflict();
    return { id: result[0].id as string };
  }
}
export async function replaceDictionaryLinks(
  tx: Transaction,
  media: string,
  fields: { tagIds?: string[]; studioIds?: string[] },
) {
  if (fields.tagIds !== undefined) {
    await tx.query(sql`DELETE FROM video_x.media_tags WHERE media_id=${media}`);
    for (const id of fields.tagIds) {
      const inserted = await tx.query(
        sql`INSERT INTO video_x.media_tags(media_id,tag_id,is_manual) SELECT ${media},id,true FROM video_x.tags WHERE id=${id} AND archived_at IS NULL RETURNING id`,
      );
      if (!inserted.length)
        throw new AppError(400, "INVALID_TAG", "标签已不可用。");
    }
  }
  if (fields.studioIds !== undefined) {
    await tx.query(
      sql`DELETE FROM video_x.media_organizations WHERE media_id=${media} AND role='studio'`,
    );
    for (const id of fields.studioIds) {
      const inserted = await tx.query(
        sql`INSERT INTO video_x.media_organizations(media_id,organization_id,role,is_manual) SELECT ${media},id,'studio',true FROM video_x.organizations WHERE id=${id} AND archived_at IS NULL RETURNING id`,
      );
      if (!inserted.length)
        throw new AppError(400, "INVALID_STUDIO", "片商已不可用。");
    }
  }
}
