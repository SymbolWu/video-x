import { useEffect, useRef } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { Art } from "../../shared/Art";
import { Icon } from "../../shared/Icon";
import { filmMetadata } from "../../shared/mediaText";
import { EditionPlayback } from "../playback/EditionPlayback";
import { FilmPeople } from "./FilmPeople";
import { FilmStills } from "./FilmStills";
import "./film-detail.css";
import "./film-stills.css";

type Film = Schemas["Media"];
export function FilmDetail({
  detail,
  info,
  profileId,
  resume,
  covered,
  error,
  retry,
  onClose,
  openEpisode,
  personal,
  collections,
  explore,
}: {
  detail: Film;
  info?: Schemas["MediaDetail"];
  profileId: string;
  resume: boolean;
  covered: boolean;
  error: unknown;
  retry: () => void;
  onClose: () => void;
  openEpisode: (film: Film) => void;
  personal: (film: Film, patch: Partial<Schemas["MediaStatePatch"]>) => void;
  collections: () => void;
  explore: (name: string, kind: "演员" | "系列", id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = root.current!;
    el.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (
        event.key !== "Tab" ||
        el.inert ||
        document.querySelector("dialog[open]")
      )
        return;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(
          "button:not(:disabled),select:not(:disabled),a[href]",
        ),
      ).filter((item) => item.getClientRects().length);
      const first = items.at(0),
        last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === el)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    el.addEventListener("keydown", trap);
    return () => {
      el.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const movie = info ?? detail;
  const time = movie.durationMs;
  const metadata = filmMetadata(
    info?.releaseDate ?? movie.releaseYear,
    movie.categoryName,
    time == null
      ? null
      : time < 60000
        ? Math.floor(time / 1000) + " 秒"
        : Math.round(time / 60000) + " 分钟",
    info?.identifier,
  );
  const person = (p: Schemas["Person"]) => explore(p.fullName, "演员", p.id);
  return (
    <div
      ref={root}
      tabIndex={-1}
      className="film-detail"
      inert={covered}
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
    >
      <div className="detail-page">
        <nav className="detail-breadcrumb">
          <button aria-label="返回列表" onClick={onClose}>
            <Icon name="arrow" size={16} />
            返回
          </button>
          <span aria-hidden="true">/</span>
          <span>影片详情</span>
        </nav>
        <header
          className={"detail-hero" + (movie.backdropId ? " has-backdrop" : "")}
        >
          {movie.backdropId && (
            <div className="detail-scenery" aria-hidden="true">
              <Art id={movie.backdropId} alt="" />
            </div>
          )}
          {movie.posterId && (
            <div className="detail-poster">
              <Art id={movie.posterId} alt={movie.title + "海报"} />
            </div>
          )}
          <div className="detail-intro">
            <h1>{movie.title}</h1>
            {metadata && <p className="detail-meta">{metadata}</p>}
            <div className="detail-playback">
              {!!error ? (
                <p role="alert">
                  影片信息读取失败。 <button onClick={retry}>重新加载</button>
                </p>
              ) : info?.episodes?.length ? (
                <button
                  className="vx-primary"
                  onClick={() => openEpisode(info.episodes![0]!)}
                >
                  选择第 {info.episodes[0]?.episodeNumber} 集
                </button>
              ) : info?.linkedFileCount ? (
                <EditionPlayback
                  media={info}
                  profileId={profileId}
                  resume={resume}
                />
              ) : (
                <span className="detail-availability" role="status">
                  {info ? "尚未关联视频" : "正在读取文件…"}
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="detail-personal-bar">
          <div className="detail-tools">
            <button
              aria-label="喜欢影片"
              aria-pressed={movie.isFavorite}
              onClick={() => personal(movie, { isFavorite: !movie.isFavorite })}
            >
              <Icon name="heart" size={17} />
              {movie.isFavorite ? "已喜欢" : "喜欢"}
            </button>
            <button onClick={collections}>
              <Icon name="folder" size={17} />
              收藏夹
            </button>
            <button
              aria-pressed={!!movie.watchedAt}
              onClick={() => personal(movie, { watched: !movie.watchedAt })}
            >
              <Icon name="check" size={16} />
              {movie.watchedAt ? "已看过" : "标记已看"}
            </button>
          </div>
          <div role="group" aria-label="我的评分" className="detail-rating">
            <span>我的评分</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                aria-label={n + " 星"}
                aria-pressed={movie.rating === n}
                className={n <= (movie.rating ?? 0) ? "rated" : ""}
                onClick={() =>
                  personal(movie, { rating: movie.rating === n ? null : n })
                }
              >
                <Icon name="star" size={17} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-content">
          {!!info?.episodes?.length && (
            <section>
              <h3>分集</h3>
              <div className="detail-links">
                {info.episodes.map((m) => (
                  <button key={m.id} onClick={() => openEpisode(m)}>
                    第 {m.episodeNumber} 集 · {m.title}
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {movie.summary?.trim() && (
            <section className="detail-synopsis">
              <h3>故事简介</h3>
              <p>{movie.summary.trim()}</p>
            </section>
          )}
          <FilmStills key={movie.id} ids={info?.stillIds ?? []} />
          <FilmPeople
            title="主要演员"
            people={info?.actors ?? []}
            open={person}
          />
          <FilmPeople title="导演" people={info?.directors ?? []} />
          {!!info?.franchises.length && (
            <section>
              <h3>所属系列</h3>
              <div className="detail-links">
                {info.franchises.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => explore(f.name, "系列", f.id)}
                  >
                    {f.name}
                    <small>{f.workCount} 部作品</small>
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
