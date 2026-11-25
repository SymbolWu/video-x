import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice } from "@video-x/ui";
import { AppendEdition } from "./AppendEdition";
import { CommonFields } from "./CommonFields";
import { EpisodeList, type EpisodeOrigin } from "./EpisodeList";
import {
  checkFields,
  commonTabs,
  Frame,
  useLeaveGuard,
  type FieldIssue,
  type Fields,
  type SaveStatus,
  type Tab,
} from "./FilmWorkspace";
import { PublishedFiles } from "./PublishedFiles";
import { validReleaseDate } from "./releaseDate";
import { useEditionPublication } from "./useEditionPublication";

type Media = Schemas["MediaDetail"];
type EditorNavigation = {
  restoredEpisode?: EpisodeOrigin;
  restoreVersions: boolean;
  inEpisode: boolean;
  openEpisode: (id: string) => void;
  openIntake: () => void;
};

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
  navigation,
}: {
  id: string;
  categories: Schemas["Category"][];
  back: () => void;
  navigation: EditorNavigation;
}) {
  const result = useQuery({
    queryKey: ["editor", id],
    queryFn: () =>
      unwrap(api.GET("/api/media/{id}", { params: { path: { id } } })),
  });
  if (!result.data) {
    return (
      <>
        <button onClick={back}>
          ← {navigation.inEpisode ? "返回分集列表" : "返回资料列表"}
        </button>
        {result.isPending ? (
          <p role="status">正在读取作品…</p>
        ) : (
          <>
            <ErrorNotice error={result.error} />
            <button
              type="button"
              disabled={result.isFetching}
              onClick={() => void result.refetch()}
            >
              重新读取影片
            </button>
          </>
        )}
      </>
    );
  }
  return (
    <Editor
      key={id}
      m={result.data}
      categories={categories}
      back={back}
      navigation={navigation}
    />
  );
}

