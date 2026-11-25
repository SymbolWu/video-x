import { useState } from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorNotice, Modal } from "@video-x/ui";
import { VideoFacts } from "./EditionComparison";
import { StudioIcon } from "../../shared/StudioIcon";

type Edition = Schemas["EditionInfo"];
const checks: Record<Schemas["EditionCheck"]["status"], string> = {
  present: "检测通过，已读取文件的音视频信息。",
  offline: "媒体盘离线或身份无法核实。",
  missing: "媒体盘在线，登记路径下找不到文件。",
  changed: "路径上的文件已变更，请核对后使用替换文件。",
  probe_failed: "找到了文件，但无法读取可用的视频流。",
  unreadable: "无法读取登记的文件，请检查路径和权限。",
};
const fileStatuses: Record<string, { label: string; tone?: string }> = {
  present: { label: "在线", tone: "positive" },
  missing: { label: "文件缺失", tone: "attention" },
  offline: { label: "盘离线", tone: "attention" },
  changed: { label: "内容有变化", tone: "attention" },
  probe_failed: { label: "检测失败", tone: "attention" },
  unreadable: { label: "文件无法读取", tone: "attention" },
};

export function PublishedFiles({
  media,
  dirty,
  dateRequired,
  publishing,
  fixDate,
  append,
  replace,
}: {
  media: Schemas["MediaDetail"];
  dirty: boolean;
  dateRequired: boolean;
  publishing: boolean;
  fixDate: () => void;
  append: () => void;
  replace: (edition: Edition) => void;
}) {
  const cache = useQueryClient();
  const [activity, setActivity] = useState<{
    id: string;
    action: "check" | "restore";
  }>();
  const [restoring, setRestoring] = useState<Edition>();
  const [restored, setRestored] = useState(false);
  const [messages, setMessages] = useState<
    Record<string, { text: string; tone: string }>
  >({});
  const [restoreError, setRestoreError] = useState("");
  const [expanded, setExpanded] = useState(new Set<string>());
  const editions = media.editions ?? [];
  async function maintain(edition: Edition, action: "check" | "restore") {
    if (!edition.revision || activity) return;
    setActivity({ id: edition.id, action });
    setRestoreError("");
    setRestored(false);
    const params = { path: { id: media.id, editionId: edition.id } };
    const body = { expectedRevision: edition.revision };
    const update = (text: string, tone: string) =>
      setMessages((current) => ({ ...current, [edition.id]: { text, tone } }));
    try {
      if (action === "check") {
        update("正在检测文件…", "");
        const result = await unwrap(
          api.POST("/api/media/{id}/editions/{editionId}/check", {
            params,
            body,
          }),
        );
        update(
          checks[result.status],
          result.status === "present" ? "positive" : "attention",
        );
      } else {
        const result = await unwrap(
          api.POST("/api/media/{id}/editions/{editionId}/restore", {
            params,
            body,
          }),
        );
        setExpanded((current) => new Set([...current, result.id]));
        setRestoring(undefined);
        setRestored(true);
      }
      await cache.invalidateQueries();
    } catch (error) {
      const message = (error as Error).message;
      if (action === "restore") setRestoreError(message);
      else update(message, "attention");
    } finally {
      setActivity(undefined);
    }
  }

  return (
    <div className="editor-versions">
      <header className="editor-section-heading">
        <h2>
          播放版本 <small>{editions.length}</small>
        </h2>
        <button
          type="button"
          disabled={dirty || dateRequired || publishing || !!activity}
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
            : "先保存资料变更，再追加、替换或恢复版本。"}
          {dateRequired && (
            <button className="editor-quiet" type="button" onClick={fixDate}>
              补全发行日期
            </button>
          )}
        </div>
      )}
      {restored && (
        <p className="editor-notice" role="status" data-tone="positive">
          已恢复原播放文件。
        </p>
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
                  message={messages[edition.id]}
                  busy={activity?.id === edition.id}
                  canMaintain={
                    !!edition.revision && edition.partCount === 1 && !activity
                  }
                  canReplace={!dirty && !publishing}
                  check={() => void maintain(edition, "check")}
                  replace={() => replace(edition)}
                  restore={() => {
                    setRestoreError("");
                    setRestoring(edition);
                  }}
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
      {restoring?.replacedEdition && (
        <Modal
          title="恢复原播放文件"
          close={() => !activity && setRestoring(undefined)}
        >
          <div className="edition-restore">
            <p>
              系统会先检测原文件。通过后，「{restoring.replacedEdition.name}
              」将重新出现在播放列表中。
            </p>
            <p className="edition-restore-path">
              {restoring.replacedEdition.filename}
            </p>
            <p>
              当前版本的文件和进度会保留
              {restoring.isDefault ? "，默认播放会切回原版本" : ""}。
            </p>
            <ErrorNotice error={restoreError} />
            <footer className="edition-actions">
              <button
                type="button"
                disabled={!!activity}
                onClick={() => setRestoring(undefined)}
              >
                取消
              </button>
              <button
                type="button"
                className="editor-primary"
                disabled={!!activity}
                onClick={() => void maintain(restoring, "restore")}
              >
                {activity ? "正在检测并恢复…" : "确认恢复"}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditionRows({
  edition,
  status,
  open,
  toggle,
  busy,
  message,
  canMaintain,
  canReplace,
  check,
  replace,
  restore,
}: {
  edition: Schemas["EditionInfo"];
  status: { label: string; tone?: string };
  open: boolean;
  toggle: () => void;
  busy: boolean;
  message?: { text: string; tone: string };
  canMaintain: boolean;
  canReplace: boolean;
  check: () => void;
  replace: () => void;
  restore: () => void;
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
            <div className="edition-maintenance">
              <dl>
                <VideoFacts data={edition} />
                <dt>媒体相对路径</dt>
                <dd>{path}</dd>
              </dl>
              <div className="edition-maintenance-actions">
                <button type="button" disabled={!canMaintain} onClick={check}>
                  {busy ? "处理中…" : "重新检测"}
                </button>
                <button
                  type="button"
                  disabled={!canMaintain || !canReplace}
                  onClick={replace}
                >
                  替换文件
                </button>
                {edition.replacedEdition && (
                  <button
                    type="button"
                    className="editor-quiet"
                    disabled={!canMaintain || !canReplace}
                    onClick={restore}
                  >
                    恢复原文件
                  </button>
                )}
              </div>
              {(edition.partCount ?? 1) > 1 && (
                <p>该版本包含多个文件，暂不可执行单文件维护。</p>
              )}
              {message && (
                <p
                  role="status"
                  className="editor-notice"
                  data-tone={message.tone}
                >
                  {message.text}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
