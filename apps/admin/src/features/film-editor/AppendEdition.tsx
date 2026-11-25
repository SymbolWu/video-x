import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, Pager, ErrorNotice } from "@video-x/ui";
type Media = Schemas["MediaDetail"];
export function AppendEdition({
  media,
  close,
  done,
}: {
  media: Media;
  close: () => void;
  done: (row: Schemas["ImportRow"]) => void;
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
    if (!selected || !name.trim() || busy) return;
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
  return (
    <Modal title="追加播放版本" close={() => !busy && close()}>
      <div className="relation-picker">
        <p>选取录入工作台已核对的文件，发布到《{media.title}》。</p>
        <label>
          版本名称
          <input
            placeholder="例如 4K 修复版"
            maxLength={160}
            value={name}
            onChange={(e) => rename(e.target.value)}
          />
        </label>
        <input
          type="search"
          aria-label="查找已核对文件"
          placeholder="搜索片名、编号或文件名"
          value={q}
          onChange={(e) => {
            search(e.target.value);
            setPage(1);
          }}
        />
        <ErrorNotice error={list.error || error} />
        <div className="picker-results">
          {list.isPending && <p role="status">正在读取已核对文件…</p>}
          {list.data?.items
            .filter((r) => !r.publishedMediaId)
            .map((r) => (
              <label key={r.id}>
                <input
                  type="radio"
                  name="version-file"
                  checked={selected?.id === r.id}
                  disabled={
                    !!r.group ||
                    !!r.editionTarget ||
                    r.needsTarget ||
                    r.availability !== "present" ||
                    r.probeStatus !== "succeeded"
                  }
                  onChange={() => select(r)}
                />
                <span>
                  <strong>{r.fields.title}</strong>
                  <small>{r.relativePath}</small>
                  {r.group && <small>属于分集组</small>}
                  {r.needsTarget && <small>待设置整理目标</small>}
                </span>
              </label>
            ))}
        </div>
        {list.data && !list.data.total && (
          <p>
            {q.trim()
              ? "没有匹配的已核对文件。"
              : "没有已核对的文件。请先从下载目录导入文件、设置整理目标并核对。"}
          </p>
        )}
        {list.data && list.data.total > list.data.pageSize && (
          <Pager {...list.data} onChange={setPage} />
        )}
        {selected && (
          <dl className="edition-destination">
            <dt>来源文件</dt>
            <dd>{selected.relativePath}</dd>
            <dt>发布位置</dt>
            <dd>{selected.move?.directory || selected.relativePath}</dd>
          </dl>
        )}
        <footer>
          <a href="#ingest">录入工作台</a>
          <button disabled={busy} onClick={close}>
            取消
          </button>
          <button
            className="primary"
            disabled={busy || !selected || !name.trim()}
            onClick={() => void publish()}
          >
            确认追加并发布
          </button>
        </footer>
      </div>
    </Modal>
  );
}
