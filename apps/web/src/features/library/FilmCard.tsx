import { filmMetadata } from "../../shared/mediaText";
import type { Schemas } from "@video-x/sdk-ts";
import { Art } from "../../shared/Art";
import { Icon } from "../../shared/Icon";
type Film = Schemas["Media"];
export function FilmCard({
  m,
  coverView,
  onOpen,
  onFavorite,
}: {
  m: Film;
  coverView: "poster" | "backdrop";
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="vx-film" key={m.id}>
      <button
        className="vx-cover"
        onClick={onOpen}
        aria-label={`查看${m.title}`}
      >
        <Art
          id={
            coverView === "poster"
              ? (m.posterId ?? m.backdropId)
              : (m.backdropId ?? m.posterId)
          }
          alt={m.title}
        />
        {m.durationMs != null && (
          <span className="vx-runtime">
            {m.durationMs < 60000
              ? Math.floor(m.durationMs / 1000) + " 秒"
              : Math.round(m.durationMs / 60000) + " 分钟"}
          </span>
        )}
        {!!m.watchedAt && (
          <span className="vx-seen">
            <Icon name="check" size={11} />
            已看
          </span>
        )}
      </button>
      <button
        className={`vx-love ${m.isFavorite ? "chosen" : ""}`}
        onClick={onFavorite}
        aria-label={`${m.isFavorite ? "取消喜欢" : "喜欢"}${m.title}`}
        aria-pressed={m.isFavorite}
      >
        <Icon name="heart" size={17} />
      </button>
      <button className="vx-title" onClick={onOpen}>
        {m.title}
      </button>
      <div className="vx-film-meta">
        <span>{filmMetadata(m.releaseYear, m.categoryName)}</span>
        {m.rating && <span className="vx-score">★ {m.rating}</span>}
      </div>
    </article>
  );
}
