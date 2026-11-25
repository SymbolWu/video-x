import { useState } from "react";
import { Modal } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";
import { MoveStatus } from "../storage/StoragePicker";
import { DraftCoverage } from "./SourceReview";
import { issue, type Row } from "./queueModel";
export function IntakeCover({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const draft = row.fields.posterId,
    source = row.lookup?.candidate?.posterId;
  const ids = [...new Set([draft, source].filter((id): id is string => !!id))];
  if (!ids.length)
    return (
      <span className="queue-no-cover">
        <StudioIcon name="film" />
        <small>缺封面</small>
      </span>
    );
  return (
    <>
      <button
        type="button"
        className="queue-cover"
        onClick={() => setOpen(true)}
        aria-label={"放大" + row.fields.title + "的封面"}
      >
        <img src={"/api/art/" + ids[0]} alt="" />
        <small>{draft ? "草稿" : "候选"}</small>
      </button>
      {open && (
        <Modal
          title={"封面预览 · " + row.fields.title}
          close={() => setOpen(false)}
        >
          <div className="cover-compare">
            {ids.map((id) => (
              <figure key={id}>
                <figcaption>
                  {id === draft
                    ? id === source
                      ? "草稿与来源封面"
                      : "当前草稿"
                    : "来源候选"}
                </figcaption>
                <img src={"/api/art/" + id} alt={row.fields.title + "封面"} />
              </figure>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export function ReviewCard({
  row: r,
  edit,
  compare,
}: {
  row: Row;
  edit: () => void;
  compare?: () => void;
}) {
  return (
    <article>
      <IntakeCover row={r} />
      <div>
        <h3>{r.fields.title}</h3>
        <p>
          {[...r.actors, ...(r.fields.sourceNames?.actors ?? [])].join("、") ||
            "无演员"}{" "}
          · {r.categoryName} ·{" "}
          {r.fields.releaseDate ?? r.fields.releaseYear ?? "日期未知"}
        </p>
        <p>
          本地文件探测 ·{" "}
          {[...r.series, ...(r.fields.sourceNames?.series ?? [])].join("、") ||
            "未关联系列"}
        </p>
        <p className="ig-muted">{r.relativePath}</p>
        <MoveStatus row={r} />
        <p>{r.fields.summary || "暂无简介"}</p>
        <DraftCoverage row={r} />
        {r.lookup?.candidate && compare && (
          <button type="button" className="cell-action" onClick={compare}>
            核对来源字段
          </button>
        )}
        <div className="ig-gaps">
          {issue(r) && <span className="ig-error">{issue(r)}</span>}
        </div>
      </div>
      <a
        href={"#draft/" + r.id}
        onClick={(e) => {
          e.preventDefault();
          edit();
        }}
      >
        修改 ↗
      </a>
    </article>
  );
}
