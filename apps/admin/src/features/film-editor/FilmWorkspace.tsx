import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { ErrorNotice } from "@video-x/ui";
import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "../../shared/StudioIcon";
import { validReleaseDate } from "./releaseDate";
import "./film-workspace.css";

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
export type FieldIssue = { field: "title" | "releaseDate"; message: string };
export type SaveStatus = { text: string; tone?: "positive" | "attention" };

export function checkFields(d: Fields): FieldIssue | null {
  if (!d.title.trim()) return { field: "title", message: "请填写作品标题。" };
  if (!validReleaseDate(d.releaseDate))
    return { field: "releaseDate", message: "请填写完整有效的发行日期。" };
  return null;
}

export function Frame({
  tabs,
  tab,
  select,
  title,
  identifier,
  poster,
  backLabel,
  back,
  meta,
  actions,
  status,
  error,
  issue,
  locked,
  children,
}: {
  tabs: Tab[];
  tab: Tab;
  select: (t: Tab) => void;
  title: string;
  identifier?: string | null;
  poster?: string | null;
  backLabel: string;
  back: () => void;
  meta: string;
  actions: ReactNode;
  status: SaveStatus;
  error: unknown;
  issue?: FieldIssue | null;
  locked?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (tab === "基本资料" && issue) {
      panel.current
        ?.querySelector<HTMLInputElement>(
          '[data-editor-field="' + issue.field + '"]',
        )
        ?.focus();
    }
  }, [tab, issue]);
  return (
    <section className="film-editor">
      <button
        type="button"
        className="editor-back"
        onClick={back}
        disabled={locked}
      >
        ← {backLabel}
      </button>
      <header className="editor-heading">
        <span className="editor-identity-art" aria-hidden="true">
          <StudioIcon name="film" />
          {poster && (
            <img
              key={poster}
              alt=""
              src={"/api/art/" + poster}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
        </span>
        <div className="editor-identity">
          <h1>{title}</h1>
          <p>
            {identifier && (
              <>
                <code>{identifier}</code>
                <span aria-hidden="true">·</span>
              </>
            )}
            {meta}
          </p>
        </div>
      </header>
      <nav className="editor-sections" aria-label="资料编辑分区">
        {tabs.map((t) => (
          <button
            type="button"
            key={t}
            aria-current={tab === t ? "page" : undefined}
            disabled={locked}
            onClick={() => select(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <section className="wb-panel" aria-label={tab} inert={locked} ref={panel}>
        <ErrorNotice error={error} />
        {children}
      </section>
      <footer className="editor-save-bar">
        <div className="editor-save-inner">
          <span
            className="editor-save-status"
            data-tone={status.tone}
            role="status"
          >
            {status.text}
          </span>
          <div className="editor-actions">{actions}</div>
        </div>
      </footer>
    </section>
  );
}
export function useLeaveGuard(dirty: boolean, locked = false) {
  const permitted = useRef(false);
  const canLeave = useCallback(() => {
    if (locked) return false;
    if (!dirty || permitted.current) return true;
    permitted.current = window.confirm("离开编辑并放弃未保存的修改？");
    return permitted.current;
  }, [dirty, locked]);
  useEffect(() => {
    permitted.current = false;
    if (!dirty) return;
    const original = location.href;
    const originalState = history.state;
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
        history.pushState(originalState, "", original);
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
