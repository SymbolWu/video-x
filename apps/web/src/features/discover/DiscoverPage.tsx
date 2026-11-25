import type { Schemas } from "@video-x/sdk-ts";
import type { ReactNode } from "react";
import { Art } from "../../shared/Art";
import { Icon } from "../../shared/Icon";
import { filmMetadata, playTime } from "../../shared/mediaText";
import "./discover.css";

type Film = Schemas["Media"];
type Feed = { isPending: boolean; error: Error | null; refetch: () => unknown };
export function DiscoverPage({
  films,
  continuing,
  recentFeed,
  resumeFeed,
  open,
  resume,
  openLibrary,
  card,
}: {
  films: Film[];
  continuing: Film[];
  recentFeed: Feed;
  resumeFeed: Feed;
  open: (film: Film) => void;
  resume: (film: Film) => void;
  openLibrary: () => void;
  card: (film: Film) => ReactNode;
}) {
  const featured = films.find((film) => film.backdropId);
  return (
    <>
      {featured && (
        <section className="vx-discover-hero">
          <Art id={featured.backdropId} alt="" />
          <div>
            <span>片库精选</span>
            <h2>{featured.title}</h2>
            <p>{filmMetadata(featured.releaseYear, featured.categoryName)}</p>
            <button className="vx-primary" onClick={() => open(featured)}>
              查看影片 <Icon name="chevron" size={15} />
            </button>
          </div>
        </section>
      )}
      {(continuing.length > 0 || resumeFeed.error) && (
        <section aria-label="继续观看">
          <div className="vx-section-heading">
            <h2>继续观看</h2>
          </div>
          {resumeFeed.error && (
            <p role="alert">
              续播记录读取失败。{" "}
              <button onClick={() => resumeFeed.refetch()}>重新加载</button>
            </p>
          )}
          <div className="resume-grid">
            {continuing.map((film) => (
              <button
                className="vx-continue"
                key={film.id}
                onClick={() => resume(film)}
                aria-label={`继续观看${film.title}，从 ${playTime(film.resumeMs ?? 0)} 开始`}
              >
                <span className="resume-art">
                  <Art id={film.backdropId ?? film.posterId} alt="" />
                </span>
                <span className="resume-copy">
                  <b>{film.title}</b>
                  <small>看到 {playTime(film.resumeMs ?? 0)}</small>
                  {!!film.durationMs && (
                    <progress
                      aria-label="观看进度"
                      value={Math.min(film.resumeMs ?? 0, film.durationMs)}
                      max={film.durationMs}
                    />
                  )}
                </span>
                <Icon name="play" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}
      <section aria-label="最近添加">
        <div className="vx-section-heading">
          <h2>最近添加</h2>
          <button onClick={openLibrary}>
            全部影片 <Icon name="chevron" size={14} />
          </button>
        </div>
        {recentFeed.error ? (
          <p role="alert">
            影片读取失败。{" "}
            <button onClick={() => recentFeed.refetch()}>重新加载</button>
          </p>
        ) : films.length ? (
          <div className="vx-film-grid">{films.slice(0, 8).map(card)}</div>
        ) : (
          <p className="vx-empty" role="status">
            {recentFeed.isPending ? "正在读取影片…" : "片库里还没有影片"}
          </p>
        )}
      </section>
    </>
  );
}
