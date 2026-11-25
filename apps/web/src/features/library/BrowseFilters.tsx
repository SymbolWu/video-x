import { Icon } from "../../shared/Icon";
import { Overlay } from "../../shared/Overlay";
import { defaults, type Filters } from "./filterModel";
export function BrowseFilters({
  panel,
  favoritesOnly,
  entity,
  draft,
  setDraft,
  categories,
  catName,
  releaseYears,
  total,
  apply,
  onClose,
}: {
  panel: string;
  favoritesOnly: boolean;
  entity: string;
  draft: Filters;
  setDraft: (f: Filters) => void;
  categories: string[];
  catName: (id: string) => string;
  releaseYears: string[];
  total?: number;
  apply: () => void;
  onClose: () => void;
}) {
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
    <Overlay
      title={panel === "sort" ? "排序方式" : `筛选${entity}`}
      onClose={() => onClose()}
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
                {!favoritesOnly && (
                  <>
                    <h3>喜欢状态</h3>
                    {picks("favorite", ["全部", "已喜欢", "未喜欢"])}
                  </>
                )}
                <h3>发行年份</h3>
                {picks("year", ["全部", ...releaseYears])}
                <h3>作品范围</h3>
                {picks("shape", ["全部", "仅分集"])}
                <h3>我的评分</h3>
                {picks("rating", ["全部", "未评分", "1", "2", "3", "4", "5"])}
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
            apply();
          }}
        >
          {entity === "影片" ? `查看 ${total ?? "…"} 部影片` : "应用条件"}
          <Icon name="chevron" size={16} />
        </button>
      </footer>
    </Overlay>
  );
}
