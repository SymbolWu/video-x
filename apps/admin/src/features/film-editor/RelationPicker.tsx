import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, Select, ErrorNotice, Pager } from "@video-x/ui";

type Kind = "actors" | "directors" | "series" | "tags" | "studios";
export const relationLabels = {
  actors: "演员",
  directors: "导演",
  series: "系列",
  tags: "标签",
  studios: "片商",
};
type Item = {
  id: string;
  name: string;
  detail?: string | null;
  art?: string | null;
};
const pageSize = 16;

async function choices(
  kind: Kind,
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

export function RelationList({
  kind,
  ids,
  names,
  categories,
  change,
  remember,
  children,
}: {
  kind: Kind;
  ids: string[];
  names: Record<string, string>;
  categories: Schemas["Category"][];
  change: (ids: string[]) => void;
  remember: (items: Item[]) => void;
  children?: React.ReactNode;
}) {
  const [picking, setPicking] = useState(false);
  const label = relationLabels[kind];
  const dictionary = kind === "tags" || kind === "studios";
  const unresolved = ids.filter((id) => !names[id]).sort();
  const resolved = useQuery({
    queryKey: ["relation-labels", kind, unresolved],
    enabled: dictionary && unresolved.length > 0,
    queryFn: async () => {
      const parts = [];
      for (let i = 0; i < unresolved.length; i += 100) {
        const res = await unwrap(
          api.GET("/api/dictionary/choices", {
            params: {
              query: {
                kind: kind === "tags" ? "tag" : "studio",
                ids: unresolved.slice(i, i + 100).join(","),
                pageSize: 100,
              },
            },
          }),
        );
        parts.push(...res.items);
      }
      return Object.fromEntries(parts.map((p) => [p.id, p.name]));
    },
  });
  const name = (id: string) =>
    names[id] ||
    resolved.data?.[id] ||
    (resolved.isFetching ? "读取中…" : "未命名资料");
  return (
    <section className="relation-list">
      <header>
        <h3>
          {label}
          <small>{ids.length}</small>
        </h3>
        <button type="button" onClick={() => setPicking(true)}>
          ＋ 添加{label}
        </button>
      </header>
      {children}
      <ErrorNotice error={resolved.error} />
      {ids.length ? (
        <ul>
          {ids.map((id, i) => (
            <li key={id}>
              <span className="role-position">{i + 1}</span>
              <strong>{name(id)}</strong>
              {(kind === "actors" || kind === "directors") &&
                ids.length > 1 && (
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label={"前移" + name(id)}
                    onClick={() => {
                      const next = [...ids];
                      next.splice(i, 1);
                      next.splice(i - 1, 0, id);
                      change(next);
                    }}
                  >
                    前移
                  </button>
                )}
              <button
                type="button"
                aria-label={"移除" + name(id)}
                onClick={() => change(ids.filter((x) => x !== id))}
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="relation-empty">尚未关联{label}</p>
      )}
      {picking && (
        <Picker
          kind={kind}
          categories={categories}
          ids={ids}
          dismiss={() => setPicking(false)}
          add={(items) => {
            remember(items);
            change([...new Set([...ids, ...items.map((x) => x.id)])]);
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
function Picker({
  kind,
  categories,
  ids,
  dismiss,
  add,
}: {
  kind: Kind;
  categories: Schemas["Category"][];
  ids: string[];
  dismiss: () => void;
  add: (items: Item[]) => void;
}) {
  const [q, setQ] = useState(""),
    [term, search] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [selected, pick] = useState<Map<string, Item>>(new Map());
  useEffect(() => {
    const timer = setTimeout(() => {
      search(q.trim());
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);
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
            <p>正在读取…</p>
          ) : !result.error && !result.data?.items.length ? (
            <p>没有匹配的{label}</p>
          ) : null}
          {result.data?.items.map((item: Item) => {
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
                {item.art && (
                  <img src={"/api/art/" + item.art} alt="" loading="lazy" />
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
        {result.data && <Pager {...result.data} onChange={setPage} />}
        <footer>
          <span>已选 {selected.size} 项</span>
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
