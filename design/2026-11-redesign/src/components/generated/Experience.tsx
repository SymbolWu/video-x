import React, { useEffect, useRef, useState } from "react";
import "./experience.css";
import { films, people, series, categories, type Film } from "./cinemaCatalog";

const featured = films[0];
const releaseYears = [...new Set(films.map((film) => film.year))]
  .sort((a, b) => b - a)
  .map(String);
type Filters = {
  category: string;
  seen: string;
  favorite: string;
  year: string;
  rating: string;
  sort: string;
  direction: "asc" | "desc";
};
const defaults: Filters = {
  category: "全部",
  seen: "全部",
  favorite: "全部",
  year: "全部",
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
export function Experience({ desktop = false }: { desktop?: boolean }) {
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
      id: number;
    } | null>(null);
  const [favorites, setFavorites] = useState<number[]>([
      693134, 129, 843, 157336, 128, 155, 354912,
    ]),
    [watched, setWatched] = useState<number[]>([
      129, 10775, 120467, 76341, 746, 808,
    ]),
    [ratings, setRatings] = useState<Record<number, number | null>>({
      693134: 4,
      129: 5,
      843: 5,
      155: 4,
      746: 4,
    }),
    [folder, setFolder] = useState<number[]>([693134, 129, 843, 157336]);
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
    setNav(name);
    if (desktop) setSearchOpen(false);
    setScope(null);
    setDetail(null);
    setPanel(null);
    setFilters(defaults);
    setQuery("");
    setEntity("影片");
  };
  const toggleFavorite = (id: number) =>
    setFavorites((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  const toggleWatched = (id: number) =>
    setWatched((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  function filtered(f: Filters) {
    return films
      .filter(
        (m) =>
          (!scope ||
            (scope.kind === "演员"
              ? m.actors.includes(scope.id)
              : scope.kind === "系列"
                ? m.series === scope.id
                : scope.kind === "收藏夹"
                  ? folder.includes(m.id)
                  : true)) &&
          (nav !== "收藏" || scope || favorites.includes(m.id)) &&
          (f.category === "全部" || f.category === m.category) &&
          (f.year === "全部" || m.year === Number(f.year)) &&
          (f.seen === "全部" ||
            (f.seen === "已看"
              ? watched.includes(m.id)
              : !watched.includes(m.id))) &&
          (f.favorite === "全部" ||
            (f.favorite === "已喜欢"
              ? favorites.includes(m.id)
              : !favorites.includes(m.id))) &&
          (f.rating === "全部" ||
            (f.rating === "未评分"
              ? ratings[m.id] == null
              : ratings[m.id] != null && ratings[m.id]! >= Number(f.rating))) &&
          (!query ||
            [
              m.title,
              ...m.actors.map((id) => people.find((p) => p.id === id)!.name),
            ].some((t) => t.includes(query))),
      )
      .sort((a, b) => {
        if (f.sort === "我的评分") {
          if (ratings[a.id] == null && ratings[b.id] == null)
            return a.id - b.id;
          if (ratings[a.id] == null) return 1;
          if (ratings[b.id] == null) return -1;
        }
        let delta =
          f.sort === "名称"
            ? a.title.localeCompare(b.title, "zh-CN")
            : f.sort === "发行年份"
              ? a.year - b.year
              : f.sort === "我的评分"
                ? (ratings[a.id] || 0) - (ratings[b.id] || 0)
                : Date.parse(a.createdAt) - Date.parse(b.createdAt);
        return delta * (f.direction === "asc" ? 1 : -1) || a.id - b.id;
      });
  }
  const result = filtered(filters);
  const detailSeries = detail && series.find((s) => s.id === detail.series);
  const active = [
    filters.category !== "全部",
    filters.year !== "全部",
    filters.seen !== "全部",
    filters.favorite !== "全部",
    filters.rating !== "全部",
  ].filter(Boolean).length;
  const visiblePeople = people
    .filter(
      (p) =>
        (filters.category === "全部" || p.category === filters.category) &&
        (!query || p.name.includes(query) || p.detailed.includes(query)),
    )
    .sort((a, b) => {
      const n =
        filters.sort === "作品数量"
          ? films.filter((f) => f.actors.includes(a.id)).length -
            films.filter((f) => f.actors.includes(b.id)).length
          : filters.sort === "名称"
            ? a.name.localeCompare(b.name, "zh-CN")
            : Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return n * (filters.direction === "asc" ? 1 : -1) || a.id - b.id;
    });
  const visibleSeries = series
    .filter(
      (p) =>
        (filters.category === "全部" || p.category === filters.category) &&
        (!query || p.name.includes(query)),
    )
    .sort((a, b) => {
      const n =
        filters.sort === "作品数量"
          ? films.filter((f) => f.series === a.id).length -
            films.filter((f) => f.series === b.id).length
          : filters.sort === "名称"
            ? a.name.localeCompare(b.name, "zh-CN")
            : Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return n * (filters.direction === "asc" ? 1 : -1) || a.id - b.id;
    });
  const explore = (name: string, kind: string, id: number) => {
    const scrollTop = mainRef.current?.scrollTop || 0;
    backStack.current.push(() => {
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
        <img
          src={coverView === "poster" ? m.image : m.backdrop}
          alt={m.title}
          loading="lazy"
        />
        <span className="vx-runtime">{m.minutes} 分钟</span>
        {watched.includes(m.id) && (
          <span className="vx-seen">
            <Icon name="check" size={11} />
            已看
          </span>
        )}
      </button>
      <button
        className={`vx-love ${favorites.includes(m.id) ? "chosen" : ""}`}
        onClick={() => toggleFavorite(m.id)}
        aria-label={`${favorites.includes(m.id) ? "取消喜欢" : "喜欢"}${m.title}`}
        aria-pressed={favorites.includes(m.id)}
      >
        <Icon name="heart" size={17} />
      </button>
      <button className="vx-title" onClick={() => setDetail(m)}>
        {m.title}
      </button>
      <div className="vx-film-meta">
        <span>
          {m.year} · {m.category}
        </span>
        {ratings[m.id] && <span className="vx-score">★ {ratings[m.id]}</span>}
      </div>
    </article>
  );
  const navItems = [
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
              W
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
              <section className="vx-discover-hero">
                <img src={featured.backdrop} alt={featured.title} />
                <div>
                  <span>片库精选</span>
                  <h2>{featured.title}</h2>
                  <p>
                    {featured.year} · {featured.category} · {featured.minutes}{" "}
                    分钟
                  </p>
                  <button
                    className="vx-primary"
                    onClick={() => setDetail(featured)}
                  >
                    <Icon name="play" size={17} />
                    查看影片
                  </button>
                </div>
              </section>
              <div className="vx-section-heading">
                <h2>继续观看</h2>
                <span>回到上次的故事</span>
              </div>
              <button
                className="vx-continue"
                onClick={() => {
                  setDetail(featured);
                  setNotice("继续播放位置：38:20（交互演示）");
                }}
              >
                <img src={featured.backdrop} alt={featured.title} />
                <div>
                  <b>{featured.title}</b>
                  <small>看到 38:20 · 共 {featured.minutes} 分钟</small>
                  <div className="vx-progress">
                    <i
                      style={{
                        width: `${((38 + 20 / 60) / featured.minutes) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="vx-play-circle">
                  <Icon name="play" size={17} />
                </span>
              </button>
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
              <span className="vx-profile-avatar">W</span>
              <h2>我的片库</h2>
              <p>把喜欢的故事，留在身边。</p>
              <div className="vx-profile-stats">
                <div>
                  <strong>{films.length}</strong>影片
                </div>
                <div>
                  <strong>{favorites.length}</strong>喜欢
                </div>
                <div>
                  <strong>{watched.length}</strong>已看
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
              <button onClick={() => setPanel("about")}>
                <Icon name="discover" />
                关于这份设计
                <Icon name="chevron" />
              </button>
            </section>
          ) : (
            <>
              {nav === "收藏" && !scope && (
                <>
                  <button
                    className="vx-collection"
                    onClick={() => explore("周末放映", "收藏夹", 1)}
                  >
                    <div className="vx-cover-stack">
                      {folder.slice(0, 3).map((id) => (
                        <img
                          key={id}
                          src={films.find((f) => f.id === id)!.image}
                          alt=""
                        />
                      ))}
                    </div>
                    <div>
                      <b>周末放映</b>
                      <span>{folder.length} 部影片 · 留给放松的时光</span>
                    </div>
                    <Icon name="chevron" size={18} />
                  </button>
                  <div className="vx-section-heading">
                    <h2>我喜欢的</h2>
                    <span>{favorites.length} 部</span>
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
                            ? films.length
                            : t === "演员"
                              ? people.length
                              : series.length}
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
                      onClick={() => setFilters({ ...filters, category: c })}
                      key={c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="vx-toolbar">
                  <span>
                    {entity === "影片"
                      ? `${result.length} 部影片`
                      : entity === "演员"
                        ? `${visiblePeople.length} 位演员`
                        : `${visibleSeries.length} 个系列`}
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
                      onClick={() => explore(p.name, "演员", p.id)}
                    >
                      <img src={p.image} alt={p.name} loading="lazy" />
                      <h3>{p.name}</h3>
                      <span>
                        {p.category} ·{" "}
                        {films.filter((f) => f.actors.includes(p.id)).length}{" "}
                        部作品
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
                      <img src={s.image} alt={s.name} />
                      <div>
                        <span>
                          {s.category} /{" "}
                          {films.filter((f) => f.series === s.id).length} 部作品
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
              {desktop && (
                <footer className="vx-list-end">
                  {entity === "影片" ? "已展示全部影片" : "已展示全部资料"}
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
        <div className="vx-detail-layer">
          <div className="vx-detail-screen">
            <div className="vx-detail-hero">
              <img src={detail.backdrop} alt={detail.title} />
              <header>
                <button
                  className="vx-icon"
                  aria-label="返回列表"
                  onClick={() => setDetail(null)}
                >
                  <Icon name="arrow" />
                </button>
                <button
                  className={`vx-icon ${favorites.includes(detail.id) ? "chosen" : ""}`}
                  aria-label="喜欢影片"
                  aria-pressed={favorites.includes(detail.id)}
                  onClick={() => toggleFavorite(detail.id)}
                >
                  <Icon name="heart" />
                </button>
              </header>
              <div>
                <span>
                  {detail.category} / {detail.year}
                </span>
                <h2>{detail.title}</h2>
                <p>
                  {detail.minutes} 分钟 ·{" "}
                  {watched.includes(detail.id) ? "已看过" : "未看"}
                </p>
              </div>
            </div>
            <div className="vx-detail-content">
              <div className="vx-detail-primary">
                <button
                  className="vx-primary"
                  onClick={() =>
                    setNotice("播放交互演示；这份设计未连接媒体文件")
                  }
                >
                  <Icon name="play" size={18} />
                  {detail.id === featured.id ? "继续播放 · 38:20" : "播放影片"}
                </button>
                <button
                  className="vx-save"
                  onClick={() => setPanel("collection")}
                >
                  <Icon name="folder" size={20} />
                  收藏夹
                </button>
              </div>
              <section className="vx-personal">
                <div>
                  <small>我的评分</small>
                  <div className="vx-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        aria-label={`${n} 星`}
                        aria-pressed={(ratings[detail.id] || 0) === n}
                        className={
                          n <= (ratings[detail.id] || 0) ? "rated" : ""
                        }
                        onClick={() =>
                          setRatings((v) => ({
                            ...v,
                            [detail.id]: v[detail.id] === n ? null : n,
                          }))
                        }
                      >
                        <Icon name="star" size={20} />
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className={watched.includes(detail.id) ? "active" : ""}
                  onClick={() => toggleWatched(detail.id)}
                >
                  <Icon name="check" size={16} />
                  {watched.includes(detail.id) ? "已看过" : "标记已看"}
                </button>
              </section>
              <h3>故事简介</h3>
              <p className="vx-summary">{detail.summary}</p>
              <h3>主要演员</h3>
              <div className="vx-cast">
                {detail.actors.map((id) => {
                  const p = people.find((p) => p.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => explore(p.name, "演员", id)}
                    >
                      <img src={p.image} alt={p.name} loading="lazy" />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              {detailSeries && (
                <>
                  <h3>所属系列</h3>
                  <button
                    className="vx-related"
                    onClick={() =>
                      explore(detailSeries.name, "系列", detailSeries.id)
                    }
                  >
                    <img src={detailSeries.image} alt="" />
                    <div>
                      <b>{detailSeries.name}</b>
                      <small>
                        {
                          films.filter((f) => f.series === detailSeries.id)
                            .length
                        }{" "}
                        部作品 · 查看完整系列
                      </small>
                    </div>
                    <Icon name="chevron" size={17} />
                  </button>
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
                setFilters(draft);
                setPanel(null);
              }}
            >
              {entity === "影片"
                ? `查看 ${filtered(draft).length} 部影片`
                : "应用条件"}
              <Icon name="chevron" size={16} />
            </button>
          </footer>
        </Overlay>
      )}
      {panel === "collection" && detail && (
        <Overlay title="加入收藏夹" onClose={() => setPanel(null)}>
          <div className="vx-filter-content">
            <button
              className="vx-folder-choice"
              onClick={() =>
                setFolder((v) =>
                  v.includes(detail.id)
                    ? v.filter((x) => x !== detail.id)
                    : [...v, detail.id],
                )
              }
            >
              <Icon name="folder" />
              <span>
                周末放映<small>{folder.length} 部影片</small>
              </span>
              <span
                className={`vx-checkbox ${folder.includes(detail.id) ? "selected" : ""}`}
              >
                {folder.includes(detail.id) && <Icon name="check" size={15} />}
              </span>
            </button>
          </div>
          <footer className="vx-panel-footer">
            <button className="vx-primary" onClick={() => setPanel(null)}>
              完成
            </button>
          </footer>
        </Overlay>
      )}
      {panel === "about" && (
        <Overlay title="关于这份设计" onClose={() => setPanel(null)}>
          <div className="vx-filter-content vx-about">
            <h3>video-x · 设计预览</h3>
            <p>
              海报、剧照与演职员资料来自
              TMDB。喜欢、评分、收藏夹和观看进度是本地演示数据。
            </p>
            <p>
              可以体验分类、筛选、升降序、详情、喜欢、评分和加入收藏夹。数据只在当前预览中变化，尚未连接真实片库；播放按钮仅演示交互。
            </p>
            <p>
              网页版与 Android 共用业务规则，Android 正式实现仍使用原生界面。
            </p>
          </div>
        </Overlay>
      )}
      {notice && (
        <div className="vx-toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
