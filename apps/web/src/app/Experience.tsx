import { LibraryToolbar } from "../features/library/LibraryToolbar";
import { LibraryTabs } from "../features/library/LibraryTabs";
import { CollectionShelf } from "../features/collections/CollectionShelf";
import { CollectionDialogs } from "../features/collections/CollectionDialogs";
import {
  WorkProfile,
  type LibraryScope,
} from "../features/library/WorkProfile";
import { DiscoverPage } from "../features/discover/DiscoverPage";
import { ProfilePage } from "../features/account/ProfilePage";
import { useEffect, useRef, useState } from "react";
import "./experience.css";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "../shared/Icon";
import { WatchHeader } from "./WatchHeader";
import { LibraryResults } from "../features/library/LibraryResults";
import { BrowseFilters } from "../features/library/BrowseFilters";
import { FilmCard } from "../features/library/FilmCard";
import { FilmDetail } from "../features/film/FilmDetail";
import { defaults, type Filters } from "../features/library/filterModel";
import { useLibraryData } from "../features/library/useLibraryData";
type Film = Schemas["Media"];
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
    [resumeOnOpen, setResumeOnOpen] = useState(false),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [scope, setScope] = useState<LibraryScope | null>(null);
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
    setSearchOpen(false);
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
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        closeFilm();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail, panel]);
  const {
    facts,
    categories,
    catName,
    releaseYears,
    movies,
    preview,
    actorList,
    seriesList,
    collectionList,
    detailReq,
    continuing,
    films,
    total,
    visiblePeople,
    visibleSeries,
    folders,
    info,
    active,
  } = useLibraryData({
    nav,
    entity,
    page,
    query,
    scope,
    filters,
    draft,
    panel,
    detail,
  });
  const episodeParents = useRef<Film[]>([]);
  const filmOrigin = useRef<HTMLElement | null>(null);
  function openFilm(film: Film, resume = false) {
    filmOrigin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    episodeParents.current = [];
    setResumeOnOpen(resume);
    setDetail(film);
  }
  function closeFilm() {
    setResumeOnOpen(false);
    const parent = episodeParents.current.pop();
    setDetail(parent ?? null);
    if (!parent)
      requestAnimationFrame(() =>
        filmOrigin.current?.focus({ preventScroll: true }),
      );
  }
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
      setPanel(detail ? "collection" : null);
    });
  const browseQuery =
    entity === "演员" ? actorList : entity === "系列" ? seriesList : movies;
  const loadError =
    (nav === "收藏" || panel === "collection" ? collectionList.error : null) ||
    facts.error;
  const explore = (name: string, kind: LibraryScope["kind"], id: string) => {
    const previousPage = page;
    const restoreFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.getAttribute("aria-label")
        : null;
    const originText = document.activeElement?.textContent;
    const parents = [...episodeParents.current];
    const previousOrigin = filmOrigin.current;
    const scrollTop = mainRef.current?.scrollTop || 0;
    backStack.current.push(() => {
      setPage(previousPage);
      setNav(nav);
      setEntity(entity);
      setFilters(filters);
      setQuery(query);
      setScope(scope);
      setDetail(detail);
      episodeParents.current = parents;
      filmOrigin.current = previousOrigin;
      setResumeOnOpen(false);
      requestAnimationFrame(() => {
        const origin = Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            detail ? ".film-detail button" : ".vx-main button",
          ),
        ).find((b) =>
          restoreFocus
            ? b.getAttribute("aria-label") === restoreFocus
            : b.textContent === originText,
        );
        origin?.focus({ preventScroll: true });
        mainRef.current?.scrollTo(0, scrollTop);
      });
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
    if (nav === "发现" || nav === "我的") {
      openNav("片库");
      setSearchOpen(!desktop);
    }
    setPage(1);
    setQuery(value);
  };
  const openFilters = (mode = "filters") => {
    setDraft({ ...filters });
    setPanel(mode);
  };
  const card = (m: Film) => (
    <FilmCard
      key={m.id}
      m={m}
      coverView={coverView}
      onOpen={() => openFilm(m)}
      onFavorite={() => personal(m, { isFavorite: !m.isFavorite })}
    />
  );
  const navItems: [string, string][] = [
    ["发现", "discover"],
    ["片库", "grid"],
    ["收藏", "heart"],
    ["我的", "user"],
  ];
  return (
    <div
      className={`vx-design ${desktop ? "vx-desktop" : "vx-mobile"}`}
      data-covers={coverView}
    >
      <div className="vx-body" inert={!!detail || !!panel}>
        <WatchHeader
          desktop={desktop}
          scope={scope}
          nav={nav}
          entity={entity}
          query={query}
          name={profile.displayName}
          searchOpen={searchOpen}
          openNav={openNav}
          changeSearch={changeSearch}
          toggleSearch={() => setSearchOpen((v) => !v)}
          cancelSearch={() => {
            setQuery("");
            setSearchOpen(false);
          }}
        />
        <main ref={mainRef} className="vx-main">
          {scope && <WorkProfile scope={scope} back={returnToBrowse} />}
          {nav === "发现" ? (
            <DiscoverPage
              films={films}
              continuing={continuing.data?.items ?? []}
              recentFeed={movies}
              resumeFeed={continuing}
              open={openFilm}
              resume={(film) => openFilm(film, true)}
              openLibrary={() => openNav("片库")}
              card={card}
            />
          ) : nav === "我的" ? (
            <ProfilePage
              name={profile.displayName}
              facts={facts.data}
              folders={() => openNav("收藏")}
              watched={() => {
                openNav("片库");
                setFilters({ ...defaults, seen: "已看" });
              }}
              logout={() => void logout().catch((e) => setNotice(e.message))}
            />
          ) : (
            <>
              {nav === "收藏" && !scope && (
                <>
                  <CollectionShelf
                    folders={folders}
                    open={(name, id) => explore(name, "收藏夹", id)}
                    create={() => {
                      setName("");
                      setPanel("new-folder");
                    }}
                    favorites={facts.data?.favorites}
                  />
                </>
              )}
              {!scope && nav === "片库" && (
                <LibraryTabs
                  desktop={desktop}
                  entity={entity}
                  facts={facts.data}
                  setTab={setTab}
                />
              )}
              <LibraryToolbar
                scope={scope}
                entity={entity}
                filters={filters}
                categories={categories}
                catName={catName}
                total={total}
                coverView={coverView}
                setCoverView={setCoverView}
                openFilters={openFilters}
                active={active}
                setFilters={(value) => {
                  setPage(1);
                  setFilters(value);
                }}
              />
              <LibraryResults
                entity={entity}
                films={films}
                visiblePeople={visiblePeople}
                visibleSeries={visibleSeries}
                renderFilm={card}
                explore={explore}
                resetFilters={() => {
                  setPage(1);
                  setQuery("");
                  setFilters(defaults);
                }}
                page={page}
                setPage={setPage}
                total={total}
                filtered={Boolean(query || active)}
                emptyTitle={
                  scope
                    ? scope.kind === "收藏夹"
                      ? "收藏夹里还没有影片"
                      : "暂无收录作品"
                    : nav === "收藏"
                      ? "还没有喜欢的影片"
                      : undefined
                }
                pending={browseQuery.isPending}
                error={browseQuery.error}
                retry={() => void browseQuery.refetch()}
              />
            </>
          )}
        </main>
        {!desktop && (
          <nav className="vx-bottom-nav" aria-label="主导航">
            {navItems.map(([name, icon]) => (
              <button
                key={name}
                aria-current={
                  (scope?.kind === "收藏夹" ? "收藏" : nav) === name
                    ? "page"
                    : undefined
                }
                className={
                  (scope?.kind === "收藏夹" ? "收藏" : nav) === name
                    ? "active"
                    : ""
                }
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
        <FilmDetail
          key={detail.id}
          detail={detail}
          info={info}
          covered={!!panel}
          error={detailReq.error}
          retry={() => void detailReq.refetch()}
          profileId={profile.id}
          resume={resumeOnOpen}
          onClose={closeFilm}
          openEpisode={(film) => {
            episodeParents.current.push(detail);
            setResumeOnOpen(false);
            setDetail(film);
          }}
          personal={personal}
          collections={() => setPanel("collection")}
          explore={explore}
        />
      )}
      {(panel === "filters" || panel === "sort") && (
        <BrowseFilters
          favoritesOnly={nav === "收藏" && !scope}
          panel={panel}
          entity={entity}
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          catName={catName}
          releaseYears={releaseYears}
          total={preview.data?.total}
          onClose={() => setPanel(null)}
          apply={() => {
            setPage(1);
            setFilters(draft);
            setPanel(null);
          }}
        />
      )}
      <CollectionDialogs
        panel={panel}
        detail={detail}
        folders={folders}
        busy={busy}
        name={name}
        setName={setName}
        setPanel={setPanel}
        setFolder={setFolder}
        newFolder={newFolder}
      />
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
