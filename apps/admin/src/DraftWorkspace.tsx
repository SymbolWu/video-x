import { BindForm, SourceReview, fetching } from "./SourceReview";
import { DictionaryLinks } from "./Dictionary";
import { Artwork } from "./Artwork";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Select, Modal, ErrorNotice } from "@video-x/ui";
type Row = Schemas["ImportRow"];
type Fields = Schemas["ImportFields"];
function Relations({
  kind,
  ids,
  names,
  change,
}: {
  kind: "actors" | "directors" | "series";
  ids: string[];
  names: string[];
  change: (ids: string[]) => void;
}) {
  const [q, search] = useState(""),
    [chosen, setChosen] = useState<Record<string, string>>(() =>
      Object.fromEntries(ids.map((id, i) => [id, names[i] ?? "已选资料"])),
    );
  const label =
    kind === "actors" ? "演员" : kind === "directors" ? "导演" : "系列";
  const results = useQuery({
    queryKey: ["intake-relations", kind, q],
    queryFn: async () => {
      const query = { q: q.trim() || undefined, pageSize: 20 };
      if (kind !== "series")
        return (
          await unwrap(api.GET("/api/people", { params: { query } }))
        ).items.map((p) => ({ id: p.id, name: p.fullName }));
      return (
        await unwrap(api.GET("/api/franchises", { params: { query } }))
      ).items.map((f) => ({ id: f.id, name: f.name }));
    },
  });
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="intake-chips">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => change(ids.filter((x) => x !== id))}
          >
            {chosen[id]} ×
          </button>
        ))}
      </div>
      <label>
        查找{label}
        <input
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder={"输入" + label + "名称"}
        />
      </label>
      <ErrorNotice error={results.error} />
      <Select
        label={"添加" + label}
        value=""
        options={[
          { value: "", label: "选择已有" + label },
          ...(results.data ?? [])
            .filter((x) => !ids.includes(x.id))
            .map((x) => ({ value: x.id, label: x.name })),
        ]}
        onValueChange={(id) => {
          const x = results.data?.find((x) => x.id === id);
          if (x) {
            setChosen({ ...chosen, [id]: x.name });
            change([...ids, id]);
          }
        }}
      />
    </fieldset>
  );
}

