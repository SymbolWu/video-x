import type { ManagementMediaQuery } from "@video-x/contracts";
import { sql } from "../../platform/db.js";

const resolutionBands = {
  "2160p": [2160, null],
  "1080p": [1080, 2160],
  "720p": [720, 1080],
  "576p": [540, 720],
  "480p": [360, 540],
  below360p: [0, 360],
} as const;

const defaultEditionHeight = sql`(
  SELECT CASE WHEN count(*) = count(video.height) THEN min(video.height) END
  FROM video_x.editions edition
  JOIN video_x.edition_parts part ON part.edition_id = edition.id
  JOIN video_x.media_files file ON file.id = part.file_id
  LEFT JOIN LATERAL (
    SELECT stream.height
    FROM video_x.media_streams stream
    WHERE stream.file_id = file.id AND stream.kind = 'video'
      AND file.probe_status = 'succeeded'
      AND file.content_revision = part.bound_content_revision
    ORDER BY stream.stream_index
    LIMIT 1
  ) video ON true
  WHERE edition.media_id = m.id
    AND edition.is_default
    AND edition.archived_at IS NULL
)`;

export function resolutionFilter(
  resolution: ManagementMediaQuery["resolution"],
) {
  if (!resolution) return sql`true`;
  if (resolution === "unknown") return sql`${defaultEditionHeight} IS NULL`;
  const [min, upper] = resolutionBands[resolution];
  if (upper === null) return sql`${defaultEditionHeight} >= ${min}`;
  return sql`${defaultEditionHeight} BETWEEN ${min} AND ${upper - 1}`;
}

export function chineseSubtitlesFilter(
  status: ManagementMediaQuery["chineseSubtitles"],
) {
  if (!status) return sql`true`;
  if (status === "unknown") return sql`m.supports_chinese IS NULL`;
  return sql`m.supports_chinese = ${status === "supported"}`;
}
