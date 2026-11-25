import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, ErrorNotice, Modal, Pager } from "@video-x/ui";
import { CatalogTable, FilmCards } from "./CatalogTable";
import { MediaCatalogFilters, type FilmFilters } from "./MediaCatalogFilters";
import type { CoverMode } from "./CatalogCover";
import { RecordGrid, RecordDetail } from "./RecordCatalog";
import { StudioIcon } from "../../shared/StudioIcon";
import { StudioCard } from "../../shared/StudioCard";
import { EntityEditor } from "./EntityEditor";
import { labels } from "../../app/AdminShell";
import { openFilm } from "../../app/AdminRoute";
import "./catalog-table.css";
import "./record-catalog.css";
type CatalogKind = "media" | "people" | "franchises" | "categories";
const viewOptions = [
  { value: "backdrop", label: "横图", icon: "landscape" },
  { value: "poster", label: "海报", icon: "poster" },
  { value: "table", label: "列表", icon: "list" },
] as const;

export function CatalogPage({
  kind,
  detailId,
  categories,
}: {
  kind: CatalogKind;
  detailId: string;
  categories: Schemas["Category"][];
}) {
  const client = useQueryClient();
  const saved = useRef(
    history.state?.catalog?.kind === kind ? history.state.catalog : undefined,
  ).current;

  const [toolsOpen, setToolsOpen] = useState<boolean>(
      saved?.toolsOpen ?? false,
    ),
    [q, setQ] = useState<string>(saved?.q ?? ""),
    [searchInput, setSearchInput] = useState<string>(saved?.q ?? ""),
    [pageSize, setPageSize] = useState<number>(saved?.pageSize ?? 24),
    [filmView, setFilmView] = useState<CoverMode | "table">(
      saved?.filmView === "poster" || saved?.filmView === "table"
        ? saved.filmView
        : "backdrop",
    ),
    [detailEditor, setDetailEditor] = useState<
      Schemas["Person"] | Schemas["Franchise"] | null
    >(null),
    [categoryId, setCategory] = useState<string>(saved?.categoryId ?? ""),
    [filmFilters, setFilmFilters] = useState<FilmFilters>({
      resolution: saved?.filmFilters?.resolution ?? "",
      chineseSubtitles: saved?.filmFilters?.chineseSubtitles ?? "",
    }),
    [sort, setSort] = useState<"createdAt" | "name" | "year" | "count">(
      kind === "media"
        ? saved?.sort === "year"
          ? "year"
          : "createdAt"
        : (saved?.sort ??
            (kind === "people" || kind === "franchises"
              ? "count"
              : "createdAt")),
    ),
    [direction, setDirection] = useState<"asc" | "desc">(
      saved?.direction ?? "desc",
    ),
    [page, setPage] = useState<number>(saved?.page ?? 1),
    [create, setCreate] = useState(false),
    [error, setError] = useState("");

  useEffect(() => {
    if (!detailId)
      history.replaceState(
        {
          ...history.state,
          catalog: {
            kind,
            q,
            categoryId,
            page,
            pageSize,
            sort,
            direction,
            filmView,
            filmFilters,
            toolsOpen,
          },
        },
        "",
      );
  }, [
    detailId,
    kind,
    q,
    categoryId,
    page,
    pageSize,
    sort,
    direction,
    filmView,
    filmFilters,
    toolsOpen,
  ]);
  const listOrigin = useRef<{ id: string; scroll: number } | null>(
    kind === "media" ? (history.state?.filmOrigin ?? null) : null,
  );
  function rememberRecord(id: string) {
    listOrigin.current = { id, scroll: window.scrollY };
  }
  function editListedFilm(id: string) {
    history.replaceState(
      { ...history.state, filmOrigin: { id, scroll: window.scrollY } },
      "",
    );
    openFilm(id);
  }
  const params = {
    q: q || undefined,
    categoryId: categoryId || undefined,
    sort,
    direction,
    page,
    pageSize,
  };
  const list = useQuery({
    queryKey: ["list", kind, params, kind === "media" ? filmFilters : null],
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
                  sort: sort === "year" ? "year" : "createdAt",
                  resolution: filmFilters.resolution || undefined,
                  chineseSubtitles: filmFilters.chineseSubtitles || undefined,
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
  useLayoutEffect(() => {
    if (detailId || !list.data || !listOrigin.current) return;
    const { id, scroll } = listOrigin.current;
    listOrigin.current = null;
    if (history.state?.filmOrigin) {
      const state = { ...history.state };
      delete state.filmOrigin;
      history.replaceState(state, "");
    }
    window.scrollTo(0, scroll);
    document.getElementById("catalog-" + id)?.focus({ preventScroll: true });
  }, [detailId, list.data]);

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

  const isRecordList = kind === "people" || kind === "franchises";
  const filterCount = [
    categoryId,
    filmFilters.resolution,
    filmFilters.chineseSubtitles,
  ].filter(Boolean).length;
  function renderRecordFilters() {
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
            ...categories.map((c) => ({
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
            { value: "count", label: "作品数量" },
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
      {detailId && isRecordList ? (
        <RecordDetail
          key={detailId}
          actors={kind === "people"}
          id={detailId}
          edit={setDetailEditor}
          editFilm={editListedFilm}
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
                    {kind === "media" ? "部" : kind === "people" ? "人" : "项"}
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
                  {filterCount > 0 && (
                    <span className="catalog-filter-count">{filterCount}</span>
                  )}
                </button>
              )}
              {isRecordList && renderRecordFilters()}
              {q && <span className="catalog-result">“{q}” 的结果</span>}
              {kind === "media" && (
                <div
                  role="group"
                  aria-label="影片展示方式"
                  className="catalog-view-switch"
                >
                  {viewOptions.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filmView === value}
                      onClick={() => setFilmView(value)}
                    >
                      <StudioIcon name={icon} /> {label}
                    </button>
                  ))}
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
          {kind === "media" && toolsOpen && (
            <MediaCatalogFilters
              categories={categories}
              categoryId={categoryId}
              filters={filmFilters}
              sort={sort === "year" ? "year" : "createdAt"}
              direction={direction}
              onCategory={(value) => {
                setCategory(value);
                setPage(1);
              }}
              onFilters={(value) => {
                setFilmFilters(value);
                setPage(1);
              }}
              onSort={(value) => {
                setSort(value);
                setPage(1);
              }}
              onDirection={(value) => {
                setDirection(value);
                setPage(1);
              }}
              onReset={() => {
                setCategory("");
                setFilmFilters({ resolution: "", chineseSubtitles: "" });
                setPage(1);
              }}
            />
          )}
          <ErrorNotice error={error || list.error} />
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
                      ? (categories.find((p) => p.id === c.parentId)?.name ??
                        "子分类")
                      : "顶级分类"
                  }
                  meta={c.isVisible ? "片库中显示" : "已隐藏"}
                  action={c.isVisible ? "隐藏分类" : "显示分类"}
                  open={() => void checkVisibility(c)}
                />
              ))}
            </div>
          ) : list.data?.type === "media" && filmView !== "table" ? (
            <FilmCards
              films={list.data.items}
              mode={filmView}
              edit={editListedFilm}
            />
          ) : (
            list.data && <CatalogTable rows={list.data} edit={editListedFilm} />
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
      {detailEditor && (
        <EntityEditor
          kind={"fullName" in detailEditor ? "people" : "franchises"}
          selected={detailEditor}
          categories={categories}
          close={() => setDetailEditor(null)}
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
      {create && kind !== "media" && (
        <EntityEditor
          kind={kind}
          selected={null}
          categories={categories}
          close={() => setCreate(false)}
        />
      )}
    </>
  );
}
