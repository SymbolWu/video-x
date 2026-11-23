import { StoragePicker, useStorage } from "./StoragePicker";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, Modal, ErrorNotice } from "@video-x/ui";
type Row = Schemas["ImportRow"];
type Lookup = Schemas["SourceLookup"];
type Key = Schemas["ApplyLookup"]["fields"][number];
const labels: Record<Key, string> = {
  title: "片名",
  identifier: "编号",
  releaseDate: "发行日期",
  posterId: "封面",
  actors: "演员",
  directors: "导演",
  series: "系列",
  studios: "片商",
  tags: "标签",
  summary: "简介",
  supportsChinese: "中文支持",
};
const keys = Object.keys(labels) as Key[];
const present = (v: unknown) =>
  v !== null &&
  v !== undefined &&
  v !== "" &&
  (!Array.isArray(v) || v.length > 0);
export const fetching = (l?: Lookup | null) =>
  l?.state === "queued" || l?.state === "running";
const stateLabels = {
  queued: "等待抓取",
  running: "抓取中",
  failed: "抓取失败",
  choices: "待选影片",
  succeeded: "已返回候选",
};
export function SourceFacts({ lookup: l }: { lookup?: Lookup | null }) {
  if (!l) return null;
  const c = l.candidate;
  return (
    <div className="source-facts">
      <strong>
        {l.provider === "javdb" ? "JavDB" : l.provider} · {stateLabels[l.state]}
      </strong>
      {c && (
        <>
          <div className="ig-complete">
            已取得：
            {keys
              .filter((k) => present(c[k]))
              .map((k) => labels[k])
              .join("、") || "无"}
          </div>
          <div className="ig-missing">
            未取得：
            {keys
              .filter((k) => !present(c[k]))
              .map((k) => labels[k])
              .join("、") || "无"}
          </div>
          <div className="ig-muted">来源剧照：{c.previews?.length ?? 0} 张</div>
        </>
      )}
      {l.message && <div className="ig-muted">{l.message}</div>}
    </div>
  );
}
const defaultQuery = (r: Row) =>
  r.fields.identifier ||
  r.fields.title.match(
    /(?:^|[^A-Za-z0-9])([A-Za-z]{2,12}[-_ ]\d{2,8})(?!\d)/,
  )?.[1] ||
  r.fields.title;
