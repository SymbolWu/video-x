import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, Select, ErrorNotice, Pager } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";
import "./relation-picker.css";

export type RelationKind =
  | "actors"
  | "directors"
  | "series"
  | "tags"
  | "studios";
export const relationLabels = {
  actors: "演员",
  directors: "导演",
  series: "系列",
  tags: "标签",
  studios: "片商",
};
export type RelationItem = {
  id: string;
  name: string;
  detail?: string | null;
  art?: string | null;
};
const pageSize = 16;

async function choices(
  kind: RelationKind,
  q: string,
  categoryId: string,
  page: number,
) {
  const query = {
    q: q.trim() || undefined,
    categoryId: categoryId || undefined,
    page,
    pageSize,
    sort: "name" as const,
    direction: "asc" as const,
  };
  if (kind === "series") {
    const v = await unwrap(api.GET("/api/franchises", { params: { query } }));
    return {
      ...v,
      items: v.items.map((p) => ({
        id: p.id,
        name: p.name,
        detail: p.categoryName,
        art: p.coverId,
      })),
    };
  }
  if (kind === "actors" || kind === "directors") {
    const v = await unwrap(api.GET("/api/people", { params: { query } }));
    return {
      ...v,
      items: v.items.map((p) => ({
        id: p.id,
        name: p.fullName,
        detail: [
          p.detailedName !== p.fullName ? p.detailedName : null,
          p.categoryName,
        ]
          .filter(Boolean)
          .join(" · "),
        art: p.portraitId,
      })),
    };
  }
  return unwrap(
    api.GET("/api/dictionary/choices", {
      params: {
        query: {
          kind: kind === "tags" ? "tag" : "studio",
          page,
          pageSize,
          q: query.q,
          categoryId: query.categoryId,
        },
      },
    }),
  );
}

export function RelationPicker({
  kind,
  categories,
  ids,
  dismiss,
  add,
}: {
  kind: RelationKind;
  categories: Schemas["Category"][];
  ids: string[];
  dismiss: () => void;
  add: (items: RelationItem[]) => void;
}) {
  const [q, setQ] = useState(""),
    [term, search] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [selected, pick] = useState<Map<string, RelationItem>>(new Map());
  useEffect(() => {
    if (term === q.trim()) return;
    const timer = setTimeout(() => {
      search(q.trim());
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [q, term]);
  const result = useQuery({
    queryKey: ["film-editor-choices", kind, term, category, page],
    queryFn: () => choices(kind, term, category, page),
  });
  const label = relationLabels[kind];
  return (
    <Modal title={"添加" + label} close={dismiss}>
      <div className="relation-picker">
        <div className="picker-search">
          <input
            type="search"
            autoFocus
            aria-label={"搜索" + label}
            placeholder={"搜索" + label + "名称"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {kind !== "studios" && (
            <Select
              label={label + "分类"}
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "全部分类" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}
        </div>
        <ErrorNotice error={result.error} />
        <div className="picker-results" aria-busy={result.isFetching}>
          {result.isPending ? (
            <p role="status">正在读取…</p>
          ) : result.isError ? (
            <button type="button" onClick={() => void result.refetch()}>
              重试
            </button>
          ) : !result.data?.items.length ? (
            <div className="picker-empty">
              <p>没有匹配的{label}</p>
              {(q || category) && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setCategory("");
                    setPage(1);
                  }}
                >
                  清除条件
                </button>
              )}
            </div>
          ) : null}
          {result.data?.items.map((item: RelationItem) => {
            const linked = ids.includes(item.id);
            return (
              <label key={item.id}>
                <input
                  type="checkbox"
                  disabled={linked}
                  checked={linked || selected.has(item.id)}
                  onChange={(e) => {
                    const next = new Map(selected);
                    if (e.target.checked) next.set(item.id, item);
                    else next.delete(item.id);
                    pick(next);
                  }}
                />
                {(kind === "actors" ||
                  kind === "directors" ||
                  kind === "series") && (
                  <span className="picker-avatar" aria-hidden="true">
                    <StudioIcon name={kind === "series" ? "film" : "user"} />
                    {item.art && (
                      <img
                        src={"/api/art/" + item.art}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                  </span>
                )}
                <span>
                  <strong>{item.name}</strong>
                  {item.detail && <small>{item.detail}</small>}
                </span>
                {linked && <small>已关联</small>}
              </label>
            );
          })}
        </div>
        {result.data && result.data.total > result.data.pageSize && (
          <Pager {...result.data} onChange={setPage} />
        )}
        <div className="picker-selection">
          <span role="status">已选 {selected.size} 项</span>
          {!!selected.size && (
            <ul className="editor-chips">
              {[...selected.values()].map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <button
                    type="button"
                    aria-label={"取消选择 " + item.name}
                    onClick={() => {
                      const next = new Map(selected);
                      next.delete(item.id);
                      pick(next);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer>
          <button type="button" onClick={dismiss}>
            取消
          </button>
          <button
            className="primary"
            type="button"
            disabled={!selected.size}
            onClick={() => add([...selected.values()])}
          >
            添加所选
          </button>
        </footer>
      </div>
    </Modal>
  );
}
