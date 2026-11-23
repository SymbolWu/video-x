import {StudioCard} from "./StudioCard";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, ErrorNotice } from "@video-x/ui";

export function StudioExtra({
  kind,
}: {
  kind: "jobs" | "collections";
}) {
  const cache = useQueryClient(),
    isFolder = kind === "collections";
  const folders = useQuery({
    queryKey: ["collections"],
    enabled: isFolder,
    queryFn: () => unwrap(api.GET("/api/collections")),
  });
  const tasks = useQuery({
    queryKey: ["ops", "imports"],
    enabled: !isFolder,
    queryFn: () =>
      unwrap(api.GET("/api/imports", { params: { query: { pageSize: 50 } } })),
    refetchInterval: 5000,
  });
  const [editor, edit] = useState<null | "new" | Schemas["Collection"]>(null),
    [error, fail] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const fields = new FormData(event.currentTarget),
      body = {
        name: String(fields.get("name")).trim(),
        description: String(fields.get("description")).trim() || null,
      };
    setBusy(true);
    fail("");
    try {
      if (editor === "new")
        await unwrap(api.POST("/api/collections", { body }));
      else
        await unwrap(
          api.PATCH("/api/collections/{id}", {
            params: { path: { id: editor.id } },
            body: { ...body, expectedRevision: editor.revision },
          }),
        );
      await cache.invalidateQueries({ queryKey: ["collections"] });
      edit(null);
    } catch (e) {
      fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-extra">
      <div className="heading">
        <h1>
          {isFolder ? "收藏夹维护" : "后台任务"}
        </h1>
        {isFolder && (
          <button
            className="primary"
            onClick={() => {
              fail("");
              edit("new");
            }}
          >
            ＋ 新建收藏夹
          </button>
        )}
      </div>
      <ErrorNotice error={folders.error || tasks.error} />
      {isFolder?<div className="studio-cards">{folders.data?.map(f=><StudioCard key={f.id} title={f.name} subtitle={f.description??""} meta={f.mediaIds.length+" 部影片"} images={f.coverIds?.length?f.coverIds:f.coverId?[f.coverId]:[]} action="编辑收藏夹" open={()=>{edit(f);fail("")}}/>)}{folders.data?.length===0&&<div className="empty">还没有收藏夹</div>}</div>:<div className="ops-deck"><article><h3>任务队列</h3><dl><dt>文件扫描</dt><dd>{tasks.data?.scanning?"执行中":"空闲"}</dd><dt>录入记录</dt><dd>{tasks.data?.total??"—"}</dd></dl><button onClick={()=>void tasks.refetch()}>刷新</button></article><article><h3>最近文件探测</h3>{tasks.data?.items.map(r=><details key={r.id}><summary>{r.relativePath}</summary><p>{r.probeStatus==="succeeded"?"探测成功":r.probeStatus} · {r.publishedMediaId?"已发布":r.reviewed?"已确认":"待核对"}</p></details>)}</article></div>}
      {editor && (
        <Modal
          title={editor === "new" ? "新建收藏夹" : "编辑收藏夹"}
          close={() => {
            if (!busy) edit(null);
          }}
        >
          <form onSubmit={save}>
            <label>
              名称
              <input
                autoFocus
                required
                maxLength={120}
                name="name"
                defaultValue={editor === "new" ? "" : editor.name}
              />
            </label>
            <label>
              说明
              <textarea
                maxLength={10000}
                name="description"
                defaultValue={
                  editor === "new" ? "" : (editor.description ?? "")
                }
              />
            </label>
            <ErrorNotice error={error} />
            <div className="actions">
              <button type="button" onClick={() => edit(null)} disabled={busy}>
                取消
              </button>
              <button className="primary" disabled={busy}>
                保存
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
