import { useLayoutEffect, useRef, useState } from "react";
import { Art } from "../../shared/Art";
import { Icon } from "../../shared/Icon";
import "./film-stills.css";

export function FilmStills({ ids }: { ids: string[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!ids.length) return null;
  return (
    <section aria-label="剧照">
      <h3>
        剧照 <small>{ids.length} 张</small>
      </h3>
      <div className="film-stills">
        {ids.map((id, index) => (
          <button
            key={id}
            aria-label={`查看第 ${index + 1} 张剧照`}
            onClick={() => setActive(index)}
          >
            <Art id={id} alt="" />
          </button>
        ))}
      </div>
      {active !== null && ids[active] && (
        <StillPreview
          ids={ids}
          index={active}
          select={setActive}
          close={() => setActive(null)}
        />
      )}
    </section>
  );
}

function StillPreview({
  ids,
  index,
  select,
  close,
}: {
  ids: string[];
  index: number;
  select: (index: number) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="剧照预览"
      className="still-preview"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && index > 0) select(index - 1);
        if (e.key === "ArrowRight" && index + 1 < ids.length) select(index + 1);
      }}
    >
      <div className="still-preview-toolbar">
        <strong aria-live="polite">
          剧照 {index + 1} / {ids.length}
        </strong>
        {ids.length > 1 && (
          <>
            <button
              aria-label="上一张"
              disabled={index === 0}
              onClick={() => select(index - 1)}
            >
              <Icon name="arrow" />
            </button>
            <button
              aria-label="下一张"
              disabled={index + 1 === ids.length}
              onClick={() => select(index + 1)}
            >
              <Icon name="chevron" />
            </button>
          </>
        )}
        <button aria-label="关闭剧照预览" autoFocus onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <Art
        id={ids[index]}
        alt={`第 ${index + 1} 张剧照`}
        className="still-preview-image"
      />
    </dialog>
  );
}
