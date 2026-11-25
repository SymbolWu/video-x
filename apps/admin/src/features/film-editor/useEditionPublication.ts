import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";

type Publication =
  | { state: "running"; id: string }
  | { state: "done" }
  | { state: "failed"; error: string };

export function useEditionPublication(mediaId: string) {
  const cache = useQueryClient();
  const cacheKey = ["film-edition-publication", mediaId];
  const [publication, setPublication] = useState(() =>
    cache.getQueryData<Publication>(cacheKey),
  );
  const pending = publication?.state === "running" ? publication.id : "";
  const progress = useQuery({
    queryKey: ["film-edition-progress", pending],
    enabled: !!pending,
    queryFn: () =>
      unwrap(
        api.GET("/api/imports/{id}", { params: { path: { id: pending } } }),
      ),
    refetchInterval: 2000,
  });
  useEffect(() => {
    const row = progress.data;
    if (!pending || !row) return;
    if (row.publishedMediaId) {
      setPublication({ state: "done" });
      cache.removeQueries({
        queryKey: ["film-edition-publication", mediaId],
        exact: true,
      });
      void cache.invalidateQueries();
    } else if (
      row.move?.state === "failed" ||
      row.move?.state === "cancelled"
    ) {
      setPublication({
        state: "failed",
        error: row.move.error || "整理任务已停止。",
      });
      cache.removeQueries({
        queryKey: ["film-edition-publication", mediaId],
        exact: true,
      });
    }
  }, [cache, mediaId, pending, progress.data]);

  function track(row: Schemas["ImportRow"]) {
    const next: Publication = row.publishedMediaId
      ? { state: "done" }
      : { state: "running", id: row.id };
    setPublication(next);
    if (next.state === "running") cache.setQueryData(cacheKey, next);
    else void cache.invalidateQueries();
  }

  return { publication, progress, track };
}
