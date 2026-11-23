SET LOCAL search_path TO video_x,public;
--> statement-breakpoint
ALTER TABLE user_media_state
 ADD COLUMN last_played_at timestamptz,
 ADD COLUMN resume_edition_id uuid,
 ADD COLUMN takeover_generation bigint NOT NULL DEFAULT 0 CHECK (takeover_generation>=0),
 ADD FOREIGN KEY(resume_edition_id,media_id) REFERENCES editions(id,media_id);
--> statement-breakpoint
DROP TRIGGER user_media_state_revision ON user_media_state;
--> statement-breakpoint
CREATE TRIGGER user_media_state_revision BEFORE UPDATE OF is_favorite,favorited_at,rating,watched_at ON user_media_state FOR EACH ROW EXECUTE FUNCTION video_x.touch_state_revision();
--> statement-breakpoint
CREATE TABLE playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  device_id uuid NOT NULL,
  media_id uuid NOT NULL REFERENCES media_items(id),
  edition_id uuid NOT NULL,
  start_mode text NOT NULL CHECK (start_mode IN ('fresh','resume','restart')),
  start_part_id uuid NOT NULL,
  start_position_ms bigint NOT NULL CHECK (start_position_ms >= 0),
  takeover_generation bigint NOT NULL CHECK (takeover_generation > 0),
  last_seq bigint NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
  has_started boolean NOT NULL DEFAULT false,
  last_received_at timestamptz,
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('ended','closed','taken_over','expired')),
  created_at timestamptz NOT NULL DEFAULT now() ,
  FOREIGN KEY (device_id, profile_id) REFERENCES devices (id, profile_id),
  FOREIGN KEY (edition_id, media_id) REFERENCES editions (id, media_id),
  UNIQUE (id, profile_id, edition_id),
  UNIQUE (id, edition_id),
  UNIQUE (profile_id, media_id, takeover_generation),
  CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
  FOREIGN KEY (start_part_id, edition_id) REFERENCES edition_parts (id, edition_id),
  CHECK (start_mode='resume' OR start_position_ms=0)
);
--> statement-breakpoint
CREATE INDEX playback_history_idx ON playback_sessions (profile_id, created_at DESC, id) WHERE has_started;
--> statement-breakpoint
CREATE TABLE playback_events (
  session_id uuid NOT NULL,
  seq bigint NOT NULL CHECK (seq > 0),
  event_id uuid NOT NULL UNIQUE,
  edition_id uuid NOT NULL,
  part_id uuid NOT NULL,
  position_ms bigint NOT NULL CHECK (position_ms >= 0),
  kind text NOT NULL CHECK (kind IN ('start','progress','pause','seek','ended')),
  client_occurred_at timestamptz,
  applied_to_resume boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, edition_id) REFERENCES playback_sessions (id, edition_id),
  FOREIGN KEY (part_id, edition_id) REFERENCES edition_parts (id, edition_id)
);
--> statement-breakpoint
CREATE INDEX playback_events_retention_idx ON playback_events (created_at);
--> statement-breakpoint
CREATE TABLE playback_progress (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  edition_id uuid NOT NULL REFERENCES editions(id),
  session_id uuid NOT NULL,
  last_seq bigint NOT NULL CHECK (last_seq > 0),
  part_id uuid NOT NULL,
  position_ms bigint NOT NULL CHECK (position_ms >= 0),
  completed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (profile_id, edition_id),
  FOREIGN KEY (session_id, profile_id, edition_id) REFERENCES playback_sessions (id, profile_id, edition_id),
  FOREIGN KEY (session_id, last_seq) REFERENCES playback_events (session_id, seq),
  FOREIGN KEY (part_id, edition_id) REFERENCES edition_parts (id, edition_id)
);
