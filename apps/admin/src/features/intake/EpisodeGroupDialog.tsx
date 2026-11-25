import { useState } from "react";
import { api, unwrap } from "@video-x/sdk-ts";
import { Select, Modal, ErrorNotice } from "@video-x/ui";
import { poster, type Row, type Perform } from "./queueModel";
export function EpisodeGroupDialog({
  initial,
  busy,
  error,
  perform,
  close,
  saved,
}: {
  initial: Row[];
  busy: boolean;
  error: string;
  perform: Perform;
  close: () => void;
  saved: () => void;
}) {
  const first = initial[0]!,
    existingGroup = first.group?.id;
  const [groupRows, setGroupRows] = useState(initial);
  const [groupName, setGroupName] = useState(
    first.group?.title ??
      first.fields.title
        .replace(
          /\s*[·._\s-]*(?:(?:part|ep)[\s._-]*\d+|[上下][篇部集])\s*$/i,
          "",
        )
        .trim(),
  );
  const [sourceId, setSourceId] = useState(first.group?.sourceId ?? first.id);
  const [start, setStart] = useState(first.group?.position ?? 1);
  const source = groupRows.find((r) => r.id === sourceId);
  return (
    <Modal
      title={existingGroup ? "调整分集容器" : "创建分集容器"}
      close={() => !busy && close()}
    >
      <form
        className="intake-form"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            const body = {
              title: groupName.trim(),
              sourceId,
              startNumber: start,
              members: groupRows.map((r) => ({
                id: r.id,
                revision: r.revision,
              })),
            };
            if (existingGroup)
              await unwrap(
                api.PUT("/api/imports/groups/{id}", {
                  params: { path: { id: existingGroup } },
                  body,
                }),
              );
            else await unwrap(api.POST("/api/imports/groups", { body }));
            saved();
            close();
          }, "已保存分集容器，请核对后发布。");
        }}
      >
        <div className="ig-group-fields">
          <label>
            容器名称
            <input
              autoFocus
              value={groupName}
              required
              maxLength={300}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </label>
          <label>
            容器资料取自
            <Select
              label="容器资料取自"
              value={sourceId}
              onValueChange={setSourceId}
              options={groupRows.map((r) => ({
                value: r.id,
                label: r.fields.title,
              }))}
            />
          </label>
          <label>
            起始集号
            <input
              type="number"
              min={1}
              max={9000}
              required
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="ig-tree">
          {source && (
            <div className="ig-container-preview">
              {<img src={poster(source)} alt="容器封面" />}
              <div>
                <small>容器资料预览 · 按集播放</small>
                <h3>{groupName}</h3>
                <p>
                  {source.categoryName} ·{" "}
                  {source.actors.join("、") || "未填演员"}
                </p>
                <p className="ig-muted">
                  {source.fields.summary || "未填简介"}
                </p>
              </div>
            </div>
          )}
          <h3 className="order-heading">分集顺序</h3>
          <ol aria-label="分集顺序" className="ig-episode-order">
            {groupRows.map((r, i) => (
              <li key={r.id}>
                <span>第 {start + i} 集</span>
                <div>
                  <strong>{r.fields.title}</strong>
                  <small>{r.relativePath}</small>
                </div>
                <div>
                  {[-1, 1].map((d) => (
                    <button
                      key={d}
                      className="btn ghost small"
                      type="button"
                      disabled={i + d < 0 || i + d >= groupRows.length}
                      onClick={() =>
                        setGroupRows((rows) => {
                          const next = [...rows];
                          [next[i], next[i + d]] = [next[i + d]!, next[i]!];
                          return next;
                        })
                      }
                    >
                      {d < 0 ? "上移" : "下移"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <ErrorNotice error={error} />
        <div className="actions">
          <small className="group-foot-caption">各集保留自己的文件</small>
          <button
            type="button"
            className="btn ghost small"
            disabled={busy}
            onClick={() => close()}
          >
            取消
          </button>
          <button
            className="btn primary small"
            disabled={!groupName.trim() || busy}
          >
            {existingGroup
              ? "保存容器与集顺序"
              : "创建容器并关联 " + groupRows.length + " 集"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
