import {StudioCard} from "./StudioCard";
import { useState, type FormEvent } from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice, Modal, Select } from "@video-x/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
type D = Schemas["DictionaryEntry"];
function useDictionary() {
  return useQuery({
    queryKey: ["dictionary"],
    queryFn: () => unwrap(api.GET("/api/dictionary")),
  });
}
export function DictionaryPage({ tags }: { tags: boolean }) {
  const label = tags ? "标签" : "片商",
    kind = tags ? "tag" : "studio",
    query = useDictionary(),
    cache = useQueryClient();
  const cats = useQuery({
    queryKey: ["categories"],
    enabled: tags,
    queryFn: () => unwrap(api.GET("/api/categories")),
  });
  const [q, search] = useState(""),
    [edit, show] = useState<D | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [error, fail] = useState("");
  const entry = edit && edit !== "new" ? edit : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      kind: tags ? ("tag" as const) : ("studio" as const),
      name: String(f.get("name")).trim(),
      detail: String(f.get("detail")).trim() || null,
      categoryId: tags ? String(f.get("category")) : null,
      isVisible: tags ? f.get("visible") === "on" : true,
    };
    setBusy(true);
    fail("");
    try {
      if (entry)
        await unwrap(
          api.PATCH("/api/dictionary/{id}", {
            params: { path: { id: entry.id } },
            body: { ...body, expectedRevision: entry.revision },
          }),
        );
      else await unwrap(api.POST("/api/dictionary", { body }));
      await cache.invalidateQueries({ queryKey: ["dictionary"] });
      show(null);
    } catch (e) {
      fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const entries = (query.data ?? []).filter(
    (e) =>
      e.kind === kind &&
      e.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  return (
    <section>
      <div className="heading">
        <h1>{tags?"标签维护":"片商 / 发行机构"}</h1>
        <button
          className="primary"
          onClick={() => {
            fail("");
            show("new");
          }}
        >
          ＋ 新增{label}
        </button>
      </div>
      <div className="studio-tools">
        <span>{entries.length} 项</span>
        <input
          aria-label={"搜索" + label}
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder={"搜索" + label + "名称"}
        />
      </div>
      <ErrorNotice error={query.error || cats.error} />
      <div className="studio-cards compact">{entries.map(d=><StudioCard key={d.id} title={d.name} subtitle={[d.detail,tags?cats.data?.find(c=>c.id===d.categoryId)?.name:null].filter(Boolean).join(" · ")} meta={(d.isVisible?"":"已隐藏 · ")+d.workCount+" 部作品"} action="编辑资料" open={()=>{fail("");show(d)}}/>)}</div>{!query.isPending&&!entries.length&&<div className="empty">{q?"没有符合条件的资料":"暂无"+label}</div>}
      {edit && (
        <Modal
          title={(entry ? "编辑" : "新增") + label}
          close={() => {
            if (!busy) show(null);
          }}
        >
          <form onSubmit={save}>
            <label>
              名称
              <input
                name="name"
                autoFocus
                required
                maxLength={tags ? 120 : 300}
                defaultValue={entry?.name}
              />
            </label>
            {tags && (
              <label>
                所属分类
                <Select
                  label="所属分类"
                  name="category"
                  required
                  defaultValue={entry?.categoryId ?? cats.data?.[0]?.id}
                  options={(cats.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </label>
            )}
            <label>
              {tags ? "分组" : "说明"}
              <input
                name="detail"
                defaultValue={entry?.detail ?? (tags ? "其他" : "")}
              />
            </label>
            {tags && (
              <label>
                <input
                  name="visible"
                  type="checkbox"
                  defaultChecked={entry?.isVisible ?? true}
                />{" "}
                显示标签
              </label>
            )}
            <ErrorNotice error={error} />
            <div className="actions">
              <button type="button" disabled={busy} onClick={() => show(null)}>
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
export function DictionaryLinks({
  tagIds,
  studioIds,
  change,
}: {
  tagIds: string[];
  studioIds: string[];
  change: (fields: { tagIds?: string[]; studioIds?: string[] }) => void;
}) {
  const dict = useDictionary();
  return (
    <>
      <ErrorNotice error={dict.error} />
      {(["tag", "studio"] as const).map((kind) => {
        const ids = kind === "tag" ? tagIds : studioIds,
          items = (dict.data ?? []).filter(
            (d) => d.kind === kind && (d.isVisible || ids.includes(d.id)),
          );
        return (
          <fieldset key={kind}>
            <legend>{kind === "tag" ? "标签" : "片商"}</legend>
            <div className="check-list">
              {items.length ? (
                items.map((d) => (
                  <label key={d.id}>
                    <input
                      type="checkbox"
                      checked={ids.includes(d.id)}
                      onChange={(e) =>
                        change({
                          [kind === "tag" ? "tagIds" : "studioIds"]: e.target
                            .checked
                            ? [...ids, d.id]
                            : ids.filter((id) => id !== d.id),
                        })
                      }
                    />
                    {d.name}
                  </label>
                ))
              ) : (
                <small>{dict.isPending ? "读取中…" : "暂无可选资料"}</small>
              )}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}
