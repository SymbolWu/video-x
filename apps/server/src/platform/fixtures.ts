import { Database, sql } from "./db.js";
export const ids = {
  library: "10000000-0000-4000-8000-000000000001",
  unsorted: "20000000-0000-4000-8000-000000000001",
  cinema: "20000000-0000-4000-8000-000000000002",
  independent: "20000000-0000-4000-8000-000000000003",
  actor: "30000000-0000-4000-8000-000000000001",
  actor2: "30000000-0000-4000-8000-000000000002",
  franchise: "40000000-0000-4000-8000-000000000001",
  media: "50000000-0000-4000-8000-000000000001",
  media2: "50000000-0000-4000-8000-000000000002",
  media3: "50000000-0000-4000-8000-000000000003",
};
export async function seedFixtures(db: Database) {
  await db.transaction(async (tx) => {
    await tx.query(
      sql`INSERT INTO video_x.libraries(id,name) VALUES(${ids.library},'我的片库') ON CONFLICT(id) DO NOTHING`,
    );
    for (const [id, code, name, parent, position] of [
      [ids.unsorted, "unsorted", "未分类", null, 99],
      [ids.cinema, "cinema", "电影", null, 1],
      [ids.independent, "independent", "独立电影", ids.cinema, 2],
    ] as const)
      await tx.query(
        sql`INSERT INTO video_x.categories(id,code,name,parent_id,position,is_system) VALUES(${id},${code},${name},${parent},${position},${code === "unsorted"}) ON CONFLICT(id) DO NOTHING`,
      );
    for (const [id, name, detail, cat] of [
      [ids.actor, "沈知夏", "沈知夏 / Shen Zhixia", ids.independent],
      [ids.actor2, "程澈", "Cheng Che", ids.cinema],
    ])
      await tx.query(
        sql`INSERT INTO video_x.people(id,full_name,detailed_name,primary_category_id) VALUES(${id},${name},${detail},${cat}) ON CONFLICT(id) DO NOTHING`,
      );
    await tx.query(
      sql`INSERT INTO video_x.franchises(id,name,description,primary_category_id) VALUES(${ids.franchise},'海岸来信','虚构开发样例，关于海岸与归途的三个故事。',${ids.independent}) ON CONFLICT(id) DO NOTHING`,
    );
    for (const [n, [id, title, year, summary, cat]] of (
      [
        [
          ids.media,
          "蓝色时区",
          2024,
          "在海边收集声音的人，遇见迟到的夏天。",
          ids.independent,
        ],
        [
          ids.media2,
          "潮汐之外",
          2025,
          "向着灯塔的方向，重新寻找自己的节奏。",
          ids.cinema,
        ],
        [ids.media3, "雨落之前", null, null, ids.cinema],
      ] as const
    ).entries()) {
      await tx.query(
        sql`INSERT INTO video_x.media_items(id,library_id,kind,title,summary,release_year,release_precision,primary_category_id,published_at,cover_layout,notes) VALUES(${id},${ids.library},'movie',${title},${summary},${year},${year ? "year" : "unknown"},${cat},now(),'portrait','虚构开发资料；尚未关联视频文件') ON CONFLICT(id) DO NOTHING`,
      );
      await tx.query(
        sql`INSERT INTO video_x.credits(media_id,person_id,job,position,is_manual) VALUES(${id},${ids.actor},'actor',0,true) ON CONFLICT(media_id,person_id,job) DO NOTHING`,
      );
      await tx.query(
        sql`INSERT INTO video_x.franchise_items(franchise_id,media_id,position,is_manual) VALUES(${ids.franchise},${id},${n + 1},true) ON CONFLICT(franchise_id,media_id) DO NOTHING`,
      );
    }
  });
}
