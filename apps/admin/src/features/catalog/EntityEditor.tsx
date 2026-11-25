import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, ErrorNotice, Modal } from "@video-x/ui";
import { Artwork } from "../../shared/Artwork";
import type { Kind } from "../../app/AdminShell";
export function EntityEditor({
  kind,
  selected,
  categories,
  close,
}: {
  kind: Exclude<Kind, "media">;
  selected: Schemas["Person"] | Schemas["Franchise"] | null;
  categories: Schemas["Category"][];
  close: () => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [entityArt, setEntityArt] = useState<string | null | undefined>(
    undefined,
  );
  const person = selected && "fullName" in selected ? selected : null,
    franchise = selected && "name" in selected ? selected : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      name = String(data.get("name")).trim(),
      categoryId = String(data.get("categoryId"));
    setBusy(true);
    setError("");
    try {
      if (kind === "people") {
        const body = {
          portraitId: entityArt,
          fullName: name,
          detailedName: String(data.get("detailedName")).trim() || null,
          categoryId,
          gender: String(data.get("gender")) as
            | "unknown"
            | "female"
            | "male"
            | "other",
        };
        if (person)
          await unwrap(
            api.PATCH("/api/people/{id}", {
              params: { path: { id: person.id } },
              body: { ...body, expectedRevision: person.revision },
            }),
          );
        else await unwrap(api.POST("/api/people", { body }));
      } else if (kind === "franchises") {
        const body = {
          coverId: entityArt,
          name,
          categoryId,
          description: String(data.get("description")).trim() || null,
        };
        if (franchise)
          await unwrap(
            api.PATCH("/api/franchises/{id}", {
              params: { path: { id: franchise.id } },
              body: { ...body, expectedRevision: franchise.revision },
            }),
          );
        else await unwrap(api.POST("/api/franchises", { body }));
      } else await unwrap(api.POST("/api/categories", { body: { name } }));
      await client.invalidateQueries();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        (selected ? "编辑" : "新增") +
        (kind === "people" ? "演员" : kind === "franchises" ? "系列" : "分类")
      }
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={save}>
        {kind !== "categories" && (
          <Artwork
            label={kind === "people" ? "演员头像" : "系列封面"}
            value={
              entityArt === undefined
                ? (person?.portraitId ?? franchise?.coverId)
                : entityArt
            }
            onChange={setEntityArt}
          />
        )}
        <label>
          {kind === "people" ? "常用名" : "名称"}
          <input
            autoFocus
            name="name"
            required
            maxLength={kind === "categories" ? 120 : 300}
            defaultValue={person?.fullName ?? franchise?.name ?? ""}
          />
        </label>
        {kind === "people" && (
          <>
            <label>
              详细名称
              <input
                name="detailedName"
                maxLength={300}
                defaultValue={person?.detailedName ?? ""}
              />
            </label>
            <label>
              性别
              <Select
                label="性别"
                name="gender"
                defaultValue={person?.gender ?? "unknown"}
                options={[
                  { value: "unknown", label: "未知" },
                  { value: "female", label: "女性" },
                  { value: "male", label: "男性" },
                  { value: "other", label: "其他" },
                ]}
              />
            </label>
          </>
        )}
        {kind === "franchises" && (
          <label>
            说明
            <textarea
              name="description"
              maxLength={10000}
              defaultValue={franchise?.description ?? ""}
            />
          </label>
        )}
        {kind !== "categories" && (
          <label>
            所属分类
            <Select
              label="所属分类"
              name="categoryId"
              defaultValue={
                selected?.categoryId ??
                categories.find((c) => c.name === "未分类")?.id ??
                categories[0]?.id
              }
              required
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </label>
        )}
        <ErrorNotice error={error} />
        <div className="actions">
          <button type="button" onClick={close} disabled={busy}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "保存中…" : "保存资料"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
