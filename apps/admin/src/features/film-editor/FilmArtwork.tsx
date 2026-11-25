import { useRef, useState, type ReactNode } from "react";
import { ErrorNotice, Modal } from "@video-x/ui";
import { uploadArtwork } from "../../shared/Artwork";
import { StudioIcon } from "../../shared/StudioIcon";
import { moveItem } from "./moveItem";
import type { Fields } from "./FilmWorkspace";
import "./film-artwork.css";

type CoverKey = "posterId" | "backdropId";
type Target = CoverKey | "stillIds";
const coverTypes: { key: CoverKey; title: string; use: string }[] = [
  { key: "posterId", title: "竖版海报", use: "2∶3 预览 · 海报卡片" },
  { key: "backdropId", title: "横版封面", use: "16∶9 预览 · 横图与影片详情" },
];
const stillLimit = 100;

function ArtworkImage({ id, label }: { id: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="editor-image-empty">图片读取失败</span>
  ) : (
    <img
      src={"/api/art/" + id}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function PositionDialog({
  current,
  total,
  close,
  move,
}: {
  current: number;
  total: number;
  close: () => void;
  move: (position: number) => void;
}) {
  const [value, setValue] = useState(String(current + 1));
  const next = Number(value);
  const valid =
    Number.isInteger(next) && next > 0 && next <= total && next !== current + 1;
  return (
    <Modal title="调整剧照位置" close={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) move(next - 1);
        }}
      >
        <label className="editor-field">
          移动到第几位
          <input
            type="number"
            min={1}
            max={total}
            value={value}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setValue(event.target.value)}
          />
          <small>位置范围 1 至 {total}。</small>
        </label>
        <div className="actions">
          <button type="button" onClick={close}>
            取消
          </button>
          <button type="submit" className="primary" disabled={!valid}>
            移动
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FilmArtwork({
  mode,
  d,
  patch,
  onUploading,
}: {
  mode: "封面" | "剧照";
  d: Fields;
  patch: (p: Partial<Fields>) => void;
  onUploading: (uploading: boolean) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const target = useRef<Target>("posterId");
  const [error, setError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [preview, setPreview] = useState<CoverKey | number>();
  const [position, setPosition] = useState<number>();
  const stills = d.stillIds ?? [];

  function choose(key: Target) {
    target.current = key;
    if (imageInput.current) {
      imageInput.current.multiple = key === "stillIds";
      imageInput.current.click();
    }
  }
  async function upload(files: File[]) {
    if (!files.length) return;
    const current = target.current;
    const remaining = current === "stillIds" ? stillLimit - stills.length : 1;
    if (files.length > remaining) {
      setError("最多保留 " + stillLimit + " 张剧照，请减少本次选择的图片。");
      return;
    }
    setError("");
    onUploading(true);
    const ids: string[] = [];
    const failures: string[] = [];
    try {
      for (const file of files) {
        try {
          ids.push(await uploadArtwork(file));
        } catch (err) {
          failures.push(file.name + "：" + (err as Error).message);
        }
      }
      if (ids.length) {
        if (current === "stillIds")
          patch({ stillIds: [...new Set([...stills, ...ids])] });
        else patch({ [current]: ids[0] });
      }
      setError(failures.join("；"));
    } finally {
      onUploading(false);
    }
  }

  const selectFile = (
    <input
      ref={imageInput}
      type="file"
      accept="image/jpeg,image/png"
      hidden
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void upload(files);
      }}
    />
  );
  function move(from: number, to: number) {
    patch({ stillIds: moveItem(stills, from, to) });
  }
  function emptyImage(content: ReactNode) {
    return (
      <div className="editor-image-empty">
        <StudioIcon name="landscape" />
        {content}
      </div>
    );
  }

  const currentCover = coverTypes.find((type) => type.key === preview);
  const currentImage =
    typeof preview === "number"
      ? stills[preview]
      : currentCover && d[currentCover.key];
  const title =
    currentCover?.title ??
    (typeof preview === "number"
      ? "剧照 · " + (preview + 1) + " / " + stills.length
      : "");
  return (
    <>
      {selectFile}
      <ErrorNotice error={error} />
      {mode === "封面" ? (
        <div className="editor-cover-layout">
          {coverTypes.map(({ key, title, use }) => {
            const image = d[key];
            const upload = (
              <button
                type="button"
                aria-label={(image ? "替换" : "选择") + title}
                onClick={() => choose(key)}
              >
                {image ? "替换" : "选择图片"}
              </button>
            );
            return (
              <section className="editor-cover" key={key}>
                <h2>{title}</h2>
                <p>{use}</p>
                <div
                  className="editor-cover-image"
                  data-portrait={key === "posterId" || undefined}
                >
                  {image ? (
                    <ArtworkImage key={image} id={image} label={title} />
                  ) : (
                    emptyImage(
                      <>
                        <span>未设置</span>
                        {upload}
                      </>,
                    )
                  )}
                </div>
                {image && (
                  <div className="editor-inline-actions">
                    {upload}
                    <button
                      type="button"
                      aria-label={"预览" + title}
                      onClick={() => setPreview(key)}
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      className="editor-quiet"
                      aria-label={"移除" + title}
                      onClick={() => patch({ [key]: null })}
                    >
                      移除
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <header className="editor-section-heading">
            <h2>
              剧照 <small>{stills.length}</small>
            </h2>
            <div className="editor-inline-actions">
              {stills.length > 0 && (
                <button
                  type="button"
                  aria-pressed={ordering}
                  onClick={() => setOrdering(!ordering)}
                >
                  {ordering ? "完成整理" : "调整顺序"}
                </button>
              )}
              <button
                type="button"
                disabled={stills.length >= stillLimit}
                onClick={() => choose("stillIds")}
              >
                <StudioIcon name="plus" />
                添加剧照
              </button>
            </div>
          </header>
          {stills.length ? (
            <ol className="editor-still-grid">
              {stills.map((id, index) => (
                <li key={id}>
                  <button
                    type="button"
                    className="editor-still-preview"
                    aria-label={"预览第 " + (index + 1) + " 张剧照"}
                    onClick={() => setPreview(index)}
                  >
                    <ArtworkImage id={id} label="" />
                  </button>
                  {ordering && (
                    <div className="editor-still-order">
                      <button
                        type="button"
                        className="editor-quiet"
                        aria-label={"调整第 " + (index + 1) + " 张剧照的位置"}
                        onClick={() => setPosition(index)}
                      >
                        第 {index + 1} 位
                      </button>
                      <div className="editor-inline-actions">
                        <button
                          type="button"
                          disabled={!index}
                          aria-label={"前移第 " + (index + 1) + " 张剧照"}
                          onClick={() => move(index, index - 1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={index === stills.length - 1}
                          aria-label={"后移第 " + (index + 1) + " 张剧照"}
                          onClick={() => move(index, index + 1)}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          aria-label={"移除第 " + (index + 1) + " 张剧照"}
                          onClick={() =>
                            patch({
                              stillIds: stills.filter((item) => item !== id),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            emptyImage("还没有剧照")
          )}
        </>
      )}
      {currentImage && (
        <Modal title={title} close={() => setPreview(undefined)}>
          <div
            className="film-image-preview"
            data-portrait={currentCover?.key === "posterId" || undefined}
          >
            <ArtworkImage key={currentImage} id={currentImage} label={title} />
          </div>
          {typeof preview === "number" && (
            <div className="actions editor-preview-actions">
              <button
                type="button"
                disabled={preview === 0}
                onClick={() => setPreview(preview - 1)}
              >
                上一张
              </button>
              <button
                type="button"
                disabled={preview === stills.length - 1}
                onClick={() => setPreview(preview + 1)}
              >
                下一张
              </button>
            </div>
          )}
        </Modal>
      )}
      {position !== undefined && (
        <PositionDialog
          current={position}
          total={stills.length}
          close={() => setPosition(undefined)}
          move={(next) => {
            move(position, next);
            setPosition(undefined);
          }}
        />
      )}
    </>
  );
}
