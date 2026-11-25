import { api, type Schemas } from "@video-x/sdk-ts";
type Event = Schemas["PlaybackEvent"];

type Pending = Event | "close";
const jobs = new Map<string, Promise<string>>();
const read = (key: string): Pending[] =>
  JSON.parse(localStorage.getItem(key) ?? "[]");
export function flush(key: string): Promise<string> {
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
export function queue(key: string, event: Pending) {
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
