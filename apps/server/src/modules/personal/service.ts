import type { Static } from "@sinclair/typebox";
import {
  MediaStatePatch,
  CollectionCreate,
  CollectionItems,
  type CollectionDto,
} from "@video-x/contracts";
import {
  Database,
  sql,
  conflict,
  notFound,
  AppError,
  requireChanged,
} from "../../platform/db.js";
import { checkActive } from "../catalog/service.js";
export class Personal {
  constructor(private db: Database) {}
  async state(
    profileId: string,
    mediaId: string,
    input: Static<typeof MediaStatePatch>,
  ) {
    if (
      input.isFavorite === undefined &&
      input.rating === undefined &&
      input.watched === undefined
    )
      throw new AppError(400, "EMPTY_PATCH", "请提交需要修改的内容");
    await this.db.transaction(async (tx) => {
      await checkActive(tx, "media_items", [mediaId]);
      if (input.expectedRevision === 0) {
        const row = await tx.query(
          sql`INSERT INTO video_x.user_media_state(profile_id,media_id,is_favorite,favorited_at,rating,watched_at) VALUES(${profileId},${mediaId},${input.isFavorite ?? false},${input.isFavorite ? new Date() : null},${input.rating ?? null},${input.watched ? new Date() : null}) ON CONFLICT(profile_id,media_id) DO NOTHING RETURNING media_id`,
        );
        if (!row.length) throw conflict();
      } else {
        const updates = [];
        if (input.isFavorite !== undefined)
          updates.push(
            sql`is_favorite=${input.isFavorite},favorited_at=CASE WHEN ${input.isFavorite}=false THEN NULL WHEN is_favorite=true THEN favorited_at ELSE now() END`,
          );
        if (input.rating !== undefined)
          updates.push(sql`rating=${input.rating}`);
        if (input.watched !== undefined)
          updates.push(
            sql`watched_at=${input.watched ? sql`COALESCE(watched_at,now())` : sql`NULL`}`,
          );
        const rows = await tx.query(
          sql`UPDATE video_x.user_media_state SET ${sql.join(updates, sql`, `)} WHERE profile_id=${profileId} AND media_id=${mediaId} AND revision=${input.expectedRevision} RETURNING media_id`,
        );
        if (!rows.length) throw conflict();
      }
    });
  }
  async collections(profileId: string) {
    return this.db.query<CollectionDto>(
      sql`SELECT c.id,c.name,c.description,ARRAY(SELECT mi.asset_id FROM video_x.collection_items ci JOIN video_x.media_images mi ON mi.media_id=ci.media_id AND mi.purpose='poster' AND mi.position=1 WHERE ci.collection_id=c.id ORDER BY ci.position LIMIT 3) AS "coverIds",(SELECT mi.asset_id FROM video_x.collection_items ci JOIN video_x.media_images mi ON mi.media_id=ci.media_id AND mi.purpose='poster' WHERE ci.collection_id=c.id ORDER BY ci.position,mi.position LIMIT 1) AS "coverId",c.revision::int,COALESCE((SELECT json_agg(ci.media_id ORDER BY ci.position,ci.id) FROM video_x.collection_items ci WHERE ci.collection_id=c.id),'[]'::json) AS "mediaIds" FROM video_x.collections c WHERE c.profile_id=${profileId} AND c.archived_at IS NULL ORDER BY c.created_at DESC,c.id`,
    );
  }
  async createCollection(
    profileId: string,
    input: Static<typeof CollectionCreate>,
  ) {
    const name = input.name.trim(),
      normalized = name.normalize("NFKC").toLocaleLowerCase("en-US");
    const [row] = await this.db.query<{ id: string }>(
      sql`INSERT INTO video_x.collections(profile_id,name,normalized_name,description) VALUES(${profileId},${name},${normalized},${input.description ?? null}) RETURNING id`,
    );
    return (await this.collections(profileId)).find((x) => x.id === row!.id)!;
  }
  async renameCollection(
    profile: string,
    id: string,
    input: {
      name: string;
      description?: string | null;
      expectedRevision: number;
    },
  ) {
    const name = input.name.trim();
    const changed = await this.db.query(
      sql`UPDATE video_x.collections SET name=${name},normalized_name=${name.normalize("NFKC").toLocaleLowerCase("en-US")},description=${input.description ?? null} WHERE profile_id=${profile} AND id=${id} AND archived_at IS NULL AND revision=${input.expectedRevision} RETURNING id`,
    );
    await requireChanged(changed, () =>
      this.db.query(
        sql`SELECT id FROM video_x.collections WHERE id=${id} AND profile_id=${profile} AND archived_at IS NULL`,
      ),
    );
    return (await this.collections(profile)).find((c) => c.id === id)!;
  }
  async setCollectionItems(
    profileId: string,
    id: string,
    input: Static<typeof CollectionItems>,
  ) {
    await this.db.transaction(async (tx) => {
      const rows = await tx.query(
        sql`UPDATE video_x.collections SET name=name WHERE id=${id} AND profile_id=${profileId} AND archived_at IS NULL AND revision=${input.expectedRevision} RETURNING id`,
      );
      await requireChanged(rows, () =>
        tx.query(
          sql`SELECT id FROM video_x.collections WHERE id=${id} AND profile_id=${profileId} AND archived_at IS NULL`,
        ),
      );
      await checkActive(tx, "media_items", input.mediaIds);
      await tx.query(
        sql`DELETE FROM video_x.collection_items WHERE collection_id=${id}`,
      );
      for (const [n, mediaId] of input.mediaIds.entries())
        await tx.query(
          sql`INSERT INTO video_x.collection_items(collection_id,media_id,position) VALUES(${id},${mediaId},${n + 1})`,
        );
    });
    const result = (await this.collections(profileId)).find((x) => x.id === id);
    if (!result) throw notFound();
    return result;
  }
}
