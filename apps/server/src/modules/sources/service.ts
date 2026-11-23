import type { Static } from "@sinclair/typebox";
import type {
  ApplyLookup,
  RunLookup,
  SourceNames,
  ImportFields,
} from "@video-x/contracts";
import {
  Database,
  sql,
  conflict,
  AppError,
  type Transaction,
} from "../../platform/db.js";
import { saveArtwork } from "../catalog/art.js";
import {
  providers,
  type Candidate,
  type MetadataProvider,
} from "./providers.js";
export const noNames = (): Static<typeof SourceNames> => ({
  actors: [],
  directors: [],
  series: [],
  tags: [],
  studios: [],
});
export async function enqueueLookup(
  db: Database,
  id: string,
  input: Static<typeof RunLookup>,
) {
  if (!providers.has(input.provider) || !input.query.trim())
    throw new AppError(
      400,
      "SOURCE_INVALID",
      "请选择可用来源并填写编号、片名或详情页地址。",
    );
  return db.transaction(async (tx) => {
    const [r] = await tx.query(
      sql`SELECT revision::int,stage,merged_into_id FROM video_x.import_items WHERE id=${id} FOR UPDATE`,
    );
    if (!r || r.merged_into_id || r.stage === "published") throw conflict();
    const [running] = await tx.query(
      sql`SELECT id,provider,query FROM video_x.import_lookups WHERE item_id=${id} AND state IN ('queued','running')`,
    );
    if (running) {
      if (
        running.query === input.query.trim() &&
        running.provider === input.provider
      )
        return { id: running.id };
      throw new AppError(409, "SOURCE_BUSY", "已有抓取正在执行。");
    }
    if (r.revision !== input.expectedRevision) throw conflict();
    const [job] = await tx.query(
      sql`INSERT INTO video_x.import_lookups(item_id,provider,query,state) VALUES(${id},${input.provider},${input.query.trim()},'queued') RETURNING id`,
    );
    await tx.query(
      sql`UPDATE video_x.import_items SET reviewed_revision=null,reviewed_at=null,reviewed_by=null,stage=CASE WHEN stage='ready' THEN 'probed' ELSE stage END WHERE id=${id}`,
    );
    await tx.enqueue("metadata.lookup", { id: job!.id });
    return { id: job!.id };
  });
}
export async function runLookup(
  db: Database,
  id: string,
  registry: ReadonlyMap<string, MetadataProvider> = providers,
) {
  // A crashed worker can resume a 'running' lookup; completed retries are no-ops.
  const [task] = await db.query(
    sql`UPDATE video_x.import_lookups SET state='running' WHERE id=${id} AND state IN('queued','running') RETURNING provider,query`,
  );
  if (!task) return;
  let candidate: Candidate | null = null,
    choices: unknown[] = [],
    message: string | null = null,
    state: string;
  try {
    const provider = registry.get(task.provider);
    if (!provider) throw Error("来源插件暂不可用。");
    const result = await provider.lookup(task.query);
    if ("choices" in result) {
      choices = result.choices;
      state = "choices";
    } else {
      candidate = { ...result.candidate, posterId: null };
      message = result.warning ?? null;
      if (result.cover) {
        try {
          const img = await saveArtwork(
            db,
            result.cover,
            result.cover[0] === 137 ? "image/png" : "image/jpeg",
          );
          candidate.posterId = img.id;
        } catch {
          message = "封面未保存，其余返回字段可核对。";
        }
      }
      state = "succeeded";
    }
  } catch (e) {
    state = "failed";
    message =
      e instanceof Error && e.name === "TimeoutError"
        ? "JavDB 连接超时，请重试。"
        : e instanceof Error && e.message !== "fetch failed"
          ? e.message.slice(0, 240)
          : "资料源连接失败，请检查后台网络。";
  }
  await db.query(
    sql`UPDATE video_x.import_lookups SET state=${state},candidate=${candidate ? JSON.stringify(candidate) : null}::jsonb,choices=${JSON.stringify(choices)}::jsonb,message=${message} WHERE id=${id} AND state='running'`,
  );
}
export async function acceptLookup(
  db: Database,
  id: string,
  input: Static<typeof ApplyLookup>,
) {
  return db.transaction(async (tx) => {
    const [r] = await tx.query(
      sql`SELECT draft,revision::int,stage,merged_into_id FROM video_x.import_items WHERE id=${id} FOR UPDATE`,
    );
    if (
      !r ||
      r.stage === "published" ||
      r.merged_into_id ||
      r.revision !== input.expectedRevision
    )
      throw conflict();
    const [result] = await tx.query(
      sql`SELECT id,state,candidate FROM video_x.import_lookups WHERE item_id=${id} ORDER BY created_at DESC,id DESC LIMIT 1`,
    );
    if (result?.id !== input.lookupId || result.state !== "succeeded")
      throw conflict();
    const c = result.candidate as Candidate,
      fields = r.draft as Static<typeof ImportFields>,
      sourceNames = { ...noNames(), ...fields.sourceNames };
    for (const key of input.fields) {
      const value = c[key];
      if (
        value == null ||
        value === "" ||
        (Array.isArray(value) && !value.length)
      )
        throw new AppError(400, "MISSING_FIELD", "候选缺少所选字段。");
      switch (key) {
        case "releaseDate":
          fields.releaseDate = c.releaseDate;
          fields.releaseYear = Number(c.releaseDate!.slice(0, 4));
          break;
        case "title":
          fields.title = c.title;
          break;
        case "identifier":
          fields.identifier = c.identifier;
          break;
        case "summary":
          fields.summary = c.summary;
          break;
        case "posterId":
          fields.posterId = c.posterId;
          break;
        case "supportsChinese":
          fields.supportsChinese = c.supportsChinese;
          break;
        default:
          sourceNames[key] = [...new Set([...sourceNames[key], ...c[key]])];
      }
    }
    fields.sourceNames = sourceNames;
    await tx.query(
      sql`UPDATE video_x.import_items SET draft=${JSON.stringify(fields)}::jsonb,draft_revision=draft_revision+1,reviewed_revision=null,reviewed_at=null,reviewed_by=null,stage='matched' WHERE id=${id}`,
    );
    await tx.query(
      sql`UPDATE video_x.import_lookups SET applied_fields=ARRAY(SELECT DISTINCT unnest(applied_fields || ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.fields)}::jsonb)))) WHERE id=${input.lookupId}`,
    );
  });
}