const sections = [
  "基本资料",
  "图片",
  "演职员",
  "归类与关联",
  "分集",
  "版本与文件",
  "来源核对",
] as const;
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
  const [baseline, setBaseline] = useState(row);
  const [d, set] = useState<Fields>(row.fields),
    [section, tab] = useState<number>(0),
    [busy, working] = useState(false),
    [error, fail] = useState(""),
    [review, askReview] = useState(false);
  const [precision, setPrecision] = useState(
    row.fields.releaseDate
      ? "day"
      : row.fields.releaseYear
        ? "year"
        : "unknown",
  );
  const dirty = JSON.stringify(d) !== JSON.stringify(baseline.fields);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function adopt(r: Row) {
    setBaseline(r);
    set(r.fields);
    setPrecision(
      r.fields.releaseDate ? "day" : r.fields.releaseYear ? "year" : "unknown",
    );
    cache.setQueryData(["intake", "draft", r.id], r);
  }
  useEffect(() => {
    if (!dirty && row.revision > baseline.revision) {
      setBaseline(row);
      set(row.fields);
      setPrecision(
        row.fields.releaseDate
          ? "day"
          : row.fields.releaseYear
            ? "year"
            : "unknown",
      );
    }
  }, [row, baseline.revision, dirty]);
  function pendingNames(k: keyof Schemas["SourceNames"]) {
    const ns = d.sourceNames;
    if (!ns?.[k].length) return null;
    return (
      <div className="source-pending">
        {ns[k].map((n) => (
          <button
            className="btn ghost small"
            type="button"
            key={n}
            aria-label={"移除候选 " + n}
            onClick={() =>
              set({
                ...d,
                sourceNames: { ...ns, [k]: ns[k].filter((x) => x !== n) },
              })
            }
          >
            {n} ×
          </button>
        ))}
      </div>
    );
  }
  async function save(confirmReview = false) {
    if (busy) return;
    if (
      (precision === "day" && !d.releaseDate) ||
      (precision !== "unknown" &&
        (!d.releaseYear || d.releaseYear < 1800 || d.releaseYear > 2500))
    ) {
      tab(0);
      fail("请填写完整的发行日期或年份，也可以将日期精度改为未知。");
      return;
    }
    if (!d.title.trim()) {
      tab(0);
      fail("请填写作品标题");
      return;
    }
    working(true);
    fail("");
    try {
      const params = { path: { id: row.id } };
      let current = baseline;
      if (dirty) {
        await unwrap(
          api.PUT("/api/imports/{id}", {
            params,
            body: { fields: d, expectedRevision: baseline.revision },
          }),
        );
        current = await unwrap(api.GET("/api/imports/{id}", { params }));
        setBaseline(current);
        set(current.fields);
      }
      if (confirmReview) {
        await unwrap(
          api.POST("/api/imports/{id}/review", {
            params,
            body: { expectedRevision: current.revision },
          }),
        );
        current = await unwrap(api.GET("/api/imports/{id}", { params }));
        setBaseline(current);
        askReview(false);
      }
      await cache.invalidateQueries({ queryKey: ["intake"] });
    } catch (e) {
      fail((e as Error).message);
      askReview(false);
    } finally {
      working(false);
    }
  }
  function leave() {
    if (!busy && (!dirty || window.confirm("离开编辑并放弃未保存的修改？")))
      back();
  }
  const saveButton = (
    <button
      disabled={busy || !!baseline.publishedMediaId}
      className="btn ghost small"
      data-action="wb-save"
      onClick={() => void save()}
    >
      保存草稿
    </button>
  );
  return (
    <section className="wb-page">
      <div className="wb-top">
        <div>
          <button className="wb-back" onClick={leave}>
            ← 返回录入队列
          </button>
          <h1>{d.title || "未命名草稿"}</h1>
          <p>
            <span className="badge warn">入库草稿</span>{" "}
            {dirty
              ? "有未保存修改"
              : baseline.reviewed
                ? "已人工确认"
                : "已保存草稿"}
          </p>
        </div>
        <div className="wb-actions">
          {saveButton}
          <button
            className="btn ghost small"
            disabled={
              busy ||
              (!dirty && baseline.reviewed) ||
              fetching(row.lookup) ||
              row.probeStatus !== "succeeded" ||
              row.availability !== "present"
            }
            onClick={() => askReview(true)}
          >
            核对并确认
          </button>
        </div>
      </div>
      <div className="wb-layout">
        <nav aria-label="资料编辑分区">
          {sections.map((title, i) => (
            <button
              key={title}
              className={section === i ? "active" : ""}
              aria-current={section === i ? "page" : undefined}
              onClick={() => tab(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {title}
            </button>
          ))}
        </nav>
        <section className="wb-panel">
          <div id="wb-error" role="status" />
          <ErrorNotice error={error} />
          {section === 0 && (
            <>
              <h2>作品资料</h2>
              <p className="wb-help">
                在发布前核对片名、发行信息和简介。未知资料可以留空。
              </p>
              <div className="wb-grid">
                <label>
                  作品标题
                  <input
                    required
                    maxLength={1000}
                    value={d.title}
                    onChange={(e) => set({ ...d, title: e.target.value })}
                  />
                </label>
                <label>
                  主编号 / 番号
                  <input
                    maxLength={160}
                    value={d.identifier ?? ""}
                    onChange={(e) =>
                      set({ ...d, identifier: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  发行日期精度
                  <Select
                    label="发行日期精度"
                    value={precision}
                    options={[
                      { value: "unknown", label: "未知" },
                      { value: "year", label: "仅年份" },
                      { value: "day", label: "完整日期" },
                    ]}
                    onValueChange={(v) => {
                      setPrecision(v);
                      set({
                        ...d,
                        releaseYear: v === "unknown" ? null : d.releaseYear,
                        releaseDate: v === "day" ? d.releaseDate : null,
                      });
                    }}
                  />
                </label>
                <label>
                  发行年份
                  <input
                    type="number"
                    min={1800}
                    max={2500}
                    disabled={precision !== "year"}
                    value={d.releaseYear ?? ""}
                    onChange={(e) =>
                      set({
                        ...d,
                        releaseYear: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  完整发行日期
                  <input
                    type="date"
                    min="1800-01-01"
                    max="2500-12-31"
                    disabled={precision !== "day"}
                    value={d.releaseDate ?? ""}
                    onChange={(e) =>
                      set({
                        ...d,
                        releaseDate: e.target.value || null,
                        releaseYear: e.target.value
                          ? Number(e.target.value.slice(0, 4))
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  中文资料标记
                  <Select
                    label="中文资料"
                    value={
                      d.supportsChinese == null
                        ? "unknown"
                        : String(d.supportsChinese)
                    }
                    options={[
                      { value: "unknown", label: "未知" },
                      { value: "true", label: "支持" },
                      { value: "false", label: "不支持" },
                    ]}
                    onValueChange={(v) =>
                      set({
                        ...d,
                        supportsChinese: v === "unknown" ? null : v === "true",
                      })
                    }
                  />
                </label>
                <label className="wb-wide">
                  简介
                  <textarea
                    rows={5}
                    maxLength={50000}
                    value={d.summary ?? ""}
                    onChange={(e) =>
                      set({ ...d, summary: e.target.value || null })
                    }
                  />
                </label>
                <label className="wb-wide">
                  我的资料备注
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={d.notes ?? ""}
                    onChange={(e) =>
                      set({ ...d, notes: e.target.value || null })
                    }
                  />
                </label>
              </div>
            </>
          )}
          {section === 1 && (
            <>
              <h2>图片</h2>
              <p className="wb-help">上传或替换本片的封面和横版剧照。</p>
              <div className="wb-grid">
                {(["posterId", "backdropId"] as const).map((k) => (
                  <Artwork
                    key={k}
                    label={k === "posterId" ? "竖版海报" : "横版剧照"}
                    value={d[k]}
                    onChange={(id) => set({ ...d, [k]: id })}
                  />
                ))}
              </div>
            </>
          )}
          {section === 2 && (
            <>
              <h2>演职员</h2>
              {pendingNames("actors")}
              {pendingNames("directors")}
              <Relations
                kind="actors"
                ids={d.actorIds}
                names={baseline.actors}
                change={(actorIds) => set({ ...d, actorIds })}
              />
              <Relations
                kind="directors"
                ids={d.directorIds ?? []}
                names={baseline.directors ?? []}
                change={(directorIds) => set({ ...d, directorIds })}
              />
            </>
          )}
          {section === 3 && (
            <>
              <h2>归类与关联</h2>
              {pendingNames("series")}
              {pendingNames("tags")}
              {pendingNames("studios")}
              <label>
                主分类
                <Select
                  label="草稿主分类"
                  value={d.categoryId}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  onValueChange={(categoryId) => set({ ...d, categoryId })}
                />
              </label>
              <Relations
                kind="series"
                ids={d.franchiseIds}
                names={baseline.series}
                change={(franchiseIds) => set({ ...d, franchiseIds })}
              />
              <DictionaryLinks
                tagIds={d.tagIds ?? []}
                studioIds={d.studioIds ?? []}
                change={(fields) => set((old) => ({ ...old, ...fields }))}
              />
            </>
          )}
          {section === 4 && (
            <>
              <h2>分集关系</h2>
              <div className="wb-callout">
                {row.group
                  ? row.group.title + " · 第 " + row.group.position + " 集"
                  : "独立视频。可在录入队列勾选同一作品的各集，创建分集容器。"}
              </div>
              <button className="btn ghost small" onClick={leave}>
                返回录入队列
              </button>
            </>
          )}
          {section === 5 && (
            <>
              <h2>版本与文件</h2>
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
          {section === 6 && (
            <>
              <h2>来源核对</h2>
              <SourceReview row={row} changed={adopt} locked={dirty || busy} />
            </>
          )}
        </section>
      </div>
      <footer className="wb-footer">
        <span>保存后可继续修改。人工核对后，在队列里手动发布。</span>
        <div>
          <button
            className="btn ghost small"
            disabled={section === 0}
            onClick={() => tab(section - 1)}
          >
            上一项
          </button>
          <button
            className="btn ghost small"
            disabled={section === sections.length - 1}
            onClick={() => tab(section + 1)}
          >
            下一项
          </button>
          {saveButton}
        </div>
      </footer>
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
    </section>
  );
}
