import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "./StudioIcon";

type Rows = { type: "media"; items: Schemas["ManagementMedia"][] };

function Identity({
  name,
  art,
  person = false,
  detail,
}: {
  name: string;
  art?: string | null;
  person?: boolean;
  detail?: string | null;
}) {
  return (
    <div className="catalog-identity">
      <span className={person ? "catalog-art portrait" : "catalog-art"}>
        {art ? (
          <img src={"/api/art/" + art} alt="" loading="lazy" />
        ) : (
          <StudioIcon name={person ? "user" : "film"} />
        )}
      </span>
      <div className="catalog-name">
        <strong title={name}>{name}</strong>
        {detail && <small title={detail}>{detail}</small>}
      </div>
    </div>
  );
}

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
  edit,
}: {
  films: Film[];
  edit: (id: string) => void;
}) {
  return (
    <ul className="catalog-film-grid" aria-label="影片资料卡片">
      {films.map((film) => (
        <li key={film.id}>
          <button
            type="button"
            className="catalog-film-card"
            aria-label={"编辑资料：" + film.title}
            aria-describedby={"film-info-" + film.id}
            onClick={() => edit(film.id)}
          >
            <span className="film-cover" aria-hidden="true">
              <StudioIcon name="film" />
              {film.posterId && (
                <img
                  key={film.posterId}
                  loading="lazy"
                  alt=""
                  src={"/api/art/" + film.posterId}
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              )}
              <span className="film-edit">
                <StudioIcon name="edit" />
                编辑
              </span>
            </span>
            <span className="film-body" id={"film-info-" + film.id}>
              <span className="film-title" title={film.title}>
                {film.title}
              </span>
              {film.identifier && film.identifier !== film.title && (
                <span className="film-id" title={film.identifier}>
                  {film.identifier}
                </span>
              )}
              <span className="film-meta">
                {[film.releaseYear, film.categoryName]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {film.actorNames.length > 0 && (
                <span className="film-cast">
                  <FilmCast names={film.actorNames} />
                </span>
              )}
              <span className="film-footer">
                <FilmFileStatus film={film} />
                <span className="film-edition">{editionLabel(film)}</span>
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
                  <Identity
                    name={m.title}
                    art={m.posterId}
                    detail={m.identifier}
                  />
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
                  <button className="catalog-action" onClick={() => edit(m.id)}>
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
