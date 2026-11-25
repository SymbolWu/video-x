import type { Schemas } from "@video-x/sdk-ts";
import { moveActive } from "../storage/StoragePicker";
import { fetching } from "./SourceReview";
import fallbackPoster from "./placeholder.svg";
export type Row = Schemas["ImportRow"];
export type Perform = (
  command: () => Promise<unknown>,
  notice: string,
) => Promise<void>;
export function poster(r: Row) {
  return r.fields.posterId ? "/api/art/" + r.fields.posterId : fallbackPoster;
}
export function issue(row: Row) {
  if (row.needsTarget) return "待设整理目标";
  if (moveActive(row)) return "整理任务处理中";
  if (fetching(row.lookup)) return "在线资料抓取中";
  if (row.availability === "unbound") return "待绑定文件";
  if (row.availability !== "present") return "文件离线";
  if (row.probeStatus !== "succeeded") return "探测失败";
  return "";
}
export function missing(r: Row) {
  return [
    !r.fields.posterId && "封面",
    !r.fields.summary && "简介",
    !r.fields.releaseDate && "发行日期",
    !r.actors.length && !r.fields.sourceNames?.actors.length && "演员",
    r.categoryName === "未分类" && "分类",
  ]
    .filter(Boolean)
    .join("、");
}
