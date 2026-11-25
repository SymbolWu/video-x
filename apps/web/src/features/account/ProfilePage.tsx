import "./profile.css";
import { Icon } from "../../shared/Icon";
export function ProfilePage({
  name,
  facts,
  folders,
  watched,
  logout,
}: {
  name: string;
  facts?: { films: number; favorites: number; watched: number };
  folders: () => void;
  watched: () => void;
  logout: () => void;
}) {
  return (
    <section className="vx-profile">
      <span className="vx-profile-avatar">{name.slice(0, 1)}</span>
      <h2>{name}</h2>

      <div className="vx-profile-stats">
        <div>
          <strong>{facts?.films ?? 0}</strong>影片
        </div>
        <div>
          <strong>{facts?.favorites ?? 0}</strong>喜欢
        </div>
        <div>
          <strong>{facts?.watched ?? 0}</strong>已看
        </div>
      </div>
      <button onClick={folders}>
        <Icon name="folder" />
        我的收藏
        <Icon name="chevron" />
      </button>
      <button onClick={watched}>
        <Icon name="check" />
        看过的影片
        <Icon name="chevron" />
      </button>
      <button onClick={logout}>
        <Icon name="discover" />
        退出登录
        <Icon name="chevron" />
      </button>
    </section>
  );
}
