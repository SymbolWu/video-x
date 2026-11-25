import { Select } from "@video-x/ui";
import type { Schemas } from "@video-x/sdk-ts";
import type { ReactNode } from "react";
import "./media-catalog-filters.css";

const resolutions = [
  { value: "", label: "全部" },
  { value: "2160p", label: "4K / 2160p" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "576p", label: "576p" },
  { value: "480p", label: "480p" },
  { value: "below360p", label: "低于 360p" },
  { value: "unknown", label: "未知" },
] as const;

const subtitleOptions = [
  { value: "", label: "全部" },
  { value: "supported", label: "支持" },
  { value: "unsupported", label: "不支持" },
  { value: "unknown", label: "未标注" },
] as const;

export type FilmFilters = {
  resolution: (typeof resolutions)[number]["value"];
  chineseSubtitles: (typeof subtitleOptions)[number]["value"];
};
type Sort = "createdAt" | "year";
type Direction = "asc" | "desc";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="media-filter-field">
      <span title={hint}>{label}</span>
      {children}
    </div>
  );
}

export function MediaCatalogFilters({
  categories,
  categoryId,
  filters,
  sort,
  direction,
  onCategory,
  onFilters,
  onSort,
  onDirection,
  onReset,
}: {
  categories: Schemas["Category"][];
  categoryId: string;
  filters: FilmFilters;
  sort: Sort;
  direction: Direction;
  onCategory: (value: string) => void;
  onFilters: (value: FilmFilters) => void;
  onSort: (value: Sort) => void;
  onDirection: (value: Direction) => void;
  onReset: () => void;
}) {
  const hasFilters = !!(
    categoryId ||
    filters.resolution ||
    filters.chineseSubtitles
  );
  return (
    <div id="catalog-options" className="media-filter-panel">
      <section
        className="media-filter-section"
        aria-labelledby="media-filter-heading"
      >
        <div className="media-filter-heading">
          <h2 id="media-filter-heading">筛选</h2>
          <button
            type="button"
            className="media-filter-reset"
            disabled={!hasFilters}
            onClick={onReset}
          >
            清除筛选
          </button>
        </div>
        <div className="media-filter-fields">
          <Field label="分类">
            <Select
              label="分类"
              value={categoryId}
              onValueChange={onCategory}
              options={[
                { value: "", label: "全部" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Field label="清晰度" hint="按默认播放版本分档">
            <Select
              label="清晰度"
              value={filters.resolution}
              options={[...resolutions]}
              onValueChange={(value) =>
                onFilters({
                  ...filters,
                  resolution: value as FilmFilters["resolution"],
                })
              }
            />
          </Field>
          <Field label="中文字幕" hint="依据影片的中文资料标记">
            <Select
              label="中文字幕"
              value={filters.chineseSubtitles}
              options={[...subtitleOptions]}
              onValueChange={(value) =>
                onFilters({
                  ...filters,
                  chineseSubtitles: value as FilmFilters["chineseSubtitles"],
                })
              }
            />
          </Field>
        </div>
      </section>
      <section
        className="media-filter-section media-filter-sort"
        aria-labelledby="media-sort-heading"
      >
        <div className="media-filter-heading">
          <h2 id="media-sort-heading">排序</h2>
        </div>
        <div className="media-filter-fields">
          <Field label="排序依据">
            <Select
              label="排序字段"
              value={sort}
              options={[
                { value: "createdAt", label: "添加时间" },
                { value: "year", label: "发行年份" },
              ]}
              onValueChange={(value) => onSort(value as Sort)}
            />
          </Field>
          <Field label="排序方向">
            <Select
              label="排序方向"
              value={direction}
              options={[
                { value: "desc", label: "降序" },
                { value: "asc", label: "升序" },
              ]}
              onValueChange={(value) => onDirection(value as Direction)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