// Resolve accepted names only inside the publication transaction, shared by the container and its episodes.
export async function publishedRelations(
  tx: Transaction,
  d: Static<typeof ImportFields>,
) {
  const pending = d.sourceNames;
  if (!pending) return d;
  // Serialize creation across simultaneous publications of the same catalog names.
  if (Object.values(pending).some((names) => names.length))
    await tx.query(sql`SELECT pg_advisory_xact_lock(72649002)`);
  const resolve = async (kind: keyof typeof pending, name: string) => {
    const table =
      kind === "actors" || kind === "directors"
        ? "people"
        : kind === "series"
          ? "franchises"
          : kind === "tags"
            ? "tags"
            : "organizations";
    const field = table === "people" ? "full_name" : "name",
      tbl = sql.identifier(table),
      col = sql.identifier(field);
    const scoped =
      table === "organizations"
        ? sql`true`
        : sql`primary_category_id=${d.categoryId}`;
    const rows = await tx.query(
      sql`SELECT id FROM video_x.${tbl} WHERE ${col}=${name} AND ${scoped} AND archived_at IS NULL LIMIT 2`,
    );
    if (rows.length > 1)
      throw new AppError(
        409,
        "AMBIGUOUS_NAME",
        "同分类内存在重名资料，请在草稿中改选已有记录：" + name,
      );
    if (rows[0]) return rows[0].id as string;
    const insert =
      table === "organizations"
        ? sql`(name) VALUES(${name})`
        : table === "tags"
          ? sql`(name,normalized_name,primary_category_id) VALUES(${name},${name.normalize("NFKC").toLowerCase()},${d.categoryId}) ON CONFLICT(primary_category_id,attribute_group,normalized_name) DO UPDATE SET name=tags.name WHERE tags.archived_at IS NULL`
          : sql`(${col},primary_category_id) VALUES(${name},${d.categoryId})`;
    const [row] = await tx.query(
      sql`INSERT INTO video_x.${tbl} ${insert} RETURNING id`,
    );
    if (!row) throw conflict();
    return row.id as string;
  };
  const merged = { ...d };
  for (const [kind, field] of [
    ["actors", "actorIds"],
    ["directors", "directorIds"],
    ["series", "franchiseIds"],
    ["tags", "tagIds"],
    ["studios", "studioIds"],
  ] as const) {
    const ids = new Set(d[field] ?? []);
    for (const n of pending[kind]) {
      const name = n.trim();
      if (name) ids.add(await resolve(kind, name));
    }
    merged[field] = [...ids];
  }
  return merged;
}
