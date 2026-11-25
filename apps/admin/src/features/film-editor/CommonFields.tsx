import { useState } from "react";
import { Select } from "@video-x/ui";
import type { Schemas } from "@video-x/sdk-ts";
import type { FieldIssue, Fields, Tab } from "./FilmWorkspace";
import { FilmArtwork } from "./FilmArtwork";
import {
  RelationList,
  relationLabels,
  type RelationItem,
} from "./RelationList";
import { ReleaseDateField } from "./ReleaseDateField";
import { validReleaseDate } from "./releaseDate";

const relationFields = {
  actors: "actorIds",
  directors: "directorIds",
  series: "franchiseIds",
  tags: "tagIds",
  studios: "studioIds",
} as const;

export function CommonFields({
  tab,
  d,
  patch,
  categories,
  initialItems,
  legacyYear,
  issue,
  onUploading,
}: {
  tab: Tab;
  d: Fields;
  patch: (p: Partial<Fields>) => void;
  categories: Schemas["Category"][];
  initialItems: Record<string, RelationItem>;
  legacyYear?: number | null;
  issue?: FieldIssue | null;
  onUploading: (uploading: boolean) => void;
}) {
  const [added, remember] = useState<Record<string, RelationItem>>({});
  const items = { ...initialItems, ...added };
  function relation(kind: keyof typeof relationLabels) {
    const key = relationFields[kind];
    const ns = d.sourceNames;
    return (
      <RelationList
        kind={kind}
        ids={d[key] ?? []}
        items={items}
        categories={categories}
        remember={(picked) =>
          remember((old) => ({
            ...old,
            ...Object.fromEntries(picked.map((item) => [item.id, item])),
          }))
        }
        change={(ids) => patch({ [key]: ids })}
      >
        {!!ns?.[kind].length && (
          <div className="source-pending">
            <small>来源候选</small>
            {ns[kind].map((n) => (
              <button
                type="button"
                key={n}
                aria-label={"移除候选 " + n}
                onClick={() =>
                  patch({
                    sourceNames: {
                      ...ns,
                      [kind]: ns[kind].filter((x) => x !== n),
                    },
                  })
                }
              >
                {n} ×
              </button>
            ))}
          </div>
        )}
      </RelationList>
    );
  }
  if (tab === "基本资料") {
    const titleError = issue?.field === "title" ? issue.message : undefined;
    return (
      <div className="editor-form">
        <label className="editor-field">
          <span>
            作品标题{" "}
            <span className="editor-required" aria-hidden="true">
              *
            </span>
          </span>
          <input
            required
            maxLength={1000}
            data-editor-field="title"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "film-title-error" : undefined}
            value={d.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          {titleError && (
            <small className="editor-field-error" id="film-title-error">
              {titleError}
            </small>
          )}
        </label>
        <div className="editor-form-row">
          <label className="editor-field">
            主编号 / 番号
            <input
              maxLength={160}
              value={d.identifier ?? ""}
              onChange={(e) => patch({ identifier: e.target.value || null })}
            />
          </label>
          <ReleaseDateField
            value={d.releaseDate ?? ""}
            legacyYear={legacyYear}
            error={issue?.field === "releaseDate" ? issue.message : undefined}
            onChange={(date) =>
              patch({
                releaseDate: date || null,
                releaseYear: validReleaseDate(date)
                  ? Number(date.slice(0, 4))
                  : (legacyYear ?? null),
              })
            }
          />
          <div className="editor-field">
            <span>中文资料标记</span>
            <Select
              label="中文资料标记"
              value={
                d.supportsChinese == null
                  ? "unknown"
                  : String(d.supportsChinese)
              }
              options={[
                { value: "unknown", label: "未标注" },
                { value: "true", label: "支持" },
                { value: "false", label: "不支持" },
              ]}
              onValueChange={(v) =>
                patch({
                  supportsChinese: v === "unknown" ? null : v === "true",
                })
              }
            />
            <small>人工标记</small>
          </div>
        </div>
        <label className="editor-field">
          简介
          <textarea
            rows={4}
            maxLength={50000}
            value={d.summary ?? ""}
            onChange={(e) => patch({ summary: e.target.value || null })}
          />
        </label>
        <label className="editor-field">
          我的资料备注
          <textarea
            rows={2}
            maxLength={10000}
            value={d.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || null })}
          />
        </label>
      </div>
    );
  }
  if (tab === "封面" || tab === "剧照")
    return (
      <FilmArtwork
        key={tab}
        mode={tab}
        d={d}
        patch={patch}
        onUploading={onUploading}
      />
    );
  if (tab === "演职员")
    return (
      <div className="editor-relations">
        {relation("actors")}
        {relation("directors")}
      </div>
    );
  if (tab === "归类与关联")
    return (
      <div className="editor-relations">
        <div className="editor-field editor-category">
          <span>主分类</span>
          <Select
            label="主分类"
            value={d.categoryId}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            onValueChange={(categoryId) => patch({ categoryId })}
          />
        </div>
        {relation("series")}
        {relation("tags")}
        {relation("studios")}
      </div>
    );
  return null;
}
