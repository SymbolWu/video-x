import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api, unwrap } from "@video-x/sdk-ts";
import { ErrorNotice } from "@video-x/ui";
import { StudioIcon } from "../../shared/StudioIcon";
import "./system-status.css";
import { StoragePicker, useStorage } from "../storage/StoragePicker";
import { formatBytes as bytes } from "../../shared/formatBytes";
type Tone = "ok" | "warn" | "info";
function Line({
  title,
  detail,
  tag,
  tone = "info",
}: {
  title: string;
  detail: string;
  tag: string;
  tone?: Tone;
}) {
  return (
    <div className="sys-line">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span className={"sys-tag " + tone}>{tag}</span>
    </div>
  );
}
function Space({
  name,
  space,
}: {
  name: string;
  space: { used: number; total: number; available: number };
}) {
  return (
    <div className="sys-space">
      <div>
        <span>可用 {bytes(space.available)}</span>
      </div>
      <progress
        aria-label={name + "已用空间"}
        max={space.total || 1}
        value={space.used}
      />
      <p>
        已用 {bytes(space.used)} / {bytes(space.total)}
      </p>
    </div>
  );
}
function Card({
  name,
  icon,
  children,
}: {
  name: string;
  icon: "folder" | "activity" | "settings";
  children: ReactNode;
}) {
  return (
    <article className="sys-card">
      <h2>
        <StudioIcon name={icon} />
        {name}
      </h2>
      {children}
    </article>
  );
}
export function SystemStatus() {
  const storage = useStorage(),
    [picking, pick] = useState(false),
    [saved, notice] = useState("");
  const query = useQuery({
    queryKey: ["operations", "status"],
    refetchInterval: 15000,
    queryFn: async () => {
      const time = performance.now();
      const status = await unwrap(api.GET("/api/system/status"));
      return { status, latency: Math.round(performance.now() - time) };
    },
  });
  const s = query.data?.status;
  const rootLabels: Record<string, string> = {
    online: "已连接",
    offline: "离线或缺少标识",
    mismatch: "盘标识不符",
    unregistered: "待登记",
  };
  return (
    <section className="sys-page">
      <header>
        <div>
          <h1>系统状态</h1>
          <p>
            {s
              ? "最近检查 " + new Date(s.checkedAt).toLocaleTimeString("zh-CN")
              : "读取服务状态…"}
          </p>
        </div>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <StudioIcon name="refresh" />
          刷新
        </button>
      </header>
      <ErrorNotice error={query.error} />
      {s && (
        <div className="sys-grid">
          <Card name="媒体存储" icon="folder">
            <Line
              title="录入工作区"
              detail={s.media.path + " · 下载暂存与整理入库"}
              tag={rootLabels[s.media.state] ?? "未知"}
              tone={s.media.state === "online" ? "ok" : "warn"}
            />
            <div className="sys-line">
              <div>
                <strong>下载目录</strong>
                <p>
                  {storage.data?.inbox
                    ? [storage.data.volume, storage.data.inbox].join(" / ")
                    : "尚未选择"}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  !storage.data?.volume && !storage.data?.inboxVolumes?.length
                }
                onClick={() => {
                  notice("");
                  pick(true);
                }}
              >
                选择下载目录
              </button>
            </div>
            <ErrorNotice error={storage.error} />
            {saved && <small role="status">{saved}</small>}
            {picking && (
              <StoragePicker
                configure
                close={() => pick(false)}
                finished={(msg) => {
                  pick(false);
                  notice(msg);
                }}
              />
            )}
            <Line
              title="待发布草稿"
              detail="已保存到录入工作台"
              tag={s.pending + " 条"}
            />
            <Line
              title="图片存储"
              detail={
                s.art.path +
                " · 封面、剧照与头像等 · 已登记 " +
                bytes(s.art.bytes)
              }
              tag={
                s.art.state === "writable"
                  ? "可写"
                  : s.art.state === "readonly"
                    ? "只读"
                    : "目录不可用"
              }
              tone={s.art.state === "writable" ? "ok" : "warn"}
            />
            <section className="sys-disks" aria-labelledby="sys-disk-title">
              <h3 id="sys-disk-title">影片盘</h3>
              {s.mediaRoots === undefined ? (
                <p>暂未获得影片盘状态。</p>
              ) : s.mediaRoots.length === 0 ? (
                <p>未配置单独的影片盘。</p>
              ) : (
                <ul>
                  {s.mediaRoots.map((disk) => (
                    <li key={disk.path}>
                      <Line
                        title={disk.name}
                        detail={disk.path}
                        tag={rootLabels[disk.state] ?? "未知"}
                        tone={disk.state === "online" ? "ok" : "warn"}
                      />
                      {disk.space ? (
                        <>
                          <Space name={disk.name} space={disk.space} />
                          {disk.capacityCheckedAt && (
                            <p>
                              容量采样{" "}
                              {new Date(
                                disk.capacityCheckedAt,
                              ).toLocaleTimeString("zh-CN")}
                            </p>
                          )}
                        </>
                      ) : disk.state === "online" ? (
                        <p>暂无可信的容量读数</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Card>
          <Card name="服务与恢复" icon="settings">
            <Line
              title="API"
              detail={"状态请求往返 " + query.data!.latency + " ms"}
              tag={query.isError ? "上次读数" : "已响应"}
              tone={query.isError ? "warn" : "ok"}
            />
            <Line
              title="后台 Worker"
              detail={
                s.worker?.lastSeen
                  ? "最近心跳 " +
                    new Date(s.worker.lastSeen).toLocaleTimeString("zh-CN")
                  : "等待队列消费者心跳"
              }
              tag={
                s.worker === null
                  ? "未知"
                  : s.worker.count
                    ? s.worker.count + " 个在线"
                    : "未检测到"
              }
              tone={s.worker?.count ? "ok" : "warn"}
            />
            <Line
              title="PostgreSQL"
              detail={s.postgres}
              tag="查询成功"
              tone="ok"
            />
            <Line
              title="FFprobe / FFmpeg"
              detail={
                "FFprobe " +
                (s.ffprobe ?? "不可用") +
                " · FFmpeg " +
                (s.ffmpeg ?? "不可用")
              }
              tag={s.ffprobe && s.ffmpeg ? "可用" : "需检查"}
              tone={s.ffprobe && s.ffmpeg ? "ok" : "warn"}
            />
            <Line
              title="在线抓取插件"
              detail={s.sources.join("、") || "尚未注册抓取插件"}
              tag={s.sources.length ? "已注册" : "未配置"}
              tone={s.sources.length ? "info" : "warn"}
            />
          </Card>
          <Card name="发布与运行" icon="activity">
            <Line
              title="当前版本"
              detail={"video-x " + s.version}
              tag={s.compose ? "Docker Compose" : "Node.js"}
            />
            <Line
              title="自动恢复"
              detail={
                s.compose
                  ? "项目容器策略 unless-stopped · Mac 登录启动需宿主验收"
                  : "Mac 登录后恢复需由宿主配置并验收"
              }
              tag="待验证"
              tone="warn"
            />
            <Line
              title="访问范围"
              detail={
                "API 监听 " +
                s.listenHost +
                " · 允许的 Web 来源 " +
                (s.origins.join("、") || "无")
              }
              tag="当前配置"
            />
          </Card>
        </div>
      )}
    </section>
  );
}
