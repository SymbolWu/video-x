import React, { useEffect, useRef, useState } from "react";
import "./experience.css";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Playback } from "./Playback";
type Film = Schemas["Media"];
const asset = (id?: string | null) => (id ? "/api/art/" + id : undefined);
function Art({
  id,
  alt,
  className,
}: {
  id?: string | null;
  alt: string;
  className?: string;
}) {
  return id ? (
    <img className={className} src={asset(id)} alt={alt} loading="lazy" />
  ) : (
    <span
      className={"vx-art-empty " + (className ?? "")}
      role="img"
      aria-label={alt + " · 暂无图片"}
    >
      <Icon name="grid" size={24} />
    </span>
  );
}
type Filters = {
  category: string;
  seen: string;
  favorite: string;
  year: string;
  shape: string;
  rating: string;
  sort: string;
  direction: "asc" | "desc";
};
const defaults: Filters = {
  category: "全部",
  seen: "全部",
  favorite: "全部",
  year: "全部",
  shape: "全部",
  rating: "全部",
  sort: "添加时间",
  direction: "desc",
};
const paths: Record<string, React.ReactNode> = {
  search: (
    <>
      <circle cx="10.7" cy="10.7" r="6.7" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" />
      <circle cx="15" cy="17" r="2" fill="currentColor" />
    </>
  ),
  heart: (
    <path d="M20.5 4.9a5.2 5.2 0 0 0-7.4 0L12 6l-1.1-1.1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.5-8.7a5.2 5.2 0 0 0 0-7.4Z" />
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  discover: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
    </>
  ),
  arrow: <path d="m14 5-7 7 7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  sort: (
    <>
      <path d="M8 4v16m-4-4 4 4 4-4M15 5h6M15 10h4M15 15h2" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" fill="currentColor" strokeWidth="0" />,
  folder: <path d="M3 7V5h6l2 3h10v12H3Z" />,
  check: <path d="m5 12 4 4 10-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
};
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}
function Overlay({
  title,
  children,
  onClose,
  kind = "sheet",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  kind?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("button,input")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const els = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,a[href]",
          ) || []),
        ].filter((x) => x.getClientRects().length);
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="vx-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`vx-panel ${kind}`}
      >
        <div className="vx-handle" />
        <header className="vx-panel-head">
          <h2>{title}</h2>
          <button className="vx-icon" aria-label="关闭" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Experience({
  profile,
  logout,
}: {
  profile: Schemas["Profile"];
  logout: () => Promise<void>;
}) {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 740);
  useEffect(() => {
    const m = matchMedia("(min-width:740px)");
    const update = () => setDesktop(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  const cache = useQueryClient(),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [name, setName] = useState("");
  const [coverView, setCoverView] = useState<"poster" | "backdrop">("poster");
  const [nav, setNav] = useState("片库"),
    [entity, setEntity] = useState("影片"),
    [filters, setFilters] = useState<Filters>(defaults),
    [draft, setDraft] = useState<Filters>(defaults),
    [panel, setPanel] = useState<string | null>(null),
    [detail, setDetail] = useState<Film | null>(null),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [scope, setScope] = useState<{
      name: string;
      kind: string;
      id: string;
    } | null>(null);
  const [notice, setNotice] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const backStack = useRef<Array<() => void>>([]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);
  const setTab = (tab: string) => {
    backStack.current = [];
    setPage(1);
    setEntity(tab);
    setScope(null);
    setFilters({
      ...defaults,
      category: filters.category,
      sort: tab === "影片" ? "添加时间" : "作品数量",
    });
  };
  const openNav = (name: string) => {
    backStack.current = [];
    mainRef.current?.scrollTo(0, 0);
    setPage(1);
    setNav(name);
    if (desktop) setSearchOpen(false);
    setScope(null);
    setDetail(null);
    setPanel(null);
    setFilters(defaults);
    setQuery("");
    setEntity("影片");
  };
  useEffect(() => {
    if (!detail || panel) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDetail(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail, panel]);
  const facts = useQuery({
    queryKey: ["browse-facts"],
    queryFn: () => unwrap(api.GET("/api/browse/facts")),
  });
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: () => unwrap(api.GET("/api/categories")),
  });
  const catRows = (cats.data ?? []).filter((c) => c.isVisible),
    categories = ["全部", ...catRows.map((c) => c.id)],
    catName = (id: string) => catRows.find((c) => c.id === id)?.name ?? id;
  const releaseYears = (facts.data?.years ?? []).map(String);
  const sortMedia = (f: Filters) =>
    f.sort === "发行年份"
      ? ("year" as const)
      : f.sort === "我的评分"
        ? ("rating" as const)
        : f.sort === "名称"
          ? ("name" as const)
          : ("createdAt" as const);
  function params(f: Filters) {
    return {
      q: query || undefined,
      categoryId: f.category === "全部" ? undefined : f.category,
      episodesOnly: f.shape === "仅分集" || undefined,
      year: f.year === "全部" ? undefined : Number(f.year),
      watched: f.seen === "全部" ? undefined : f.seen === "已看",
      favorite:
        nav === "收藏" && !scope
          ? true
          : f.favorite === "全部"
            ? undefined
            : f.favorite === "已喜欢",
      ratingMin: /^[1-5]$/.test(f.rating) ? Number(f.rating) : undefined,
      unrated: f.rating === "未评分" || undefined,
      sort: sortMedia(f),
      direction: f.direction,
      actorId: scope?.kind === "演员" ? scope.id : undefined,
      franchiseId: scope?.kind === "系列" ? scope.id : undefined,
      collectionId: scope?.kind === "收藏夹" ? scope.id : undefined,
    };
  }
  const mediaQuery = params(filters);
  const movies = useQuery({
    queryKey: ["browse-media", mediaQuery, page],
    enabled: entity === "影片",
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: { query: { ...mediaQuery, page, pageSize: 48 } },
        }),
      ),
  });
  const preview = useQuery({
    queryKey: ["draft-count", params(draft)],
    enabled:
      entity === "影片" && !!panel && ["filters", "sort"].includes(panel),
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: { query: { ...params(draft), pageSize: 1 } },
        }),
      ),
  });
  const rel = {
    q: query || undefined,
    page,
    pageSize: 48,
    categoryId: mediaQuery.categoryId,
    sort:
      filters.sort === "作品数量"
        ? ("count" as const)
        : filters.sort === "名称"
          ? ("name" as const)
          : ("createdAt" as const),
    direction: filters.direction,
  };
  const actorList = useQuery({
    queryKey: ["people", rel],
    enabled: entity === "演员",
    queryFn: () => unwrap(api.GET("/api/people", { params: { query: rel } })),
  });
  const seriesList = useQuery({
    queryKey: ["series", rel],
    enabled: entity === "系列",
    queryFn: () =>
      unwrap(api.GET("/api/franchises", { params: { query: rel } })),
  });
  const collectionList = useQuery({
    queryKey: ["folders"],
    queryFn: () => unwrap(api.GET("/api/collections")),
  });
  const detailReq = useQuery({
    queryKey: ["detail", detail?.id],
    enabled: !!detail,
    queryFn: () =>
      unwrap(
        api.GET("/api/media/{id}", { params: { path: { id: detail!.id } } }),
      ),
  });
  const continuing = useQuery({
    queryKey: ["continuing"],
    enabled: nav === "发现",
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: {
            query: { resumable: true, sort: "lastPlayed", pageSize: 6 },
          },
        }),
      ),
  });
  const films = movies.data?.items ?? [],
    result = films,
    featured = films[0],
    total =
      entity === "影片"
        ? movies.data?.total
        : entity === "演员"
          ? actorList.data?.total
          : seriesList.data?.total;
  const visiblePeople = actorList.data?.items ?? [],
    visibleSeries = seriesList.data?.items ?? [],
    folders = collectionList.data ?? [],
    info = detailReq.data;
  const active = [
    filters.category,
    filters.year,
    filters.seen,
    filters.favorite,
    filters.shape,
    filters.rating,
  ].filter((v) => v !== "全部").length;
  const invalid = async () => {
    await cache.invalidateQueries();
  };
  async function mutate(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await invalid();
    } catch (e) {
      setNotice((e as Error).message);
      await invalid();
    } finally {
      setBusy(false);
    }
  }
  function personal(m: Film, patch: Partial<Schemas["MediaStatePatch"]>) {
    const current = info?.id === m.id ? info : m;
    void mutate(async () => {
      const next = await unwrap(
        api.PATCH("/api/media/{id}/state", {
          params: { path: { id: m.id } },
          body: { expectedRevision: current.stateRevision, ...patch },
        }),
      );
      setDetail((old) => (old?.id === next.id ? next : old));
    });
  }
  function setFolder(f: Schemas["Collection"], id: string) {
    void mutate(() =>
      unwrap(
        api.PUT("/api/collections/{id}/items", {
          params: { path: { id: f.id } },
          body: {
            expectedRevision: f.revision,
            mediaIds: f.mediaIds.includes(id)
              ? f.mediaIds.filter((x) => x !== id)
              : [...f.mediaIds, id],
          },
        }),
      ),
    );
  }
  const newFolder = () =>
    void mutate(async () => {
      await unwrap(
        api.POST("/api/collections", { body: { name: name.trim() } }),
      );
      setName("");
      setPanel(null);
    });
  const loadError =
    movies.error ||
    actorList.error ||
    seriesList.error ||
    collectionList.error ||
    detailReq.error ||
    facts.error;
  const explore = (name: string, kind: string, id: string) => {
    const previousPage = page;
    const scrollTop = mainRef.current?.scrollTop || 0;
    backStack.current.push(() => {
      setPage(previousPage);
      setNav(nav);
      setEntity(entity);
      setFilters(filters);
      setQuery(query);
      setScope(scope);
      setDetail(detail);
      requestAnimationFrame(() => mainRef.current?.scrollTo(0, scrollTop));
    });
    mainRef.current?.scrollTo(0, 0);
    setDetail(null);
    setPanel(null);
    setPage(1);
    setScope({ name, kind, id });
    setEntity("影片");
    setFilters(defaults);
    setQuery("");
    setNav("片库");
  };
  const returnToBrowse = () => {
    const restore = backStack.current.pop();
    if (restore) restore();
    else {
      setScope(null);
      setFilters(defaults);
    }
  };
  const changeSearch = (value: string) => {
    if (desktop && (nav === "发现" || nav === "我的")) {
      openNav("片库");
      setSearchOpen(searchOpen);
    }
    setPage(1);
    setQuery(value);
  };
  const openFilters = (mode = "filters") => {
    setDraft({ ...filters });
    setPanel(mode);
  };
  const card = (m: Film) => (
    <article className="vx-film" key={m.id}>
      <button
        className="vx-cover"
        onClick={() => setDetail(m)}
        aria-label={`查看${m.title}`}
      >
        <Art
          id={
            coverView === "poster"
              ? (m.posterId ?? m.backdropId)
              : (m.backdropId ?? m.posterId)
          }
          alt={m.title}
        />
        {m.durationMs != null && (
          <span className="vx-runtime">
            {m.durationMs < 60000
              ? Math.floor(m.durationMs / 1000) + " 秒"
              : Math.round(m.durationMs / 60000) + " 分钟"}
          </span>
        )}
        {!!m.watchedAt && (
          <span className="vx-seen">
            <Icon name="check" size={11} />
            已看
          </span>
        )}
      </button>
      <button
        className={`vx-love ${m.isFavorite ? "chosen" : ""}`}
        onClick={() => personal(m, { isFavorite: !m.isFavorite })}
        aria-label={`${m.isFavorite ? "取消喜欢" : "喜欢"}${m.title}`}
        aria-pressed={m.isFavorite}
      >
        <Icon name="heart" size={17} />
      </button>
      <button className="vx-title" onClick={() => setDetail(m)}>
        {m.title}
      </button>
      <div className="vx-film-meta">
        <span>
          {m.releaseYear ?? "—"} · {m.categoryName}
        </span>
        {m.rating && <span className="vx-score">★ {m.rating}</span>}
      </div>
    </article>
  );
  const navItems: [string, string][] = [
    ["发现", "discover"],
    ["片库", "grid"],
    ["收藏", "heart"],
    ["我的", "user"],
  ];
  const picks = (key: keyof Filters, values: string[]) => (
    <div className="vx-picks">
      {values.map((v) => (
        <button
          key={v}
          aria-pressed={draft[key] === v}
          className={draft[key] === v ? "selected" : ""}
          onClick={() =>
            setDraft({
              ...draft,
              [key]: v,
              ...(key === "sort"
                ? { direction: v === "名称" ? "asc" : "desc" }
                : {}),
            })
          }
        >
          {key === "rating" && v !== "全部" && v !== "未评分"
            ? `${v} 星及以上`
            : key === "category"
              ? catName(v)
              : v}
          {draft[key] === v && <Icon name="check" size={13} />}
        </button>
      ))}
    </div>
  );
  return (
    <div
      className={`vx-design ${desktop ? "vx-desktop" : "vx-mobile"}`}
      data-covers={coverView}
    >
      <div className="vx-body">
        <header className="vx-top">
          {desktop ? (
            <>
              <button
                className="vx-wordmark"
                aria-label="video-x 片库"
                onClick={() => openNav("片库")}
              >
                video<span>—x</span>
              </button>
              <nav className="vx-watch-nav" aria-label="观看导航">
                {["发现", "片库", "收藏"].map((name) => (
                  <button
                    key={name}
                    aria-current={
                      (scope?.kind === "收藏夹" ? "收藏" : nav) === name
                        ? "page"
                        : undefined
                    }
                    onClick={() => openNav(name)}
                  >
                    {name}
                  </button>
                ))}
              </nav>
            </>
          ) : (
            <div className="vx-heading">
              {scope ? (
                <button
                  className="vx-icon"
                  aria-label="返回上一页"
                  onClick={returnToBrowse}
                >
                  <Icon name="arrow" />
                </button>
              ) : (
                <span className="vx-mark">
                  v<span>×</span>
                </span>
              )}
              <h1>{scope ? scope.name : nav}</h1>
            </div>
          )}
          <div className="vx-top-actions">
            {desktop && (
              <label className="vx-desktop-search">
                <Icon name="search" size={17} />
                <input
                  value={query}
                  onChange={(e) => changeSearch(e.target.value)}
                  placeholder={`搜索${entity === "影片" ? "影片或演员" : entity}`}
                  aria-label="搜索片库"
                />
              </label>
            )}
            <button
              className={desktop ? "vx-icon vx-condensed-search" : "vx-icon"}
              aria-label="搜索片库"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Icon name="search" size={22} />
            </button>
            <button
              aria-current={desktop && nav === "我的" ? "page" : undefined}
              className="vx-avatar-letter"
              aria-label="我的资料"
              onClick={() => openNav("我的")}
            >
              {profile.displayName.slice(0, 1)}
            </button>
          </div>
        </header>
        {searchOpen && (
          <div className="vx-search">
            <Icon name="search" size={18} />
            <input
              autoFocus
              placeholder={`搜索${entity === "影片" ? "影片或演员" : entity}`}
              aria-label="搜索片库"
              value={query}
              onChange={(e) => changeSearch(e.target.value)}
            />
            <button
              onClick={() => {
                setQuery("");
                setSearchOpen(false);
              }}
            >
              取消
            </button>
          </div>
        )}
        <main ref={mainRef} className="vx-main">
          {desktop && scope && (
            <div className="vx-scope-title">
              <button
                className="vx-icon"
                aria-label="返回上一页"
                onClick={returnToBrowse}
              >
                <Icon name="arrow" />
              </button>
              <h1>{scope.name}</h1>
            </div>
          )}
          {nav === "发现" ? (
            <>
              {featured && (
                <section className="vx-discover-hero">
                  <Art
                    id={featured.backdropId ?? featured.posterId}
                    alt={featured.title}
                  />
                  <div>
                    <span>片库精选</span>
                    <h2>{featured.title}</h2>
                    <p>
                      {featured.releaseYear} · {featured.categoryName}
                    </p>
                    <button
                      className="vx-primary"
                      onClick={() => setDetail(featured)}
                    >
                      <Icon name="play" />
                      查看影片
                    </button>
                  </div>
                </section>
              )}
              {!!continuing.data?.items.length && (
                <>
                  <div className="vx-section-heading">
                    <h2>继续观看</h2>
                  </div>
                  {continuing.data.items.map((m) => (
                    <button
                      key={m.id}
                      className="vx-continue"
                      onClick={() => setDetail(m)}
                    >
                      <Art id={m.backdropId ?? m.posterId} alt={m.title} />
                      <div>
                        <b>{m.title}</b>
                        <small>
                          看到 {Math.floor((m.resumeMs ?? 0) / 60000)}:
                          {String(
                            Math.floor((m.resumeMs ?? 0) / 1000) % 60,
                          ).padStart(2, "0")}
                        </small>
                      </div>
                      <Icon name="play" />
                    </button>
                  ))}
                </>
              )}
              <div className="vx-section-heading">
                <h2>最近添加</h2>
                <button onClick={() => openNav("片库")}>
                  全部影片 <Icon name="chevron" size={14} />
                </button>
              </div>
              <div className="vx-film-grid">{films.slice(0, 6).map(card)}</div>
            </>
          ) : nav === "我的" ? (
            <section className="vx-profile">
              <span className="vx-profile-avatar">
                {profile.displayName.slice(0, 1)}
              </span>
              <h2>{profile.displayName}</h2>

              <div className="vx-profile-stats">
                <div>
                  <strong>{facts.data?.films ?? 0}</strong>影片
                </div>
                <div>
                  <strong>{facts.data?.favorites ?? 0}</strong>喜欢
                </div>
                <div>
                  <strong>{facts.data?.watched ?? 0}</strong>已看
                </div>
              </div>
              <button onClick={() => openNav("收藏")}>
                <Icon name="folder" />
                我的收藏
                <Icon name="chevron" />
              </button>
              <button
                onClick={() => {
                  openNav("片库");
                  setFilters({ ...defaults, seen: "已看" });
                }}
              >
                <Icon name="check" />
                看过的影片
                <Icon name="chevron" />
              </button>
              <button
                onClick={() => void logout().catch((e) => setNotice(e.message))}
              >
                <Icon name="discover" />
                退出登录
                <Icon name="chevron" />
              </button>
            </section>
          ) : (
            <>
              {nav === "收藏" && !scope && (
                <>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      className="vx-collection"
                      onClick={() => explore(f.name, "收藏夹", f.id)}
                    >
                      <div className="vx-cover-stack">
                        {f.coverId ? (
                          <img alt="" src={"/api/art/" + f.coverId} />
                        ) : (
                          <Icon name="folder" size={38} />
                        )}
                      </div>
                      <div>
                        <b>{f.name}</b>
                        <span>
                          {f.mediaIds.length} 部影片
                          {f.description ? " · " + f.description : ""}
                        </span>
                      </div>
                      <Icon name="chevron" />
                    </button>
                  ))}
                  <button
                    className="vx-new-folder"
                    onClick={() => setPanel("new-folder")}
                  >
                    <Icon name="plus" size={15} /> 新建收藏夹
                  </button>
                  <div className="vx-section-heading">
                    <h2>我喜欢的</h2>
                    <span>{facts.data?.favorites ?? 0} 部</span>
                  </div>
                </>
              )}
              {!scope && nav === "片库" && (
                <div
                  className="vx-entity-tabs"
                  role="tablist"
                  aria-label="片库视图"
                >
                  {["影片", "演员", "系列"].map((t) => (
                    <button
                      role="tab"
                      aria-selected={entity === t}
                      key={t}
                      className={entity === t ? "active" : ""}
                      onClick={() => setTab(t)}
                    >
                      {t}
                      {desktop && (
                        <small>
                          {t === "影片"
                            ? (facts.data?.films ?? 0)
                            : t === "演员"
                              ? (facts.data?.actors ?? 0)
                              : (facts.data?.series ?? 0)}
                        </small>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="vx-list-controls">
                <div className="vx-category-bar" aria-label="分类">
                  {categories.map((c) => (
                    <button
                      aria-pressed={filters.category === c}
                      className={filters.category === c ? "active" : ""}
                      onClick={() => (
                        setPage(1),
                        setFilters({ ...filters, category: c })
                      )}
                      key={c}
                    >
                      {catName(c)}
                    </button>
                  ))}
                </div>
                <div className="vx-toolbar">
                  <span>
                    {entity === "影片"
                      ? `${total ?? 0} 部影片`
                      : entity === "演员"
                        ? `${total ?? 0} 位演员`
                        : `${total ?? 0} 个系列`}
                    {scope && <em> · {scope.kind}作品</em>}
                  </span>
                  <div>
                    {entity === "影片" && (
                      <button
                        className="vx-cover-toggle"
                        aria-label={
                          coverView === "poster" ? "切换为横图" : "切换为海报"
                        }
                        onClick={() =>
                          setCoverView(
                            coverView === "poster" ? "backdrop" : "poster",
                          )
                        }
                      >
                        <Icon name="grid" size={15} />
                        {coverView === "poster" ? "横图" : "海报"}
                      </button>
                    )}
                    <button onClick={() => openFilters("sort")}>
                      <Icon name="sort" size={16} />
                      {filters.sort === "添加时间"
                        ? filters.direction === "desc"
                          ? "最近添加"
                          : "最早添加"
                        : filters.sort}
                      <span>{filters.direction === "desc" ? "↓" : "↑"}</span>
                    </button>
                    <button
                      className={active ? "active" : ""}
                      onClick={() => openFilters()}
                    >
                      <Icon name="filter" size={17} />
                      <span>筛选{active ? ` ${active}` : ""}</span>
                    </button>
                  </div>
                </div>
              </div>
              {(filters.year !== "全部" ||
                filters.seen !== "全部" ||
                filters.favorite !== "全部" ||
                filters.rating !== "全部") && (
                <div className="vx-active-filters">
                  {filters.year !== "全部" && <span>{filters.year}</span>}
                  {filters.seen !== "全部" && <span>{filters.seen}</span>}
                  {filters.favorite !== "全部" && (
                    <span>{filters.favorite}</span>
                  )}
                  {filters.rating !== "全部" && (
                    <span>
                      {filters.rating === "未评分"
                        ? "未评分"
                        : `${filters.rating} 星及以上`}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      setFilters({
                        ...defaults,
                        sort: filters.sort,
                        direction: filters.direction,
                      })
                    }
                  >
                    清除
                  </button>
                </div>
              )}
              {entity === "影片" ? (
                result.length ? (
                  <div className="vx-film-grid">{result.map(card)}</div>
                ) : (
                  <div className="vx-empty">
                    <Icon name="search" size={32} />
                    <h3>没有符合条件的影片</h3>
                    <p>换个关键词，或放宽一点筛选条件。</p>
                    <button
                      onClick={() => {
                        setQuery("");
                        setFilters(defaults);
                      }}
                    >
                      清除筛选
                    </button>
                  </div>
                )
              ) : entity === "演员" ? (
                <div className="vx-people-grid">
                  {visiblePeople.map((p) => (
                    <button
                      className="vx-person"
                      key={p.id}
                      onClick={() => explore(p.fullName, "演员", p.id)}
                    >
                      <Art id={p.portraitId} alt={p.fullName} />
                      <h3>{p.fullName}</h3>
                      <span>
                        {p.categoryName} · {p.workCount} 部作品
                      </span>
                    </button>
                  ))}
                  {!visiblePeople.length && (
                    <div className="vx-empty">没有符合条件的演员</div>
                  )}
                </div>
              ) : (
                <div className="vx-series-grid">
                  {visibleSeries.map((s) => (
                    <button
                      className="vx-series"
                      key={s.id}
                      onClick={() => explore(s.name, "系列", s.id)}
                    >
                      <Art id={s.coverId} alt={s.name} />
                      <div>
                        <span>
                          {s.categoryName} / {s.workCount} 部作品
                        </span>
                        <h3>{s.name}</h3>
                      </div>
                      <Icon name="chevron" />
                    </button>
                  ))}
                  {!visibleSeries.length && (
                    <div className="vx-empty">没有符合条件的系列</div>
                  )}
                </div>
              )}
              {(total ?? 0) > 48 && (
                <footer className="vx-list-end">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </button>{" "}
                  {page} / {Math.ceil((total ?? 0) / 48)}{" "}
                  <button
                    disabled={page * 48 >= (total ?? 0)}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </button>
                </footer>
              )}
            </>
          )}
        </main>
        {!desktop && (
          <nav className="vx-bottom-nav" aria-label="主导航">
            {navItems.map(([name, icon]) => (
              <button
                key={name}
                className={nav === name ? "active" : ""}
                onClick={() => openNav(name)}
              >
                <span>
                  <Icon name={icon} size={21} />
                </span>
                {name}
              </button>
            ))}
          </nav>
        )}
      </div>
      {detail && (
        <div
          className="vx-detail-layer"
          role="dialog"
          aria-modal="true"
          aria-label={detail.title}
        >
          <div className="vx-detail-screen">
            <div className="vx-detail-hero">
              <Art
                id={detail.backdropId ?? detail.posterId}
                alt={detail.title}
              />
              <header>
                <button
                  className="vx-icon"
                  aria-label="返回列表"
                  onClick={() => setDetail(null)}
                >
                  <Icon name="arrow" />
                </button>
                <button
                  className={`vx-icon ${detail.isFavorite ? "chosen" : ""}`}
                  aria-label="喜欢影片"
                  aria-pressed={detail.isFavorite}
                  onClick={() =>
                    personal(detail, { isFavorite: !detail.isFavorite })
                  }
                >
                  <Icon name="heart" />
                </button>
              </header>
              <div>
                <span>
                  {detail.categoryName} / {detail.releaseYear ?? "年份未知"}
                </span>
                <h2>{detail.title}</h2>
                <p>
                  {detail.durationMs != null
                    ? (detail.durationMs < 60000
                        ? Math.floor(detail.durationMs / 1000) + " 秒"
                        : Math.round(detail.durationMs / 60000) + " 分钟") +
                      " · "
                    : ""}{" "}
                  {!!detail.watchedAt ? "已看过" : "未看"}
                </p>
              </div>
            </div>
            <div className="vx-detail-content">
              <div className="vx-detail-primary">
                {info?.episodes?.length ? (
                  <button
                    className="vx-primary"
                    onClick={() => setDetail(info.episodes![0]!)}
                  >
                    选择第 {info.episodes[0]?.episodeNumber} 集
                  </button>
                ) : info?.linkedFileCount ? (
                  <Playback
                    key={detail.id}
                    mediaId={detail.id}
                    profileId={profile.id}
                  />
                ) : (
                  <button className="vx-primary" disabled>
                    {info ? "尚未关联视频" : "正在读取文件…"}
                  </button>
                )}
                <button
                  className="vx-save"
                  onClick={() => setPanel("collection")}
                >
                  <Icon name="folder" size={20} />
                  收藏夹
                </button>
              </div>
              {!!info?.episodes?.length && (
                <section>
                  <h3>分集</h3>
                  {info.episodes.map((m) => (
                    <button
                      className="vx-related"
                      key={m.id}
                      onClick={() => setDetail(m)}
                    >
                      第 {m.episodeNumber} 集　{m.title}
                      <Icon name="chevron" />
                    </button>
                  ))}
                </section>
              )}
              <section className="vx-personal">
                <div>
                  <small>我的评分</small>
                  <div className="vx-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        aria-label={`${n} 星`}
                        aria-pressed={(detail.rating || 0) === n}
                        className={n <= (detail.rating || 0) ? "rated" : ""}
                        onClick={() =>
                          personal(detail, {
                            rating: detail.rating === n ? null : n,
                          })
                        }
                      >
                        <Icon name="star" size={20} />
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className={!!detail.watchedAt ? "active" : ""}
                  onClick={() =>
                    personal(detail, { watched: !detail.watchedAt })
                  }
                >
                  <Icon name="check" size={16} />
                  {!!detail.watchedAt ? "已看过" : "标记已看"}
                </button>
              </section>
              <h3>故事简介</h3>
              <p className="vx-summary">{detail.summary || "暂无简介"}</p>
              <h3>主要演员</h3>
              <div className="vx-cast">
                {info?.actors.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => explore(p.fullName, "演员", p.id)}
                  >
                    <Art id={p.portraitId} alt={p.fullName} />
                    <span>{p.fullName}</span>
                  </button>
                ))}
              </div>
              {!!info?.franchises.length && (
                <>
                  <h3>所属系列</h3>
                  {info.franchises.map((f) => (
                    <button
                      key={f.id}
                      className="vx-related"
                      onClick={() => explore(f.name, "系列", f.id)}
                    >
                      <Art id={f.coverId} alt={f.name} />
                      <div>
                        <b>{f.name}</b>
                        <small>{f.workCount} 部作品 · 查看完整系列</small>
                      </div>
                      <Icon name="chevron" />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {(panel === "filters" || panel === "sort") && (
        <Overlay
          title={panel === "sort" ? "排序方式" : `筛选${entity}`}
          onClose={() => setPanel(null)}
        >
          <div className="vx-filter-content">
            {panel === "filters" && (
              <>
                <h3>
                  分类 <small>单选</small>
                </h3>
                {picks("category", categories)}
                {entity === "影片" && (
                  <>
                    <h3>观看状态</h3>
                    {picks("seen", ["全部", "未看", "已看"])}
                    <h3>喜欢状态</h3>
                    {picks("favorite", ["全部", "已喜欢", "未喜欢"])}
                    <h3>发行年份</h3>
                    {picks("year", ["全部", ...releaseYears])}
                    <h3>作品范围</h3>
                    {picks("shape", ["全部", "仅分集"])}
                    <h3>我的评分</h3>
                    {picks("rating", [
                      "全部",
                      "未评分",
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                    ])}
                  </>
                )}
              </>
            )}
            <h3>排序依据</h3>
            {picks(
              "sort",
              entity === "影片"
                ? ["添加时间", "名称", "发行年份", "我的评分"]
                : ["添加时间", "名称", "作品数量"],
            )}
            <div className="vx-direction" role="group" aria-label="排列方向">
              <button
                className={draft.direction === "desc" ? "selected" : ""}
                onClick={() => setDraft({ ...draft, direction: "desc" })}
              >
                降序 ↓{" "}
                {draft.direction === "desc" && <Icon name="check" size={14} />}
              </button>
              <button
                className={draft.direction === "asc" ? "selected" : ""}
                onClick={() => setDraft({ ...draft, direction: "asc" })}
              >
                升序 ↑{" "}
                {draft.direction === "asc" && <Icon name="check" size={14} />}
              </button>
            </div>
          </div>
          <footer className="vx-panel-footer">
            <button
              className="vx-reset"
              onClick={() =>
                setDraft({
                  ...defaults,
                  sort: draft.sort,
                  direction: draft.direction,
                })
              }
            >
              重置
            </button>
            <button
              className="vx-primary"
              onClick={() => {
                setPage(1);
                setFilters(draft);
                setPanel(null);
              }}
            >
              {entity === "影片"
                ? `查看 ${preview.data?.total ?? "…"} 部影片`
                : "应用条件"}
              <Icon name="chevron" size={16} />
            </button>
          </footer>
        </Overlay>
      )}
      {panel === "collection" && detail && (
        <Overlay title="加入收藏夹" onClose={() => setPanel(null)}>
          <div className="vx-filter-content">
            {folders.map((f) => (
              <button
                key={f.id}
                disabled={busy}
                className="vx-folder-choice"
                onClick={() => setFolder(f, detail.id)}
              >
                <Icon name="folder" />
                <span>
                  {f.name}
                  <small>{f.mediaIds.length} 部影片</small>
                </span>
                <span
                  className={
                    "vx-checkbox " +
                    (f.mediaIds.includes(detail.id) ? "selected" : "")
                  }
                >
                  {f.mediaIds.includes(detail.id) && <Icon name="check" />}
                </span>
              </button>
            ))}
            <button onClick={() => setPanel("new-folder")}>新建收藏夹</button>
          </div>
          <footer className="vx-panel-footer">
            <button className="vx-primary" onClick={() => setPanel(null)}>
              完成
            </button>
          </footer>
        </Overlay>
      )}
      {panel === "new-folder" && (
        <Overlay title="新建收藏夹" onClose={() => setPanel(null)}>
          <form
            className="vx-create-folder"
            onSubmit={(e) => {
              e.preventDefault();
              newFolder();
            }}
          >
            <label>
              名称
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button disabled={busy || !name.trim()} className="vx-primary">
              创建
            </button>
          </form>
        </Overlay>
      )}
      {loadError && (
        <div role="alert" className="vx-toast">
          {loadError.message}
        </div>
      )}
      {notice && (
        <div className="vx-toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