function Editor({
  m,
  categories,
  back,
  navigation,
}: {
  m: Media;
  categories: Schemas["Category"][];
  back: () => void;
  navigation: EditorNavigation;
}) {
  const cache = useQueryClient();
  const [base, setBase] = useState(m);
  const [d, set] = useState(() => fields(m));
  const [section, tab] = useState<Tab>(
    navigation.restoredEpisode && m.kind === "group"
      ? "分集"
      : navigation.restoreVersions && m.kind !== "group"
        ? "版本与文件"
        : "基本资料",
  );
  const [saving, busy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, fail] = useState("");
  const [issue, setIssue] = useState<FieldIssue | null>(null);
  const [saved, didSave] = useState(false);
  const [append, setAppend] = useState(false);
  const [episodeIds, reorder] = useState((m.episodes ?? []).map((e) => e.id));
  const group = m.kind === "group";
  const tabs: Tab[] = [...commonTabs, group ? "分集" : "版本与文件"];
  const episodeChanges =
    episodeIds.join(",") !== (base.episodes ?? []).map((e) => e.id).join(",");
  const original = fields(base);
  const dirty =
    JSON.stringify(d) !== JSON.stringify(original) || episodeChanges;
  const locked = saving || uploading;
  const canLeave = useLeaveGuard(dirty || locked, locked);
  const { publication, progress, track } = useEditionPublication(m.id);
  const initialRestore = useRef(navigation.restoredEpisode);
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (
      navigation.restoreVersions &&
      !restored.current &&
      section === "版本与文件"
    ) {
      document
        .querySelector<HTMLButtonElement>(
          ".editor-versions .editor-section-heading button:enabled",
        )
        ?.focus({ preventScroll: true });
      restored.current = true;
    }
  }, [navigation.restoreVersions, section]);

  function adopt(next: Media) {
    setBase(next);
    set(fields(next));
    reorder((next.episodes ?? []).map((e) => e.id));
  }

  useEffect(() => {
    if (!dirty && !locked && m.revision !== base.revision) adopt(m);
  }, [m, base.revision, dirty, locked]);

  const initialItems = Object.fromEntries(
    [
      ...[...base.actors, ...(base.directors ?? [])].map((p) => ({
        id: p.id,
        name: p.fullName,
        art: p.portraitId,
      })),
      ...base.franchises.map((f) => ({
        id: f.id,
        name: f.name,
        art: f.coverId,
      })),
    ].map((item) => [item.id, item]),
  );
  function patch(change: Partial<Fields>) {
    set((old) => ({ ...old, ...change }));
    didSave(false);
    fail("");
    setIssue((previous) =>
      previous && previous.field in change ? null : previous,
    );
  }
  function goToDate() {
    tab("基本资料");
    setIssue({ field: "releaseDate", message: "请填写完整有效的发行日期。" });
  }
  async function save() {
    if (locked || !dirty) return;
    const invalid = checkFields(d);
    if (invalid) {
      tab("基本资料");
      setIssue(invalid);
      return;
    }
    busy(true);
    fail("");
    setIssue(null);
    didSave(false);
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
      ] as const) {
        if (JSON.stringify(d[key]) !== JSON.stringify(original[key]))
          Object.assign(payload, { [key]: d[key] });
      }
      if (episodeChanges) payload.episodeOrder = episodeIds;
      const saved = await unwrap(
        api.PATCH("/api/media/{id}", { params, body: payload }),
      );
      adopt(saved);
      cache.setQueryData(["editor", m.id], saved);
      void cache.invalidateQueries();
      didSave(true);
    } catch (e) {
      fail((e as Error).message);
    } finally {
      busy(false);
    }
  }

  const status: SaveStatus = saving
    ? { text: "正在保存资料…" }
    : uploading
      ? { text: "正在上传图片…" }
      : error
        ? { text: "保存失败，修改已保留", tone: "attention" }
        : issue
          ? { text: "请补齐必填项", tone: "attention" }
          : dirty
            ? { text: "有未保存修改", tone: "attention" }
            : saved
              ? { text: "已保存", tone: "positive" }
              : { text: "暂无未保存修改" };
  return (
    <Frame
      tab={section}
      tabs={tabs}
      select={(next) => {
        initialRestore.current = undefined;
        tab(next);
      }}
      title={d.title || m.title}
      identifier={d.identifier}
      poster={d.posterId || d.backdropId}
      backLabel={navigation.inEpisode ? "返回分集列表" : "返回资料列表"}
      back={() => {
        if (canLeave()) back();
      }}
      meta={group ? "分集容器" : m.kind === "episode" ? "单集" : "已发布影片"}
      status={status}
      error={error}
      issue={issue}
      locked={locked}
      actions={
        <button
          className="editor-primary"
          type="button"
          disabled={locked || !dirty}
          onClick={() => void save()}
        >
          {saving ? "保存中…" : "保存资料"}
        </button>
      }
    >
      <CommonFields
        tab={section}
        d={d}
        patch={patch}
        categories={categories}
        initialItems={initialItems}
        legacyYear={base.releaseDate ? null : base.releaseYear}
        issue={issue}
        onUploading={setUploading}
      />
      {section === "分集" && (
        <EpisodeList
          episodes={base.episodes ?? []}
          ids={episodeIds}
          restored={initialRestore.current}
          onOpen={(id) => {
            if (canLeave()) navigation.openEpisode(id);
          }}
          onReorder={(ids) => {
            fail("");
            didSave(false);
            reorder(ids);
          }}
        />
      )}
      {section === "版本与文件" && (
        <>
          {publication?.state === "running" && (
            <div className="editor-notice" role="status">
              正在整理并发布新版本… <a href="#jobs">查看后台任务</a>
            </div>
          )}
          {progress.isError && publication?.state === "running" && (
            <div className="editor-notice" data-tone="attention">
              读取整理进度失败。{" "}
              <button type="button" onClick={() => void progress.refetch()}>
                重试
              </button>
            </div>
          )}
          {publication?.state === "done" && (
            <div className="editor-notice" data-tone="positive" role="status">
              新版本已发布
            </div>
          )}
          {publication?.state === "failed" && (
            <div className="editor-notice" role="alert" data-tone="attention">
              <span>{publication.error}</span>
              <a href="#jobs">查看后台任务</a>
            </div>
          )}
          <PublishedFiles
            media={m}
            dirty={dirty}
            dateRequired={!validReleaseDate(d.releaseDate)}
            publishing={publication?.state === "running"}
            fixDate={goToDate}
            append={() => setAppend(true)}
          />
          {append && (
            <AppendEdition
              media={m}
              close={() => setAppend(false)}
              openIntake={navigation.openIntake}
              done={(row) => {
                setAppend(false);
                track(row);
              }}
            />
          )}
        </>
      )}
    </Frame>
  );
}
