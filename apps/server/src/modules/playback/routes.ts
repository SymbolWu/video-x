import type { FastifyInstance } from "fastify";
import type { Static } from "@sinclair/typebox";
import * as C from "@video-x/contracts";
import type { Database } from "../../platform/db.js";
import { Playback } from "./service.js";

import { sendVideo } from "./video-response.js";

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
      return sendVideo(req, reply, { file, size, mime });
    },
  });
}
