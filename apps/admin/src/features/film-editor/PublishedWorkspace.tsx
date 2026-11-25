import { AppendEdition } from "./AppendEdition";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice } from "@video-x/ui";
import {
  commonTabs,
  Frame,
  CommonFields,
  useLeaveGuard,
  validReleaseDate,
  type Tab,
  type Fields,
} from "./FilmWorkspace";
type Media = Schemas["MediaDetail"];
type Category = Schemas["Category"];
function fields(m: Media): Fields {
  return {
    title: m.title,
    summary: m.summary,
    notes: m.notes,
    identifier: m.identifier ?? null,
    releaseDate: m.releaseDate ?? null,
    releaseYear: m.releaseYear,
    categoryId: m.categoryId,
    supportsChinese: m.supportsChinese,
    posterId: m.posterId,
    backdropId: m.backdropId,
    stillIds: m.stillIds ?? [],
    actorIds: m.actors.map((p) => p.id),
    directorIds: (m.directors ?? []).map((p) => p.id),
    franchiseIds: m.franchises.map((p) => p.id),
    tagIds: m.tagIds ?? [],
    studioIds: m.studioIds ?? [],
  };
}
export function PublishedWorkspace({
  id,
  categories,
  back,
}: {
  id: string;
  categories: Category[];
  back: () => void;
}) {
  const result = useQuery({
    queryKey: ["editor", id],
    queryFn: () =>
      unwrap(api.GET("/api/media/{id}", { params: { path: { id } } })),
  });
  if (!result.data)
    return (
      <>
        <button onClick={back}>← 返回</button>
        {result.isPending ? (
          <p>正在读取作品…</p>
        ) : (
          <ErrorNotice error={result.error} />
        )}
      </>
    );
  return (
    <Editor key={id} m={result.data} categories={categories} back={back} />
  );
}
function Editor({
  m,
  categories,
  back,
}: {
  m: Media;
  categories: Category[];
  back: () => void;
}) {
  const cache = useQueryClient(),
    [base, setBase] = useState(m),
    [d, set] = useState(() => fields(m)),
    [section, tab] = useState<Tab>("基本资料"),
    [busy, working] = useState(false),
    [error, fail] = useState(""),
    [message, notify] = useState(""),
    [append, setAppend] = useState(false);
  const [episodeIds, reorder] = useState((m.episodes ?? []).map((e) => e.id));
  const group = m.kind === "group",
    tabs: Tab[] = [...commonTabs, group ? "分集" : "版本与文件"];
  const episodeChanges =
    episodeIds.join(",") !== (base.episodes ?? []).map((e) => e.id).join(",");
  const original = fields(base);
  const dirty =
    JSON.stringify(d) !== JSON.stringify(original) || episodeChanges;
  const canLeave = useLeaveGuard(dirty);
  const [pendingFile, trackFile] = useState<string>();
  const progress = useQuery({
    queryKey: ["edition-publish", pendingFile],
    enabled: !!pendingFile,
    queryFn: () =>
      unwrap(
        api.GET("/api/imports/{id}", {
          params: { path: { id: pendingFile! } },
        }),
      ),
    refetchInterval: 2000,
  });
  useEffect(() => {
    if (!pendingFile || !progress.data) return;
    const row = progress.data;
    if (
      row.publishedMediaId ||
      row.move?.state === "failed" ||
      row.move?.state === "cancelled"
    ) {
      if (row.publishedMediaId) {
        notify("新版本已发布");
        void cache.invalidateQueries();
      } else fail(row.move?.error ?? "整理任务已停止，请到后台任务查看。");
      trackFile(undefined);
    }
  }, [pendingFile, progress.data, cache]);
  useEffect(() => {
    if (!dirty && m.revision !== base.revision) {
      setBase(m);
      set(fields(m));
      reorder((m.episodes ?? []).map((e) => e.id));
    }
  }, [m, base.revision, dirty]);
  const idsToNames = Object.fromEntries(
    [...base.actors, ...(base.directors ?? [])]
      .map((p) => [p.id, p.fullName])
      .concat(base.franchises.map((f) => [f.id, f.name])),
  );
  function patch(p: Partial<Fields>) {
    set((old) => ({ ...old, ...p }));
    notify("");
    fail("");
  }
  function leave() {
    if (!busy && canLeave()) back();
  }
  async function save() {
    if (!validReleaseDate(d.releaseDate) || !d.title.trim()) {
      tab("基本资料");
      fail(
        !d.title.trim()
          ? "请填写作品标题"
          : "请填写完整的发行日期（年、月、日）。",
      );
      return;
    }
    working(true);
    fail("");
    notify("");
    try {
      const params = { path: { id: m.id } };
      const payload: Schemas["MediaPatch"] = {
        expectedRevision: base.revision,
        releaseDate: d.releaseDate!,
      };
      for (const key of [
        "title",
        "summary",
        "notes",
        "identifier",
        "categoryId",
        "supportsChinese",
        "posterId",
        "backdropId",
        "stillIds",
        "actorIds",
        "directorIds",
        "franchiseIds",
        "tagIds",
        "studioIds",
      ] as const)
        if (JSON.stringify(d[key]) !== JSON.stringify(original[key]))
          Object.assign(payload, { [key]: d[key] });
      if (episodeChanges) payload.episodeOrder = episodeIds;
      const saved = await unwrap(
        api.PATCH("/api/media/{id}", { params, body: payload }),
      );
      setBase(saved);
      set(fields(saved));
      reorder((saved.episodes ?? []).map((e) => e.id));
      cache.setQueryData(["editor", m.id], saved);
      await cache.invalidateQueries();
      notify("已保存");
    } catch (e) {
      fail((e as Error).message);
    } finally {
      working(false);
    }
  }
  return (
    <Frame
      tab={section}
      tabs={tabs}
      select={tab}
      title={d.title || m.title}
      backLabel="返回资料列表"
      back={leave}
      meta={[
        group ? "分集容器" : m.kind === "episode" ? "分集作品" : "已发布影片",
        dirty ? "有未保存修改" : message,
      ]
        .filter(Boolean)
        .join(" · ")}
      error={error}
      actions={
        <button
          className="btn primary small"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          {busy ? "保存中…" : "保存变更"}
        </button>
      }
    >
      <CommonFields
        tab={section}
        d={d}
        patch={patch}
        categories={categories}
        initialNames={idsToNames}
        legacyYear={base.releaseDate ? null : base.releaseYear}
      />
      {section === "分集" && (
        <div className="relation-list">
          <header>
            <h3>
              容器内作品 <small>{episodeIds.length}</small>
            </h3>
          </header>
          <ul>
            {episodeIds.map((id, i) => {
              const ep = base.episodes!.find((e) => e.id === id)!;
              function move(to: number) {
                const next = [...episodeIds];
                next.splice(i, 1);
                next.splice(to, 0, id);
                reorder(next);
              }
              return (
                <li key={id}>
                  <span>第 {base.episodes![i]!.episodeNumber} 集</span>
                  <a href={"#media/" + id}>{ep.title}</a>
                  <button disabled={!i} onClick={() => move(i - 1)}>
                    上移
                  </button>
                  <button
                    disabled={i === episodeIds.length - 1}
                    onClick={() => move(i + 1)}
                  >
                    下移
                  </button>
                </li>
              );
            })}
          </ul>
          {!episodeIds.length && <p>暂无分集</p>}
        </div>
      )}
      {section === "版本与文件" && (
        <div className="relation-list">
          <header>
            <h3>
              播放版本 <small>{m.editions?.length ?? 0}</small>
            </h3>
            <button
              disabled={dirty || !base.releaseDate || !!pendingFile}
              title={
                dirty
                  ? "请先保存资料修改"
                  : !base.releaseDate
                    ? "请先补齐完整发行日期"
                    : undefined
              }
              onClick={() => setAppend(true)}
            >
              ＋ 追加版本
            </button>
          </header>
          {!base.releaseDate && (
            <p>
              追加版本需要完整的发行日期。{" "}
              <button type="button" onClick={() => tab("基本资料")}>
                补全发行日期
              </button>
            </p>
          )}
          {pendingFile && (
            <p role="status">
              正在整理版本文件 · <a href="#jobs">查看后台任务</a>
            </p>
          )}
          {(m.editions ?? []).map((e) => (
            <article className="edition-row" key={e.id}>
              <strong>{e.name}</strong>
              <small>
                {[
                  e.isDefault ? "默认版本" : null,
                  e.width && e.height ? e.width + " × " + e.height : null,
                  e.availability === "present" ? "文件在线" : "待检查",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
              <code>{e.filename}</code>
            </article>
          ))}
          {!m.editions?.length && <p>尚未绑定播放文件</p>}
          {append && (
            <AppendEdition
              media={m}
              close={() => setAppend(false)}
              done={async (row) => {
                setAppend(false);
                if (row.publishedMediaId) notify("新版本已发布");
                else {
                  notify("已提交整理任务");
                  trackFile(row.id);
                }
                await cache.invalidateQueries();
              }}
            />
          )}
        </div>
      )}
    </Frame>
  );
}
