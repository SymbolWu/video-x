import { Icon } from "../../shared/Icon";
import { defaults, type Filters } from "./filterModel";
import type { LibraryScope } from "./WorkProfile";
export function LibraryToolbar({
  scope,
  entity,
  filters,
  setFilters,
  categories,
  catName,
  total,
  coverView,
  setCoverView,
  openFilters,
  active,
}: {
  scope: LibraryScope | null;
  entity: string;
  filters: Filters;
  setFilters: (value: Filters) => void;
  categories: string[];
  catName: (key: string) => string;
  total?: number;
  coverView: "poster" | "backdrop";
  setCoverView: (view: "poster" | "backdrop") => void;
  openFilters: (mode?: string) => void;
  active: number;
}) {
  return (
    <>
      <div className="vx-list-controls">
        {scope ? (
          <h2 className="work-heading">
            {scope.kind === "演员"
              ? "参演作品"
              : scope.kind === "系列"
                ? "系列作品"
                : "收藏影片"}
          </h2>
        ) : (
          <div className="vx-category-bar" aria-label="分类">
            {categories.map((c) => (
              <button
                aria-pressed={filters.category === c}
                className={filters.category === c ? "active" : ""}
                onClick={() => setFilters({ ...filters, category: c })}
                key={c}
              >
                {catName(c)}
              </button>
            ))}
          </div>
        )}
        <div className="vx-toolbar">
          <span>
            {entity === "影片"
              ? `${total ?? 0} 部影片`
              : entity === "演员"
                ? `${total ?? 0} 位演员`
                : `${total ?? 0} 个系列`}
          </span>
          <div>
            {entity === "影片" && (
              <button
                className="vx-cover-toggle"
                aria-label={
                  coverView === "poster" ? "切换为横图" : "切换为海报"
                }
                onClick={() =>
                  setCoverView(coverView === "poster" ? "backdrop" : "poster")
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
            {!scope && (
              <button
                className={active ? "active" : ""}
                onClick={() => openFilters()}
              >
                <Icon name="filter" size={17} />
                <span>筛选{active ? ` ${active}` : ""}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {(filters.shape !== "全部" ||
        filters.year !== "全部" ||
        filters.seen !== "全部" ||
        filters.favorite !== "全部" ||
        filters.rating !== "全部") && (
        <div className="vx-active-filters">
          {filters.shape !== "全部" && <span>{filters.shape}</span>}
          {filters.year !== "全部" && <span>{filters.year}</span>}
          {filters.seen !== "全部" && <span>{filters.seen}</span>}
          {filters.favorite !== "全部" && <span>{filters.favorite}</span>}
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
    </>
  );
}
