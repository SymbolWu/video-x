import { formatBytes } from "../../shared/formatBytes";
import { lazy, Suspense, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, ErrorNotice } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";
import "./storage.css";
const DirectoryTree = lazy(() =>
  import("./DirectoryTree").then(({ DirectoryTree }) => ({
    default: DirectoryTree,
  })),
);
type Row = Schemas["ImportRow"];
export const useStorage = () =>
  useQuery({
    queryKey: ["storage", "layout"],
    queryFn: () => unwrap(api.GET("/api/storage/browse", {})),
  });
export const moveActive = (r: Row) =>
  ["queued", "running", "cleanup"].includes(r.move?.state ?? "") &&
  !r.move?.error;
const states: Record<string, string> = {
  planned: "已设目标",
  queued: "等待移动",
  running: "移动校验中",
  cleanup: "清理源文件",
  done: "已移动",
  failed: "移动受阻",
};
export function moveDestination(m: NonNullable<Row["move"]>) {
  return m.directory.startsWith(m.target + "/")
    ? m.directory
    : m.target + " / " + m.directory;
}
export function MoveStatus({ row }: { row: Row }) {
  const m = row.move;
  if (!m) return null;
  return (
    <div className="move-status">
      <strong>{states[m.state] ?? m.state}</strong>
      <span>{moveDestination(m)}</span>
      {m.error && <span className="ig-error">{m.error}</span>}
    </div>
  );
}
type PickerProps = {
  rows?: Row[];
  bind?: Row;
  configure?: boolean;
  close: () => void;
  finished: (message: string, row?: Row) => void;
};
export function StoragePicker({
  rows,
  bind,
  configure = false,
  close,
  finished,
}: PickerProps) {
  const config = useStorage(),
    cache = useQueryClient(),
    inbox = config.data?.inbox ?? null,
    targets = config.data?.targets ?? [];
  const [initial] = useState(inbox),
    [chosen, setChosen] = useState(""),
    target = chosen || targets[0]?.key;
  const [dir, setDir] = useState(configure ? (inbox ?? "") : ""),
    [selected, setSelected] = useState<string[]>([]),
    [newFolder, setFolder] = useState(""),
    [adding, add] = useState(false),
    [busy, wait] = useState(false),
    [error, fail] = useState("");
  const area = configure ? "volume" : rows ? "target" : "inbox",
    volume = config.data?.volume ?? "",
    title = configure
      ? volume
      : rows
        ? (targets.find((t) => t.key === target)?.label ?? "整理位置")
        : (inbox?.split("/").at(-1) ?? "下载目录");
  const directory = useQuery({
    queryKey: ["storage", "target-picker", target, dir],
    enabled: !!rows && !!target,
    queryFn: () =>
      unwrap(
        api.GET("/api/storage/browse", {
          params: { query: { area: "target", target, dir } },
        }),
      ),
  });
  const counts = useQueries({
    queries: (rows ? targets : []).map((t) => ({
      queryKey: ["storage", "category-count", t.key],
      queryFn: async () =>
        (
          await unwrap(
            api.GET("/api/storage/browse", {
              params: {
                query: { area: "target", target: t.key, summaryOnly: true },
              },
            }),
          )
        ).totalVideoCount ?? null,
      staleTime: 60_000,
    })),
  });
  const folderName = newFolder.trim();
  const invalidFolder =
    adding &&
    (!folderName ||
      folderName.startsWith(".") ||
      /[/\\:\u0000-\u001f]/u.test(folderName) ||
      directory.data?.entries.some((e) => e.name === folderName));
  function navigate(path: string) {
    setDir(path);
    setFolder("");
    add(false);
  }
  function pick(file: string) {
    setSelected((old) =>
      old.includes(file)
        ? old.filter((f) => f !== file)
        : bind
          ? [file]
          : [...old, file],
    );
  }
  const ready = configure
    ? !!dir
    : rows
      ? !!(
          target &&
          rows.length &&
          directory.data &&
          !directory.error &&
          !invalidFolder
        )
      : !!selected.length;
  async function apply() {
    if (!ready || busy) return;
    wait(true);
    fail("");
    try {
      if (configure) {
        const saved = await unwrap(
          api.PUT("/api/storage/inbox", { body: { dir, expected: initial } }),
        );
        cache.setQueryData(["storage", "layout"], saved);
        await cache.invalidateQueries({ queryKey: ["storage", "tree"] });
        finished("下载目录已保存。");
        return;
      }
      if (rows) {
        await unwrap(
          api.POST("/api/imports/targets", {
            body: {
              target: target!,
              dir,
              newFolder: adding ? newFolder.trim() || undefined : undefined,
              members: rows.map(({ id, revision }) => ({ id, revision })),
            },
          }),
        );
        await cache.invalidateQueries({
          queryKey: ["storage", "target-picker"],
        });
      } else if (bind) {
        const result = await unwrap(
          api.POST("/api/imports/{id}/file", {
            params: { path: { id: bind.id } },
            body: {
              expectedRevision: bind.revision,
              expectedInbox: inbox!,
              relativePath: [inbox, selected[0]].join("/"),
            },
          }),
        );
        await cache.invalidateQueries({ queryKey: ["intake"] });
        finished("已绑定文件。", result);
        return;
      } else
        for (const file of selected) {
          await unwrap(
            api.POST("/api/imports/manual", {
              body: {
                relativePath: [inbox, file].join("/"),
                expectedInbox: inbox!,
              },
            }),
          );
          setSelected((old) => old.filter((x) => x !== file));
        }
      await cache.invalidateQueries({ queryKey: ["intake"] });
      finished(
        rows
          ? "已设置整理目标，人工核对后可移动并发布。"
          : "所选文件已加入录入队列。",
      );
    } catch (e) {
      fail((e as Error).message);
      void cache.invalidateQueries({ queryKey: ["storage"] });
      void cache.invalidateQueries({ queryKey: ["intake"] });
    } finally {
      wait(false);
    }
  }
  return (
    <Modal
      title={
        configure
          ? "选择下载目录"
          : rows
            ? "设置整理目标"
            : bind
              ? "绑定下载文件"
              : "从下载目录导入"
      }
      close={() => {
        if (!busy) close();
      }}
    >
      <fieldset className="storage-picker" disabled={busy}>
        {!rows && (
          <div className="vx-device">
            <StudioIcon name="folder" />
            <div>
              <strong>{volume || "媒体卷"}</strong>
              <small>
                {configure
                  ? "选择用来接收新影片的目录"
                  : rows
                    ? "选择分类和归档子目录"
                    : [volume, inbox].filter(Boolean).join(" / ")}
              </small>
            </div>
          </div>
        )}
        {config.data && !rows && (
          <Suspense
            fallback={
              <div className="vx-directory vx-directory-loading" role="status">
                读取目录树…
              </div>
            }
          >
            <DirectoryTree
              key={[area, target, initial].join("|")}
              area={area}
              title={title}
              inbox={inbox}
              dir={dir}
              onDir={(p) => {
                setDir(p);
                setFolder("");
              }}
              files={selected}
              onFile={pick}
              close={close}
              single={!!bind}
            />
          </Suspense>
        )}
        {rows && (
          <>
            <div className="target-columns">
              <section>
                <h3>
                  整理分类 <small>含子目录</small>
                </h3>
                <div className="target-list">
                  {targets.map((t, i) => (
                    <button
                      type="button"
                      aria-pressed={target === t.key}
                      key={t.key}
                      onClick={() => {
                        setChosen(t.key);
                        navigate("");
                      }}
                    >
                      <StudioIcon name="folder" />
                      {t.label}
                      <small>
                        {counts[i]?.data != null
                          ? counts[i].data + " 个"
                          : counts[i]?.isFetching
                            ? "统计中…"
                            : "未读取"}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3>
                  归档目录 <small>本层视频数</small>
                </h3>
                <div className="target-list">
                  {dir && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(dir.split("/").slice(0, -1).join("/"))
                      }
                    >
                      ← 上一级
                    </button>
                  )}
                  {directory.data && (
                    <>
                      <button
                        type="button"
                        aria-pressed="true"
                        onClick={() => {
                          add(false);
                          setFolder("");
                        }}
                      >
                        <StudioIcon name="folder" />
                        {dir.split("/").at(-1) || "当前分类目录"}
                        <small>{directory.data.used} 个</small>
                      </button>
                      {directory.data.entries.map((entry) => (
                        <button
                          type="button"
                          key={entry.name}
                          onClick={() =>
                            navigate(
                              [dir, entry.name].filter(Boolean).join("/"),
                            )
                          }
                        >
                          <StudioIcon name="folder" />
                          {entry.name}
                          <small>
                            {entry.videoCount == null
                              ? "未读取"
                              : entry.videoCount + " 个"}{" "}
                            ›
                          </small>
                        </button>
                      ))}
                    </>
                  )}
                  {target && directory.isPending && (
                    <p role="status">读取目录中…</p>
                  )}
                  <ErrorNotice error={directory.error} />
                </div>
                {directory.data && (
                  <button
                    className="target-new"
                    type="button"
                    onClick={() => {
                      add(!adding);
                      setFolder("");
                    }}
                  >
                    {adding ? "取消新建" : "＋ 新建子目录"}
                  </button>
                )}
                {adding && (
                  <label className="target-input">
                    子目录名称
                    <input
                      autoFocus
                      maxLength={120}
                      value={newFolder}
                      onChange={(e) => setFolder(e.target.value)}
                    />
                  </label>
                )}
                {adding && folderName && invalidFolder && (
                  <p role="alert">请输入有效且未被占用的子目录名。</p>
                )}
              </section>
            </div>
            <section className="move-preview">
              <h3>移动预览</h3>
              <p>
                {[directory.data?.volume, title, dir, adding ? folderName : ""]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              {directory.data && !invalidFolder && (
                <small>
                  目录已有 {adding ? 0 : directory.data.used} 个　·　本次移入 +
                  {rows.length}　·　本批完成后{" "}
                  {(adding ? 0 : directory.data.used) + rows.length} 个
                </small>
              )}
              <ul>
                {rows.map((r) => (
                  <li key={r.id}>
                    <StudioIcon name="film" />
                    {r.relativePath.split("/").at(-1)}
                    <small>{formatBytes(Number(r.sizeBytes))}</small>
                  </li>
                ))}
              </ul>
              {directory.data && (
                <small>
                  {!!directory.data.limit &&
                    "目录上限 " + directory.data.limit + " 个　"}
                  {directory.data.availableBytes &&
                    "磁盘可用 " +
                      formatBytes(Number(directory.data.availableBytes))}
                </small>
              )}
            </section>
          </>
        )}
        {area === "inbox" && selected.length > 0 && (
          <div className="vx-picked">
            {selected.map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => pick(f)}
                aria-label={"移除 " + f}
              >
                {f}
                <span>×</span>
              </button>
            ))}
          </div>
        )}
        <ErrorNotice error={error || config.error} />
        <div className="vx-picker-actions">
          <span>
            {configure
              ? dir || "选择一个文件夹"
              : rows
                ? rows.length +
                  " 个文件 · " +
                  [title, dir, adding ? newFolder : ""]
                    .filter(Boolean)
                    .join(" / ")
                : "已选 " + selected.length + " 个文件"}
          </span>
          <button type="button" onClick={close}>
            取消
          </button>
          <button
            type="button"
            className="primary"
            disabled={!ready || busy}
            onClick={() => void apply()}
          >
            {busy
              ? "处理中…"
              : configure
                ? "保存下载目录"
                : rows
                  ? "应用整理目标"
                  : bind
                    ? "绑定文件"
                    : "加入录入队列"}
          </button>
        </div>
      </fieldset>
    </Modal>
  );
}
