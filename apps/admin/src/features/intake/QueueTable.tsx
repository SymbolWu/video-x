import { Fragment, useState, type Dispatch, type SetStateAction } from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select } from "@video-x/ui";
import { IntakeCover } from "./ReviewCard";
import { MoveStatus, moveActive } from "../storage/StoragePicker";
import {
  DraftCoverage,
  FieldPreview,
  lookupLabel,
  fetching,
} from "./SourceReview";
import { issue, poster, type Row, type Perform } from "./queueModel";
type TableProps = {
  hasInbox: boolean;
  data?: Schemas["ImportQueue"];
  status: string;
  q: string;
  count: number;
  categories: Schemas["Category"][];
  busy: boolean;
  selection: Row[];
  select: Dispatch<SetStateAction<Row[]>>;
  selectGroup: (id: string) => Promise<void>;
  adjust: (id: string) => Promise<void>;
  ungroup: (id: string) => void;
  toMedia: (id: string) => void;
  open: (r: Row, k: "edit" | "review" | "publish") => void;
  perform: Perform;
  bindRow: (r: Row) => void;
  showLookup: (id: string) => void;
  setPicker: (r: Row[]) => void;
  updateCategory: (r: Row, id: string) => Promise<void>;
};
export function QueueTable({
  hasInbox,
  data,
  status,
  q,
  count,
  categories,
  busy,
  selection,
  select,
  selectGroup,
  adjust,
  ungroup,
  toMedia,
  open,
  perform,
  bindRow,
  showLookup,
  setPicker,
  updateCategory,
}: TableProps) {
  const selectable = (data?.items ?? []).filter((r) => !r.publishedMediaId);
  const [hiddenGroups, hideGroups] = useState<string[]>([]);
  const [expanded, expand] = useState<string[]>([]),
    [previewAll, setPreviewAll] = useState(false);
  const ordered: { r: Row; groupHeader: boolean }[] = [];
  const grouped = new Set<string>();
  for (const r of data?.items ?? []) {
    if (!r.group) {
      ordered.push({ r, groupHeader: false });
      continue;
    }
    const id = r.group.id;
    if (grouped.has(id)) continue;
    grouped.add(id);
    const members = data!.items
      .filter((x) => x.group?.id === id)
      .sort((a, b) => a.group!.position - b.group!.position);
    members.forEach((member, i) =>
      ordered.push({ r: member, groupHeader: i === 0 }),
    );
  }
  return (
    <>
      {" "}
      <div className="ig-table-scroll">
        <table className="ig-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="选择当前页可操作草稿"
                  checked={
                    !!selectable.length &&
                    selectable.every((r) =>
                      selection.some((x) => x.id === r.id),
                    )
                  }
                  disabled={!selectable.length || busy}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    select((old) => [
                      ...old.filter(
                        (x) => !selectable.some((y) => y.id === x.id),
                      ),
                      ...(checked ? selectable : []),
                    ]);
                  }}
                />
              </th>
              {[
                "封面 / 作品 / 文件",
                "当前草稿",
                "资料核对",
                "状态 / 整理目标",
                "草稿操作",
              ].map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data?.items.length && (
              <tr>
                <td colSpan={6} className="ig-empty">
                  {!data
                    ? "正在读取录入队列…"
                    : data.scanning
                      ? "正在读取文件…"
                      : status === "all" && !q
                        ? "暂无录入记录。从下载目录选择 MP4 或 MKV 文件。"
                        : "没有符合条件的草稿，可以切回全部或清空搜索。"}
                </td>
              </tr>
            )}
            {ordered.map(({ r, groupHeader }) => {
              const chosen = selection.some((x) => x.id === r.id),
                peek = previewAll !== expanded.includes(r.id);
              const problem = issue(r),
                g = r.group,
                published = !!r.publishedMediaId;
              const edit = () =>
                published ? toMedia(r.publishedMediaId!) : open(r, "edit");
              return (
                <Fragment key={r.id}>
                  {groupHeader && g && (
                    <tr className="ig-group">
                      <td />
                      <td colSpan={3}>
                        <div className="ig-group-line">
                          <button
                            className="ig-group-toggle"
                            aria-label={
                              (hiddenGroups.includes(g.id) ? "展开" : "收起") +
                              g.title
                            }
                            aria-expanded={!hiddenGroups.includes(g.id)}
                            onClick={() =>
                              hideGroups((prev) =>
                                prev.includes(g.id)
                                  ? prev.filter((x) => x !== g.id)
                                  : [...prev, g.id],
                              )
                            }
                          >
                            {hiddenGroups.includes(g.id) ? "▸" : "▾"}
                          </button>
                          <div>
                            <strong>{g.title}</strong>{" "}
                            <span className="ig-pill purple">分集容器</span>
                            <div className="ig-sub">选择分集播放</div>
                          </div>
                        </div>
                      </td>
                      <td colSpan={2}>
                        {!published && (
                          <div className="ig-row-actions">
                            <button
                              className="btn ghost small"
                              disabled={busy}
                              onClick={() => void selectGroup(g.id)}
                            >
                              选择整组
                            </button>
                            <button
                              className="btn ghost small"
                              disabled={busy}
                              onClick={() => void adjust(g.id)}
                            >
                              调整分集
                            </button>
                            <button
                              disabled={busy}
                              className="btn ghost small"
                              onClick={() => ungroup(g.id)}
                            >
                              解除分组
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {(!g || !hiddenGroups.includes(g.id)) && (
                    <>
                      <tr
                        className={[
                          chosen ? "ig-selected" : "",
                          g ? "ig-child" : "",
                        ].join(" ")}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={"选择" + r.fields.title}
                            checked={chosen}
                            disabled={published || busy}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              select((old) =>
                                checked
                                  ? [...old.filter((x) => x.id !== r.id), r]
                                  : old.filter((x) => x.id !== r.id),
                              );
                            }}
                          />
                        </td>
                        <td>
                          <div className="ig-identity">
                            <IntakeCover row={r} />
                            <div>
                              <button
                                type="button"
                                className="ig-title"
                                onClick={edit}
                              >
                                {r.fields.title}
                              </button>
                              {g && (
                                <div className="ig-sub">
                                  <span className="ig-pill purple">
                                    第 {g.position} 集
                                  </span>
                                </div>
                              )}
                              {r.fields.identifier && (
                                <div className="ig-sub">
                                  {r.fields.identifier}
                                </div>
                              )}
                              <div className="ig-file" title={r.relativePath}>
                                {r.relativePath.split("/").at(-1) ||
                                  "待绑定文件"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="draft-glance">
                          <Select
                            label={r.fields.title + "的分类"}
                            value={r.fields.categoryId}
                            disabled={published || busy}
                            options={categories.map((c) => ({
                              value: c.id,
                              label: c.name,
                            }))}
                            onValueChange={(id) => void updateCategory(r, id)}
                          />
                          <small>
                            {r.fields.releaseDate ||
                              r.fields.releaseYear ||
                              "日期未填"}
                          </small>
                          <small>
                            {[
                              ...r.actors,
                              ...(r.fields.sourceNames?.actors ?? []),
                            ].join("、") || "演员未填"}
                          </small>
                        </td>
                        <td className="queue-coverage">
                          <small>{lookupLabel(r.lookup)}</small>
                          <DraftCoverage row={r} />
                          {!published && (
                            <button
                              className="cell-action"
                              onClick={() => showLookup(r.id)}
                            >
                              {r.lookup?.candidate
                                ? "核对字段"
                                : r.lookup?.state === "choices"
                                  ? "选择匹配影片"
                                  : r.lookup?.state === "failed"
                                    ? "查看失败原因"
                                    : fetching(r.lookup)
                                      ? "查看抓取进度"
                                      : "抓取资料"}
                            </button>
                          )}
                        </td>
                        <td className="queue-destination">
                          <strong
                            className={
                              published || r.reviewed ? "good" : "warn"
                            }
                          >
                            {published
                              ? "已发布"
                              : r.reviewed
                                ? "已确认"
                                : "待核对"}
                          </strong>
                          <MoveStatus row={r} />
                          {problem && !published && (
                            <small className="warn">{problem}</small>
                          )}
                          {!r.move && !problem && <small>原文件位置</small>}
                          <div className="file-actions">
                            {" "}
                            {hasInbox &&
                              !published &&
                              r.availability === "present" &&
                              !moveActive(r) && (
                                <button
                                  className="btn ghost small"
                                  onClick={() => setPicker([r])}
                                >
                                  {r.move ? "更改目标" : "设整理目标"}
                                </button>
                              )}
                            {r.move?.error && (
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() =>
                                  void perform(
                                    () =>
                                      unwrap(
                                        api.POST("/api/imports/{id}/publish", {
                                          params: { path: { id: r.id } },
                                          body: {
                                            expectedRevision: r.revision,
                                          },
                                        }),
                                      ),
                                    "已提交重试。",
                                  )
                                }
                              >
                                重试整理
                              </button>
                            )}
                            {r.probeStatus === "failed" && (
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() =>
                                  void perform(
                                    () =>
                                      unwrap(
                                        api.POST("/api/imports/manual", {
                                          body: {
                                            relativePath: r.relativePath,
                                          },
                                        }),
                                      ),
                                    "已重新检查文件，请核对探测结果。",
                                  )
                                }
                              >
                                重试探测
                              </button>
                            )}
                            {!published && r.availability === "unbound" && (
                              <button
                                className="cell-action"
                                onClick={() => bindRow(r)}
                              >
                                绑定文件
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="ig-row-actions">
                          <button
                            className="btn ghost small"
                            aria-expanded={peek}
                            onClick={() =>
                              expand((old) =>
                                old.includes(r.id)
                                  ? old.filter((x) => x !== r.id)
                                  : [...old, r.id],
                              )
                            }
                          >
                            {peek ? "收起预览" : "行内预览"}
                          </button>
                          {published ? (
                            <button className="btn ghost small" onClick={edit}>
                              打开作品
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn ghost small"
                                disabled={!!problem || busy}
                                onClick={() =>
                                  open(r, r.reviewed ? "publish" : "review")
                                }
                              >
                                {r.reviewed
                                  ? g
                                    ? "发布整个容器"
                                    : "手动发布"
                                  : "核对确认"}
                              </button>
                              <button
                                className="btn ghost small"
                                disabled={busy}
                                onClick={() => open(r, "edit")}
                              >
                                完整编辑
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {peek && (
                        <tr className="ig-detail">
                          <td colSpan={6}>
                            <div className="ig-preview">
                              <img
                                src={poster(r)}
                                alt={r.fields.title + "封面"}
                              />
                              <div>
                                <FieldPreview row={r} />
                                <div className="ig-meta">
                                  <span>
                                    演员：
                                    {[
                                      ...r.actors,
                                      ...(r.fields.sourceNames?.actors ?? []),
                                    ].join("、") || "未填写"}
                                  </span>
                                  <span>分类：{r.categoryName}</span>
                                  <span>
                                    系列：
                                    {[
                                      ...r.series,
                                      ...(r.fields.sourceNames?.series ?? []),
                                    ].join("、") || "未关联"}
                                  </span>
                                </div>
                                <p className="ig-muted">
                                  {[
                                    r.relativePath,
                                    r.format?.toUpperCase(),
                                    r.videoCodec,
                                    r.availability === "unbound"
                                      ? "待绑定文件"
                                      : (Number(r.sizeBytes) / 1048576).toFixed(
                                          1,
                                        ) + " MiB",
                                    r.durationMs != null
                                      ? (r.durationMs / 1000).toFixed(1) + " 秒"
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {r.fields.notes && <p>{r.fields.notes}</p>}
                                {problem && (
                                  <p className="ig-error">{problem}</p>
                                )}
                              </div>
                              <button
                                className="btn ghost small"
                                onClick={edit}
                              >
                                {published ? "打开作品" : "完整编辑"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ig-bottom">
        <span>
          {data?.total ?? 0} 条符合条件 · {count} 条草稿
        </span>
        <button
          className="btn ghost small"
          onClick={() => {
            setPreviewAll(!previewAll);
            expand([]);
          }}
        >
          {previewAll ? "收起所有行内预览" : "展开所有行内预览"}
        </button>
      </div>
    </>
  );
}
