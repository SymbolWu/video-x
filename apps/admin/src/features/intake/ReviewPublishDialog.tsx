import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice, Modal } from "@video-x/ui";
import { api, unwrap } from "@video-x/sdk-ts";
import { moveDestination } from "../storage/StoragePicker";
import { ReviewCard } from "./ReviewCard";
import { formatBytes } from "../../shared/formatBytes";
import { issue, missing, type Row, type Perform } from "./queueModel";
type ChangeRows = Dispatch<SetStateAction<Row[]>>;
export function ReviewPublishDialog({
  batch,
  batchRows,
  setBatchRows,
  select,
  busy,
  error,
  perform,
  close,
  edit,
  showLookup,
}: {
  batch: "review" | "publish";
  batchRows: Row[];
  setBatchRows: ChangeRows;
  select: ChangeRows;
  busy: boolean;
  error: string;
  perform: Perform;
  close: () => void;
  edit: (r: Row) => void;
  showLookup: (id: string) => void;
}) {
  return (
    <Modal
      title={
        batch === "review"
          ? "核对所选 " + batchRows.length + " 条草稿"
          : "手动发布所选资料"
      }
      close={() => {
        if (!busy) close();
      }}
    >
      {batch === "review" ? (
        <>
          <p className="ig-dialog-intro">
            直接对照以下资料，确认后仍需手动发布。
          </p>
          <div className="ig-review-list">
            {batchRows.map((r) => (
              <ReviewCard
                key={r.id}
                row={r}
                compare={() => showLookup(r.id)}
                edit={() => {
                  close();
                  edit(r);
                }}
              />
            ))}
          </div>
          <p className="ig-dialog-note">
            {batchRows.filter((r) => missing(r)).length}{" "}
            条有非必填缺项，可以接受现状后确认。缺少文件或探测失败的草稿须先处理。
          </p>
        </>
      ) : (
        <>
          <p className="ig-dialog-intro">
            发布以下 {batchRows.length} 条草稿。
            {batchRows.some((r) => r.move)
              ? "按以下路径移动并校验文件后发布。"
              : "文件将从当前位置播放。"}
          </p>
          {batchRows.some((r) => r.move) && (
            <p>
              待移动 {batchRows.filter((r) => r.move).length} 个文件 ·{" "}
              {formatBytes(
                batchRows.reduce(
                  (sum, r) => sum + (r.move ? Number(r.sizeBytes) : 0),
                  0,
                ),
              )}
            </p>
          )}
          <ul className="ig-publish-list">
            {batchRows.map((r) => (
              <li key={r.id}>
                {r.fields.title}
                <span>
                  {r.move
                    ? r.move.source + " → " + moveDestination(r.move)
                    : r.group
                      ? "分集"
                      : "作品"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {batch === "publish" &&
        batchRows.some((r) => !r.reviewed || issue(r)) && (
          <p className="ig-error">请先核对全部分集并解决发布阻断。</p>
        )}
      <ErrorNotice error={error} />
      <div className="actions">
        <button onClick={() => close()} disabled={busy}>
          取消
        </button>
        <button
          className="btn primary small"
          disabled={
            busy ||
            !batchRows.length ||
            (batch === "publish" &&
              batchRows.some((r) => !r.reviewed || issue(r)))
          }
          onClick={() =>
            void perform(
              async () => {
                const done = new Set<string>();
                for (const r of batchRows) {
                  if (batch === "review" && r.reviewed) continue;
                  const groupKey = r.group?.id ?? r.id;
                  if (batch === "publish" && done.has(groupKey)) continue;
                  const opt = {
                    params: { path: { id: r.id } },
                    body: { expectedRevision: r.revision },
                  };
                  if (batch === "review")
                    await unwrap(api.POST("/api/imports/{id}/review", opt));
                  else await unwrap(api.POST("/api/imports/{id}/publish", opt));
                  done.add(groupKey);
                  setBatchRows((prev) =>
                    prev.filter(
                      (x) =>
                        x.id !== r.id &&
                        !(batch === "publish" && x.group?.id === groupKey),
                    ),
                  );
                  if (batch === "publish")
                    select((prev) =>
                      prev.filter(
                        (x) =>
                          x.id !== r.id &&
                          !(
                            batch === "publish" &&
                            x.group &&
                            x.group.id === groupKey
                          ),
                      ),
                    );
                }
                close();
              },
              batch === "review"
                ? "所选草稿已人工确认。"
                : batchRows.some((r) => r.move)
                  ? "已提交移动发布，请查看列表中的处理结果。"
                  : "所选资料已发布。",
            )
          }
        >
          {batch === "review"
            ? "确认所选草稿"
            : batchRows.some((r) => r.move)
              ? "移动并发布"
              : "确认发布"}
        </button>
      </div>
    </Modal>
  );
}
