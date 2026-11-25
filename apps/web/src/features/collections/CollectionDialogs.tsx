import type { Schemas } from "@video-x/sdk-ts";
import { Overlay } from "../../shared/Overlay";
import { Icon } from "../../shared/Icon";
export function CollectionDialogs({
  panel,
  detail,
  folders,
  busy,
  name,
  setName,
  setPanel,
  setFolder,
  newFolder,
}: {
  panel: string | null;
  detail: Schemas["Media"] | null;
  folders: Schemas["Collection"][];
  busy: boolean;
  name: string;
  setName: (name: string) => void;
  setPanel: (value: string | null) => void;
  setFolder: (folder: Schemas["Collection"], id: string) => void;
  newFolder: () => void;
}) {
  return (
    <>
      {panel === "collection" && detail && (
        <Overlay title="加入收藏夹" onClose={() => setPanel(null)}>
          <div className="vx-filter-content">
            {folders.map((f) => (
              <button
                key={f.id}
                disabled={busy}
                className="vx-folder-choice"
                onClick={() => setFolder(f, detail.id)}
              >
                <Icon name="folder" />
                <span>
                  {f.name}
                  <small>{f.mediaIds.length} 部影片</small>
                </span>
                <span
                  className={
                    "vx-checkbox " +
                    (f.mediaIds.includes(detail.id) ? "selected" : "")
                  }
                >
                  {f.mediaIds.includes(detail.id) && <Icon name="check" />}
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setName("");
                setPanel("new-folder");
              }}
            >
              新建收藏夹
            </button>
          </div>
          <footer className="vx-panel-footer">
            <button className="vx-primary" onClick={() => setPanel(null)}>
              完成
            </button>
          </footer>
        </Overlay>
      )}
      {panel === "new-folder" && (
        <Overlay
          title="新建收藏夹"
          onClose={() => {
            setName("");
            setPanel(detail ? "collection" : null);
          }}
        >
          <form
            className="vx-create-folder"
            onSubmit={(e) => {
              e.preventDefault();
              newFolder();
            }}
          >
            <label>
              名称
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button disabled={busy || !name.trim()} className="vx-primary">
              创建
            </button>
          </form>
        </Overlay>
      )}
    </>
  );
}
