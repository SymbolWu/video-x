import { useState } from "react";
import type { Schemas } from "@video-x/sdk-ts";
import { StudioIcon } from "../../shared/StudioIcon";

const fileStatuses: Record<string, { label: string; tone?: string }> = {
  present: { label: "在线", tone: "positive" },
  missing: { label: "文件缺失", tone: "attention" },
  offline: { label: "离线", tone: "attention" },
};

export function PublishedFiles({
  media,
  dirty,
  dateRequired,
  publishing,
  fixDate,
  append,
}: {
  media: Schemas["MediaDetail"];
  dirty: boolean;
  dateRequired: boolean;
  publishing: boolean;
  fixDate: () => void;
  append: () => void;
}) {
  const [expanded, setExpanded] = useState(new Set<string>());
  const editions = media.editions ?? [];
  return (
    <div className="editor-versions">
      <header className="editor-section-heading">
        <h2>
          播放版本 <small>{editions.length}</small>
        </h2>
        <button
          type="button"
          disabled={dirty || dateRequired || publishing}
          onClick={append}
        >
          <StudioIcon name="plus" />
          追加版本
        </button>
      </header>
      {(dateRequired || dirty) && (
        <div className="editor-notice" data-tone="attention">
          {dateRequired
            ? "追加版本前请补齐发行日期并保存。"
            : "先保存资料变更，再追加版本。"}
          {dateRequired && (
            <button className="editor-quiet" type="button" onClick={fixDate}>
              补全发行日期
            </button>
          )}
        </div>
      )}
      {editions.length ? (
        <table className="editor-version-table" aria-label="播放版本">
          <thead>
            <tr>
              <th scope="col">版本</th>
              <th scope="col">清晰度</th>
              <th scope="col">状态</th>
              <th scope="col">文件</th>
            </tr>
          </thead>
          <tbody>
            {editions.map((edition) => {
              const open = expanded.has(edition.id);
              const status = fileStatuses[edition.availability] ?? {
                label: "待检查",
              };
              return (
                <EditionRows
                  key={edition.id}
                  edition={edition}
                  status={status}
                  open={open}
                  toggle={() => {
                    const next = new Set(expanded);
                    if (open) next.delete(edition.id);
                    else next.add(edition.id);
                    setExpanded(next);
                  }}
                />
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="editor-list-empty">尚未绑定播放文件</p>
      )}
    </div>
  );
}

function EditionRows({
  edition,
  status,
  open,
  toggle,
}: {
  edition: Schemas["EditionInfo"];
  status: { label: string; tone?: string };
  open: boolean;
  toggle: () => void;
}) {
  const path = edition.filename || "";
  const dimensions =
    edition.width && edition.height
      ? edition.width + " × " + edition.height
      : "";
  const name = path.split("/").at(-1);
  return (
    <>
      <tr>
        <th scope="row">
          <span>{edition.name}</span>
          {edition.isDefault && <small>默认播放</small>}
        </th>
        <td>
          <span>
            {edition.height === 2160
              ? "4K"
              : edition.height
                ? edition.height + "p"
                : "未知"}
          </span>
          {dimensions && <small>{dimensions}</small>}
        </td>
        <td>
          <span className="version-file-status" data-tone={status.tone}>
            {status.label}
          </span>
        </td>
        <td>
          <div className="editor-version-file">
            <span>{name || "—"}</span>
            {path && (
              <button
                type="button"
                aria-label={edition.name + "文件详情"}
                aria-expanded={open}
                onClick={toggle}
              >
                {open ? "收起" : "详情"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="editor-version-path">
            <dl>
              <dt>媒体相对路径</dt>
              <dd>{path}</dd>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}
