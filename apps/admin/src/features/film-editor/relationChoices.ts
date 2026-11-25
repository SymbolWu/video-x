import { api, unwrap } from "@video-x/sdk-ts";

export type RelationKind =
  | "actors"
  | "directors"
  | "series"
  | "tags"
  | "studios";
export const relationLabels = {
  actors: "演员",
  directors: "导演",
  series: "系列",
  tags: "标签",
  studios: "片商",
};
export type RelationItem = {
  id: string;
  name: string;
  detail?: string | null;
  context?: string;
  art?: string | null;
};
const pageSize = 16;

export async function pagedChoices(
  kind: Exclude<RelationKind, "tags">,
  q: string,
  categoryId: string,
  page: number,
) {
  const query = {
    q: q.trim() || undefined,
    categoryId: categoryId || undefined,
    page,
    pageSize,
    sort: "name" as const,
    direction: "asc" as const,
  };
  if (kind === "series") {
    const v = await unwrap(api.GET("/api/franchises", { params: { query } }));
    return {
      ...v,
      items: v.items.map((p) => ({
        id: p.id,
        name: p.name,
        detail: p.categoryName,
        art: p.coverId,
      })),
    };
  }
  if (kind === "studios") {
    return unwrap(
      api.GET("/api/dictionary/choices", {
        params: { query: { kind: "studio", page, pageSize, q: query.q } },
      }),
    );
  }
  const v = await unwrap(api.GET("/api/people", { params: { query } }));
  return {
    ...v,
    items: v.items.map((p) => ({
      id: p.id,
      name: p.fullName,
      detail: [
        p.detailedName !== p.fullName ? p.detailedName : null,
        p.categoryName,
      ]
        .filter(Boolean)
        .join(" · "),
      art: p.portraitId,
    })),
  };
}
