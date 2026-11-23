import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import Tree from "rc-tree";
import type { DataNode } from "rc-tree/es/interface";
import { api, unwrap } from "@video-x/sdk-ts";
import { StudioIcon } from "./StudioIcon";
import { formatBytes } from "./formatBytes";
type Area = "volume" | "inbox" | "target";
interface Node extends DataNode {
  key: string;
  name: string;
  folder: boolean;
  draftId?: string;
  children?: Node[];
}
type Props = {
  area: Area;
  title: string;
  target?: string;
  inbox: string | null;
  dir: string;
  onDir: (s: string) => void;
  files: string[];
  onFile: (s: string) => void;
  single: boolean;
  close: () => void;
};
export function DirectoryTree({
  area,
  title,
  target,
  inbox,
  dir,
  onDir,
  files,
  onFile,
  single,
  close,
}: Props) {
  const dirsOnly = area !== "inbox";
  const [expanded, expand] = useState<string[]>(() => [
      "/",
      ...dir
        .split("/")
        .filter(Boolean)
        .map((_, i) =>
          dir
            .split("/")
            .slice(0, i + 1)
            .join("/"),
        ),
    ]),
    [filter, setFilter] = useState("");
  const paths = [...new Set(["", ...expanded.filter((p) => p !== "/"), dir])];
  const queries = useQueries({
    queries: paths.map((p) => ({
      queryKey: ["storage", "tree", area, target || "", inbox, p],
      queryFn: () =>
        unwrap(
          api.GET("/api/storage/browse", {
            params: { query: { area, dir: p, target } },
          }),
        ),
      staleTime: 5000,
      retry: false,
    })),
  });
  const current = queries[paths.indexOf(dir)],
    view = current?.data;
  const term = filter.trim().toLocaleLowerCase();
  function children(parent: string): Node[] {
    const res = queries[paths.indexOf(parent)]?.data;
    return (res?.entries ?? []).flatMap((e) => {
      const key = parent ? parent + "/" + e.name : e.name;
      const descendants =
        e.folder && expanded.includes(key) ? children(key) : undefined;
      if (
        term &&
        !e.name.toLocaleLowerCase().includes(term) &&
        !descendants?.length
      )
        return [];
      return [
        {
          key,
          title: e.name,
          name: e.name,
          folder: e.folder,
          draftId: e.draftId,
          isLeaf: !e.folder,
          disableCheckbox: e.folder || (!single && !!e.draftId),
          children: descendants,
        },
      ];
    });
  }
  const tree: Node[] = [
    {
      key: "/",
      title,
      name: title,
      folder: true,
      disableCheckbox: true,
      isLeaf: false,
      children: children(""),
    },
  ];
  const error = queries.find((q) => q.isError);
  function choose(n: Node) {
    if (!n.folder) {
      if (!n.draftId || single) onFile(n.key);
      return;
    }
    onDir(n.key === "/" ? "" : n.key);
    expand((old) => (old.includes(n.key) ? old : [...old, n.key]));
  }
  return (
    <div className="vx-directory">
      <div className="vx-tree-search">
        <StudioIcon name="search" />
        <input
          aria-label="筛选已展开的目录和文件"
          placeholder={dirsOnly ? "筛选已展开的目录" : "筛选文件或已展开的目录"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button
            type="button"
            aria-label="清空筛选"
            onClick={() => setFilter("")}
          >
            ×
          </button>
        )}
      </div>
      <div className="vx-tree-scroll">
        <Tree<Node>
          prefixCls="vx-tree"
          aria-label={dirsOnly ? "目录树" : "下载文件树"}
          treeData={tree}
          showIcon={false}
          virtual={false}
          selectable
          expandedKeys={expanded}
          onExpand={(keys) => expand(keys.map(String))}
          selectedKeys={[dir || "/"]}
          checkable={!dirsOnly}
          checkStrictly
          checkedKeys={files}
          onCheck={(_, info) => {
            if (!info.node.folder) onFile(info.node.key);
          }}
          onSelect={(_, info) => choose(info.node)}
          switcherIcon={(props) => (
            <span aria-hidden="true">
              {props.isLeaf ? "" : props.expanded ? "⌄" : "›"}
            </span>
          )}
          titleRender={(n) => (
            <span className="vx-node">
              <StudioIcon name={n.folder ? "folder" : "film"} />
              <span>{n.name}</span>
              {n.draftId && !single && (
                <a
                  className="vx-existing-file"
                  href={"#draft/" + n.draftId}
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                >
                  查看已有草稿 ↗
                </a>
              )}
            </span>
          )}
        />
        {queries.some((q) => q.isFetching) && <p role="status">读取目录中…</p>}
        {error && (
          <p role="alert">
            {(error.error as Error).message}{" "}
            <button type="button" onClick={() => void error.refetch()}>
              重试
            </button>
          </p>
        )}
        {!error && !!view && !tree[0]?.children?.length && (
          <p>{filter ? "已展开的目录中没有匹配项" : "当前目录没有可选项目"}</p>
        )}
      </div>
      <div className="vx-tree-foot">
        <span>{[title, dir].filter(Boolean).join(" / ")}</span>
        {area === "target" && view && (
          <small>
            已有 {view.used} 部 · 待移入 {view.pending ?? 0} 部
            {view.limit ? " · 上限 " + view.limit + " 部" : ""}
            {view.availableBytes
              ? " · 可用 " + formatBytes(Number(view.availableBytes))
              : ""}
          </small>
        )}
      </div>
    </div>
  );
}
