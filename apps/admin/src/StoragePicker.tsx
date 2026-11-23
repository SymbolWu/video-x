import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, Select, ErrorNotice } from "@video-x/ui";
import { StudioIcon } from "./StudioIcon";
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
      ? !!(target && rows.length)
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
          {rows && (
            <Select
              label="目标分类"
              value={target ?? ""}
              options={targets.map((t) => ({ label: t.label, value: t.key }))}
              onValueChange={(k) => {
                setChosen(k);
                setDir("");
                setFolder("");
                add(false);
              }}
            />
          )}
        </div>
        {config.data && (
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
              target={rows ? target : undefined}
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
          <div className="vx-tree-extra">
            {adding ? (
              <label>
                新建子目录
                <input
                  aria-label="子目录名"
                  placeholder="输入子目录名称"
                  value={newFolder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </label>
            ) : (
              <button type="button" onClick={() => add(true)}>
                ＋ 新建子目录
              </button>
            )}
          </div>
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
