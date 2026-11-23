import { CatalogTable, FilmCards } from "./CatalogTable";
import { RecordGrid, RecordDetail } from "./RecordCatalog";
import { StudioIcon } from "./StudioIcon";
import { SystemStatus } from "./SystemStatus";
import React, {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, AuthGate, ErrorNotice, Modal, Pager } from "@video-x/ui";
import "@video-x/design-tokens";
import "./style.css";
import "./catalog-table.css";
import "./record-catalog.css";
import { Artwork } from "./Artwork";
import { StudioCard } from "./StudioCard";
import { DictionaryPage, DictionaryLinks } from "./Dictionary";
import { ActorEnrichment, ArchivedRecords } from "./CatalogTools";
import { StudioExtra } from "./StudioExtra";

import { AdminShell, routes, labels, type Kind } from "./AdminShell";

const Intake = lazy(() =>
  import("./Intake").then((module) => ({ default: module.Intake })),
);

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10000 } },
});
function legacyDestination(): Kind | undefined {
  if (location.hash === "#changes") return "intake";
  if (location.hash === "#sources") return "settings";
}
function locationKind(): Kind {
  return (
    legacyDestination() ??
    (Object.keys(routes) as Kind[]).find(
      (k) => routes[k] === location.hash.slice(1).split("/")[0],
    ) ??
    "intake"
  );
}
function profileId() {
  return (
    location.hash.match(/^#(?:actors|series)\/([0-9a-f-]{36})$/i)?.[1] ?? ""
  );
}
function Admin({ logout }: { logout: () => Promise<void> }) {
  const [kind, setKind] = useState<Kind>(locationKind),
    [toolsOpen, setToolsOpen] = useState(false),
    [q, setQ] = useState(""),
    [searchInput, setSearchInput] = useState(""),
    [pageSize, setPageSize] = useState(24),
    [filmView, setFilmView] = useState<"cards" | "table">("cards"),
    [detailId, setDetailId] = useState(profileId),
    [detailEditor, setDetailEditor] = useState<
      Schemas["Person"] | Schemas["Franchise"] | null
    >(null),
    [workEditor, setWorkEditor] = useState<string | null>(null),
    [categoryId, setCategory] = useState(""),
    [sort, setSort] = useState<"createdAt" | "name" | "year" | "count">(
      kind === "people" || kind === "franchises" ? "count" : "createdAt",
    ),
    [direction, setDirection] = useState<"asc" | "desc">("desc"),
    [page, setPage] = useState(1),
    [editId, setEditId] = useState<string | null>(null),
    [create, setCreate] = useState(false),
    [error, setError] = useState("");
  const listOrigin = useRef<{ id: string; scroll: number } | null>(null);
  function rememberRecord(id: string) {
    listOrigin.current = { id, scroll: window.scrollY };
  }
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => unwrap(api.GET("/api/categories")),
  });
  const params = {
    q: q || undefined,
    categoryId: categoryId || undefined,
    sort,
    direction,
    page,
    pageSize,
  };
  const list = useQuery({
    queryKey: ["list", kind, params],
    enabled:
      !detailId &&
      ["media", "people", "franchises", "categories"].includes(kind),
    queryFn: async () => {
      if (kind === "media")
        return {
          type: "media" as const,
          ...(await unwrap(
            api.GET("/api/manage/media", {
              params: {
                query: {
                  ...params,
                  sort: sort === "count" ? "createdAt" : sort,
                },
              },
            }),
          )),
        };
      if (kind === "people")
        return {
          type: "people" as const,
          ...(await unwrap(
            api.GET("/api/people", {
              params: {
                query: {
                  ...params,
                  sort: sort === "year" ? "createdAt" : sort,
                },
              },
            }),
          )),
        };
      if (kind === "franchises")
        return {
          type: "franchises" as const,
          ...(await unwrap(
            api.GET("/api/franchises", {
              params: {
                query: {
                  ...params,
                  sort: sort === "year" ? "createdAt" : sort,
                },
              },
            }),
          )),
        };
      const items = await unwrap(api.GET("/api/categories"));
      return {
        type: "categories" as const,
        items,
        total: items.length,
        page: 1,
        pageSize: 100,
      };
    },
  });
  useEffect(() => {
    const restore = () => {
      const destination = legacyDestination();
      if (destination)
        history.replaceState(history.state, "", "#" + routes[destination]);
      const next = locationKind();
      const id = profileId();
      if (next !== kind) changeKind(next, false);
      setDetailId(id);
      setWorkEditor(null);
      setDetailEditor(null);
      if (id || next !== kind) window.scrollTo({ top: 0 });
    };
    if (legacyDestination()) restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, [kind]);
  useLayoutEffect(() => {
    if (detailId || !list.data || !listOrigin.current) return;
    const { id, scroll } = listOrigin.current;
    listOrigin.current = null;
    window.scrollTo(0, scroll);
    document.getElementById("catalog-" + id)?.focus({ preventScroll: true });
  }, [detailId, list.data]);

  function changeKind(k: Kind, push = true) {
    listOrigin.current = null;
    if (push && location.hash !== "#" + routes[k])
      history.pushState(null, "", "#" + routes[k]);
    setKind(k);
    setToolsOpen(false);
    setCategory("");
    setError("");
    setCreate(false);
    setPage(1);
    setSort(k === "people" || k === "franchises" ? "count" : "createdAt");
    setQ("");
    setSearchInput("");
    setDirection("desc");
    setDetailId("");
    setDetailEditor(null);
    setWorkEditor(null);
    setEditId(null);
  }
  const [personEditor, setPersonEditor] = useState<Schemas["Person"] | null>(
    null,
  );
  const [visibility, askVisibility] = useState<{
    c: Schemas["Category"];
    count: number;
  } | null>(null);
  async function checkVisibility(c: Schemas["Category"]) {
    try {
      const data = await unwrap(
        api.GET("/api/media", {
          params: {
            query: { categoryId: c.id, pageSize: 1, includeEpisodes: true },
          },
        }),
      );
      askVisibility({ c, count: data.total });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pending = useQuery({
    queryKey: ["intake", "pending-count"],
    queryFn: async () =>
      (
        await unwrap(
          api.GET("/api/imports", {
            params: { query: { status: "pending", pageSize: 1 } },
          }),
        )
      ).total,
  });
  const isRecordList = kind === "people" || kind === "franchises";
  const selected =
    list.data?.type === "people"
      ? list.data.items.find((x) => x.id === editId)
      : list.data?.type === "franchises"
        ? list.data.items.find((x) => x.id === editId)
        : null;
  function renderFilters() {
    return (
      <div className="catalog-options" id="catalog-options">
        <Select
          label="分类"
          value={categoryId}
          onValueChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          options={[
            { value: "", label: "全部分类" },
            ...(categories.data ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
        <Select
          label="排序字段"
          value={sort}
          onValueChange={(value) => {
            setSort(value as typeof sort);
            setPage(1);
          }}
          options={[
            { value: "createdAt", label: "添加时间" },
            { value: "name", label: "名称" },
            kind === "media"
              ? { value: "year", label: "发行年份" }
              : { value: "count", label: "作品数量" },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setDirection(direction === "asc" ? "desc" : "asc");
            setPage(1);
          }}
        >
          {direction === "asc" ? "↑ 升序" : "↓ 降序"}
        </button>
      </div>
    );
  }
  return (
    <>
      <AdminShell
        kind={kind}
        pending={pending.data}
        logout={() => void logout().catch((e) => setError(e.message))}
      >
        {kind === "tags" || kind === "organizations" ? (
          <DictionaryPage key={kind} tags={kind === "tags"} />
        ) : kind === "enrich" ? (
          <ActorEnrichment editPerson={setPersonEditor} />
        ) : kind === "archive" ? (
          <ArchivedRecords />
        ) : kind === "settings" ? (
          <SystemStatus />
        ) : kind === "collections" || kind === "jobs" ? (
          <StudioExtra key={kind} kind={kind} />
        ) : kind === "intake" ? (
          <Suspense fallback={<p role="status">读取录入工作台…</p>}>
            <Intake
              categories={categories.data ?? []}
              toMedia={(id) => {
                changeKind("media");
                setEditId(id);
              }}
            />
          </Suspense>
        ) : detailId && isRecordList ? (
          <RecordDetail
            key={detailId}
            actors={kind === "people"}
            id={detailId}
            edit={setDetailEditor}
            editFilm={setWorkEditor}
          />
        ) : (
          <div className={isRecordList ? "record-index" : undefined}>
            <div className="catalog-heading">
              <div>
                <h1>
                  {kind === "people"
                    ? "演员"
                    : kind === "franchises"
                      ? "系列"
                      : kind === "categories"
                        ? "分类维护"
                        : labels[kind]}
                  {list.data && (
                    <small>
                      {list.data.total}{" "}
                      {kind === "media"
                        ? "部"
                        : kind === "people"
                          ? "人"
                          : "项"}
                    </small>
                  )}
                </h1>
              </div>
              {kind !== "media" && (
                <button
                  className="primary"
                  onClick={() => {
                    setError("");
                    setCreate(true);
                  }}
                >
                  ＋ 新增
                  {kind === "people"
                    ? "演员"
                    : kind === "franchises"
                      ? "系列"
                      : "分类"}
                </button>
              )}
            </div>
            {kind !== "categories" && (
              <div className="catalog-tools">
                <form
                  className="catalog-search"
                  role="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQ(searchInput.trim());
                    setPage(1);
                  }}
                >
                  <input
                    type="search"
                    aria-label="搜索资料"
                    maxLength={120}
                    value={searchInput}
                    placeholder={
                      kind === "media"
                        ? "搜索片名、编号或演员"
                        : kind === "people"
                          ? "搜索常用名或详细名称"
                          : "搜索系列名称或说明"
                    }
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      if (!e.target.value) {
                        setQ("");
                        setPage(1);
                      }
                    }}
                  />
                  <button type="submit" aria-label="搜索">
                    <StudioIcon name="search" />
                  </button>
                </form>
                {!isRecordList && (
                  <button
                    aria-controls="catalog-options"
                    aria-expanded={toolsOpen}
                    onClick={() => setToolsOpen(!toolsOpen)}
                  >
                    排序与筛选
                  </button>
                )}
                {isRecordList && renderFilters()}
                {!isRecordList && categoryId && (
                  <button
                    onClick={() => {
                      setCategory("");
                      setPage(1);
                    }}
                    aria-label="清除分类筛选"
                  >
                    {categories.data?.find((c) => c.id === categoryId)?.name} ×
                  </button>
                )}
                {q && <span className="catalog-result">“{q}” 的结果</span>}
                {kind === "media" && (
                  <div
                    role="group"
                    aria-label="影片展示方式"
                    className="catalog-view-switch"
                  >
                    <button
                      type="button"
                      aria-pressed={filmView === "cards"}
                      onClick={() => setFilmView("cards")}
                    >
                      <StudioIcon name="grid" /> 卡片
                    </button>
                    <button
                      type="button"
                      aria-pressed={filmView === "table"}
                      onClick={() => setFilmView("table")}
                    >
                      <StudioIcon name="list" /> 列表
                    </button>
                  </div>
                )}
                <Select
                  label="每页条数"
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                  options={[24, 50, 100].map((n) => ({
                    value: String(n),
                    label: n + " 条 / 页",
                  }))}
                />
              </div>
            )}
            {kind !== "categories" &&
              !isRecordList &&
              toolsOpen &&
              renderFilters()}
            <ErrorNotice error={error || list.error || categories.error} />
            {list.isPending ? (
              <div className="empty">正在读取资料…</div>
            ) : list.data?.items.length === 0 ? (
              <div className="empty">暂时没有符合条件的资料</div>
            ) : list.data?.type === "franchises" ? (
              <RecordGrid
                records={list.data.items}
                remember={rememberRecord}
                actors={false}
              />
            ) : list.data?.type === "people" ? (
              <RecordGrid
                records={list.data.items}
                remember={rememberRecord}
                actors
              />
            ) : list.data?.type === "categories" ? (
              <div className="studio-cards">
                {list.data.items.map((c) => (
                  <StudioCard
                    key={c.id}
                    title={c.name}
                    subtitle={
                      c.parentId
                        ? (categories.data?.find((p) => p.id === c.parentId)
                            ?.name ?? "子分类")
                        : "顶级分类"
                    }
                    meta={c.isVisible ? "片库中显示" : "已隐藏"}
                    action={c.isVisible ? "隐藏分类" : "显示分类"}
                    open={() => void checkVisibility(c)}
                  />
                ))}
              </div>
            ) : list.data?.type === "media" && filmView === "cards" ? (
              <FilmCards films={list.data.items} edit={setEditId} />
            ) : (
              list.data && <CatalogTable rows={list.data} edit={setEditId} />
            )}
            {list.data &&
              kind !== "categories" &&
              (!isRecordList || list.data.total > pageSize) && (
                <Pager
                  {...list.data}
                  onChange={(n) => {
                    setPage(n);
                    window.scrollTo({ top: 0 });
                  }}
                />
              )}
          </div>
        )}
      </AdminShell>
      {detailEditor && (
        <EntityEditor
          kind={"fullName" in detailEditor ? "people" : "franchises"}
          selected={detailEditor}
          categories={categories.data ?? []}
          close={() => setDetailEditor(null)}
        />
      )}
      {workEditor && (
        <MediaEditor
          id={workEditor}
          categories={categories.data ?? []}
          close={() => setWorkEditor(null)}
        />
      )}
      {visibility && (
        <Modal
          title={visibility.c.isVisible ? "隐藏分类" : "显示分类"}
          close={() => askVisibility(null)}
        >
          <p>
            「{visibility.c.name}」及其子分类当前有 {visibility.count} 部影片。
            {visibility.c.isVisible
              ? "隐藏后观看端分类栏会收起此项，影片仍可从片库访问。"
              : "显示后可在片库选择此分类。"}
          </p>
          <button onClick={() => askVisibility(null)}>取消</button>{" "}
          <button
            className="primary"
            onClick={async () => {
              try {
                const c = visibility.c;
                await unwrap(
                  api.PATCH("/api/categories/{id}/visibility", {
                    params: { path: { id: c.id } },
                    body: {
                      expectedRevision: c.revision,
                      isVisible: !c.isVisible,
                    },
                  }),
                );
                await client.invalidateQueries();
                askVisibility(null);
              } catch (e) {
                setError((e as Error).message);
                askVisibility(null);
              }
            }}
          >
            确认{visibility.c.isVisible ? "隐藏" : "显示"}
          </button>
        </Modal>
      )}
      {personEditor && (
        <EntityEditor
          kind="people"
          selected={personEditor}
          categories={categories.data ?? []}
          close={() => setPersonEditor(null)}
        />
      )}
      {editId && kind === "media" && (
        <MediaEditor
          id={editId}
          categories={categories.data ?? []}
          close={() => setEditId(null)}
        />
      )}
      {(create || selected) && kind !== "media" && (
        <EntityEditor
          kind={kind}
          selected={selected ?? null}
          categories={categories.data ?? []}
          close={() => {
            setCreate(false);
            setEditId(null);
          }}
        />
      )}
    </>
  );
}
function EntityEditor({
  kind,
  selected,
  categories,
  close,
}: {
  kind: Exclude<Kind, "media">;
  selected: Schemas["Person"] | Schemas["Franchise"] | null;
  categories: Schemas["Category"][];
  close: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [entityArt, setEntityArt] = useState<string | null | undefined>(
    undefined,
  );
  const person = selected && "fullName" in selected ? selected : null,
    franchise = selected && "name" in selected ? selected : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      name = String(data.get("name")).trim(),
      categoryId = String(data.get("categoryId"));
    setBusy(true);
    setError("");
    try {
      if (kind === "people") {
        const body = {
          portraitId: entityArt,
          fullName: name,
          detailedName: String(data.get("detailedName")).trim() || null,
          categoryId,
          gender: String(data.get("gender")) as
            | "unknown"
            | "female"
            | "male"
            | "other",
        };
        if (person)
          await unwrap(
            api.PATCH("/api/people/{id}", {
              params: { path: { id: person.id } },
              body: { ...body, expectedRevision: person.revision },
            }),
          );
        else await unwrap(api.POST("/api/people", { body }));
      } else if (kind === "franchises") {
        const body = {
          coverId: entityArt,
          name,
          categoryId,
          description: String(data.get("description")).trim() || null,
        };
        if (franchise)
          await unwrap(
            api.PATCH("/api/franchises/{id}", {
              params: { path: { id: franchise.id } },
              body: { ...body, expectedRevision: franchise.revision },
            }),
          );
        else await unwrap(api.POST("/api/franchises", { body }));
      } else await unwrap(api.POST("/api/categories", { body: { name } }));
      await client.invalidateQueries();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        (selected ? "编辑" : "新增") +
        (kind === "people" ? "演员" : kind === "franchises" ? "系列" : "分类")
      }
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={save}>
        {kind !== "categories" && (
          <Artwork
            label={kind === "people" ? "演员头像" : "系列封面"}
            value={
              entityArt === undefined
                ? (person?.portraitId ?? franchise?.coverId)
                : entityArt
            }
            onChange={setEntityArt}
          />
        )}
        <label>
          {kind === "people" ? "常用名" : "名称"}
          <input
            autoFocus
            name="name"
            required
            maxLength={kind === "categories" ? 120 : 300}
            defaultValue={person?.fullName ?? franchise?.name ?? ""}
          />
        </label>
        {kind === "people" && (
          <>
            <label>
              详细名称
              <input
                name="detailedName"
                maxLength={300}
                defaultValue={person?.detailedName ?? ""}
              />
            </label>
            <label>
              性别
              <Select
                label="性别"
                name="gender"
                defaultValue={person?.gender ?? "unknown"}
                options={[
                  { value: "unknown", label: "未知" },
                  { value: "female", label: "女性" },
                  { value: "male", label: "男性" },
                  { value: "other", label: "其他" },
                ]}
              />
            </label>
          </>
        )}
        {kind === "franchises" && (
          <label>
            说明
            <textarea
              name="description"
              maxLength={10000}
              defaultValue={franchise?.description ?? ""}
            />
          </label>
        )}
        {kind !== "categories" && (
          <label>
            所属分类
            <Select
              label="所属分类"
              name="categoryId"
              defaultValue={
                selected?.categoryId ??
                categories.find((c) => c.name === "未分类")?.id ??
                categories[0]?.id
              }
              required
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </label>
        )}
        <ErrorNotice error={error} />
        <div className="actions">
          <button type="button" onClick={close} disabled={busy}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "保存中…" : "保存资料"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function MediaEditor({
  id,
  categories,
  close,
}: {
  id: string;
  categories: Schemas["Category"][];
  close: () => void;
}) {
  const data = useQuery({
      queryKey: ["media-editor", id],
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn: () =>
        unwrap(api.GET("/api/media/{id}", { params: { path: { id } } })),
    }),
    people = useQuery({
      queryKey: ["all-people"],
      queryFn: () =>
        unwrap(
          api.GET("/api/people", {
            params: {
              query: { pageSize: 100, sort: "name", direction: "asc" },
            },
          }),
        ),
    }),
    franchises = useQuery({
      queryKey: ["all-franchises"],
      queryFn: () =>
        unwrap(
          api.GET("/api/franchises", {
            params: {
              query: { pageSize: 100, sort: "name", direction: "asc" },
            },
          }),
        ),
    });
  const [dictionary, setDictionary] = useState<{
    tagIds?: string[];
    studioIds?: string[];
  }>({});
  const [art, setArt] = useState<{
    posterId?: string | null;
    backdropId?: string | null;
  }>({});
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [m, setSnapshot] = useState<Schemas["MediaDetail"] | null>(null);
  useEffect(() => {
    if (data.data && !m) setSnapshot(data.data);
  }, [data.data, m]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!m) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await unwrap(
        api.PATCH("/api/media/{id}", {
          params: { path: { id } },
          body: {
            ...art,
            ...dictionary,
            expectedRevision: m.revision,
            title: String(f.get("title")).trim(),
            summary: String(f.get("summary")).trim() || null,
            notes: String(f.get("notes")).trim() || null,
            categoryId: String(f.get("categoryId")),
            supportsChinese:
              f.get("chinese") === "unknown"
                ? null
                : f.get("chinese") === "yes",
            actorIds: [
              ...new Set([
                ...f.getAll("actorIds").map(String),
                ...m.actors
                  .filter((a) => !people.data?.items.some((x) => x.id === a.id))
                  .map((a) => a.id),
              ]),
            ],
            franchiseIds: [
              ...new Set([
                ...f.getAll("franchiseIds").map(String),
                ...m.franchises
                  .filter(
                    (a) => !franchises.data?.items.some((x) => x.id === a.id),
                  )
                  .map((a) => a.id),
              ]),
            ],
          },
        }),
      );
      await client.invalidateQueries();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="编辑作品资料"
      close={() => {
        if (!busy) close();
      }}
    >
      <ErrorNotice error={data.error ?? error} />
      {m && (
        <form onSubmit={save}>
          <div className="intake-pair">
            {(["posterId", "backdropId"] as const).map((k) => (
              <Artwork
                key={k}
                label={k === "posterId" ? "竖版海报" : "横版剧照"}
                value={art[k] === undefined ? m[k] : art[k]}
                onChange={(id) => setArt({ ...art, [k]: id })}
              />
            ))}
          </div>
          <label>
            作品名称
            <input
              name="title"
              required
              maxLength={1000}
              defaultValue={m.title}
            />
          </label>
          <div className="field-grid">
            <label>
              所属分类
              <Select
                label="所属分类"
                name="categoryId"
                defaultValue={m.categoryId}
                required
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </label>
            <label>
              中文资料标记
              <Select
                label="中文资料标记"
                name="chinese"
                defaultValue={
                  m.supportsChinese == null
                    ? "unknown"
                    : m.supportsChinese
                      ? "yes"
                      : "no"
                }
                options={[
                  { value: "unknown", label: "未知" },
                  { value: "yes", label: "支持" },
                  { value: "no", label: "不支持" },
                ]}
              />
            </label>
          </div>
          <label>
            简介
            <textarea
              name="summary"
              maxLength={50000}
              defaultValue={m.summary ?? ""}
            />
          </label>
          <label>
            备注
            <textarea
              name="notes"
              maxLength={10000}
              defaultValue={m.notes ?? ""}
            />
          </label>
          <DictionaryLinks
            tagIds={dictionary.tagIds ?? m.tagIds ?? []}
            studioIds={dictionary.studioIds ?? m.studioIds ?? []}
            change={(fields) => setDictionary((old) => ({ ...old, ...fields }))}
          />{" "}
          <fieldset>
            <legend>演员</legend>
            <ErrorNotice error={people.error} />
            <div className="check-list">
              {people.data?.items.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    name="actorIds"
                    value={p.id}
                    defaultChecked={m.actors.some((a) => a.id === p.id)}
                  />
                  {p.fullName}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>系列</legend>
            <ErrorNotice error={franchises.error} />
            <div className="check-list">
              {franchises.data?.items.map((f) => (
                <label key={f.id}>
                  <input
                    type="checkbox"
                    name="franchiseIds"
                    value={f.id}
                    defaultChecked={m.franchises.some((a) => a.id === f.id)}
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </fieldset>
          {((people.data && people.data.total > 100) ||
            (franchises.data && franchises.data.total > 100)) && (
            <p className="notice">
              当前显示前 100 项，未显示的已有关系会保留。
            </p>
          )}
          <p className="muted small">
            修改影片分类不会更改演员或系列自身的分类。清空简介或取消关联会按本次选择保存。
          </p>
          <div className="actions">
            <button type="button" disabled={busy} onClick={close}>
              取消
            </button>
            <button
              className="primary"
              disabled={
                busy ||
                people.isPending ||
                franchises.isPending ||
                !!people.error ||
                !!franchises.error
              }
            >
              {busy ? "保存中…" : "保存变更"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthGate>{(_profile, logout) => <Admin logout={logout} />}</AuthGate>
    </QueryClientProvider>
  </React.StrictMode>,
);
