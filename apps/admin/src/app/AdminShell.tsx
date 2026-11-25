import type { ReactNode } from "react";
import { StudioIcon, studioNavIcons } from "../shared/StudioIcon";
import "./admin-shell.css";
export type Kind = keyof typeof studioNavIcons;
export const routes: Record<Kind, string> = {
  intake: "ingest",
  media: "media",
  people: "actors",
  franchises: "series",
  categories: "categories",
  collections: "collections",
  jobs: "jobs",
  settings: "settings",
  tags: "tags",
  organizations: "organizations",
  enrich: "enrich",
  archive: "archive",
};
export const labels = {
  intake: "录入工作台",
  media: "影片资料库",
  people: "演员",
  franchises: "系列",
  categories: "分类",
  collections: "收藏夹",
  jobs: "后台任务",
  settings: "系统状态",
  tags: "标签",
  organizations: "片商",
  enrich: "演员资料补全",
  archive: "归档",
};

const sections: { name: string; keys: Kind[] }[] = [
  { name: "工作区", keys: ["intake", "media"] },
  {
    name: "资料维护",
    keys: [
      "people",
      "franchises",
      "collections",
      "categories",
      "tags",
      "organizations",
    ],
  },
  {
    name: "运行",
    keys: ["jobs", "settings"],
  },
];
export function AdminShell({
  kind,
  pending,
  filmEditing = false,
  draftEditing = false,
  logout,
  children,
}: {
  kind: Kind;
  pending?: number;
  filmEditing?: boolean;
  draftEditing?: boolean;
  logout: () => void;
  children: ReactNode;
}) {
  const watch = import.meta.env.DEV
    ? location.protocol +
      "//" +
      location.hostname +
      ":" +
      (location.port === "5281" ? "5280" : "5180")
    : "/";
  return (
    <div className="vx-admin">
      <aside className="vx-rail">
        <div className="vx-logo">
          video<span>—x</span>
        </div>
        <nav aria-label="管理导航">
          {sections.map((section) => (
            <section key={section.name}>
              <p>{section.name}</p>
              {section.keys.map((k) => (
                <a
                  key={k}
                  href={"#" + routes[k]}
                  aria-current={kind === k ? "page" : undefined}
                >
                  <StudioIcon name={studioNavIcons[k]} />
                  {labels[k]}
                  {k === "intake" && <small>{pending ?? "…"}</small>}
                </a>
              ))}
            </section>
          ))}
        </nav>
        <footer>
          <b>VX</b>
          <span>
            个人媒体库<small>本地管理</small>
          </span>
        </footer>
      </aside>
      <div className="vx-area">
        <header className="vx-toolbar">
          <div>
            <StudioIcon name="grid" />
            <span>管理端</span>
            <i>/</i>
            <strong>
              {draftEditing
                ? "完整草稿编辑"
                : filmEditing
                  ? "影片资料编辑"
                  : labels[kind]}
            </strong>
          </div>
          <div>
            <a href={watch}>
              <StudioIcon name="play" />
              观看端
              <StudioIcon name="arrow" />
            </a>
            <button onClick={logout}>退出</button>
          </div>
        </header>
        <main
          className={
            "vx-content" +
            (kind === "intake" || filmEditing ? " intake-layout" : "")
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
