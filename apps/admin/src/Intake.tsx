import {
  BindForm,
  QueueSource,
  LookupForm,
  DraftCoverage,
  FieldPreview,
  lookupLabel,
  fetching,
} from "./SourceReview";
import {
  StoragePicker,
  MoveStatus,
  moveDestination,
  moveActive,
  useStorage,
} from "./StoragePicker";
import { formatBytes } from "./formatBytes";
import { DraftWorkspace } from "./DraftWorkspace";
import { StudioIcon } from "./StudioIcon";
import fallbackPoster from "../../../design/2026-11-redesign/preview/studio/assets/placeholder.svg";

import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, Modal, ErrorNotice, Pager } from "@video-x/ui";
type Row = Schemas["ImportRow"];

const tabs = {
  all: "全部",
  episode: "分集线索",
  missing: "缺少资料",
  blocked: "发布阻断",
  failed: "探测失败",
  unbound: "待绑定文件",
  retrieved: "已抓取",
  lookupFailed: "抓取失败",
  reviewed: "已确认",
  published: "已发布",
} as const;
const stageTabs = {
  all: "全部",
  pending: "待核对",
  reviewed: "已确认",
  published: "已发布",
} as const;
function IntakeCover({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const draft = row.fields.posterId,
    source = row.lookup?.candidate?.posterId;
  const ids = [...new Set([draft, source].filter((id): id is string => !!id))];
  if (!ids.length)
    return (
      <span className="queue-no-cover">
        <StudioIcon name="film" />
        <small>缺封面</small>
      </span>
    );
  return (
    <>
      <button
        type="button"
        className="queue-cover"
        onClick={() => setOpen(true)}
        aria-label={"放大" + row.fields.title + "的封面"}
      >
        <img src={"/api/art/" + ids[0]} alt="" />
        <small>{draft ? "草稿" : "候选"}</small>
      </button>
      {open && (
        <Modal
          title={"封面预览 · " + row.fields.title}
          close={() => setOpen(false)}
        >
          <div className="cover-compare">
            {ids.map((id) => (
              <figure key={id}>
                <figcaption>
                  {id === draft
                    ? id === source
                      ? "草稿与来源封面"
                      : "当前草稿"
                    : "来源候选"}
                </figcaption>
                <img src={"/api/art/" + id} alt={row.fields.title + "封面"} />
              </figure>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function poster(r: Row) {
  return r.fields.posterId ? "/api/art/" + r.fields.posterId : fallbackPoster;
}
function issue(row: Row) {
  if (row.needsTarget) return "待设整理目标";
  if (moveActive(row)) return "整理任务处理中";
  if (fetching(row.lookup)) return "在线资料抓取中";
  if (row.availability === "unbound") return "待绑定文件";
  if (row.availability !== "present") return "文件离线";
  if (row.probeStatus !== "succeeded") return "探测失败";
  return "";
}
function missing(r: Row) {
  return [
    !r.fields.posterId && "封面",
    !r.fields.summary && "简介",
    !r.fields.releaseYear && "发行日期",
    !r.actors.length && !r.fields.sourceNames?.actors.length && "演员",
    r.categoryName === "未分类" && "分类",
  ]
    .filter(Boolean)
    .join("、");
}
function ReviewCard({
  row: r,
  edit,
  compare,
}: {
  row: Row;
  edit: () => void;
  compare?: () => void;
}) {
  return (
    <article>
      <IntakeCover row={r} />
      <div>
        <h3>{r.fields.title}</h3>
        <p>
          {[...r.actors, ...(r.fields.sourceNames?.actors ?? [])].join("、") ||
            "无演员"}{" "}
          · {r.categoryName} ·{" "}
          {r.fields.releaseDate ?? r.fields.releaseYear ?? "日期未知"}
        </p>
        <p>
          本地文件探测 ·{" "}
          {[...r.series, ...(r.fields.sourceNames?.series ?? [])].join("、") ||
            "未关联系列"}
        </p>
        <p className="ig-muted">{r.relativePath}</p>
        <MoveStatus row={r} />
        <p>{r.fields.summary || "暂无简介"}</p>
        <DraftCoverage row={r} />
        {r.lookup?.candidate && compare && (
          <button type="button" className="cell-action" onClick={compare}>
            核对来源字段
          </button>
        )}
        <div className="ig-gaps">
          {issue(r) && <span className="ig-error">{issue(r)}</span>}
        </div>
      </div>
      <a
        href={"#draft/" + r.id}
        onClick={(e) => {
          e.preventDefault();
          edit();
        }}
      >
        修改 ↗
      </a>
    </article>
  );
}
export function Intake({
  categories,
  toMedia,
}: {
  categories: Schemas["Category"][];
  toMedia: (id: string) => void;
}) {
  const cache = useQueryClient(),
    [status, filter] = useState<keyof typeof tabs>("all"),
    [stage, setStage] = useState<keyof typeof stageTabs>("all"),
    [page, setPage] = useState(1),
    [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{
      row: Row;
      kind: "edit" | "review" | "publish";
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [expanded, expand] = useState<string[]>([]),
    [previewAll, setPreviewAll] = useState(false);
  const readEditor = () =>
    location.hash.match(/^#draft\/([0-9a-f-]{36})$/i)?.[1] ?? "";
  const [editorId, setEditorId] = useState(readEditor);
  useEffect(() => {
    const update = () => setEditorId(readEditor());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const editor = useQuery({
    queryKey: ["intake", "draft", editorId],
    enabled: !!editorId,
    refetchInterval: (q) => (fetching(q.state.data?.lookup) ? 900 : false),
    queryFn: () =>
      unwrap(
        api.GET("/api/imports/{id}", { params: { path: { id: editorId } } }),
      ),
  });
  const [hiddenGroups, hideGroups] = useState<string[]>([]);

  const storage = useStorage();
  const [picker, setPicker] = useState<"inbox" | Row[] | null>(null);

  const [organizeRows, setOrganizeRows] = useState<Row[] | null>(null),
    [bulkCategory, setBulkCategory] = useState("");
  const [binding, bindRow] = useState<Row | null>(null),
    [lookupId, showLookup] = useState(""),
    [batchLookup, setBatchLookup] = useState<Row[] | null>(null);
  const [selection, select] = useState<Row[]>([]),
    [groupName, setGroupName] = useState(""),
    [groupOpen, showGroup] = useState(false);
  const [sourceId, setSourceId] = useState(""),
    [start, setStart] = useState(1),
    [batch, setBatch] = useState<"review" | "publish" | null>(null);
  const [existingGroup, setExistingGroup] = useState("");
  const [batchRows, setBatchRows] = useState<Row[]>([]);
  const [groupRows, setGroupRows] = useState<Row[]>([]);
  const source = groupRows.find((r) => r.id === sourceId) ?? groupRows[0];

  const counts = useQuery({
    queryKey: ["intake", "counts"],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          (
            [...Object.keys(tabs), "pending"] as (
              | keyof typeof tabs
              | "pending"
            )[]
          ).map(async (status) => [
            status,
            (
              await unwrap(
                api.GET("/api/imports", {
                  params: { query: { status, pageSize: 1 } },
                }),
              )
            ).total,
          ]),
        ),
      ),
  });
  const queue = useQuery({
    queryKey: ["intake", page, stage, status, q],
    queryFn: () =>
      unwrap(
        api.GET("/api/imports", {
          params: {
            query: {
              page,
              pageSize: 20,
              status,
              stage: stage === "all" ? undefined : stage,
              q: q || undefined,
            },
          },
        }),
      ),
    refetchInterval: (q) =>
      q.state.data?.scanning ||
      q.state.data?.lookingUp ||
      q.state.data?.items.some(moveActive)
        ? 1000
        : false,
  });
  const data = queue.data;
  const previousActive = useRef(false);
  useEffect(() => {
    if (!data) return;
    const active = data.lookingUp || data.items.some(moveActive);
    if (previousActive.current && !active)
      void cache.invalidateQueries({ queryKey: ["intake", "counts"] });
    previousActive.current = active;
  }, [data, cache]);
  const selectable = (data?.items ?? []).filter((r) => !r.publishedMediaId);
  useEffect(() => {
    if (!data) return;
    const visible = new Map(data.items.map((r) => [r.id, r]));
    select((old) =>
      old.map((r) => visible.get(r.id) ?? r).filter((r) => !r.publishedMediaId),
    );
  }, [data]);
  function open(row: Row, kind: "edit" | "review" | "publish") {
    setError("");
    setNotice("");
    if (kind === "edit") {
      location.hash = "draft/" + row.id;
      setDialog(null);
    } else if (kind === "publish") {
      void preparePublish([row]);
    } else setDialog({ row, kind });
  }
  async function perform(call: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await call();
      setDialog(null);
      setNotice(message);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["intake"] }),
        cache.invalidateQueries({ queryKey: ["list"] }),
      ]);
    } catch (err) {
      setError((err as Error).message);
      void queue.refetch();
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy) {
      setDialog(null);
      setError("");
    }
  };
  const ordered: { r: Row; groupHeader: boolean }[] = [];
  const grouped = new Set<string>();
  for (const r of data?.items ?? []) {
    if (!r.group) {
      ordered.push({ r, groupHeader: false });
      continue;
    }
    const id = r.group.id;
    if (grouped.has(id)) continue;
    grouped.add(id);
    const members = data!.items
      .filter((x) => x.group?.id === id)
      .sort((a, b) => a.group!.position - b.group!.position);
    members.forEach((member, i) =>
      ordered.push({ r: member, groupHeader: i === 0 }),
    );
  }
  async function selectGroup(id: string) {
    try {
      const { items } = await unwrap(
        api.GET("/api/imports", {
          params: { query: { groupId: id, pageSize: 100 } },
        }),
      );
      select((prev) => [
        ...prev.filter((x) => x.group?.id !== id),
        ...items
          .filter((x) => !x.publishedMediaId)
          .sort((a, b) => a.group!.position - b.group!.position),
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function groupMembers(id: string) {
    const { items } = await unwrap(
      api.GET("/api/imports", {
        params: { query: { groupId: id, pageSize: 100 } },
      }),
    );
    return items.sort((a, b) => a.group!.position - b.group!.position);
  }
  async function adjust(id: string) {
    try {
      const items = await groupMembers(id),
        first = items[0];
      if (!first?.group) return;
      setExistingGroup(id);
      setGroupRows(items);
      setGroupName(first.group.title);
      setSourceId(first.group.sourceId ?? first.id);
      setStart(first.group.position);
      setError("");
      showGroup(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function preparePublish(rows: Row[]) {
    setBusy(true);
    setError("");
    try {
      const ids = [
        ...new Set(rows.flatMap((r) => (r.group ? [r.group.id] : []))),
      ];
      const groups = await Promise.all(ids.map(groupMembers));
      setBatchRows([
        ...rows.filter((r) => !r.group),
        ...groups.flat().filter((r) => !r.publishedMediaId),
      ]);
      setBatch("publish");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function ungroup(id: string) {
    if (window.confirm("解除整个未发布的分集容器？各集草稿和文件将保留。"))
      void perform(async () => {
        await unwrap(
          api.DELETE("/api/imports/groups/{id}", { params: { path: { id } } }),
        );
        select((old) => old.filter((x) => x.group?.id !== id));
      }, "已解除容器。");
  }
  async function updateCategory(r: Row, categoryId: string) {
    if (categoryId === r.fields.categoryId) return;
    await perform(async () => {
      const params = { path: { id: r.id } };
      await unwrap(
        api.PUT("/api/imports/{id}", {
          params,
          body: {
            expectedRevision: r.revision,
            fields: { ...r.fields, categoryId },
          },
        }),
      );
      const updated = await unwrap(api.GET("/api/imports/{id}", { params }));
      select((old) => old.map((x) => (x.id === r.id ? updated : x)));
    }, "已更新分类，当前版本待核对。");
  }
  if (editorId) {
    if (editor.isError)
      return (
        <>
          <ErrorNotice error={editor.error} />
          <a className="btn ghost" href="#ingest">
            返回录入队列
          </a>
        </>
      );
    return editor.data ? (
      <DraftWorkspace
        key={editorId}
        row={editor.data}
        categories={categories}
        back={() => {
          location.hash = "ingest";
        }}
      />
    ) : (
      <p role="status">正在读取草稿…</p>
    );
  }
  return (
    <section className="ig-page">
      <header className="queue-heading">
        <h1>录入工作台</h1>
        {storage.data?.inbox ? (
          <button className="btn primary" onClick={() => setPicker("inbox")}>
            <StudioIcon name="folder" />从{" "}
            {storage.data.inbox.split("/").at(-1)} 选择文件
          </button>
        ) : (
          <a className="btn primary" href="#settings">
            设置下载目录
          </a>
        )}
      </header>
      {storage.data?.inbox && (
        <p className="inbox-location">
          <StudioIcon name="folder" />
          {storage.data.volume} / {storage.data.inbox}
        </p>
      )}
      <div className="queue-toolbar">
        <nav aria-label="录入队列状态">
          {(Object.keys(stageTabs) as (keyof typeof stageTabs)[]).map((k) => (
            <button
              key={k}
              aria-pressed={stage === k}
              onClick={() => {
                setStage(k);
                setPage(1);
              }}
            >
              {stageTabs[k]} <small>{counts.data?.[k] ?? "—"}</small>
            </button>
          ))}
        </nav>
        <Select
          label="更多状态"
          value={status}
          onValueChange={(v) => {
            filter(v as keyof typeof tabs);
            setPage(1);
          }}
          options={[
            { value: "all", label: "更多状态" },
            ...Object.entries(tabs)
              .filter(([k]) => !(k in stageTabs))
              .map(([value, label]) => ({ value, label })),
          ]}
        />
        <form
          id="ig-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(String(new FormData(e.currentTarget).get("q") ?? "").trim());
            setPage(1);
          }}
        >
          <button className="icon-btn" aria-label="执行录入搜索">
            <StudioIcon name="search" />
          </button>
          <input
            aria-label="搜索录入队列"
            name="q"
            type="search"
            maxLength={200}
            placeholder="搜索影片、演员或文件"
            title="支持片名、主编号、演员、导演和文件路径"
          />
        </form>
      </div>
      <div className="queue-batch" role="group" aria-label="批量操作">
        <div>
          <strong>
            {selection.length ? "已选 " + selection.length + " 项" : "选择文件"}
          </strong>
          {selection.some((r) => !selectable.some((x) => x.id === r.id)) && (
            <small>含其他页草稿</small>
          )}
          <button
            disabled={!selection.length || busy}
            onClick={() => select([])}
          >
            取消选择
          </button>
        </div>
        <div role="group" aria-label="文件整理">
          <button
            disabled={
              !storage.data?.inbox ||
              !selection.length ||
              busy ||
              selection.some(
                (r) => r.availability !== "present" || moveActive(r),
              )
            }
            onClick={() => setPicker([...selection])}
          >
            <StudioIcon name="folder" />
            设置整理目标
          </button>
          <button
            className="btn ghost small"
            data-action="ig-group-new"
            disabled={
              selection.some((r) => r.availability === "unbound") ||
              selection.length < 2 ||
              selection.some((r) => r.group) ||
              busy
            }
            onClick={() => {
              setGroupName(
                selection[0]?.fields.title
                  .replace(
                    /\s*[·._\s-]*\s*(?:(?:part|ep)[\s._-]*\d+|[上下][篇部集])\s*$/i,
                    "",
                  )
                  .trim() ?? "",
              );
              setSourceId(selection[0]!.id);
              setStart(1);
              setExistingGroup("");
              setGroupRows([...selection]);
              showGroup(true);
            }}
          >
            创建分集容器
          </button>
        </div>
        <div role="group" aria-label="资料补充">
          <button
            disabled={busy || !selection.length}
            onClick={() => {
              setBulkCategory(selection[0]!.fields.categoryId);
              setOrganizeRows([...selection]);
              setError("");
            }}
          >
            设置主分类
          </button>
          <button
            disabled={
              !selection.length ||
              busy ||
              selection.some((r) => fetching(r.lookup))
            }
            onClick={() => setBatchLookup([...selection])}
          >
            抓取所选
          </button>
        </div>
        <div role="group" aria-label="核对与发布">
          {" "}
          <button
            disabled={
              busy ||
              !selection.length ||
              selection.every((r) => r.reviewed) ||
              selection.some((r) => issue(r))
            }
            className="btn ghost small"
            data-action="ig-review-selected"
            onClick={() => {
              setBatchRows(selection);
              setBatch("review");
            }}
          >
            批量核对
          </button>
          <button
            disabled={
              busy ||
              !selection.length ||
              selection.some((r) => !r.reviewed || issue(r))
            }
            className="btn ghost small"
            data-action="ig-publish"
            onClick={() => void preparePublish(selection)}
          >
            {selection.some((r) => r.move) ? "移动并发布" : "发布所选"}
          </button>
        </div>
      </div>
      {groupOpen && (
        <Modal
          title={existingGroup ? "调整分集容器" : "创建分集容器"}
          close={() => !busy && showGroup(false)}
        >
          <form
            className="intake-form"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                const body = {
                  title: groupName.trim(),
                  sourceId,
                  startNumber: start,
                  members: groupRows.map((r) => ({
                    id: r.id,
                    revision: r.revision,
                  })),
                };
                if (existingGroup)
                  await unwrap(
                    api.PUT("/api/imports/groups/{id}", {
                      params: { path: { id: existingGroup } },
                      body,
                    }),
                  );
                else await unwrap(api.POST("/api/imports/groups", { body }));
                select([]);
                showGroup(false);
              }, "已保存分集容器，请核对后发布。");
            }}
          >
            <div className="ig-group-fields">
              <label>
                容器名称
                <input
                  autoFocus
                  value={groupName}
                  required
                  maxLength={300}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </label>
              <label>
                容器资料取自
                <Select
                  label="容器资料取自"
                  value={sourceId}
                  onValueChange={setSourceId}
                  options={groupRows.map((r) => ({
                    value: r.id,
                    label: r.fields.title,
                  }))}
                />
              </label>
              <label>
                起始集号
                <input
                  type="number"
                  min={1}
                  max={9000}
                  required
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="ig-tree">
              {source && (
                <div className="ig-container-preview">
                  {<img src={poster(source)} alt="容器封面" />}
                  <div>
                    <small>容器资料预览 · 按集播放</small>
                    <h3>{groupName}</h3>
                    <p>
                      {source.categoryName} ·{" "}
                      {source.actors.join("、") || "未填演员"}
                    </p>
                    <p className="ig-muted">
                      {source.fields.summary || "未填简介"}
                    </p>
                  </div>
                </div>
              )}
              <h3 className="order-heading">分集顺序</h3>
              <ol aria-label="分集顺序" className="ig-episode-order">
                {groupRows.map((r, i) => (
                  <li key={r.id}>
                    <span>第 {start + i} 集</span>
                    <div>
                      <strong>{r.fields.title}</strong>
                      <small>{r.relativePath}</small>
                    </div>
                    <div>
                      {[-1, 1].map((d) => (
                        <button
                          key={d}
                          className="btn ghost small"
                          type="button"
                          disabled={i + d < 0 || i + d >= groupRows.length}
                          onClick={() =>
                            setGroupRows((rows) => {
                              const next = [...rows];
                              [next[i], next[i + d]] = [next[i + d]!, next[i]!];
                              return next;
                            })
                          }
                        >
                          {d < 0 ? "上移" : "下移"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <ErrorNotice error={error} />
            <div className="actions">
              <small className="group-foot-caption">各集保留自己的文件</small>
              <button
                type="button"
                className="btn ghost small"
                disabled={busy}
                onClick={() => showGroup(false)}
              >
                取消
              </button>
              <button
                className="btn primary small"
                disabled={!groupName.trim() || busy}
              >
                {existingGroup
                  ? "保存容器与集顺序"
                  : "创建容器并关联 " + groupRows.length + " 集"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {organizeRows && (
        <Modal
          title={"整理所选 " + organizeRows.length + " 条草稿"}
          close={() => !busy && setOrganizeRows(null)}
        >
          <div className="intake-form">
            <p className="ig-dialog-intro">
              修改主分类后，涉及的草稿需要重新核对。
            </p>
            <label>
              将所选草稿归入
              <Select
                label="批量设置分类"
                value={bulkCategory}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                onValueChange={setBulkCategory}
              />
            </label>
            <ErrorNotice error={error} />
            <div className="actions">
              <button
                className="btn ghost small"
                onClick={() => setOrganizeRows(null)}
                disabled={busy}
              >
                取消
              </button>
              <button
                className="btn primary small"
                disabled={busy || !bulkCategory}
                onClick={() =>
                  void perform(async () => {
                    for (const r of organizeRows) {
                      if (r.fields.categoryId !== bulkCategory) {
                        const next = await unwrap(
                          api.PUT("/api/imports/{id}", {
                            params: { path: { id: r.id } },
                            body: {
                              expectedRevision: r.revision,
                              fields: { ...r.fields, categoryId: bulkCategory },
                            },
                          }),
                        );
                        select((old) =>
                          old.map((x) => (x.id === r.id ? next : x)),
                        );
                      }
                      setOrganizeRows(
                        (old) => old?.filter((x) => x.id !== r.id) ?? null,
                      );
                    }
                    setOrganizeRows(null);
                  }, "已更新所选草稿的分类。")
                }
              >
                应用分类
              </button>
            </div>
          </div>
        </Modal>
      )}
      {binding && (
        <Modal
          title={"绑定文件 · " + binding.fields.title}
          close={() => bindRow(null)}
        >
          <div className="intake-form">
            <BindForm row={binding} changed={() => bindRow(null)} />
          </div>
        </Modal>
      )}

      {batchLookup && (
        <Modal
          title={"抓取所选 " + batchLookup.length + " 条草稿"}
          close={() => setBatchLookup(null)}
        >
          <div className="intake-form">
            <LookupForm
              rows={batchLookup}
              finish={() => setBatchLookup(null)}
            />
          </div>
        </Modal>
      )}
      {picker && (
        <StoragePicker
          rows={picker === "inbox" ? undefined : picker}
          close={() => setPicker(null)}
          finished={(message) => {
            setPicker(null);
            setNotice(message);
            setError("");
            if (picker === "inbox") {
              filter("all");
              setStage("all");
              setQ("");
              setPage(1);
            }
          }}
        />
      )}
      {batch && (
        <Modal
          title={
            batch === "review"
              ? "核对所选 " + batchRows.length + " 条草稿"
              : "手动发布所选资料"
          }
          close={() => {
            if (!busy) setBatch(null);
          }}
        >
          {batch === "review" ? (
            <>
              <p className="ig-dialog-intro">
                直接对照以下资料，确认后仍需手动发布。
              </p>
              <div className="ig-review-list">
                {batchRows.map((r) => (
                  <ReviewCard
                    key={r.id}
                    row={r}
                    compare={() => showLookup(r.id)}
                    edit={() => {
                      setBatch(null);
                      open(r, "edit");
                    }}
                  />
                ))}
              </div>
              <p className="ig-dialog-note">
                {batchRows.filter((r) => missing(r)).length}{" "}
                条有非必填缺项，可以接受现状后确认。缺少文件或探测失败的草稿须先处理。
              </p>
            </>
          ) : (
            <>
              <p className="ig-dialog-intro">
                发布以下 {batchRows.length} 条草稿。
                {batchRows.some((r) => r.move)
                  ? "按以下路径移动并校验文件后发布。"
                  : "文件将从当前位置播放。"}
              </p>
              {batchRows.some((r) => r.move) && (
                <p>
                  待移动 {batchRows.filter((r) => r.move).length} 个文件 ·{" "}
                  {formatBytes(
                    batchRows.reduce(
                      (sum, r) => sum + (r.move ? Number(r.sizeBytes) : 0),
                      0,
                    ),
                  )}
                </p>
              )}
              <ul className="ig-publish-list">
                {batchRows.map((r) => (
                  <li key={r.id}>
                    {r.fields.title}
                    <span>
                      {r.move
                        ? r.move.source + " → " + moveDestination(r.move)
                        : r.group
                          ? "分集"
                          : "作品"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {batch === "publish" &&
            batchRows.some((r) => !r.reviewed || issue(r)) && (
              <p className="ig-error">请先核对全部分集并解决发布阻断。</p>
            )}
          <ErrorNotice error={error} />
          <div className="actions">
            <button onClick={() => setBatch(null)} disabled={busy}>
              取消
            </button>
            <button
              className="btn primary small"
              disabled={
                busy ||
                !batchRows.length ||
                (batch === "publish" &&
                  batchRows.some((r) => !r.reviewed || issue(r)))
              }
              onClick={() =>
                void perform(
                  async () => {
                    const done = new Set<string>();
                    for (const r of batchRows) {
                      if (batch === "review" && r.reviewed) continue;
                      const groupKey = r.group?.id ?? r.id;
                      if (batch === "publish" && done.has(groupKey)) continue;
                      const opt = {
                        params: { path: { id: r.id } },
                        body: { expectedRevision: r.revision },
                      };
                      if (batch === "review")
                        await unwrap(api.POST("/api/imports/{id}/review", opt));
                      else
                        await unwrap(
                          api.POST("/api/imports/{id}/publish", opt),
                        );
                      done.add(groupKey);
                      setBatchRows((prev) =>
                        prev.filter(
                          (x) =>
                            x.id !== r.id &&
                            !(batch === "publish" && x.group?.id === groupKey),
                        ),
                      );
                      if (batch === "publish")
                        select((prev) =>
                          prev.filter(
                            (x) =>
                              x.id !== r.id &&
                              !(
                                batch === "publish" &&
                                x.group &&
                                x.group.id === groupKey
                              ),
                          ),
                        );
                    }
                    setBatch(null);
                  },
                  batch === "review"
                    ? "所选草稿已人工确认。"
                    : batchRows.some((r) => r.move)
                      ? "已提交移动发布，请查看列表中的处理结果。"
                      : "所选资料已发布。",
                )
              }
            >
              {batch === "review"
                ? "确认所选草稿"
                : batchRows.some((r) => r.move)
                  ? "移动并发布"
                  : "确认发布"}
            </button>
          </div>
        </Modal>
      )}
      {data &&
        !["online", "unregistered"].includes(data.rootStatus) &&
        !data.scanning && (
          <p role="status">上次检查未确认媒体卷在线，可在系统状态中查看。</p>
        )}
      <ErrorNotice error={queue.error || storage.error || (!dialog && error)} />
      {notice && <p role="status">{notice}</p>}
      <div className="ig-table-scroll">
        <table className="ig-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="选择当前页可操作草稿"
                  checked={
                    !!selectable.length &&
                    selectable.every((r) =>
                      selection.some((x) => x.id === r.id),
                    )
                  }
                  disabled={!selectable.length || busy}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    select((old) => [
                      ...old.filter(
                        (x) => !selectable.some((y) => y.id === x.id),
                      ),
                      ...(checked ? selectable : []),
                    ]);
                  }}
                />
              </th>
              {[
                "封面 / 作品 / 文件",
                "当前草稿",
                "资料核对",
                "状态 / 整理目标",
                "草稿操作",
              ].map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data?.items.length && (
              <tr>
                <td colSpan={6} className="ig-empty">
                  {!data
                    ? "正在读取录入队列…"
                    : data.scanning
                      ? "正在读取文件…"
                      : status === "all" && !q
                        ? "暂无录入记录。从下载目录选择 MP4 或 MKV 文件。"
                        : "没有符合条件的草稿，可以切回全部或清空搜索。"}
                </td>
              </tr>
            )}
            {ordered.map(({ r, groupHeader }) => {
              const chosen = selection.some((x) => x.id === r.id),
                peek = previewAll !== expanded.includes(r.id);
              const problem = issue(r),
                g = r.group,
                published = !!r.publishedMediaId;
              const edit = () =>
                published ? toMedia(r.publishedMediaId!) : open(r, "edit");
              return (
                <Fragment key={r.id}>
                  {groupHeader && g && (
                    <tr className="ig-group">
                      <td />
                      <td colSpan={3}>
                        <div className="ig-group-line">
                          <button
                            className="ig-group-toggle"
                            aria-label={
                              (hiddenGroups.includes(g.id) ? "展开" : "收起") +
                              g.title
                            }
                            aria-expanded={!hiddenGroups.includes(g.id)}
                            onClick={() =>
                              hideGroups((prev) =>
                                prev.includes(g.id)
                                  ? prev.filter((x) => x !== g.id)
                                  : [...prev, g.id],
                              )
                            }
                          >
                            {hiddenGroups.includes(g.id) ? "▸" : "▾"}
                          </button>
                          <div>
                            <strong>{g.title}</strong>{" "}
                            <span className="ig-pill purple">分集容器</span>
                            <div className="ig-sub">选择分集播放</div>
                          </div>
                        </div>
                      </td>
                      <td colSpan={2}>
                        {!published && (
                          <div className="ig-row-actions">
                            <button
                              className="btn ghost small"
                              disabled={busy}
                              onClick={() => void selectGroup(g.id)}
                            >
                              选择整组
                            </button>
                            <button
                              className="btn ghost small"
                              disabled={busy}
                              onClick={() => void adjust(g.id)}
                            >
                              调整分集
                            </button>
                            <button
                              disabled={busy}
                              className="btn ghost small"
                              onClick={() => ungroup(g.id)}
                            >
                              解除分组
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {(!g || !hiddenGroups.includes(g.id)) && (
                    <>
                      <tr
                        className={[
                          chosen ? "ig-selected" : "",
                          g ? "ig-child" : "",
                        ].join(" ")}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={"选择" + r.fields.title}
                            checked={chosen}
                            disabled={published || busy}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              select((old) =>
                                checked
                                  ? [...old.filter((x) => x.id !== r.id), r]
                                  : old.filter((x) => x.id !== r.id),
                              );
                            }}
                          />
                        </td>
                        <td>
                          <div className="ig-identity">
                            <IntakeCover row={r} />
                            <div>
                              <button
                                type="button"
                                className="ig-title"
                                onClick={edit}
                              >
                                {r.fields.title}
                              </button>
                              {g && (
                                <div className="ig-sub">
                                  <span className="ig-pill purple">
                                    第 {g.position} 集
                                  </span>
                                </div>
                              )}
                              {r.fields.identifier && (
                                <div className="ig-sub">
                                  {r.fields.identifier}
                                </div>
                              )}
                              <div className="ig-file" title={r.relativePath}>
                                {r.relativePath.split("/").at(-1) ||
                                  "待绑定文件"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="draft-glance">
                          <Select
                            label={r.fields.title + "的分类"}
                            value={r.fields.categoryId}
                            disabled={published || busy}
                            options={categories.map((c) => ({
                              value: c.id,
                              label: c.name,
                            }))}
                            onValueChange={(id) => void updateCategory(r, id)}
                          />
                          <small>
                            {r.fields.releaseDate ||
                              r.fields.releaseYear ||
                              "日期未填"}
                          </small>
                          <small>
                            {[
                              ...r.actors,
                              ...(r.fields.sourceNames?.actors ?? []),
                            ].join("、") || "演员未填"}
                          </small>
                        </td>
                        <td className="queue-coverage">
                          <small>{lookupLabel(r.lookup)}</small>
                          <DraftCoverage row={r} />
                          {!published && (
                            <button
                              className="cell-action"
                              onClick={() => showLookup(r.id)}
                            >
                              {r.lookup?.candidate
                                ? "核对字段"
                                : r.lookup?.state === "choices"
                                  ? "选择匹配影片"
                                  : r.lookup?.state === "failed"
                                    ? "查看失败原因"
                                    : fetching(r.lookup)
                                      ? "查看抓取进度"
                                      : "抓取资料"}
                            </button>
                          )}
                        </td>
                        <td className="queue-destination">
                          <strong
                            className={
                              published || r.reviewed ? "good" : "warn"
                            }
                          >
                            {published
                              ? "已发布"
                              : r.reviewed
                                ? "已确认"
                                : "待核对"}
                          </strong>
                          <MoveStatus row={r} />
                          {problem && !published && (
                            <small className="warn">{problem}</small>
                          )}
                          {!r.move && !problem && <small>原文件位置</small>}
                          <div className="file-actions">
                            {" "}
                            {storage.data?.inbox &&
                              !published &&
                              r.availability === "present" &&
                              !moveActive(r) && (
                                <button
                                  className="btn ghost small"
                                  onClick={() => setPicker([r])}
                                >
                                  {r.move ? "更改目标" : "设整理目标"}
                                </button>
                              )}
                            {r.move?.error && (
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() =>
                                  void perform(
                                    () =>
                                      unwrap(
                                        api.POST("/api/imports/{id}/publish", {
                                          params: { path: { id: r.id } },
                                          body: {
                                            expectedRevision: r.revision,
                                          },
                                        }),
                                      ),
                                    "已提交重试。",
                                  )
                                }
                              >
                                重试整理
                              </button>
                            )}
                            {r.probeStatus === "failed" && (
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() =>
                                  void perform(
                                    () =>
                                      unwrap(
                                        api.POST("/api/imports/manual", {
                                          body: {
                                            relativePath: r.relativePath,
                                          },
                                        }),
                                      ),
                                    "已重新检查文件，请核对探测结果。",
                                  )
                                }
                              >
                                重试探测
                              </button>
                            )}
                            {!published && r.availability === "unbound" && (
                              <button
                                className="cell-action"
                                onClick={() => bindRow(r)}
                              >
                                绑定文件
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="ig-row-actions">
                          <button
                            className="btn ghost small"
                            aria-expanded={peek}
                            onClick={() =>
                              expand((old) =>
                                old.includes(r.id)
                                  ? old.filter((x) => x !== r.id)
                                  : [...old, r.id],
                              )
                            }
                          >
                            {peek ? "收起预览" : "行内预览"}
                          </button>
                          {published ? (
                            <button className="btn ghost small" onClick={edit}>
                              打开作品
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn ghost small"
                                disabled={!!problem || busy}
                                onClick={() =>
                                  open(r, r.reviewed ? "publish" : "review")
                                }
                              >
                                {r.reviewed
                                  ? g
                                    ? "发布整个容器"
                                    : "手动发布"
                                  : "核对确认"}
                              </button>
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() => open(r, "edit")}
                              >
                                完整编辑
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {peek && (
                        <tr className="ig-detail">
                          <td colSpan={6}>
                            <div className="ig-preview">
                              <img
                                src={poster(r)}
                                alt={r.fields.title + "封面"}
                              />
                              <div>
                                <FieldPreview row={r} />
                                <div className="ig-meta">
                                  <span>
                                    演员：
                                    {[
                                      ...r.actors,
                                      ...(r.fields.sourceNames?.actors ?? []),
                                    ].join("、") || "未填写"}
                                  </span>
                                  <span>分类：{r.categoryName}</span>
                                  <span>
                                    系列：
                                    {[
                                      ...r.series,
                                      ...(r.fields.sourceNames?.series ?? []),
                                    ].join("、") || "未关联"}
                                  </span>
                                </div>
                                <p className="ig-muted">
                                  {[
                                    r.relativePath,
                                    r.format?.toUpperCase(),
                                    r.videoCodec,
                                    r.availability === "unbound"
                                      ? "待绑定文件"
                                      : (Number(r.sizeBytes) / 1048576).toFixed(
                                          1,
                                        ) + " MiB",
                                    r.durationMs != null
                                      ? (r.durationMs / 1000).toFixed(1) + " 秒"
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {r.fields.notes && <p>{r.fields.notes}</p>}
                                {problem && (
                                  <p className="ig-error">{problem}</p>
                                )}
                              </div>
                              <button
                                className="btn ghost small"
                                onClick={edit}
                              >
                                {published ? "打开作品" : "完整编辑"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ig-bottom">
        <span>
          {data?.total ?? 0} 条符合条件 · {counts.data?.all ?? 0} 条草稿
        </span>
        <button
          className="btn ghost small"
          onClick={() => {
            setPreviewAll(!previewAll);
            expand([]);
          }}
        >
          {previewAll ? "收起所有行内预览" : "展开所有行内预览"}
        </button>
      </div>

      {data && data.total > 20 && <Pager {...data} onChange={setPage} />}
      {dialog && dialog.kind !== "edit" && (
        <Modal
          title={dialog.kind === "review" ? "核对当前草稿" : "发布到片库"}
          close={close}
        >
          <div className="ig-review-list">
            <ReviewCard
              row={dialog.row}
              edit={() => open(dialog.row, "edit")}
            />
          </div>
          {dialog.row.group && (
            <p className="ig-dialog-note">
              {dialog.row.group.title} · 第 {dialog.row.group.position}{" "}
              集。发布将提交整个已核对容器。
            </p>
          )}
          <ErrorNotice error={error} />
          <div className="actions">
            <button onClick={close} disabled={busy}>
              返回
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                const opt = {
                  params: { path: { id: dialog.row.id } },
                  body: { expectedRevision: dialog.row.revision },
                };
                void perform(
                  () =>
                    dialog.kind === "review"
                      ? unwrap(api.POST("/api/imports/{id}/review", opt))
                      : unwrap(api.POST("/api/imports/{id}/publish", opt)),
                  dialog.kind === "review"
                    ? "已人工确认，可以手动发布。"
                    : "已发布到片库。",
                );
              }}
            >
              {dialog.kind === "review" ? "确认这份资料" : "确认发布"}
            </button>
          </div>
        </Modal>
      )}
      {lookupId && (
        <QueueSource
          id={lookupId}
          close={() => showLookup("")}
          changed={(next) => {
            setBatchRows((old) =>
              old.map((r) => (r.id === next.id ? next : r)),
            );
            setDialog((old) =>
              old?.row.id === next.id ? { ...old, row: next } : old,
            );
          }}
        />
      )}
    </section>
  );
}
