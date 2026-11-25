import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import type { Schemas } from "@video-x/sdk-ts";
import { Modal, Select, ErrorNotice, Pager } from "@video-x/ui";
import { useDictionary } from "../dictionaries/useDictionary";
import { StudioIcon } from "../../shared/StudioIcon";
import {
  pagedChoices,
  relationLabels,
  type RelationItem,
  type RelationKind,
} from "./relationChoices";
import { TagChoiceGroups, tagChoices } from "./TagChoiceGroups";
import "./relation-picker.css";

function ChoiceRows({
  kind,
  items,
  ids,
  selected,
  toggle,
}: {
  kind: RelationKind;
  items: RelationItem[];
  ids: ReadonlySet<string>;
  selected: ReadonlyMap<string, RelationItem>;
  toggle: (item: RelationItem) => void;
}) {
  return (
    <div
      className={
        kind === "series" ? "picker-series-grid" : "picker-choice-list"
      }
    >
      {items.map((item) => {
        const linked = ids.has(item.id);
        return (
          <label key={item.id}>
            <input
              type="checkbox"
              disabled={linked}
              checked={linked || selected.has(item.id)}
              onChange={() => toggle(item)}
            />
            {kind !== "studios" && (
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
              {linked && <small className="picker-linked">已关联</small>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function RelationPicker({
  kind,
  categories,
  categoryId,
  ids,
  dismiss,
  add,
}: {
  kind: RelationKind;
  categories: Schemas["Category"][];
  categoryId: string;
  ids: string[];
  dismiss: () => void;
  add: (items: RelationItem[]) => void;
}) {
  const tags = kind === "tags";
  const scoped = tags || kind === "series";
  const label = relationLabels[kind];
  const categoryOptions = [
    { value: "", label: "全部分类" },
    ...categories.map((item) => ({ value: item.id, label: item.name })),
  ];
  const [q, setQ] = useState("");
  const [term, search] = useState("");
  const [category, setCategory] = useState(scoped ? categoryId : "");
  const [page, setPage] = useState(1);
  const [selected, pick] = useState<Map<string, RelationItem>>(new Map());
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tags || term === q.trim()) return;
    const timer = setTimeout(() => {
      search(q.trim());
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [q, tags, term]);

  const dictionary = useDictionary(tags);
  const paged = useQuery({
    queryKey: ["film-editor-choices", kind, term, category, page],
    queryFn:
      kind === "tags"
        ? skipToken
        : () => pagedChoices(kind, term, category, page),
  });
  const result = tags ? dictionary : paged;
  const filteredTags = tags
    ? tagChoices(dictionary.data ?? [], category, q, categories)
    : [];
  const pagination =
    !tags && paged.data && paged.data.total > paged.data.pageSize
      ? paged.data
      : undefined;
  const rows = paged.data?.items ?? [];
  const count = tags ? filteredTags.length : (paged.data?.total ?? 0);
  const empty =
    !result.isPending &&
    !result.isError &&
    (tags ? !filteredTags.length : !rows.length);
  const linked = new Set(ids);
  const selectedItems = [...selected.values()];
  const seenNames = new Set<string>();
  const duplicateNames = new Set<string>();
  for (const item of selectedItems) {
    if (seenNames.has(item.name)) duplicateNames.add(item.name);
    else seenNames.add(item.name);
  }

  const resultTerm = tags ? q : term;
  useLayoutEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }, [page, category, resultTerm]);

  function chooseCategory(value: string) {
    setCategory(value);
    setPage(1);
  }
  function toggle(item: RelationItem) {
    pick((current) => {
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }
  function clearSearch() {
    setQ("");
    search("");
    setPage(1);
    searchRef.current?.focus();
  }

  return (
    <Modal title={"添加" + label} close={dismiss}>
      <div className="relation-picker catalog-relation-picker" data-kind={kind}>
        <div className="picker-toolbar">
          <div className="picker-search">
            <div className="picker-search-field">
              <StudioIcon name="search" />
              <input
                ref={searchRef}
                type="search"
                autoFocus
                aria-label={"搜索" + label}
                placeholder={"搜索" + label + "名称"}
                value={q}
                maxLength={200}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {!scoped && kind !== "studios" && (
              <Select
                label={label + "分类"}
                value={category}
                onValueChange={chooseCategory}
                options={categoryOptions}
              />
            )}
          </div>
          {scoped && (
            <div className="picker-category-row">
              <span aria-hidden="true">分类</span>
              <div
                className="picker-categories"
                role="group"
                aria-label={label + "分类"}
              >
                {categoryOptions.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    aria-pressed={item.value === category}
                    onClick={() => chooseCategory(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div
          className="picker-results"
          ref={resultsRef}
          aria-busy={result.isFetching}
        >
          {result.isPending ? (
            <p role="status">正在读取{label}…</p>
          ) : result.isError ? (
            <div className="picker-empty">
              <ErrorNotice error={result.error} />
              <button type="button" onClick={() => void result.refetch()}>
                重试
              </button>
            </div>
          ) : empty ? (
            <div className="picker-empty">
              <p>没有匹配的{label}</p>
              <div className="picker-empty-actions">
                {q && (
                  <button type="button" onClick={clearSearch}>
                    清除搜索
                  </button>
                )}
                {category && (
                  <button type="button" onClick={() => chooseCategory("")}>
                    查看全部分类
                  </button>
                )}
              </div>
            </div>
          ) : tags ? (
            <TagChoiceGroups
              items={filteredTags}
              ids={linked}
              selected={selected}
              toggle={toggle}
              showCategories={!category}
            />
          ) : (
            <ChoiceRows
              kind={kind}
              items={rows}
              ids={linked}
              selected={selected}
              toggle={toggle}
            />
          )}
        </div>
        <footer className="picker-footer">
          {pagination && <Pager {...pagination} onChange={setPage} />}
          {!!selected.size && (
            <ul
              className="editor-chips picker-selected-list"
              aria-label="本次已选"
            >
              {selectedItems.map((item) => {
                const context = duplicateNames.has(item.name)
                  ? item.context || item.detail
                  : "";
                return (
                  <li
                    key={item.id}
                    title={item.context || item.detail || undefined}
                  >
                    <span>{item.name}</span>
                    {context && <small>{context}</small>}
                    <button
                      type="button"
                      aria-label={["取消选择 " + item.name, context]
                        .filter(Boolean)
                        .join("，")}
                      onClick={() => toggle(item)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="picker-actions">
            <div className="picker-summary" role="status">
              <strong>已选 {selected.size} 项</strong>
              {!pagination && !result.isPending && !result.isError && (
                <span>
                  共 {count} 个{label}
                </span>
              )}
            </div>
            <button type="button" onClick={dismiss}>
              取消
            </button>
            <button
              className="editor-primary"
              type="button"
              disabled={!selected.size}
              onClick={() => add(selectedItems)}
            >
              添加所选
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
