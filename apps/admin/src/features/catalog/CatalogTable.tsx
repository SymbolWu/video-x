import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "../../shared/StudioIcon";
import { CatalogCover, type CoverMode } from "./CatalogCover";

type Rows = { type: "media"; items: Schemas["ManagementMedia"][] };

type Film = Schemas["ManagementMedia"];

function editionLabel(film: Film) {
  return film.kind === "group" ? "分集容器" : film.editionCount + " 版";
}

function FilmFileStatus({ film }: { film: Film }) {
  const group = film.kind === "group";
  const state = group
    ? "group"
    : !film.fileCount
      ? "unbound"
      : film.needsFileCheck
        ? "check"
        : "ready";
  const labels = {
    group: "由各集管理",
    unbound: "未绑定",
    check: "待检查",
    ready: "记录正常",
  };
  const tone =
    state === "ready"
      ? "ok"
      : state === "check" || state === "unbound"
        ? "warn"
        : "";
  return (
    <span
      className={`catalog-status ${tone}`}
      title={group ? "文件挂在各集上" : "按最近记录的挂载、文件和探测状态汇总"}
    >
      {labels[state]}
    </span>
  );
}

function FilmCast({ names }: { names: string[] }) {
  return (
    <>
      <span className="catalog-cast" title={names.join("、")}>
        {names.slice(0, 2).join("、") || "—"}
      </span>
      {names.length > 2 && (
        <small className="catalog-more">+{names.length - 2}</small>
      )}
    </>
  );
}

export function FilmCards({
  films,
  mode,
  edit,
}: {
  films: Film[];
  mode: CoverMode;
  edit: (id: string) => void;
}) {
  return (
    <ul
      className="catalog-film-grid"
      data-covers={mode}
      aria-label="影片资料卡片"
    >
      {films.map((film) => (
        <li key={film.id}>
          <button
            type="button"
            className="catalog-film-card"
            id={"catalog-" + film.id}
            aria-label={"编辑资料：" + film.title}
            aria-describedby={`film-art-${film.id} film-info-${film.id}`}
            onClick={() => edit(film.id)}
          >
            <span className="film-cover" id={"film-art-" + film.id}>
              <CatalogCover film={film} mode={mode} />
              {film.identifier && (
                <span className="film-id" title={film.identifier}>
                  {film.identifier}
                </span>
              )}
              {film.rating != null && (
                <span
                  className="film-rating"
                  title={`我的评分：${film.rating} / 5`}
                >
                  <span aria-hidden="true">★</span>
                  <span className="film-rating-label">我的评分 </span>
                  {film.rating.toFixed(1)}
                </span>
              )}
            </span>
            <span className="film-body" id={"film-info-" + film.id}>
              <span className="film-title" title={film.title}>
                {film.title}
              </span>
              {film.actorNames.length > 0 && (
                <span className="film-cast" title={film.actorNames.join("、")}>
                  {film.actorNames.slice(0, 2).map((name, index) => (
                    <span className="film-cast-chip" key={index}>
                      {name}
                    </span>
                  ))}
                  {film.actorNames.length > 2 && (
                    <span className="film-cast-more">
                      +{film.actorNames.length - 2}
                    </span>
                  )}
                </span>
              )}
              <span className="film-meta">
                <span>
                  {[film.releaseYear, film.categoryName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {film.supportsChinese && (
                  <span
                    className="film-language"
                    aria-label="支持中文"
                    title="支持中文"
                  >
                    中
                  </span>
                )}
              </span>
              <span className="film-footer">
                <FilmFileStatus film={film} />
                <span className="film-edition">{editionLabel(film)}</span>
                <span className="film-edit">
                  <StudioIcon name="edit" />
                  编辑
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CatalogTable({
  rows,
  edit,
}: {
  rows: Rows;
  edit: (id: string) => void;
}) {
  const columns = [
    "作品",
    "分类",
    "年份",
    "参演演员",
    "播放版本",
    "文件状态",
    "操作",
  ];
  return (
    <div className="catalog-table-frame">
      <table className="catalog-table films" aria-label="影片资料">
        <thead>
          <tr>
            {columns.map((t) => (
              <th key={t} scope="col">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.items.map((m) => {
            return (
              <tr key={m.id}>
                <td>
                  <div className="catalog-identity">
                    <span className="catalog-art">
                      <CatalogCover film={m} mode="backdrop" compact />
                    </span>
                    <div className="catalog-name">
                      <strong title={m.title}>{m.title}</strong>
                      {m.identifier && (
                        <small title={m.identifier}>{m.identifier}</small>
                      )}
                    </div>
                  </div>
                </td>
                <td>{m.categoryName}</td>
                <td className="catalog-number">{m.releaseYear ?? "—"}</td>
                <td>
                  <FilmCast names={m.actorNames} />
                </td>
                <td className="catalog-number">{editionLabel(m)}</td>
                <td>
                  <FilmFileStatus film={m} />
                </td>
                <td>
                  <button
                    id={"catalog-" + m.id}
                    className="catalog-action"
                    onClick={() => edit(m.id)}
                  >
                    编辑资料
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
