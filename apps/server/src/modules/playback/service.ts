import type { Static } from "@sinclair/typebox";
import type {
  PlaybackRequest,
  PlaybackOpen,
  PlaybackEvent,
  PlaybackPlan,
} from "@video-x/contracts";
import {
  AppError,
  Database,
  sql,
  type Transaction,
} from "../../platform/db.js";
import { rootMarker, openVideo } from "../imports/files.js";

import { allowedRoot } from "../imports/layout.js";
type Viewer = { id: string; deviceId: string };
type Reader = Pick<Transaction, "query">;
type Request = Static<typeof PlaybackRequest>;
type Plan = Static<typeof PlaybackPlan>;
const unavailable = () =>
  new AppError(
    409,
    "FILE_UNAVAILABLE",
    "视频离线或文件已变更，请在录入工作台核对。",
  );
const invalid = (msg: string) => new AppError(409, "PLAYBACK_CONFLICT", msg);

async function source(
  tx: Reader,
  root: string,
  mediaId: string,
  partId?: string,
) {
  const [r] =
    await tx.query(sql`SELECT e.id edition,p.id part,p.bound_content_revision,f.content_revision,f.relative_path,
 f.duration_ms,f.size_bytes,f.mtime_ns,f.probe_status,f.availability,f.container_format,r.mount_path,r.expected_marker,
 (SELECT count(*)::int FROM video_x.edition_parts WHERE edition_id=e.id) AS parts,
 (SELECT codec FROM video_x.media_streams WHERE file_id=f.id AND kind='video' ORDER BY stream_index LIMIT 1) video_codec,
 (SELECT codec FROM video_x.media_streams WHERE file_id=f.id AND kind='audio' ORDER BY stream_index LIMIT 1) audio_codec
 FROM video_x.media_items m JOIN video_x.editions e ON e.media_id=m.id
 JOIN video_x.edition_parts p ON p.edition_id=e.id JOIN video_x.media_files f ON f.id=p.file_id
 JOIN video_x.storage_roots r ON r.id=f.root_id WHERE m.id=${mediaId} AND m.published_at IS NOT NULL AND m.archived_at IS NULL
 AND e.archived_at IS NULL AND r.archived_at IS NULL AND ${partId ? sql`p.id=${partId}` : sql`e.is_default`} ORDER BY p.part_no LIMIT 1`);
  if (!r)
    throw new AppError(404, "NO_MEDIA_FILE", "这部作品还没有可播放的文件。");
  if (r.parts !== 1) throw invalid("当前播放器支持单文件版本。");
  if (
    !allowedRoot(root, r.mount_path) ||
    r.availability !== "present" ||
    r.probe_status !== "succeeded" ||
    r.bound_content_revision !== r.content_revision
  )
    throw unavailable();
  return r;
}
async function openChecked(
  root: string,
  r: Awaited<ReturnType<typeof source>>,
) {
  try {
    if ((await rootMarker(r.mount_path)) !== r.expected_marker)
      throw unavailable();
    const opened = await openVideo(r.mount_path, r.relative_path);
    if (opened.size !== r.size_bytes || opened.mtime !== r.mtime_ns) {
      await opened.file.close();
      throw unavailable();
    }
    return opened.file;
  } catch {
    throw unavailable();
  }
}

