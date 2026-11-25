import { StudioCard } from "../../shared/StudioCard";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Modal, ErrorNotice } from "@video-x/ui";

export function CollectionsPage() {
  const cache = useQueryClient();
  const folders = useQuery({
    queryKey: ["collections"],
    queryFn: () => unwrap(api.GET("/api/collections")),
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
        <h1>收藏夹</h1>
        {
          <button
            className="primary"
            onClick={() => {
              fail("");
              edit("new");
            }}
          >
            ＋ 新建收藏夹
          </button>
        }
      </div>
      <ErrorNotice error={folders.error} />
      <div className="studio-cards">
        {folders.data?.map((f) => (
          <StudioCard
            key={f.id}
            title={f.name}
            subtitle={f.description ?? ""}
            meta={f.mediaIds.length + " 部影片"}
            images={
              f.coverIds?.length ? f.coverIds : f.coverId ? [f.coverId] : []
            }
            action="编辑收藏夹"
            open={() => {
              edit(f);
              fail("");
            }}
          />
        ))}
        {folders.data?.length === 0 && (
          <div className="empty">还没有收藏夹</div>
        )}
      </div>
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
