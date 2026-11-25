import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { ErrorNotice, Modal } from "@video-x/ui";
import { DirectoryTree, useStorage } from "../storage/StoragePicker";
import { StudioIcon } from "../../shared/StudioIcon";
import { EditionComparison } from "./EditionComparison";

export function ReplaceEdition({
  mediaId,
  previous,
  close,
  done,
}: {
  mediaId: string;
  previous: Schemas["EditionInfo"];
  close: () => void;
  done: (row: Schemas["ImportRow"]) => void;
}) {
  const storage = useStorage();
  const inbox = storage.data?.inbox;
  const volumeId = storage.data?.inboxVolumeId;
  const [picking, pick] = useState(false);
  const [dir, navigate] = useState("");
  const [selected, select] = useState("");
  const [candidate, setCandidate] = useState<Schemas["ReplacementFileInfo"]>();
  const [stem, rename] = useState("");
  const [settled, setSettled] = useState("");
  const [checkingFile, setCheckingFile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, fail] = useState("");
  const params = { path: { id: mediaId, editionId: previous.id } };
  const expectedRevision = previous.revision!;
  const busy = checkingFile || publishing;
  const source =
    candidate && volumeId
      ? { volumeId, relativePath: candidate.relativePath }
      : undefined;
  const previewUrl =
    candidate && source
      ? "/api/storage/replacement-preview?" +
        new URLSearchParams({
          ...source,
          fileVersion: candidate.fileVersion,
          format: candidate.format,
        }).toString()
      : "";
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(stem), 250);
    return () => window.clearTimeout(timer);
  }, [stem]);

  const name = useQuery({
    queryKey: [
      "replacement-name",
      mediaId,
      previous.id,
      volumeId,
      candidate?.relativePath,
      candidate?.fileVersion,
      settled,
    ],
    enabled: !!candidate && !!source && !picking && settled === stem && !!stem,
    retry: false,
    staleTime: 0,
    queryFn: () =>
      unwrap(
        api.POST("/api/media/{id}/editions/{editionId}/replacement/name", {
          params,
          body: {
            ...source!,
            expectedRevision,
            fileVersion: candidate!.fileVersion,
            stem: settled,
          },
        }),
      ),
  });

  async function inspect() {
    if (!inbox || !volumeId || !selected || busy) return;
    setCheckingFile(true);
    fail("");
    try {
      const file = await unwrap(
        api.POST("/api/media/{id}/editions/{editionId}/replacement/inspect", {
          params,
          body: {
            expectedRevision,
            volumeId,
            relativePath: inbox + "/" + selected,
          },
        }),
      );
      setCandidate(file);
      rename(file.suggestedStem);
      setSettled(file.suggestedStem);
      pick(false);
    } catch (error) {
      fail((error as Error).message);
    } finally {
      setCheckingFile(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!source || !candidate || !canPublish) return;
    setPublishing(true);
    fail("");
    try {
      const row = await unwrap(
        api.POST("/api/media/{id}/editions/{editionId}/replacement", {
          params,
          body: {
            ...source,
            expectedRevision,
            fileVersion: candidate.fileVersion,
            stem,
            requestId: candidate.requestId,
          },
        }),
      );
      done(row);
    } catch (error) {
      fail((error as Error).message);
      void name.refetch();
    } finally {
      setPublishing(false);
    }
  }

  const canPublish =
    !busy &&
    !picking &&
    !!stem &&
    settled === stem &&
    !name.isFetching &&
    !!name.data?.path;
  const nameError =
    stem && settled === stem
      ? name.data?.error || (name.error as Error | null)?.message
      : "";
  return (
    <Modal title="替换播放文件" close={() => !busy && close()}>
      {picking && inbox && volumeId ? (
        <fieldset
          className="storage-picker edition-download-picker"
          disabled={busy}
        >
          <div className="vx-device">
            <StudioIcon name="folder" />
            <div>
              <strong>{storage.data?.volume}</strong>
              <small>{inbox}</small>
            </div>
          </div>
          <Suspense fallback={<p role="status">读取下载目录…</p>}>
            <DirectoryTree
              area="inbox"
              title={inbox.split("/").at(-1) ?? inbox}
              volumeId={volumeId}
              inbox={inbox}
              dir={dir}
              onDir={navigate}
              files={selected ? [selected] : []}
              onFile={select}
              single
              close={() => pick(false)}
            />
          </Suspense>
          <ErrorNotice error={error} />
          <footer className="edition-actions">
            <button
              type="button"
              onClick={() => {
                pick(false);
                fail("");
              }}
            >
              返回
            </button>
            <button
              type="button"
              className="editor-primary"
              disabled={busy || !selected}
              onClick={() => void inspect()}
            >
              {checkingFile ? "正在检测…" : "选用文件"}
            </button>
          </footer>
        </fieldset>
      ) : (
        <form
          className="relation-picker edition-replacement-form"
          onSubmit={(event) => void submit(event)}
        >
          <div className="edition-source-field">
            <div>
              <strong id="replacement-source">来源文件</strong>
              <span>
                {candidate?.relativePath ??
                  (inbox
                    ? `${storage.data?.volume} / ${inbox}`
                    : "尚未设置下载目录")}
              </span>
            </div>
            <button
              type="button"
              disabled={busy || !inbox || !volumeId}
              aria-describedby="replacement-source"
              onClick={() => {
                pick(true);
                fail("");
              }}
            >
              {candidate ? "重新选择" : "选择文件"}
            </button>
          </div>
          {!inbox && !storage.isPending && (
            <a href="#settings">前往系统状态设置下载目录</a>
          )}
          <ErrorNotice error={storage.error || error} />
          {candidate && (
            <>
              <label className="editor-field">
                入库文件名
                <span className="edition-filename">
                  <input
                    value={stem}
                    maxLength={300}
                    disabled={busy}
                    aria-invalid={!!nameError}
                    aria-describedby="replacement-name-result"
                    onChange={(event) => {
                      rename(event.target.value);
                      fail("");
                    }}
                  />
                  <span>{candidate.extension}</span>
                </span>
              </label>
              <div
                id="replacement-name-result"
                className="edition-target-path"
                aria-live="polite"
              >
                <strong>入库位置</strong>
                <span>{candidate.targetDirectory}</span>
                {nameError ? (
                  <small data-tone="attention">{nameError}</small>
                ) : name.data?.path && settled === stem ? (
                  <small>入库为 {name.data.path.split("/").at(-1)}</small>
                ) : (
                  <small>{stem ? "正在检查文件名…" : "请输入文件名。"}</small>
                )}
              </div>
              <EditionComparison
                previous={previous}
                candidate={candidate}
                previewUrl={previewUrl}
              />
            </>
          )}
          <footer className="edition-actions">
            <button type="button" onClick={close} disabled={busy}>
              取消
            </button>
            <button
              type="submit"
              className="editor-primary"
              disabled={!canPublish}
            >
              {publishing ? "正在提交…" : "确认替换"}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
