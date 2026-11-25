import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice, Pager } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";

type Person = Schemas["Person"];
type Series = Schemas["Franchise"];
type RecordItem = Person | Series;

function Artwork({ item }: { item: RecordItem }) {
  const person = "fullName" in item;
  const images = person
    ? [item.portraitId]
    : item.coverIds?.length
      ? item.coverIds.slice(0, 3)
      : [item.coverId];
  return (
    <span className={person ? "record-art portrait" : "record-art montage"}>
      {images.some(Boolean) ? (
        images.map(
          (id, i) =>
            id && (
              <img
                key={id + ":" + i}
                src={"/api/art/" + id}
                alt=""
                loading="lazy"
              />
            ),
        )
      ) : person ? (
        <span aria-hidden="true">{Array.from(item.fullName)[0]}</span>
      ) : (
        <StudioIcon name="library" />
      )}
    </span>
  );
}

export function RecordGrid({
  records,
  actors,
  remember,
}: {
  records: RecordItem[];
  remember: (id: string) => void;
  actors: boolean;
}) {
  return (
    <div
      className={actors ? "record-grid actor-grid" : "record-grid series-grid"}
    >
      {records.map((item) => {
        const name = "fullName" in item ? item.fullName : item.name;
        return (
          <a
            key={item.id}
            id={"catalog-" + item.id}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey)
                remember(item.id);
            }}
            className={actors ? "person-tile" : "series-tile"}
            href={"#" + (actors ? "actors/" : "series/") + item.id}
            title={name}
          >
            <Artwork item={item} />
            <div className="record-caption">
              <h3>{name}</h3>
              <p>
                <span>{item.categoryName}</span>
                <span>
                  {item.workCount} {actors ? "部" : "部作品"}
                </span>
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

const genders: Record<string, string> = {
  female: "女",
  male: "男",
  other: "其他",
  unknown: "未填写",
};
export function RecordDetail({
  actors,
  id,
  edit,
  editFilm,
}: {
  actors: boolean;
  id: string;
  edit: (item: RecordItem) => void;
  editFilm: (id: string) => void;
}) {
  const [direction, order] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const info = useQuery({
    queryKey: ["profile", actors ? "actor" : "series", id],
    queryFn: async () =>
      actors
        ? await unwrap(
            api.GET("/api/people/{id}", { params: { path: { id } } }),
          )
        : await unwrap(
            api.GET("/api/franchises/{id}", { params: { path: { id } } }),
          ),
  });
  const films = useQuery({
    queryKey: ["filmography", actors, id, direction, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: {
            query: {
              ...(actors ? { actorId: id } : { franchiseId: id }),
              page,
              pageSize: 24,
              sort: "year",
              direction,
            },
          },
        }),
      ),
  });
  const facts = info.data,
    item = facts?.record;
  const person = item && "fullName" in item ? item : undefined;
  const series = item && "name" in item ? item : undefined;
  const label = actors ? "演员" : "系列";
  const years = [
    ...new Set([facts?.firstYear, facts?.lastYear].filter((v) => v != null)),
  ].join(" – ");
  return (
    <div className="record-page">
      <a className="record-back" href={actors ? "#actors" : "#series"}>
        ← 返回{label}列表
      </a>
      <ErrorNotice error={info.error || films.error} />
      {info.isPending && <p role="status">读取资料中…</p>}
      {item && (
        <section className="profile-intro">
          <Artwork item={item} />
          <div className="profile-info">
            <header>
              <h1>{person?.fullName ?? series?.name}</h1>
              <button onClick={() => edit(item)}>
                <StudioIcon name="edit" /> 编辑{label}
              </button>
            </header>
            <dl>
              {person && (
                <>
                  <div>
                    <dt>详细名称</dt>
                    <dd>{person.detailedName || "未填写"}</dd>
                  </div>
                  <div>
                    <dt>性别</dt>
                    <dd>{genders[person.gender] || "未填写"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>分类</dt>
                <dd>{item.categoryName}</dd>
              </div>
              <div>
                <dt>馆藏作品年份</dt>
                <dd>{years || (item.workCount ? "年份未填" : "暂无作品")}</dd>
              </div>
            </dl>
            {series && (
              <p>
                <span>系列说明</span>
                {series.description || "未填写"}
              </p>
            )}
            {!!facts?.cast.length && (
              <p>
                <span>{actors ? "合作演员" : "参演演员"}</span>
                {facts.cast.join("、")}
              </p>
            )}
          </div>
        </section>
      )}
      <section className="profile-works">
        <header>
          <h2>{actors ? "参演作品" : "系列作品"}</h2>
          <small>{films.data ? films.data.total + " 部" : ""}</small>
          {(films.data?.total ?? 0) > 1 && (
            <button
              onClick={() => {
                order(direction === "asc" ? "desc" : "asc");
                setPage(1);
              }}
            >
              发行年份 {direction === "asc" ? "↑" : "↓"}
            </button>
          )}
        </header>
        {films.isPending && <p role="status">读取作品中…</p>}
        {films.data &&
          (films.data.total ? (
            <div className="works-grid">
              {films.data.items.map((film) => (
                <button
                  key={film.id}
                  onClick={() => editFilm(film.id)}
                  title={"编辑 " + film.title}
                >
                  <span className="work-poster">
                    {film.posterId ? (
                      <img
                        src={"/api/art/" + film.posterId}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <StudioIcon name="film" />
                    )}
                  </span>
                  <strong>{film.title}</strong>
                  <small>
                    {[film.releaseYear, film.categoryName]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty">暂无关联作品</p>
          ))}
        {films.data && films.data.total > films.data.pageSize && (
          <Pager {...films.data} onChange={setPage} />
        )}
      </section>
    </div>
  );
}