export class Playback {
  constructor(
    private db: Database,
    private root: string,
  ) {}
  async plan(tx: Reader, profile: string, input: Request): Promise<Plan> {
    const r = await source(tx, this.root, input.mediaId);
    const handle = await openChecked(this.root, r);
    await handle.close();
    const [progress] = await tx.query(
      sql`SELECT part_id,position_ms,completed_at FROM video_x.playback_progress WHERE profile_id=${profile} AND edition_id=${r.edition}`,
    );
    if (progress && progress.part_id !== r.part && input.intent !== "restart")
      throw invalid("原断点对应的文件已更换，请明确选择从头播放。");
    const resumable =
      progress && !progress.completed_at && Number(progress.position_ms) > 0;
    if (input.intent === "resume" && !resumable)
      throw invalid("当前没有可继续的断点，请重新查看播放信息。");
    const mode =
      input.intent === "restart" || progress?.completed_at
        ? "restart"
        : resumable
          ? "resume"
          : "fresh";
    return {
      mediaId: input.mediaId,
      editionId: r.edition,
      partId: r.part,
      mode,
      positionMs: mode === "resume" ? Number(progress!.position_ms) : 0,
      durationMs: Number(r.duration_ms),
      completed: Boolean(progress?.completed_at),
      mime: r.container_format === "mp4" ? "video/mp4" : "video/x-matroska",
      videoCodec: r.video_codec,
      audioCodec: r.audio_codec,
    };
  }
  async open(viewer: Viewer, input: Static<typeof PlaybackOpen>) {
    return this.db.transaction(async (tx) => {
      // Serialize the generation and the fixed start target across devices for this work.
      await tx.query(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${viewer.id + input.mediaId},0))`,
      );
      const [same] = await tx.query(
        sql`SELECT * FROM video_x.playback_sessions WHERE id=${input.requestId}`,
      );
      if (
        same &&
        (same.profile_id !== viewer.id ||
          same.device_id !== viewer.deviceId ||
          same.media_id !== input.mediaId ||
          same.ended_at)
      )
        throw invalid("这次播放会话已不可用。");
      const plan = await this.plan(tx, viewer.id, {
        ...input,
        intent: same ? "restart" : input.intent,
      });
      if (same) {
        if (same.start_part_id !== plan.partId) throw unavailable();
        plan.mode = same.start_mode;
        plan.positionMs = Number(same.start_position_ms);
      } else {
        const [state] =
          await tx.query(sql`INSERT INTO video_x.user_media_state AS s(profile_id,media_id,takeover_generation) VALUES(${viewer.id},${input.mediaId},1)
         ON CONFLICT(profile_id,media_id) DO UPDATE SET takeover_generation=s.takeover_generation+1 RETURNING takeover_generation`);
        await tx.query(
          sql`UPDATE video_x.playback_sessions SET ended_at=now(),end_reason='taken_over' WHERE profile_id=${viewer.id} AND media_id=${input.mediaId} AND ended_at IS NULL`,
        );
        await tx.query(sql`INSERT INTO video_x.playback_sessions(id,profile_id,device_id,media_id,edition_id,start_mode,start_part_id,start_position_ms,takeover_generation)
         VALUES(${input.requestId},${viewer.id},${viewer.deviceId},${input.mediaId},${plan.editionId},${plan.mode},${plan.partId},${plan.positionMs},${state!.takeover_generation})`);
      }
      return {
        ...plan,
        sessionId: input.requestId,
        streamUrl: "/api/playback/sessions/" + input.requestId + "/stream",
      };
    });
  }
  private async session(tx: Reader, viewer: Viewer, id: string, lock = false) {
    const [s] = await tx.query(
      sql`SELECT * FROM video_x.playback_sessions WHERE id=${id} AND profile_id=${viewer.id} AND device_id=${viewer.deviceId} ${lock ? sql`FOR UPDATE` : sql``}`,
    );
    if (!s) throw new AppError(404, "NO_SESSION", "找不到当前设备的播放会话。");
    return s;
  }
  async stream(viewer: Viewer, id: string) {
    const s = await this.session(this.db, viewer, id);
    if (s.ended_at) throw invalid("播放会话已结束。");
    const r = await source(this.db, this.root, s.media_id, s.start_part_id);
    return {
      file: await openChecked(this.root, r),
      size: Number(r.size_bytes),
      mime: r.container_format === "mp4" ? "video/mp4" : "video/x-matroska",
    };
  }
  async event(viewer: Viewer, id: string, evt: Static<typeof PlaybackEvent>) {
    return this.db.transaction(async (tx) => {
      const existing = await this.session(tx, viewer, id);
      // Use the same lock order as open so a takeover and an incoming event cannot deadlock.
      await tx.query(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${viewer.id + existing.media_id},0))`,
      );
      const s = await this.session(tx, viewer, id, true);
      if (s.end_reason === "taken_over") return { status: "taken_over" };
      const [dup] = await tx.query(
        sql`SELECT * FROM video_x.playback_events WHERE session_id=${id} AND (seq=${evt.seq} OR event_id=${evt.eventId})`,
      );
      if (dup) {
        if (
          dup.event_id !== evt.eventId ||
          Number(dup.seq) !== evt.seq ||
          dup.kind !== evt.kind ||
          dup.part_id !== evt.partId ||
          Number(dup.position_ms) !== evt.positionMs
        )
          throw invalid("重复事件的内容不一致。");
        return { status: "ack" };
      }
      if (s.ended_at) return { status: "closed" };
      if (evt.seq <= Number(s.last_seq)) return { status: "stale" };
      if (
        (evt.kind === "start") === s.has_started ||
        evt.partId !== s.start_part_id
      )
        throw invalid("会话尚未正确起播或文件段不匹配。");
      if (
        evt.kind === "start" &&
        (evt.seq !== 1 ||
          Math.abs(evt.positionMs - Number(s.start_position_ms)) > 2000 ||
          (Number(s.start_position_ms) > 0 && evt.positionMs === 0))
      )
        throw invalid("播放器未定位到指定断点，已保留原进度。");
      const r = await source(tx, this.root, s.media_id, s.start_part_id);
      const opened = await openChecked(this.root, r);
      await opened.close();
      if (
        evt.positionMs > Number(r.duration_ms) ||
        (evt.kind === "ended" &&
          Math.abs(evt.positionMs - Number(r.duration_ms)) > 2000)
      )
        throw invalid("播放位置超出文件范围。");
      const ended = evt.kind === "ended";
      await tx.query(sql`INSERT INTO video_x.playback_events(session_id,seq,event_id,edition_id,part_id,position_ms,kind,applied_to_resume)
       VALUES(${id},${evt.seq},${evt.eventId},${s.edition_id},${evt.partId},${evt.positionMs},${evt.kind},true)`);
      await tx.query(
        sql`UPDATE video_x.playback_sessions SET has_started=true,last_seq=${evt.seq},last_received_at=now(),ended_at=CASE WHEN ${ended} THEN now() END,end_reason=CASE WHEN ${ended} THEN 'ended' END WHERE id=${id}`,
      );
      await tx.query(sql`INSERT INTO video_x.playback_progress AS p(profile_id,edition_id,session_id,last_seq,part_id,position_ms,completed_at)
       VALUES(${viewer.id},${s.edition_id},${id},${evt.seq},${evt.partId},${evt.positionMs},CASE WHEN ${ended} THEN now() END)
       ON CONFLICT(profile_id,edition_id) DO UPDATE SET session_id=excluded.session_id,last_seq=excluded.last_seq,part_id=excluded.part_id,position_ms=excluded.position_ms,completed_at=excluded.completed_at,received_at=now()`);
      await tx.query(
        sql`UPDATE video_x.user_media_state SET last_played_at=now(),resume_edition_id=${s.edition_id} WHERE profile_id=${viewer.id} AND media_id=${s.media_id}`,
      );
      return { status: "ack" };
    });
  }
  async close(viewer: Viewer, id: string) {
    await this.db.transaction(async (tx) => {
      const s = await this.session(tx, viewer, id, true);
      if (!s.ended_at)
        await tx.query(
          sql`UPDATE video_x.playback_sessions SET ended_at=now(),end_reason='closed' WHERE id=${id}`,
        );
    });
    return { status: "closed" };
  }
}
