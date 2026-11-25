import { BindForm, QueueSource, LookupForm, fetching } from "./SourceReview";
import {
  StoragePicker,
  moveActive,
  useStorage,
} from "../storage/StoragePicker";
import { openDraft, returnFromDraft } from "../../app/AdminRoute";
import { DraftWorkspace } from "../film-editor/DraftWorkspace";
import { StudioIcon } from "../../shared/StudioIcon";
import { ReviewCard } from "./ReviewCard";
import { issue, type Row } from "./queueModel";
import { EpisodeGroupDialog } from "./EpisodeGroupDialog";
import { ReviewPublishDialog } from "./ReviewPublishDialog";
import { QueueTable } from "./QueueTable";
import { useIntakeQueue, tabs, stageTabs } from "./useIntakeQueue";
import "./intake-theme.css";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, Modal, ErrorNotice, Pager } from "@video-x/ui";
export function Intake({
  categories,
  toMedia,
  returnToEdition,
}: {
  categories: Schemas["Category"][];
  toMedia: (id: string) => void;
  returnToEdition?: () => void;
}) {
  const cache = useQueryClient(),
    [status, filter] = useState<keyof typeof tabs>("all"),
    [stage, setStage] = useState<keyof typeof stageTabs>("all"),
    [page, setPage] = useState(1),
    [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{
      row: Row;
      kind: "edit" | "review" | "publish";
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const readEditor = () =>
    location.hash.match(/^#draft\/([0-9a-f-]{36})$/i)?.[1] ?? "";
  const [editorId, setEditorId] = useState(readEditor);
  useEffect(() => {
    const update = () => setEditorId(readEditor());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const editor = useQuery({
    queryKey: ["intake", "draft", editorId],
    enabled: !!editorId,
    refetchInterval: (q) => (fetching(q.state.data?.lookup) ? 900 : false),
    queryFn: () =>
      unwrap(
        api.GET("/api/imports/{id}", { params: { path: { id: editorId } } }),
      ),
  });

  const storage = useStorage();
  const [picker, setPicker] = useState<"inbox" | Row[] | null>(null);

  const [organizeRows, setOrganizeRows] = useState<Row[] | null>(null),
    [bulkCategory, setBulkCategory] = useState("");
  const [binding, bindRow] = useState<Row | null>(null),
    [lookupId, showLookup] = useState(""),
    [batchLookup, setBatchLookup] = useState<Row[] | null>(null);
  const [selection, select] = useState<Row[]>([]);
  const [group, setGroup] = useState<Row[] | null>(null);
  const [batch, setBatch] = useState<"review" | "publish" | null>(null);
  const [batchRows, setBatchRows] = useState<Row[]>([]);
  const { counts, queue, data } = useIntakeQueue(page, stage, status, q);
  const selectable = (data?.items ?? []).filter((r) => !r.publishedMediaId);
  useEffect(() => {
    if (!data) return;
    const visible = new Map(data.items.map((r) => [r.id, r]));
    select((old) =>
      old.map((r) => visible.get(r.id) ?? r).filter((r) => !r.publishedMediaId),
    );
  }, [data]);
  function open(row: Row, kind: "edit" | "review" | "publish") {
    setError("");
    setNotice("");
    if (kind === "edit") {
      openDraft(row.id);
      setDialog(null);
    } else if (kind === "publish") {
      void preparePublish([row]);
    } else setDialog({ row, kind });
  }
  async function perform(call: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await call();
      setDialog(null);
      setNotice(message);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["intake"] }),
        cache.invalidateQueries({ queryKey: ["list"] }),
      ]);
    } catch (err) {
      setError((err as Error).message);
      void queue.refetch();
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy) {
      setDialog(null);
      setError("");
    }
  };
  async function selectGroup(id: string) {
    try {
      const { items } = await unwrap(
        api.GET("/api/imports", {
          params: { query: { groupId: id, pageSize: 100 } },
        }),
      );
      select((prev) => [
        ...prev.filter((x) => x.group?.id !== id),
        ...items
          .filter((x) => !x.publishedMediaId)
          .sort((a, b) => a.group!.position - b.group!.position),
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function groupMembers(id: string) {
    const { items } = await unwrap(
      api.GET("/api/imports", {
        params: { query: { groupId: id, pageSize: 100 } },
      }),
    );
    return items.sort((a, b) => a.group!.position - b.group!.position);
  }
  async function adjust(id: string) {
    try {
      const items = await groupMembers(id),
        first = items[0];
      if (!first?.group) return;
      setError("");
      setGroup(items);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function preparePublish(rows: Row[]) {
    setBusy(true);
    setError("");
    try {
      const ids = [
        ...new Set(rows.flatMap((r) => (r.group ? [r.group.id] : []))),
      ];
      const groups = await Promise.all(ids.map(groupMembers));
      setBatchRows([
        ...rows.filter((r) => !r.group),
        ...groups.flat().filter((r) => !r.publishedMediaId),
      ]);
      setBatch("publish");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function ungroup(id: string) {
    if (window.confirm("解除整个未发布的分集容器？各集草稿和文件将保留。"))
      void perform(async () => {
        await unwrap(
          api.DELETE("/api/imports/groups/{id}", { params: { path: { id } } }),
        );
        select((old) => old.filter((x) => x.group?.id !== id));
      }, "已解除容器。");
  }
  async function updateCategory(r: Row, categoryId: string) {
    if (categoryId === r.fields.categoryId) return;
    await perform(async () => {
      const params = { path: { id: r.id } };
      await unwrap(
        api.PUT("/api/imports/{id}", {
          params,
          body: {
            expectedRevision: r.revision,
            fields: { ...r.fields, categoryId },
          },
        }),
      );
      const updated = await unwrap(api.GET("/api/imports/{id}", { params }));
      select((old) => old.map((x) => (x.id === r.id ? updated : x)));
    }, "已更新分类，当前版本待核对。");
  }
  if (editorId) {
    if (editor.isError)
      return (
        <>
          <ErrorNotice error={editor.error} />
          <button type="button" className="btn ghost" onClick={returnFromDraft}>
            返回录入队列
          </button>
        </>
      );
    return editor.data ? (
      <DraftWorkspace
        key={editorId}
        row={editor.data}
        categories={categories}
        back={returnFromDraft}
      />
    ) : (
      <p role="status">正在读取草稿…</p>
    );
  }
  return (
    <section className="ig-page">
      {returnToEdition && (
        <button
          type="button"
          className="btn ghost small"
          onClick={returnToEdition}
        >
          ← 返回版本与文件
        </button>
      )}
      <header className="queue-heading">
        <h1>录入工作台</h1>
        {storage.data?.inbox ? (
          <button className="btn primary" onClick={() => setPicker("inbox")}>
            <StudioIcon name="folder" />从{" "}
            {storage.data.inbox.split("/").at(-1)} 选择文件
          </button>
        ) : (
          <a className="btn primary" href="#settings">
            设置下载目录
          </a>
        )}
      </header>
      {storage.data?.inbox && (
        <p className="inbox-location">
          <StudioIcon name="folder" />
          {storage.data.volume} / {storage.data.inbox}
        </p>
      )}
      <div className="queue-toolbar">
        <nav aria-label="录入队列状态">
          {(Object.keys(stageTabs) as (keyof typeof stageTabs)[]).map((k) => (
            <button
              key={k}
              aria-pressed={stage === k}
              onClick={() => {
                setStage(k);
                setPage(1);
              }}
            >
              {stageTabs[k]} <small>{counts.data?.[k] ?? "—"}</small>
            </button>
          ))}
        </nav>
        <Select
          label="更多状态"
          value={status}
          onValueChange={(v) => {
            filter(v as keyof typeof tabs);
            setPage(1);
          }}
          options={[
            { value: "all", label: "更多状态" },
            ...Object.entries(tabs)
              .filter(([k]) => !(k in stageTabs))
              .map(([value, label]) => ({ value, label })),
          ]}
        />
        <form
          id="ig-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(String(new FormData(e.currentTarget).get("q") ?? "").trim());
            setPage(1);
          }}
        >
          <button className="icon-btn" aria-label="执行录入搜索">
            <StudioIcon name="search" />
          </button>
          <input
            aria-label="搜索录入队列"
            name="q"
            type="search"
            maxLength={200}
            placeholder="搜索影片、演员或文件"
            title="支持片名、主编号、演员、导演和文件路径"
          />
        </form>
      </div>
      <div className="queue-batch" role="group" aria-label="批量操作">
        <div>
          <strong>
            {selection.length ? "已选 " + selection.length + " 项" : "选择文件"}
          </strong>
          {selection.some((r) => !selectable.some((x) => x.id === r.id)) && (
            <small>含其他页草稿</small>
          )}
          <button
            disabled={!selection.length || busy}
            onClick={() => select([])}
          >
            取消选择
          </button>
        </div>
        <div role="group" aria-label="文件整理">
          <button
            disabled={
              !storage.data?.inbox ||
              !selection.length ||
              busy ||
              selection.some(
                (r) => r.availability !== "present" || moveActive(r),
              )
            }
            onClick={() => setPicker([...selection])}
          >
            <StudioIcon name="folder" />
            设置整理目标
          </button>
          <button
            className="btn ghost small"
            data-action="ig-group-new"
            disabled={
              selection.some((r) => r.availability === "unbound") ||
              selection.length < 2 ||
              selection.some((r) => r.group) ||
              busy
            }
            onClick={() => {
              setError("");
              setGroup([...selection]);
            }}
          >
            创建分集容器
          </button>
        </div>
        <div role="group" aria-label="资料补充">
          <button
            disabled={busy || !selection.length}
            onClick={() => {
              setBulkCategory(selection[0]!.fields.categoryId);
              setOrganizeRows([...selection]);
              setError("");
            }}
          >
            设置主分类
          </button>
          <button
            disabled={
              !selection.length ||
              busy ||
              selection.some((r) => fetching(r.lookup))
            }
            onClick={() => setBatchLookup([...selection])}
          >
            抓取所选
          </button>
        </div>
        <div role="group" aria-label="核对与发布">
          {" "}
          <button
            disabled={
              busy ||
              !selection.length ||
              selection.every((r) => r.reviewed) ||
              selection.some((r) => issue(r))
            }
            className="btn ghost small"
            data-action="ig-review-selected"
            onClick={() => {
              setBatchRows(selection);
              setBatch("review");
            }}
          >
            批量核对
          </button>
          <button
            disabled={
              busy ||
              !selection.length ||
              selection.some((r) => !r.reviewed || issue(r))
            }
            className="btn ghost small"
            data-action="ig-publish"
            onClick={() => void preparePublish(selection)}
          >
            {selection.some((r) => r.move) ? "移动并发布" : "发布所选"}
          </button>
        </div>
      </div>
      {group && (
        <EpisodeGroupDialog
          initial={group}
          busy={busy}
          error={error}
          perform={perform}
          saved={() => select([])}
          close={() => setGroup(null)}
        />
      )}
      {organizeRows && (
        <Modal
          title={"整理所选 " + organizeRows.length + " 条草稿"}
          close={() => !busy && setOrganizeRows(null)}
        >
          <div className="intake-form">
            <p className="ig-dialog-intro">
              修改主分类后，涉及的草稿需要重新核对。
            </p>
            <label>
              将所选草稿归入
              <Select
                label="批量设置分类"
                value={bulkCategory}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                onValueChange={setBulkCategory}
              />
            </label>
            <ErrorNotice error={error} />
            <div className="actions">
              <button
                className="btn ghost small"
                onClick={() => setOrganizeRows(null)}
                disabled={busy}
              >
                取消
              </button>
              <button
                className="btn primary small"
                disabled={busy || !bulkCategory}
                onClick={() =>
                  void perform(async () => {
                    for (const r of organizeRows) {
                      if (r.fields.categoryId !== bulkCategory) {
                        const next = await unwrap(
                          api.PUT("/api/imports/{id}", {
                            params: { path: { id: r.id } },
                            body: {
                              expectedRevision: r.revision,
                              fields: { ...r.fields, categoryId: bulkCategory },
                            },
                          }),
                        );
                        select((old) =>
                          old.map((x) => (x.id === r.id ? next : x)),
                        );
                      }
                      setOrganizeRows(
                        (old) => old?.filter((x) => x.id !== r.id) ?? null,
                      );
                    }
                    setOrganizeRows(null);
                  }, "已更新所选草稿的分类。")
                }
              >
                应用分类
              </button>
            </div>
          </div>
        </Modal>
      )}
      {binding && (
        <Modal
          title={"绑定文件 · " + binding.fields.title}
          close={() => bindRow(null)}
        >
          <div className="intake-form">
            <BindForm row={binding} changed={() => bindRow(null)} />
          </div>
        </Modal>
      )}

      {batchLookup && (
        <Modal
          title={"抓取所选 " + batchLookup.length + " 条草稿"}
          close={() => setBatchLookup(null)}
        >
          <div className="intake-form">
            <LookupForm
              rows={batchLookup}
              finish={() => setBatchLookup(null)}
            />
          </div>
        </Modal>
      )}
      {picker && (
        <StoragePicker
          rows={picker === "inbox" ? undefined : picker}
          close={() => setPicker(null)}
          finished={(message) => {
            setPicker(null);
            setNotice(message);
            setError("");
            if (picker === "inbox") {
              filter("all");
              setStage("all");
              setQ("");
              setPage(1);
            }
          }}
        />
      )}
      {batch && (
        <ReviewPublishDialog
          batch={batch}
          batchRows={batchRows}
          setBatchRows={setBatchRows}
          select={select}
          busy={busy}
          error={error}
          perform={perform}
          close={() => setBatch(null)}
          edit={(r) => open(r, "edit")}
          showLookup={showLookup}
        />
      )}
      {data &&
        ["offline", "identity_mismatch"].includes(data.rootStatus) &&
        !data.scanning && (
          <p role="status">
            {data.rootStatus === "identity_mismatch"
              ? "媒体卷身份不匹配"
              : "上次检查时媒体卷离线"}
            ，请到 <a href="#settings">系统状态</a> 核实。
          </p>
        )}
      <ErrorNotice error={queue.error || storage.error || (!dialog && error)} />
      {notice && <p role="status">{notice}</p>}
      <QueueTable
        hasInbox={!!storage.data?.inbox}
        data={data}
        status={status}
        q={q}
        count={counts.data?.all ?? 0}
        categories={categories}
        busy={busy}
        selection={selection}
        select={select}
        selectGroup={selectGroup}
        adjust={adjust}
        ungroup={ungroup}
        toMedia={toMedia}
        open={open}
        perform={perform}
        bindRow={bindRow}
        showLookup={showLookup}
        setPicker={setPicker}
        updateCategory={updateCategory}
      />
      {data && data.total > 20 && <Pager {...data} onChange={setPage} />}
      {dialog && dialog.kind !== "edit" && (
        <Modal
          title={dialog.kind === "review" ? "核对当前草稿" : "发布到片库"}
          close={close}
        >
          <div className="ig-review-list">
            <ReviewCard
              row={dialog.row}
              edit={() => open(dialog.row, "edit")}
            />
          </div>
          {dialog.row.group && (
            <p className="ig-dialog-note">
              {dialog.row.group.title} · 第 {dialog.row.group.position}{" "}
              集。发布将提交整个已核对容器。
            </p>
          )}
          <ErrorNotice error={error} />
          <div className="actions">
            <button onClick={close} disabled={busy}>
              返回
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                const opt = {
                  params: { path: { id: dialog.row.id } },
                  body: { expectedRevision: dialog.row.revision },
                };
                void perform(
                  () =>
                    dialog.kind === "review"
                      ? unwrap(api.POST("/api/imports/{id}/review", opt))
                      : unwrap(api.POST("/api/imports/{id}/publish", opt)),
                  dialog.kind === "review"
                    ? "已人工确认，可以手动发布。"
                    : "已发布到片库。",
                );
              }}
            >
              {dialog.kind === "review" ? "确认这份资料" : "确认发布"}
            </button>
          </div>
        </Modal>
      )}
      {lookupId && (
        <QueueSource
          id={lookupId}
          close={() => showLookup("")}
          changed={(next) => {
            setBatchRows((old) =>
              old.map((r) => (r.id === next.id ? next : r)),
            );
            setDialog((old) =>
              old?.row.id === next.id ? { ...old, row: next } : old,
            );
          }}
        />
      )}
    </section>
  );
}
