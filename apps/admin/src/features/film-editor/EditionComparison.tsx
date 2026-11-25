import { useState } from "react";
import type { Schemas } from "@video-x/sdk-ts";

type FileFacts = {
  width?: number | null;
  height?: number | null;
  videoCodec?: string | null;
  durationMs?: number | null;
};

function duration(ms: number | null | undefined) {
  if (ms == null) return "未知";
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 60), seconds % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function VideoFacts({ data }: { data: FileFacts }) {
  return (
    <>
      <dt>画面</dt>
      <dd>
        {data.width && data.height ? data.width + " × " + data.height : "未知"}
      </dd>
      <dt>时长</dt>
      <dd>{duration(data.durationMs)}</dd>
      <dt>编码</dt>
      <dd>{data.videoCodec || "未知"}</dd>
    </>
  );
}

export function EditionComparison({
  previous,
  candidate,
}: {
  previous: Schemas["EditionInfo"];
  candidate: Schemas["ImportRow"];
}) {
  const oldDuration = previous.durationMs ?? 0;
  const durationChanged =
    oldDuration > 0 &&
    candidate.durationMs != null &&
    Math.abs(oldDuration - candidate.durationMs) >=
      Math.max(3000, oldDuration * 0.03);
  const lowerResolution =
    !!previous.width &&
    !!previous.height &&
    !!candidate.width &&
    !!candidate.height &&
    candidate.width * candidate.height < previous.width * previous.height;
  return (
    <section className="edition-comparison" aria-label="新旧文件对照">
      <div className="edition-comparison-grid">
        <div>
          <h3>原文件 {previous.isDefault && <small>默认播放</small>}</h3>
          <p>{previous.filename}</p>
          <dl>
            <VideoFacts data={previous} />
          </dl>
        </div>
        <div>
          <h3>候选文件</h3>
          <p>{candidate.move?.directory || candidate.relativePath}</p>
          <dl>
            <VideoFacts data={candidate} />
          </dl>
        </div>
      </div>
      {(durationChanged || lowerResolution) && (
        <p className="editor-notice" data-tone="attention" role="status">
          {durationChanged
            ? "时长差异较大，可能是不同剪辑，请先试播核对。 "
            : ""}
          {lowerResolution ? "候选文件的分辨率低于原文件。" : ""}
        </p>
      )}
      <CandidatePreview key={candidate.id} id={candidate.id} />
      <p className="edition-comparison-note">
        替换完成后，原文件和原版本进度会保留。新版本从头播放。
        {previous.isDefault ? "默认播放会切到新文件。" : ""}
      </p>
    </section>
  );
}

function CandidatePreview({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return open ? (
    <div className="edition-preview">
      <video
        aria-label="候选文件试播"
        src={"/api/imports/" + id + "/edition-preview"}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
      />
      {failed && <p role="status">浏览器无法试播此文件，请核对格式和编码。</p>}
      <button
        type="button"
        className="editor-quiet"
        onClick={() => {
          setOpen(false);
          setFailed(false);
        }}
      >
        收起试播
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)}>
      试播候选文件
    </button>
  );
}
