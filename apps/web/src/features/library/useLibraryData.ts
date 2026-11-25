import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import type { Filters } from "./filterModel";
export function useLibraryData({
  nav,
  entity,
  page,
  query,
  scope,
  filters,
  draft,
  panel,
  detail,
}: {
  nav: string;
  entity: string;
  page: number;
  query: string;
  scope: { id: string; kind: string } | null;
  filters: Filters;
  draft: Filters;
  panel: string | null;
  detail: Schemas["Media"] | null;
}) {
  const facts = useQuery({
    queryKey: ["browse-facts"],
    queryFn: () => unwrap(api.GET("/api/browse/facts")),
  });
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: () => unwrap(api.GET("/api/categories")),
  });
  const catRows = (cats.data ?? []).filter((c) => c.isVisible),
    categories = ["全部", ...catRows.map((c) => c.id)],
    catName = (id: string) => catRows.find((c) => c.id === id)?.name ?? id;
  const releaseYears = (facts.data?.years ?? []).map(String);
  const sortMedia = (f: Filters) =>
    f.sort === "发行年份"
      ? ("year" as const)
      : f.sort === "我的评分"
        ? ("rating" as const)
        : f.sort === "名称"
          ? ("name" as const)
          : ("createdAt" as const);
  function params(f: Filters) {
    return {
      q: query || undefined,
      categoryId: f.category === "全部" ? undefined : f.category,
      episodesOnly: f.shape === "仅分集" || undefined,
      year: f.year === "全部" ? undefined : Number(f.year),
      watched: f.seen === "全部" ? undefined : f.seen === "已看",
      favorite:
        nav === "收藏" && !scope
          ? true
          : f.favorite === "全部"
            ? undefined
            : f.favorite === "已喜欢",
      ratingMin: /^[1-5]$/.test(f.rating) ? Number(f.rating) : undefined,
      unrated: f.rating === "未评分" || undefined,
      sort: sortMedia(f),
      direction: f.direction,
      actorId: scope?.kind === "演员" ? scope.id : undefined,
      franchiseId: scope?.kind === "系列" ? scope.id : undefined,
      collectionId: scope?.kind === "收藏夹" ? scope.id : undefined,
    };
  }
  const mediaQuery = params(filters);
  const movies = useQuery({
    queryKey: ["browse-media", mediaQuery, page],
    enabled: entity === "影片",
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: { query: { ...mediaQuery, page, pageSize: 48 } },
        }),
      ),
  });
  const preview = useQuery({
    queryKey: ["draft-count", params(draft)],
    enabled:
      entity === "影片" && !!panel && ["filters", "sort"].includes(panel),
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: { query: { ...params(draft), pageSize: 1 } },
        }),
      ),
  });
  const rel = {
    q: query || undefined,
    page,
    pageSize: 48,
    categoryId: mediaQuery.categoryId,
    sort:
      filters.sort === "作品数量"
        ? ("count" as const)
        : filters.sort === "名称"
          ? ("name" as const)
          : ("createdAt" as const),
    direction: filters.direction,
  };
  const actorList = useQuery({
    queryKey: ["people", rel],
    enabled: entity === "演员",
    queryFn: () => unwrap(api.GET("/api/people", { params: { query: rel } })),
  });
  const seriesList = useQuery({
    queryKey: ["series", rel],
    enabled: entity === "系列",
    queryFn: () =>
      unwrap(api.GET("/api/franchises", { params: { query: rel } })),
  });
  const collectionList = useQuery({
    queryKey: ["folders"],
    queryFn: () => unwrap(api.GET("/api/collections")),
  });
  const detailReq = useQuery({
    queryKey: ["detail", detail?.id],
    enabled: !!detail,
    queryFn: () =>
      unwrap(
        api.GET("/api/media/{id}", { params: { path: { id: detail!.id } } }),
      ),
  });
  const continuing = useQuery({
    queryKey: ["continuing"],
    enabled: nav === "发现",
    queryFn: () =>
      unwrap(
        api.GET("/api/media", {
          params: {
            query: { resumable: true, sort: "lastPlayed", pageSize: 6 },
          },
        }),
      ),
  });
  const films = movies.data?.items ?? [],
    total =
      entity === "影片"
        ? movies.data?.total
        : entity === "演员"
          ? actorList.data?.total
          : seriesList.data?.total;
  const visiblePeople = actorList.data?.items ?? [],
    visibleSeries = seriesList.data?.items ?? [],
    folders = collectionList.data ?? [],
    info = detailReq.data;
  const active = [
    filters.category,
    filters.year,
    filters.seen,
    filters.favorite,
    filters.shape,
    filters.rating,
  ].filter((v) => v !== "全部").length;
  return {
    facts,
    cats,
    categories,
    catName,
    releaseYears,
    movies,
    preview,
    actorList,
    seriesList,
    collectionList,
    detailReq,
    continuing,
    films,
    total,
    visiblePeople,
    visibleSeries,
    folders,
    info,
    active,
  };
}
