export type Filters = {
  category: string;
  seen: string;
  favorite: string;
  year: string;
  shape: string;
  rating: string;
  sort: string;
  direction: "asc" | "desc";
};
export const defaults: Filters = {
  category: "全部",
  seen: "全部",
  favorite: "全部",
  year: "全部",
  shape: "全部",
  rating: "全部",
  sort: "添加时间",
  direction: "desc",
};