function useProviders() {
  return useQuery({
    queryKey: ["metadata-providers"],
    queryFn: () => unwrap(api.GET("/api/sources")),
  });
}
export function LookupForm({
  rows,
  finish,
}: {
  rows: Row[];
  finish: () => void;
}) {
  const source = useProviders(),
    cache = useQueryClient();
  const [code, choose] = useState(""),
    [queries, set] = useState<Record<string, string>>(() =>
      Object.fromEntries(rows.map((r) => [r.id, defaultQuery(r)])),
    ),
    [done, mark] = useState<string[]>([]),
    [busy, wait] = useState(false),
    [error, fail] = useState("");
  const provider = code || source.data?.[0]?.code || "";
  async function submit() {
    wait(true);
    fail("");
    try {
      for (const row of rows.filter((r) => !done.includes(r.id))) {
        await unwrap(
          api.POST("/api/imports/{id}/lookup", {
            params: { path: { id: row.id } },
            body: {
              provider,
              query: queries[row.id]!.trim(),
              expectedRevision: row.revision,
            },
          }),
        );
        mark((old) => [...old, row.id]);
      }
      await cache.invalidateQueries({ queryKey: ["intake"] });
      finish();
    } catch (e) {
      fail((e as Error).message);
      void cache.invalidateQueries({ queryKey: ["intake"] });
    } finally {
      wait(false);
    }
  }
  return (
    <form
      className="source-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label>
        资料来源
        <Select
          label="资料来源"
          value={provider}
          options={(source.data ?? []).map((p) => ({
            value: p.code,
            label: p.name,
          }))}
          onValueChange={choose}
        />
      </label>
      {rows.map((r) => (
        <label key={r.id}>
          {rows.length === 1 ? "编号、片名或详情页 URL" : r.fields.title}
          <input
            required
            maxLength={420}
            disabled={busy || done.includes(r.id)}
            value={queries[r.id] ?? ""}
            onChange={(e) => set({ ...queries, [r.id]: e.target.value })}
          />
        </label>
      ))}
      <ErrorNotice error={error || source.error} />
      <div className="actions">
        <button
          className="btn primary small"
          disabled={
            busy || !provider || rows.some((r) => !queries[r.id]?.trim())
          }
        >
          开始抓取{rows.length > 1 ? " · " + rows.length + " 条" : ""}
        </button>
      </div>
    </form>
  );
}
function current(
  r: Row,
  k: Key,
): string | string[] | boolean | null | undefined {
  const f = r.fields,
    n = f.sourceNames;
  switch (k) {
    case "actors":
      return [...r.actors, ...(n?.actors ?? [])];
    case "directors":
      return [...(r.directors ?? []), ...(n?.directors ?? [])];
    case "series":
      return [...r.series, ...(n?.series ?? [])];
    case "studios":
    case "tags": {
      const ids = k === "tags" ? f.tagIds : f.studioIds;
      return [
        ...(ids?.length ? ["已关联 " + ids.length + " 项"] : []),
        ...(n?.[k] ?? []),
      ];
    }
    case "releaseDate":
      return f.releaseDate || f.releaseYear?.toString();
    default:
      return f[k];
  }
}
function Display({
  value,
  field,
}: {
  value: ReturnType<typeof current>;
  field: Key;
}) {
  if (!present(value)) return <>—</>;
  if (field === "posterId")
    return (
      <img alt="封面" className="lookup-poster" src={"/api/art/" + value} />
    );
  return (
    <>
      {Array.isArray(value)
        ? value.join("、")
        : typeof value === "boolean"
          ? value
            ? "支持"
            : "不支持"
          : value}
    </>
  );
}
function Proposal({
  row,
  changed,
  locked,
}: {
  row: Row;
  changed: (r: Row) => void;
  locked: boolean;
}) {
  const l = row.lookup!,
    c = l.candidate!,
    cache = useQueryClient();
  const [chosen, choose] = useState<Key[]>(() =>
      keys.filter(
        (k) =>
          present(c[k]) &&
          !present(current(row, k)) &&
          !l.appliedFields.includes(k),
      ),
    ),
    [busy, wait] = useState(false),
    [err, fail] = useState(""),
    [message, say] = useState("");
  async function apply() {
    wait(true);
    fail("");
    try {
      const r = await unwrap(
        api.POST("/api/imports/{id}/lookup/apply", {
          params: { path: { id: row.id } },
          body: {
            lookupId: l.id,
            expectedRevision: row.revision,
            fields: chosen,
          },
        }),
      );
      changed(r);
      choose([]);
      say("所选字段已写入草稿，等待人工核对。");
      await cache.invalidateQueries({ queryKey: ["intake"] });
    } catch (e) {
      fail((e as Error).message);
    } finally {
      wait(false);
    }
  }
  return (
    <>
      <div className="actions">
        <a href={c.url} target="_blank" rel="noreferrer">
          查看来源详情 ↗
        </a>
      </div>
      {((c.previews?.length ?? 0) > 0 || (c.references?.length ?? 0) > 0) && (
        <details className="source-refs">
          <summary>来源链接与剧照</summary>
          <div>
            {c.references?.map((x, i) => (
              <a key={i} href={x.url} target="_blank" rel="noreferrer">
                {labels[x.kind]} · {x.name}
              </a>
            ))}
          </div>
          <div>
            {c.previews?.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                剧照 {i + 1}
              </a>
            ))}
          </div>
        </details>
      )}
      <h3>选择采用的字段</h3>
      <p className="ig-dialog-note">
        只更新勾选字段。演员、导演、系列、标签和片商会追加到草稿，发布时建立关联。
      </p>
      <div className="lookup-fields">
        <div className="lookup-line lookup-head">
          <span>采用</span>
          <span>字段</span>
          <span>当前草稿</span>
          <span>来源候选</span>
        </div>
        {keys.map((k) => (
          <label key={k} className="lookup-line">
            <input
              type="checkbox"
              aria-label={"采用" + labels[k]}
              disabled={locked || busy || !present(c[k])}
              checked={chosen.includes(k)}
              onChange={(e) =>
                choose(
                  e.target.checked
                    ? [...chosen, k]
                    : chosen.filter((x) => x !== k),
                )
              }
            />
            <span>{labels[k]}</span>
            <span>
              <Display field={k} value={current(row, k)} />
            </span>
            <span>
              <Display field={k} value={c[k]} />
            </span>
          </label>
        ))}
      </div>
      <ErrorNotice error={err} />
      {message && <p role="status">{message}</p>}
      <button
        type="button"
        disabled={locked || busy || !chosen.length}
        className="btn primary small"
        onClick={() => void apply()}
      >
        采用所选到草稿
      </button>
    </>
  );
}
export function SourceReview({
  row,
  changed,
  locked = false,
}: {
  row: Row;
  changed: (r: Row) => void;
  locked?: boolean;
}) {
  const l = row.lookup,
    cache = useQueryClient();
  const [search, show] = useState(false),
    [busy, wait] = useState(false),
    [err, fail] = useState("");
  async function pick(url: string) {
    wait(true);
    fail("");
    try {
      await unwrap(
        api.POST("/api/imports/{id}/lookup", {
          params: { path: { id: row.id } },
          body: {
            provider: l!.provider,
            query: url,
            expectedRevision: row.revision,
          },
        }),
      );
      await cache.invalidateQueries({ queryKey: ["intake"] });
    } catch (e) {
      fail((e as Error).message);
    } finally {
      wait(false);
    }
  }
  return (
    <div className="lookup-panel">
      <SourceFacts lookup={l} />
      {locked && <p className="ig-dialog-note">请先保存当前编辑。</p>}
      <ErrorNotice error={err} />
      {l?.state === "choices" && (
        <section>
          <h3>选择匹配影片</h3>
          {l.choices.map((x) => (
            <button
              className="lookup-choice"
              key={x.url}
              disabled={locked || busy}
              onClick={() => void pick(x.url)}
            >
              {x.identifier} · {x.title}
            </button>
          ))}
        </section>
      )}
      {l?.candidate && (
        <Proposal key={l.id} row={row} changed={changed} locked={locked} />
      )}
      {(search || !l) && !locked ? (
        <LookupForm
          key={l?.id || "new"}
          rows={[row]}
          finish={() => show(false)}
        />
      ) : (
        <button
          type="button"
          disabled={locked || fetching(l)}
          className="btn ghost small"
          onClick={() => show(true)}
        >
          {fetching(l) ? "正在抓取…" : l ? "重新查询" : "查询来源"}
        </button>
      )}
    </div>
  );
}
export function QueueSource({ id, close }: { id: string; close: () => void }) {
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ["intake", "draft", id],
    queryFn: () =>
      unwrap(api.GET("/api/imports/{id}", { params: { path: { id } } })),
    refetchInterval: (q) => (fetching(q.state.data?.lookup) ? 900 : false),
  });
  return (
    <Modal
      title={(q.data?.lookup?.candidate ? "核对字段 · " : "在线抓取 · ") + (q.data?.fields.title ?? "读取中")}
      close={close}
    >
      <div className="intake-form">
        <ErrorNotice error={q.error} />
        {q.data && (
          <SourceReview
            row={q.data}
            changed={(r) => cache.setQueryData(["intake", "draft", id], r)}
          />
        )}
      </div>
    </Modal>
  );
}
export function BindForm({
  row,
  changed,
  locked = false,
}: {
  row: Row;
  changed: (r: Row) => void;
  locked?: boolean;
}) {
  const cache = useQueryClient();
  const [path, set] = useState(""),
    [busy, wait] = useState(false),
    [error, fail] = useState("");
  const storage = useStorage(),
    [pick, choose] = useState(false);
  async function bind() {
    wait(true);
    fail("");
    try {
      const r = await unwrap(
        api.POST("/api/imports/{id}/file", {
          params: { path: { id: row.id } },
          body: { relativePath: path.trim(), expectedRevision: row.revision },
        }),
      );
      changed(r);
      await cache.invalidateQueries({ queryKey: ["intake"] });
    } catch (e) {
      fail((e as Error).message);
    } finally {
      wait(false);
    }
  }
  if (pick)
    return (
      <StoragePicker
        bind={row}
        close={() => choose(false)}
        finished={(_, r) => {
          choose(false);
          if (r) changed(r);
        }}
      />
    );
  return (
    <form
      className="source-form"
      onSubmit={(e) => {
        e.preventDefault();
        void bind();
      }}
    >
      {storage.data?.inbox && (
        <button
          className="btn ghost"
          type="button"
          disabled={busy || locked}
          onClick={() => choose(true)}
        >
          从 {storage.data.inbox} 选择
        </button>
      )}
      <label>
        媒体目录中的文件
        <input
          value={path}
          onChange={(e) => set(e.target.value)}
          placeholder="例如：旅行/上集.mp4"
          maxLength={2048}
          required
        />
      </label>
      <p className="ig-dialog-note">
        {locked
          ? "请先保存当前编辑。"
          : "支持 MP4、MKV。若扫描已为此文件生成未经编辑的草稿，会合并到当前草稿。"}
      </p>
      <ErrorNotice error={error} />
      <button
        className="btn primary small"
        disabled={busy || locked || !path.trim()}
      >
        绑定并读取文件
      </button>
    </form>
  );
}
