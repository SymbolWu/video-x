import { useState, type CSSProperties } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "../../shared/StudioIcon";

export type CoverMode = "backdrop" | "poster";

export function CatalogCover({
  film,
  mode,
  compact = false,
}: {
  film: Pick<Schemas["ManagementMedia"], "posterId" | "backdropId">;
  mode: CoverMode;
  compact?: boolean;
}) {
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [loadedImage, setLoadedImage] = useState<string>();
  const candidates =
    mode === "poster"
      ? [film.posterId, film.backdropId]
      : [film.backdropId, film.posterId];
  const image = candidates.find((id) => id && !failedIds.includes(id));

  if (!image) {
    return (
      <span className="film-cover-empty">
        <StudioIcon name="film" />
        {compact ? null : "暂无封面"}
      </span>
    );
  }
  const src = "/api/art/" + image;
  const foreground = (
    <img
      key={image}
      loading="lazy"
      alt=""
      src={src}
      onLoad={compact ? undefined : () => setLoadedImage(image)}
      onError={() => setFailedIds((ids) => [...ids, image])}
    />
  );
  if (compact) return foreground;

  return (
    <span
      className="film-cover-art"
      style={
        loadedImage === image
          ? ({ "--film-cover-image": `url("${src}")` } as CSSProperties)
          : undefined
      }
    >
      {foreground}
    </span>
  );
}
