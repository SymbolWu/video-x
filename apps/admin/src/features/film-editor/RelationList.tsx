import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";
import { moveItem } from "./moveItem";
import {
  RelationPicker,
  relationLabels,
  type RelationItem,
  type RelationKind,
} from "./RelationPicker";

export { relationLabels, type RelationItem };

export function RelationList({
  kind,
  ids,
  items,
  categories,
  change,
  remember,
  children,
}: {
  kind: RelationKind;
  ids: string[];
  items: Record<string, RelationItem>;
  categories: Schemas["Category"][];
  change: (ids: string[]) => void;
  remember: (items: RelationItem[]) => void;
  children?: ReactNode;
}) {
  const [picking, setPicking] = useState(false);
  const label = relationLabels[kind];
  const isCredit = kind === "actors" || kind === "directors";
  const dictionary = kind === "tags" || kind === "studios";
  const unresolved = ids.filter((id) => !items[id]?.name).sort();
  const resolved = useQuery({
    queryKey: ["relation-labels", kind, unresolved],
    enabled: dictionary && unresolved.length > 0,
    queryFn: async () => {
      const found: RelationItem[] = [];
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
        found.push(...res.items);
      }
      return Object.fromEntries(found.map((item) => [item.id, item.name]));
    },
  });
  const name = (id: string) =>
    items[id]?.name ||
    resolved.data?.[id] ||
    (resolved.isFetching ? "读取中…" : "未命名资料");
  return (
    <section className="editor-relation">
      <header className="editor-section-heading">
        <h2>
          {label} <small>{ids.length}</small>
        </h2>
        <button type="button" onClick={() => setPicking(true)}>
          <StudioIcon name="plus" />
          添加{label}
        </button>
      </header>
      {children}
      <ErrorNotice error={resolved.error} />
      {resolved.isError && (
        <button type="button" onClick={() => void resolved.refetch()}>
          重新读取{label}
        </button>
      )}
      {ids.length ? (
        <ul className={kind === "tags" ? "editor-chips" : "editor-data-list"}>
          {ids.map((id, i) => (
            <li key={id}>
              {isCredit && (
                <>
                  <span className="editor-row-index">{i + 1}</span>
                  <span className="editor-avatar" aria-hidden="true">
                    <StudioIcon name="user" />
                    {items[id]?.art && (
                      <img
                        src={"/api/art/" + items[id].art}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                  </span>
                </>
              )}
              <span className="editor-row-name">{name(id)}</span>
              <div className="editor-inline-actions">
                {isCredit && ids.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="editor-quiet"
                      disabled={i === 0}
                      aria-label={"上移 " + name(id)}
                      onClick={() => change(moveItem(ids, i, i - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="editor-quiet"
                      disabled={i === ids.length - 1}
                      aria-label={"下移 " + name(id)}
                      onClick={() => change(moveItem(ids, i, i + 1))}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="editor-quiet"
                  aria-label={"移除 " + name(id)}
                  onClick={() => change(ids.filter((item) => item !== id))}
                >
                  {kind === "tags" ? "×" : "移除"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="editor-list-empty">尚未关联{label}</p>
      )}
      {picking && (
        <RelationPicker
          kind={kind}
          categories={categories}
          ids={ids}
          dismiss={() => setPicking(false)}
          add={(picked) => {
            remember(picked);
            change([...new Set([...ids, ...picked.map((item) => item.id)])]);
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
