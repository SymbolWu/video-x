import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Select, ErrorNotice } from "@video-x/ui";
import type { Schemas } from "@video-x/sdk-ts";
import { Artwork } from "../../shared/Artwork";
import { RelationList, relationLabels } from "./RelationPicker";
import "./film-workspace.css";
export const validReleaseDate = (value?: string | null) =>
  !!value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= "1800-01-01" &&
  value <= "2500-12-31" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export type Fields = Schemas["ImportFields"];
export type Tab =
  | "基本资料"
  | "封面"
  | "剧照"
  | "演职员"
  | "归类与关联"
  | "分集"
  | "版本与文件"
  | "来源核对";
export const commonTabs: Tab[] = [
  "基本资料",
  "封面",
  "剧照",
  "演职员",
  "归类与关联",
];
export function Frame({
  tabs,
  tab,
  select,
  title,
  backLabel,
  back,
  meta,
  actions,
  error,
  children,
}: {
  tabs: Tab[];
  tab: Tab;
  select: (t: Tab) => void;
  title: string;
  backLabel: string;
  back: () => void;
  meta: string;
  actions: ReactNode;
  error: unknown;
  children: ReactNode;
}) {
  return (
    <section className="film-editor">
      <button className="editor-back" onClick={back}>
        ← {backLabel}
      </button>
      <header className="editor-heading">
        <div>
          <p>{meta}</p>
          <h1>{title}</h1>
        </div>
        <div className="editor-actions">{actions}</div>
      </header>
      <nav className="editor-sections" aria-label="资料编辑分区">
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => select(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <section className="wb-panel" aria-label={tab}>
        <ErrorNotice error={error} />
        {children}
      </section>
    </section>
  );
}
export function useLeaveGuard(dirty: boolean) {
  const permitted = useRef(false);
  const canLeave = useCallback(() => {
    if (!dirty || permitted.current) return true;
    permitted.current = window.confirm("离开编辑并放弃未保存的修改？");
    return permitted.current;
  }, [dirty]);
  useEffect(() => {
    permitted.current = false;
    if (!dirty) return;
    const original = location.href;
    const unload = (e: BeforeUnloadEvent) => {
      if (!permitted.current) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const a =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        a &&
        a.href !== original &&
        a.target !== "_blank" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !canLeave()
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const navigation = (e: HashChangeEvent) => {
      if (location.href !== original && !canLeave()) {
        history.pushState(null, "", original);
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("hashchange", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("hashchange", navigation, true);
    };
  }, [dirty, canLeave]);
  return canLeave;
}
export function CommonFields({
  tab,
  d,
  patch,
  categories,
  initialNames,
  legacyYear,
}: {
  tab: Tab;
  d: Fields;
  patch: (p: Partial<Fields>) => void;
  categories: Schemas["Category"][];
  initialNames: Record<string, string>;
  legacyYear?: number | null;
}) {
  const [added, remember] = useState<Record<string, string>>({});
  const labels = { ...initialNames, ...added };
  const rel = (kind: keyof typeof relationLabels) => {
    const key = (
      {
        actors: "actorIds",
        directors: "directorIds",
        series: "franchiseIds",
        tags: "tagIds",
        studios: "studioIds",
      } as const
    )[kind];
    const ns = d.sourceNames;
    return (
      <RelationList
        kind={kind}
        ids={d[key] ?? []}
        names={labels}
        categories={categories}
        remember={(items) =>
          remember((old) => ({
            ...old,
            ...Object.fromEntries(items.map((i) => [i.id, i.name])),
          }))
        }
        change={(ids) => patch({ [key]: ids })}
      >
        {!!ns?.[kind].length && (
          <div className="source-pending">
            <small>来源候选</small>
            {ns[kind].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() =>
                  patch({
                    sourceNames: {
                      ...ns,
                      [kind]: ns[kind].filter((x) => x !== n),
                    },
                  })
                }
                aria-label={"移除候选 " + n}
              >
                {n} ×
              </button>
            ))}
          </div>
        )}
      </RelationList>
    );
  };
  if (tab === "基本资料")
    return (
      <div className="wb-grid">
        <label>
          作品标题
          <input
            required
            maxLength={1000}
            value={d.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label>
          主编号 / 番号
          <input
            maxLength={160}
            value={d.identifier ?? ""}
            onChange={(e) => patch({ identifier: e.target.value || null })}
          />
        </label>
        <label>
          发行日期（必填）
          <input
            required
            type="date"
            min="1800-01-01"
            max="2500-12-31"
            value={d.releaseDate ?? ""}
            onChange={(e) => {
              const date = e.target.value;
              patch({
                releaseDate: date || null,
                releaseYear: date
                  ? Number(date.slice(0, 4))
                  : (legacyYear ?? null),
              });
            }}
          />
          {legacyYear && !d.releaseDate && (
            <small>原记录仅有 {legacyYear} 年</small>
          )}
        </label>
        <label>
          中文资料标记
          <Select
            label="中文资料"
            value={
              d.supportsChinese == null ? "unknown" : String(d.supportsChinese)
            }
            options={[
              { value: "unknown", label: "未知" },
              { value: "true", label: "支持" },
              { value: "false", label: "不支持" },
            ]}
            onValueChange={(v) =>
              patch({ supportsChinese: v === "unknown" ? null : v === "true" })
            }
          />
        </label>
        <label className="wb-wide">
          简介
          <textarea
            rows={5}
            maxLength={50000}
            value={d.summary ?? ""}
            onChange={(e) => patch({ summary: e.target.value || null })}
          />
        </label>
        <label className="wb-wide">
          我的资料备注
          <textarea
            rows={3}
            maxLength={10000}
            value={d.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || null })}
          />
        </label>
      </div>
    );
  if (tab === "封面")
    return (
      <div className="wb-grid">
        <Artwork
          label="竖版封面"
          value={d.posterId}
          onChange={(posterId) => patch({ posterId })}
        />
        <Artwork
          label="详情页横版背景"
          value={d.backdropId}
          onChange={(backdropId) => patch({ backdropId })}
        />
      </div>
    );
  if (tab === "剧照")
    return (
      <div className="still-editor">
        <div className="still-grid">
          {(d.stillIds ?? []).map((id, i) => (
            <figure key={id}>
              <img src={"/api/art/" + id} alt={"剧照 " + (i + 1)} />
              <figcaption>
                <span>{i + 1}</span>
                <button
                  disabled={!i}
                  onClick={() => {
                    const next = [...d.stillIds!];
                    next.splice(i, 1);
                    next.splice(i - 1, 0, id);
                    patch({ stillIds: next });
                  }}
                >
                  前移
                </button>
                <button
                  onClick={() =>
                    patch({ stillIds: d.stillIds!.filter((x) => x !== id) })
                  }
                >
                  移除
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        <Artwork
          label="添加剧照"
          onChange={(id) => {
            if (id && !d.stillIds?.includes(id))
              patch({ stillIds: [...(d.stillIds ?? []), id] });
          }}
        />
      </div>
    );
  if (tab === "演职员")
    return (
      <>
        {rel("actors")}
        {rel("directors")}
      </>
    );
  if (tab === "归类与关联")
    return (
      <>
        <label>
          主分类
          <Select
            label="主分类"
            value={d.categoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onValueChange={(categoryId) => patch({ categoryId })}
          />
        </label>
        {rel("series")}
        {rel("tags")}
        {rel("studios")}
      </>
    );
  return null;
}
