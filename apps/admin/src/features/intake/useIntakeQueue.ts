import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@video-x/sdk-ts";
import { moveActive } from "../storage/StoragePicker";
export const tabs = {
  all: "全部",
  episode: "分集线索",
  missing: "缺少资料",
  blocked: "发布阻断",
  failed: "探测失败",
  unbound: "待绑定文件",
  retrieved: "已抓取",
  lookupFailed: "抓取失败",
  reviewed: "已确认",
  published: "已发布",
} as const;
export const stageTabs = {
  all: "全部",
  pending: "待核对",
  reviewed: "已确认",
  published: "已发布",
} as const;

export function useIntakeQueue(
  page: number,
  stage: keyof typeof stageTabs,
  status: keyof typeof tabs,
  q: string,
) {
  const cache = useQueryClient();
  const counts = useQuery({
    queryKey: ["intake", "counts"],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          (
            [...Object.keys(tabs), "pending"] as (
              | keyof typeof tabs
              | "pending"
            )[]
          ).map(async (status) => [
            status,
            (
              await unwrap(
                api.GET("/api/imports", {
                  params: { query: { status, pageSize: 1 } },
                }),
              )
            ).total,
          ]),
        ),
      ),
  });
  const queue = useQuery({
    queryKey: ["intake", page, stage, status, q],
    queryFn: () =>
      unwrap(
        api.GET("/api/imports", {
          params: {
            query: {
              page,
              pageSize: 20,
              status,
              stage: stage === "all" ? undefined : stage,
              q: q || undefined,
            },
          },
        }),
      ),
    refetchInterval: (q) =>
      q.state.data?.scanning ||
      q.state.data?.lookingUp ||
      q.state.data?.items.some(moveActive)
        ? 1000
        : false,
  });
  const data = queue.data;
  const previousActive = useRef(false);
  useEffect(() => {
    if (!data) return;
    const active = data.lookingUp || data.items.some(moveActive);
    if (previousActive.current && !active)
      void cache.invalidateQueries({ queryKey: ["intake", "counts"] });
    previousActive.current = active;
  }, [data, cache]);
  return { queue, counts, data };
}
