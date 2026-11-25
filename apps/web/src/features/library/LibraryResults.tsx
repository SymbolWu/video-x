import "./library.css";
import type { ReactNode } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { Icon } from "../../shared/Icon";
import { Art } from "../../shared/Art";
export function LibraryResults({
  entity,
  films,
  visiblePeople,
  visibleSeries,
  renderFilm,
  explore,
  resetFilters,
  page,
  total,
  setPage,
  filtered,
  emptyTitle,
  pending,
  error,
  retry,
}: {
  entity: string;
  films: Schemas["Media"][];
  visiblePeople: Schemas["Person"][];
  visibleSeries: Schemas["Franchise"][];
  renderFilm: (film: Schemas["Media"]) => ReactNode;
  explore: (name: string, kind: "演员" | "系列", id: string) => void;
  resetFilters: () => void;
  page: number;
  total?: number;
  setPage: (n: number) => void;
  filtered: boolean;
  emptyTitle?: string;
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending)
    return (
      <div className="vx-empty" role="status">
        正在读取{entity}…
      </div>
    );
  if (error)
    return (
      <div className="vx-empty" role="alert">
        <h3>{entity}加载失败</h3>
        <p>{error.message}</p>
        <button onClick={retry}>重新加载</button>
      </div>
    );
  const empty =
    entity === "影片"
      ? !films.length
      : entity === "演员"
        ? !visiblePeople.length
        : !visibleSeries.length;
  if (empty)
    return (
      <div className="vx-empty">
        <Icon name={filtered ? "search" : "grid"} size={28} />
        <h3>
          {filtered
            ? "没有符合条件的" + entity
            : (emptyTitle ?? "暂无" + entity)}
        </h3>
        {filtered && <button onClick={resetFilters}>清除搜索与筛选</button>}
      </div>
    );
  return (
    <>
      {entity === "影片" ? (
        <div className="vx-film-grid">{films.map(renderFilm)}</div>
      ) : entity === "演员" ? (
        <div className="vx-people-grid">
          {visiblePeople.map((p) => (
            <button
              className="vx-person"
              key={p.id}
              onClick={() => explore(p.fullName, "演员", p.id)}
            >
              <Art id={p.portraitId} alt="" fallback="user" />
              <h3>{p.fullName}</h3>
              <span>{p.workCount} 部作品</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="vx-series-grid">
          {visibleSeries.map((s) => (
            <button
              className="vx-series"
              key={s.id}
              onClick={() => explore(s.name, "系列", s.id)}
            >
              <Art id={s.coverId ?? s.coverIds?.[0]} alt="" />
              <div>
                <span>
                  {s.categoryName} / {s.workCount} 部作品
                </span>
                <h3>{s.name}</h3>
              </div>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
      )}
      {(total ?? 0) > 48 && (
        <footer className="vx-list-end">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
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
  );
}
