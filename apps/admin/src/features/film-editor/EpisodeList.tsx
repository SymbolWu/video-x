import { useLayoutEffect, useRef } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "../../shared/StudioIcon";
import { moveItem } from "./moveItem";

export type EpisodeOrigin = { id: string; scroll: number };

export function EpisodeList({
  episodes,
  ids,
  restored,
  onOpen,
  onReorder,
}: {
  episodes: Schemas["Media"][];
  ids: string[];
  restored?: EpisodeOrigin;
  onOpen: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const focused = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    if (restored) {
      focused.current?.focus({ preventScroll: true });
      window.scrollTo(0, restored.scroll);
    }
  }, [restored]);
  const byId = new Map(episodes.map((episode) => [episode.id, episode]));
  return (
    <div className="editor-episode-list">
      <header className="editor-section-heading">
        <h2>
          容器内作品 <small>{ids.length}</small>
        </h2>
      </header>
      {ids.length ? (
        <ul className="editor-data-list">
          {ids.map((id, index) => {
            const episode = byId.get(id)!;
            const art = episode.backdropId || episode.posterId;
            return (
              <li key={id}>
                <span className="editor-row-index">
                  第 {episodes[index]?.episodeNumber ?? index + 1} 集
                </span>
                <span className="editor-episode-art" aria-hidden="true">
                  <StudioIcon name="film" />
                  {art && (
                    <img
                      src={"/api/art/" + art}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  )}
                </span>
                <a
                  className="editor-row-name"
                  ref={restored?.id === id ? focused : undefined}
                  href={"#media/" + id}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    onOpen(id);
                  }}
                >
                  {episode.title}
                </a>
                <div className="editor-inline-actions">
                  <button
                    type="button"
                    className="editor-quiet"
                    aria-label={"上移 " + episode.title}
                    disabled={!index}
                    onClick={() => onReorder(moveItem(ids, index, index - 1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="editor-quiet"
                    aria-label={"下移 " + episode.title}
                    disabled={index === ids.length - 1}
                    onClick={() => onReorder(moveItem(ids, index, index + 1))}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="editor-list-empty">暂无分集</p>
      )}
    </div>
  );
}
