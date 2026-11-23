import type { FastifyInstance } from "fastify";
import type { Static } from "@sinclair/typebox";
import * as C from "@video-x/contracts";
import type { Database } from "../../platform/db.js";
import { Playback } from "./service.js";

function readRange(header: string, size: number) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2]) || !size) return null;
  const length = BigInt(size),
    last = length - 1n;
  const low = m[1] ? BigInt(m[1]) : length - BigInt(m[2]!);
  const high = m[1] && m[2] ? BigInt(m[2]) : last;
  if (low >= length || low > high) return null;
  return {
    start: Number(low < 0n ? 0n : low),
    end: Number(high > last ? last : high),
  };
}
export function registerPlayback(
  app: FastifyInstance,
  db: Database,
  root: string,
  auth: { security: Record<string, string[]>[] },
) {
  const playback = new Playback(db, root);
  const schema = (
    operationId: string,
    result: Parameters<typeof C.T.Ref>[0],
  ) => ({
    ...auth,
    operationId,
    tags: ["Playback"],
    response: {
      200: C.T.Ref(result),
      400: C.T.Ref(C.ErrorResponse),
      401: C.T.Ref(C.ErrorResponse),
      404: C.T.Ref(C.ErrorResponse),
      409: C.T.Ref(C.ErrorResponse),
    },
  });
  app.post<{ Body: Static<typeof C.PlaybackRequest> }>(
    "/api/playback/plans",
    {
      schema: {
        ...schema("getPlaybackPlan", C.PlaybackPlan),
        body: C.T.Ref(C.PlaybackRequest),
      },
    },
    (r) => playback.plan(db, r.viewer.id, r.body),
  );
  app.post<{ Body: Static<typeof C.PlaybackOpen> }>(
    "/api/playback/sessions",
    {
      schema: {
        ...schema("openPlayback", C.PlaybackSession),
        body: C.T.Ref(C.PlaybackOpen),
      },
    },
    (r) => playback.open(r.viewer, r.body),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.PlaybackEvent> }>(
    "/api/playback/sessions/:id/events",
    {
      schema: {
        ...schema("reportPlayback", C.PlaybackAck),
        params: C.IdParams,
        body: C.T.Ref(C.PlaybackEvent),
      },
    },
    (r) => playback.event(r.viewer, r.params.id, r.body),
  );
  app.post<{ Params: { id: string } }>(
    "/api/playback/sessions/:id/close",
    {
      schema: { ...schema("closePlayback", C.PlaybackAck), params: C.IdParams },
    },
    (r) => playback.close(r.viewer, r.params.id),
  );
  // The player follows the session's opaque stream URL. Bytes are never serialized through the JSON SDK.
  app.route<{ Params: { id: string } }>({
    method: ["GET", "HEAD"],
    url: "/api/playback/sessions/:id/stream",
    schema: { hide: true, params: C.IdParams },
    handler: async (req, reply) => {
      const { file, size, mime } = await playback.stream(
        req.viewer,
        req.params.id,
      );
      let handedOff = false;
      try {
        reply
          .header("Accept-Ranges", "bytes")
          .header("X-Content-Type-Options", "nosniff");
        const header = req.headers.range;
        const range =
          header === undefined ? undefined : readRange(header, size);
        if (range === null)
          return reply
            .code(416)
            .header("Content-Range", "bytes */" + size)
            .header("Content-Length", 0)
            .send();
        if (range)
          reply
            .code(206)
            .header(
              "Content-Range",
              `bytes ${range.start}-${range.end}/${size}`,
            );
        reply
          .type(mime)
          .header("Content-Length", range ? range.end - range.start + 1 : size);
        if (req.method === "HEAD") return reply.send();
        const body = file.createReadStream({ ...range, autoClose: true });
        handedOff = true;
        return reply.send(body);
      } finally {
        if (!handedOff) await file.close();
      }
    },
  });
}
