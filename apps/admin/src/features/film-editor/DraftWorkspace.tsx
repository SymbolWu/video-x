import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal } from "@video-x/ui";
import { BindForm, SourceReview, fetching } from "../intake/SourceReview";
import {
  Frame,
  commonTabs,
  useLeaveGuard,
  checkFields,
  type FieldIssue,
  type SaveStatus,
  type Tab,
  type Fields,
} from "./FilmWorkspace";
import { CommonFields } from "./CommonFields";
type Row = Schemas["ImportRow"];
const tabs: Tab[] = [...commonTabs, "版本与文件", "来源核对"];
export function DraftWorkspace({
  row,
  categories,
  back,
}: {
  row: Row;
  categories: Schemas["Category"][];
  back: () => void;
}) {
  const cache = useQueryClient();
  const [baseline, setBaseline] = useState(row),
    [d, set] = useState<Fields>(row.fields),
    [section, tab] = useState<Tab>("基本资料"),
    [busy, working] = useState(false),
    [uploading, setUploading] = useState(false),
    [saved, didSave] = useState(false),
    [issue, setIssue] = useState<FieldIssue | null>(null),
    [error, fail] = useState(""),
    [review, askReview] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(baseline.fields);
  const locked = busy || uploading;
  const canLeave = useLeaveGuard(dirty || locked, locked);
  function adopt(r: Row) {
    setBaseline(r);
    set(r.fields);
    cache.setQueryData(["intake", "draft", r.id], r);
  }
  useEffect(() => {
    if (!dirty && !locked && row.revision > baseline.revision) {
      setBaseline(row);
      set(row.fields);
    }
  }, [row, baseline.revision, dirty, locked]);
  const items = Object.fromEntries(
    [
      [baseline.fields.actorIds, baseline.actors],
      [baseline.fields.directorIds ?? [], baseline.directors ?? []],
      [baseline.fields.franchiseIds, baseline.series],
    ].flatMap(([ids, labels]) =>
      (ids ?? []).map((id, i) => [id, { id, name: labels?.[i] ?? "" }]),
    ),
  );
  function validate() {
    const invalid = checkFields(d);
    if (invalid) {
      tab("基本资料");
      setIssue(invalid);
      return false;
    }
    setIssue(null);
    return true;
  }
  async function save(confirmReview = false) {
    if (locked || !validate()) return;
    working(true);
    fail("");
    try {
      const params = { path: { id: row.id } };
      let current = baseline;
      if (dirty) {
        current = await unwrap(
          api.PUT("/api/imports/{id}", {
            params,
            body: { fields: d, expectedRevision: baseline.revision },
          }),
        );
        adopt(current);
      }
      if (confirmReview) {
        current = await unwrap(
          api.POST("/api/imports/{id}/review", {
            params,
            body: { expectedRevision: current.revision },
          }),
        );
        adopt(current);
        askReview(false);
      }
      didSave(true);
      void cache.invalidateQueries({ queryKey: ["intake"] });
    } catch (e) {
      fail((e as Error).message);
      askReview(false);
    } finally {
      working(false);
    }
  }
  function leave() {
    if (canLeave()) back();
  }
  const saveButton = (
    <button
      disabled={locked || !!baseline.publishedMediaId}
      className="editor-quiet"
      data-action="wb-save"
      onClick={() => void save()}
    >
      {busy ? "保存中…" : "保存草稿"}
    </button>
  );
  const status: SaveStatus = busy
    ? { text: "正在保存草稿…" }
    : uploading
      ? { text: "正在上传图片…" }
      : error
        ? { text: "操作未完成，修改已保留", tone: "attention" }
        : issue
          ? { text: "请补齐必填项", tone: "attention" }
          : dirty
            ? { text: "有未保存修改", tone: "attention" }
            : baseline.reviewed
              ? { text: "已人工确认", tone: "positive" }
              : {
                  text: saved ? "已保存草稿" : "暂无未保存修改",
                  tone: saved ? "positive" : undefined,
                };
  return (
    <Frame
      tabs={tabs}
      tab={section}
      select={tab}
      title={d.title || "未命名草稿"}
      backLabel="返回录入队列"
      back={leave}
      identifier={d.identifier}
      poster={d.posterId || d.backdropId}
      meta="入库草稿"
      status={status}
      issue={issue}
      locked={locked}
      error={error}
      actions={
        <>
          {saveButton}
          <button
            className="editor-primary"
            disabled={
              locked ||
              !!row.publishedMediaId ||
              (!dirty && baseline.reviewed) ||
              fetching(row.lookup) ||
              row.probeStatus !== "succeeded" ||
              row.availability !== "present"
            }
            onClick={() => {
              if (validate()) askReview(true);
            }}
          >
            核对并确认
          </button>
        </>
      }
    >
      <CommonFields
        tab={section}
        d={d}
        patch={(p) => {
          fail("");
          didSave(false);
          setIssue((previous) =>
            previous && previous.field in p ? null : previous,
          );
          set((old) => ({ ...old, ...p }));
        }}
        categories={categories}
        initialItems={items}
        issue={issue}
        onUploading={setUploading}
        legacyYear={
          !baseline.fields.releaseDate ? baseline.fields.releaseYear : null
        }
      />
      {section === "版本与文件" && (
        <>
          {row.availability === "unbound" ? (
            <>
              <p className="wb-help">
                草稿已独立保存。绑定视频后即可核对播放文件。
              </p>
              <BindForm row={row} changed={adopt} locked={dirty} />
            </>
          ) : (
            <div className="wb-file">
              <strong>{row.relativePath.split("/").at(-1)}</strong>
              <code>{row.relativePath}</code>
              <p>
                {[
                  row.format?.toUpperCase(),
                  row.videoCodec,
                  (Number(row.sizeBytes) / 1048576).toFixed(1) + " MiB",
                  row.durationMs == null
                    ? null
                    : (row.durationMs / 1000).toFixed(1) + " 秒",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <span className="badge">
                {row.availability === "present" ? "文件在线" : "文件离线"}
              </span>
            </div>
          )}
        </>
      )}
      {section === "来源核对" && (
        <SourceReview row={baseline} changed={adopt} locked={dirty || busy} />
      )}
      {review && (
        <Modal title="核对当前草稿" close={() => !busy && askReview(false)}>
          <div className="ig-review-list">
            <article>
              <div>
                <h3>{d.title}</h3>
                <p>{d.summary || "暂无简介"}</p>
                <p>{row.relativePath}</p>
              </div>
            </article>
          </div>
          <div className="actions">
            <button
              className="btn ghost small"
              onClick={() => askReview(false)}
              disabled={busy}
            >
              返回编辑
            </button>
            <button
              className="btn primary small"
              onClick={() => void save(true)}
              disabled={busy}
            >
              确认这份资料
            </button>
          </div>
        </Modal>
      )}
    </Frame>
  );
}
