import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";

type Publication =
  | { state: "running"; id: string; replacement: boolean }
  | { state: "done"; replacement: boolean }
  | {
      state: "failed";
      id: string;
      replacement: boolean;
      error: string;
      retryable: boolean;
    };

export function useEditionPublication(
  mediaId: string,
  pendingReplacementId?: string | null,
) {
  const cache = useQueryClient();
  const cacheKey = ["film-edition-publication", mediaId];
  const [publication, setPublication] = useState<Publication | undefined>(
    () =>
      cache.getQueryData<Publication>(cacheKey) ??
      (pendingReplacementId
        ? { state: "running", id: pendingReplacementId, replacement: true }
        : undefined),
  );
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
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
    const replacement = !!row.editionTarget?.replacement;
    if (row.publishedMediaId) {
      setPublication({ state: "done", replacement });
      cache.removeQueries({
        queryKey: ["film-edition-publication", mediaId],
        exact: true,
      });
      void cache.invalidateQueries();
    } else if (
      row.move?.state === "failed" ||
      row.move?.state === "cancelled"
    ) {
      const failed: Publication = {
        state: "failed",
        id: row.id,
        replacement,
        error: row.move.error || "整理任务已停止。",
        retryable: row.move.state === "failed",
      };
      setPublication(failed);
      cache.setQueryData(["film-edition-publication", mediaId], failed);
    }
  }, [cache, mediaId, pending, progress.data]);

  function track(row: Schemas["ImportRow"]) {
    const replacement = !!row.editionTarget?.replacement;
    const next: Publication = row.publishedMediaId
      ? { state: "done", replacement }
      : { state: "running", id: row.id, replacement };
    cache.setQueryData(["film-edition-progress", row.id], row);
    setRetryError("");
    setPublication(next);
    if (next.state === "running") cache.setQueryData(cacheKey, next);
    else {
      cache.removeQueries({ queryKey: cacheKey, exact: true });
      void cache.invalidateQueries();
    }
  }

  async function retry() {
    if (publication?.state !== "failed" || !publication.retryable || retrying)
      return;
    setRetrying(true);
    setRetryError("");
    const params = { path: { id: publication.id } };
    try {
      const row = await unwrap(api.GET("/api/imports/{id}", { params }));
      if (!row.editionTarget?.replacement) return;
      track(
        await unwrap(
          api.POST("/api/imports/{id}/publish-edition", {
            params,
            body: { ...row.editionTarget, expectedRevision: row.revision },
          }),
        ),
      );
    } catch (error) {
      setRetryError((error as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  return { publication, progress, track, retry, retrying, retryError };
}
