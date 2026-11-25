import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, Pager, ErrorNotice } from "@video-x/ui";
type Media = Schemas["MediaDetail"];
type Row = Schemas["ImportRow"];

function unavailable(row: Row) {
  if (row.group) return "属于分集组";
  if (row.editionTarget) return "已有版本整理任务";
  if (row.availability !== "present")
    return row.availability === "offline" ? "源文件离线" : "源文件不可用";
  if (row.probeStatus !== "succeeded") return "视频信息待检测";
  if (row.needsTarget) return "待设置整理目标";
  return "";
}
export function AppendEdition({
  media,
  close,
  openIntake,
  done,
}: {
  media: Media;
  close: () => void;
  openIntake: () => void;
  done: (row: Row) => void;
}) {
  const [q, search] = useState(""),
    [page, setPage] = useState(1),
    [selected, select] = useState<Schemas["ImportRow"]>(),
    [name, rename] = useState(""),
    [busy, working] = useState(false),
    [error, fail] = useState("");
  const list = useQuery({
    queryKey: ["edition-drafts", q, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/imports", {
          params: {
            query: {
              stage: "reviewed",
              status: "all",
              q: q.trim() || undefined,
              page,
              pageSize: 12,
            },
          },
        }),
      ),
  });
  async function publish() {
    if (!selected || unavailable(selected) || !name.trim() || busy) return;
    working(true);
    fail("");
    try {
      const row = await unwrap(
        api.POST("/api/imports/{id}/publish-edition", {
          params: { path: { id: selected.id } },
          body: {
            expectedRevision: selected.revision,
            mediaId: media.id,
            name: name.trim(),
          },
        }),
      );
      done(row);
    } catch (e) {
      fail((e as Error).message);
    } finally {
      working(false);
    }
  }
  const candidates =
    list.data?.items.filter((row) => !row.publishedMediaId) ?? [];
  const empty = !list.isPending && !list.isError && candidates.length === 0;
  return (
    <Modal title="追加播放版本" close={() => !busy && close()}>
      <div className="relation-picker">
        <input
          type="search"
          autoFocus
          aria-label="查找已核对文件"
          placeholder="搜索片名、编号或文件名"
          value={q}
          disabled={busy}
          onChange={(e) => {
            search(e.target.value);
            setPage(1);
          }}
        />
        <ErrorNotice error={list.error || error} />
        <div className="picker-results" aria-busy={list.isFetching}>
          {list.isPending && <p role="status">正在读取已核对文件…</p>}
          {list.isError && (
            <button type="button" onClick={() => void list.refetch()}>
              重试
            </button>
          )}
          {candidates.map((row) => {
            const reason = unavailable(row);
            return (
              <label key={row.id}>
                <input
                  type="radio"
                  name="version-file"
                  checked={selected?.id === row.id}
                  disabled={busy || !!reason}
                  onChange={() => select(row)}
                />
                <span className="picker-result-name">
                  <strong>{row.fields.title || row.relativePath}</strong>
                  <small>{row.relativePath}</small>
                </span>
                <small data-tone={reason ? "attention" : "positive"}>
                  {reason || "可发布"}
                </small>
              </label>
            );
          })}
          {empty && (
            <div className="picker-empty">
              <p>
                {q.trim()
                  ? "没有匹配的已核对文件。"
                  : list.data?.total
                    ? "当前页没有已核对的候选文件。"
                    : "没有已核对的文件。"}
              </p>
              {q.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    search("");
                    setPage(1);
                  }}
                >
                  清除搜索
                </button>
              ) : (
                <small>在录入工作台核对文件后，可以回到这里追加。</small>
              )}
            </div>
          )}
        </div>
        {candidates.length > 0 && candidates.every(unavailable) && (
          <small>当前候选文件均不可发布，请按列表中的原因处理后重试。</small>
        )}
        {list.data && list.data.total > list.data.pageSize && (
          <Pager {...list.data} onChange={setPage} />
        )}
        <label className="editor-field">
          版本名称
          <input
            placeholder="例如 4K 修复版"
            maxLength={160}
            value={name}
            disabled={busy}
            onChange={(event) => rename(event.target.value)}
          />
        </label>
        {selected && (
          <dl className="edition-destination">
            <dt>目标作品</dt>
            <dd>{media.title}</dd>
            <dt>来源文件</dt>
            <dd>{selected.relativePath}</dd>
            <dt>发布位置</dt>
            <dd>{selected.move?.directory || selected.relativePath}</dd>
          </dl>
        )}
        <footer className="edition-actions">
          <button
            type="button"
            className="editor-quiet"
            disabled={busy}
            onClick={openIntake}
          >
            录入工作台
          </button>
          <button type="button" disabled={busy} onClick={close}>
            取消
          </button>
          <button
            type="button"
            className="editor-primary"
            disabled={busy || !selected || !name.trim()}
            onClick={() => void publish()}
          >
            {busy ? "正在提交…" : "确认追加并发布"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
