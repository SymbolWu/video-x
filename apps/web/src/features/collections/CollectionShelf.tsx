import "./collections.css";
import type { Schemas } from "@video-x/sdk-ts";
import { Icon } from "../../shared/Icon";
export function CollectionShelf({
  folders,
  open,
  create,
  favorites,
}: {
  folders: Schemas["Collection"][];
  open: (name: string, id: string) => void;
  create: () => void;
  favorites?: number;
}) {
  return (
    <>
      <div className="vx-section-heading">
        <h2>收藏夹</h2>
        <button onClick={create}>
          <Icon name="plus" size={15} />
          新建收藏夹
        </button>
      </div>
      <div className="collection-grid">
        {" "}
        {folders.map((f) => (
          <button
            key={f.id}
            className="vx-collection"
            onClick={() => open(f.name, f.id)}
          >
            <div className="vx-cover-stack">
              {f.coverId ? (
                <img alt="" src={"/api/art/" + f.coverId} />
              ) : (
                <Icon name="folder" size={38} />
              )}
            </div>
            <div>
              <b>{f.name}</b>
              <span>
                {f.mediaIds.length} 部影片
                {f.description ? " · " + f.description : ""}
              </span>
            </div>
            <Icon name="chevron" />
          </button>
        ))}
      </div>{" "}
      <div className="vx-section-heading">
        <h2>我喜欢的</h2>
        <span>{favorites ?? "…"} 部</span>
      </div>
    </>
  );
}
