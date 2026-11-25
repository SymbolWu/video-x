import { Icon } from "../shared/Icon";
export function WatchHeader({
  desktop,
  scope,
  nav,
  entity,
  query,
  name,
  searchOpen,
  openNav,
  changeSearch,
  toggleSearch,
  cancelSearch,
}: {
  desktop: boolean;
  scope: { name: string; kind: string } | null;
  nav: string;
  entity: string;
  query: string;
  name: string;
  searchOpen: boolean;
  openNav: (name: string) => void;
  changeSearch: (value: string) => void;
  toggleSearch: () => void;
  cancelSearch: () => void;
}) {
  return (
    <>
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
            <span className="vx-mark" aria-hidden="true">
              v<span>×</span>
            </span>
            {scope ? (
              <span>{scope.kind === "收藏夹" ? "收藏" : "片库"}</span>
            ) : (
              <h1>{nav}</h1>
            )}
          </div>
        )}
        <div className="vx-top-actions">
          {desktop && (
            <label className="vx-desktop-search">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder={
                  scope
                    ? "搜索当前作品"
                    : `搜索${entity === "影片" ? "影片或演员" : entity}`
                }
                aria-label="搜索片库"
              />
            </label>
          )}
          <button
            className={desktop ? "vx-icon vx-condensed-search" : "vx-icon"}
            aria-label="搜索片库"
            onClick={() => toggleSearch()}
          >
            <Icon name="search" size={22} />
          </button>
          <button
            aria-current={desktop && nav === "我的" ? "page" : undefined}
            className="vx-avatar-letter"
            aria-label="我的资料"
            onClick={() => openNav("我的")}
          >
            {name.slice(0, 1)}
          </button>
        </div>
      </header>
      {searchOpen && (
        <div className="vx-search">
          <Icon name="search" size={18} />
          <input
            autoFocus
            placeholder={
              scope
                ? "搜索当前作品"
                : `搜索${entity === "影片" ? "影片或演员" : entity}`
            }
            aria-label="搜索片库"
            value={query}
            onChange={(e) => changeSearch(e.target.value)}
          />
          <button
            onClick={() => {
              cancelSearch();
            }}
          >
            取消
          </button>
        </div>
      )}
    </>
  );
}
