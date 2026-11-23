import { useCallback, useEffect, useRef, useState } from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";

type Event = Schemas["PlaybackEvent"];
type Session = Schemas["PlaybackSession"];
type Pending = Event | "close";
const jobs = new Map<string, Promise<string>>();
const read = (key: string): Pending[] =>
  JSON.parse(localStorage.getItem(key) ?? "[]");
function flush(key: string): Promise<string> {
  const running = jobs.get(key);
  if (running) return running;
  const sessionId = key.split("/").pop()!;
  const work = (async () => {
    for (;;) {
      const item = read(key)[0];
      if (!item) return "ack";
      const params = { path: { id: sessionId } };
      const res =
        item === "close"
          ? await api.POST("/api/playback/sessions/{id}/close", { params })
          : await api.POST("/api/playback/sessions/{id}/events", {
              params,
              body: item,
            });
      if (!res.response.ok) {
        if ([400, 404, 409].includes(res.response.status)) {
          localStorage.removeItem(key);
          return "invalid";
        }
        throw Error("观看进度待同步");
      }
      const status = res.data!.status;
      if (status === "taken_over" || status === "closed") {
        localStorage.removeItem(key);
        return status;
      }
      // An acknowledgement from a second tab may already have removed this event.
      const queue = read(key);
      if (JSON.stringify(queue[0]) === JSON.stringify(item)) queue.shift();
      if (queue.length) localStorage.setItem(key, JSON.stringify(queue));
      else localStorage.removeItem(key);
    }
  })().finally(() => jobs.delete(key));
  jobs.set(key, work);
  return work;
}
function queue(key: string, event: Pending) {
  const q = read(key);
  if (q.at(-1) === "close") return;
  const previous = q.at(-1);
  if (
    event !== "close" &&
    event.kind === "progress" &&
    previous &&
    previous !== "close" &&
    previous.kind === "progress"
  )
    q.pop();
  q.push(event);
  localStorage.setItem(key, JSON.stringify(q));
}
function clock(ms: number) {
  const sec = Math.floor(ms / 1000);
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

export function Playback({
  mediaId,
  profileId,
}: {
  mediaId: string;
  profileId: string;
}) {
  const prefix = "vx.play/" + profileId + "/" + mediaId + "/";
  const [plan, setPlan] = useState<Schemas["PlaybackPlan"]>(),
    [session, setSession] = useState<Session>(),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const lastPosition = useRef(0);
  const ref = useRef<HTMLVideoElement>(null),
    active = useRef<Session | undefined>(undefined),
    mounted = useRef(false),
    started = useRef(false),
    positioned = useRef(false),
    seq = useRef(0),
    last = useRef(0),
    opening = useRef(false);
  const sync = useCallback(async () => {
    for (const key of Object.keys(localStorage).filter((k) =>
      k.startsWith(prefix),
    ))
      await flush(key);
  }, [prefix]);
  const refresh = useCallback(async () => {
    await sync();
    const p = await unwrap(
      api.POST("/api/playback/plans", { body: { mediaId, intent: "play" } }),
    );
    if (mounted.current) setPlan(p);
  }, [mediaId, sync]);
  function transmit(kind: Event["kind"]) {
    const s = active.current,
      v = ref.current;
    const seconds = v?.currentTime ?? lastPosition.current;
    if (
      !s ||
      !positioned.current ||
      !Number.isFinite(seconds) ||
      (!started.current && kind !== "start")
    )
      return;
    const key = prefix + s.sessionId;
    queue(key, {
      eventId: crypto.randomUUID(),
      seq: ++seq.current,
      partId: s.partId,
      positionMs: Math.min(s.durationMs, Math.round(seconds * 1000)),
      kind,
    });
    void flush(key)
      .then((status) => {
        if (active.current?.sessionId !== s.sessionId) return;
        if (["taken_over", "closed", "invalid"].includes(status)) {
          active.current = undefined;
          v?.pause();
          setSession(undefined);
          setReady(false);
          setMessage(
            status === "taken_over"
              ? "已在另一设备继续播放。"
              : "请重新打开播放器。",
          );
          void refresh().catch(() => {});
        } else if (mounted.current) setMessage("");
      })
      .catch(() => {
        if (mounted.current) setMessage("观看进度待同步，恢复连接后重试。");
      });
  }
  function closePlayer() {
    const s = active.current;
    if (!s) return;
    if (started.current && !ref.current?.ended) transmit("pause");
    active.current = undefined;
    const key = prefix + s.sessionId;
    queue(key, "close");
    void flush(key)
      .then(() => {
        if (mounted.current) return refresh();
      })
      .catch(() => {
        if (mounted.current) setMessage("观看进度待同步");
      });
  }
  useEffect(() => {
    mounted.current = true;
    void refresh().catch((e) => {
      if (mounted.current) setMessage(e.message);
    });
    const background = () => {
      if (document.hidden && active.current) ref.current?.pause();
    };
    const pageHide = () => {
      if (active.current && started.current) transmit("pause");
    };
    const online = () => {
      void sync().catch(() => {});
    };
    document.addEventListener("visibilitychange", background);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      closePlayer();
      document.removeEventListener("visibilitychange", background);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("online", online);
    };
  }, [refresh, sync]);
  async function open(intent: "play" | "resume" | "restart") {
    if (opening.current || active.current) return;
    opening.current = true;
    setBusy(true);
    setMessage("");
    try {
      await sync();
      const p = await unwrap(
        api.POST("/api/playback/plans", { body: { mediaId, intent } }),
      );
      if (!document.createElement("video").canPlayType(p.mime))
        throw Error("当前浏览器不支持这个视频容器。");
      const s = await unwrap(
        api.POST("/api/playback/sessions", {
          body: { mediaId, intent, requestId: crypto.randomUUID() },
        }),
      );
      if (!mounted.current) {
        queue(prefix + s.sessionId, "close");
        void flush(prefix + s.sessionId).catch(() => {});
        return;
      }
      positioned.current = false;
      started.current = false;
      seq.current = 0;
      last.current = 0;
      lastPosition.current = 0;
      setReady(false);
      active.current = s;
      setSession(s);
    } catch (e) {
      if (mounted.current) setMessage((e as Error).message);
    } finally {
      opening.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function prepare(v: HTMLVideoElement) {
    const s = active.current;
    if (!s || positioned.current) return;
    if (
      Math.abs(v.currentTime * 1000 - s.positionMs) > 2000 ||
      (s.positionMs > 0 && v.currentTime === 0)
    ) {
      setMessage("未能定位到保存的断点，请重试。");
      return;
    }
    positioned.current = true;
    setReady(true);
    void v.play().catch(() => setMessage("点击播放继续。"));
  }
  return (
    <section className="work-player" aria-label="影片播放">
      {session ? (
        <>
          <video
            ref={ref}
            key={session.sessionId}
            src={session.streamUrl}
            controls={ready}
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (session.positionMs > 0)
                v.currentTime = session.positionMs / 1000;
              else prepare(v);
            }}
            onSeeked={(e) => {
              if (!positioned.current) prepare(e.currentTarget);
              else if (started.current) transmit("seek");
            }}
            onPlaying={() => {
              if (positioned.current && !started.current) {
                started.current = true;
                last.current = Date.now();
                transmit("start");
              }
            }}
            onTimeUpdate={(e) => {
              lastPosition.current = e.currentTarget.currentTime;
              if (
                !e.currentTarget.paused &&
                !e.currentTarget.seeking &&
                started.current &&
                Date.now() - last.current >= 10000
              ) {
                last.current = Date.now();
                transmit("progress");
              }
            }}
            onPause={(e) => {
              if (!e.currentTarget.ended) transmit("pause");
            }}
            onEnded={() => {
              transmit("ended");
              active.current = undefined;
              setSession(undefined);
              setReady(false);
              void refresh().catch(() => {});
            }}
            onError={() => {
              positioned.current = false;
              setMessage(
                "当前设备无法读取或解码这个视频，请检查文件或换用支持该编码的播放器。",
              );
            }}
          />
          <button
            onClick={() => {
              closePlayer();
              setSession(undefined);
              setReady(false);
            }}
          >
            退出播放
          </button>
        </>
      ) : (
        <div className="actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void open(plan?.mode === "resume" ? "resume" : "play")
            }
          >
            {busy
              ? "准备中…"
              : plan?.mode === "resume"
                ? "继续播放 · " + clock(plan.positionMs)
                : plan?.completed
                  ? "重新播放"
                  : "播放"}
          </button>
          {(plan?.mode === "resume" || !!message) && (
            <button disabled={busy} onClick={() => void open("restart")}>
              从头播放
            </button>
          )}
        </div>
      )}
      {message && <small role="status">{message}</small>}
    </section>
  );
}
