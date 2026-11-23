SET LOCAL search_path = video_x, public;
--> statement-breakpoint
CREATE TABLE storage_roots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  name text NOT NULL,
  mount_path text NOT NULL CHECK (left(mount_path,1) = '/'),
  expected_marker uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','online','offline','identity_mismatch')),
  last_checked_at timestamptz,
  last_complete_scan_at timestamptz,
  scan_enabled boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (library_id, mount_path)
);
--> statement-breakpoint
CREATE TRIGGER storage_roots_revision BEFORE UPDATE ON storage_roots FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TABLE media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_id uuid NOT NULL REFERENCES storage_roots(id),
  relative_path text NOT NULL CHECK (relative_path <> '' AND octet_length(relative_path) <= 2048 AND relative_path !~ '(^/|(^|/)\.\.(/|$))' AND relative_path !~ E'\\\\'),
  file_kind text NOT NULL CHECK (file_kind IN ('video','subtitle','sidecar')),
  content_revision bigint NOT NULL DEFAULT 1 CHECK (content_revision > 0),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  mtime_ns bigint NOT NULL CHECK (mtime_ns >= 0),
  fingerprint_algorithm text,
  fingerprint text,
  availability text NOT NULL DEFAULT 'present' CHECK (availability IN ('present','missing')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  missing_since timestamptz,
  probe_status text NOT NULL DEFAULT 'pending' CHECK (probe_status IN ('not_required','pending','running','succeeded','failed')),
  probed_content_revision bigint CHECK (probed_content_revision > 0),
  probed_at timestamptz,
  probe_version text,
  probe_error_code text,
  container_format text,
  duration_ms bigint CHECK (duration_ms >= 0),
  bitrate_bps bigint CHECK (bitrate_bps >= 0),
  probe_result jsonb CHECK (probe_result IS NULL OR jsonb_typeof(probe_result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (probe_status <> 'succeeded' OR (probed_content_revision IS NOT NULL AND probed_content_revision = content_revision)),
  UNIQUE (root_id, relative_path),
  CHECK ((fingerprint IS NULL) = (fingerprint_algorithm IS NULL)),
  CHECK ((availability='missing') = (missing_since IS NOT NULL))
);
--> statement-breakpoint
CREATE TRIGGER media_files_revision BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TABLE media_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  stream_index integer NOT NULL CHECK (stream_index >= 0),
  kind text NOT NULL CHECK (kind IN ('video','audio','subtitle','attachment','data')),
  codec text,
  language text,
  title text,
  is_default boolean NOT NULL DEFAULT false,
  is_forced boolean NOT NULL DEFAULT false,
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  frame_rate_num integer CHECK (frame_rate_num > 0),
  frame_rate_den integer CHECK (frame_rate_den > 0),
  channels smallint CHECK (channels > 0),
  channel_layout text,
  sample_rate_hz integer CHECK (sample_rate_hz > 0),
  color_transfer text,
  bit_depth smallint CHECK (bit_depth > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (file_id, stream_index),
  CHECK ((frame_rate_num IS NULL) = (frame_rate_den IS NULL))
);
--> statement-breakpoint
CREATE TABLE editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL,
  media_kind text NOT NULL CHECK (media_kind IN ('movie','episode','video')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  cut text,
  language text,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  FOREIGN KEY (media_id, media_kind) REFERENCES media_items (id, kind),
  UNIQUE (id, media_id)
);
--> statement-breakpoint
CREATE TRIGGER editions_revision BEFORE UPDATE ON editions FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TABLE edition_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES editions(id),
  part_no integer NOT NULL CHECK (part_no > 0),
  file_id uuid NOT NULL REFERENCES media_files(id),
  bound_content_revision bigint NOT NULL CHECK (bound_content_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (edition_id, part_no) DEFERRABLE INITIALLY IMMEDIATE,
  UNIQUE (edition_id, file_id),
  UNIQUE (id, edition_id)
);
--> statement-breakpoint
CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  root_id uuid REFERENCES storage_roots(id),
  created_by uuid NOT NULL REFERENCES accounts(id),
  mode text NOT NULL CHECK (mode IN ('scan','selected_files','manual','legacy')),
  is_paused boolean NOT NULL DEFAULT false,
  cancel_requested_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
CREATE TRIGGER import_batches_revision BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TABLE import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id),
  item_key text NOT NULL,
  stage text NOT NULL DEFAULT 'discovered' CHECK (stage IN ('discovered','probed','matched','ready','published')),
  execution_status text NOT NULL DEFAULT 'queued' CHECK (execution_status IN ('queued','running','waiting_user','retry_wait','failed','cancelled','completed')),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft)='object'),
  draft_schema_version integer NOT NULL DEFAULT 2 CHECK (draft_schema_version > 0),
  draft_revision bigint NOT NULL DEFAULT 1 CHECK (draft_revision > 0),
  reviewed_revision bigint CHECK (reviewed_revision > 0),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES accounts(id),
  publish_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  published_media_id uuid REFERENCES media_items(id),
  published_edition_id uuid,
  published_at timestamptz,
  error_code text,
  error_details jsonb CHECK (error_details IS NULL OR jsonb_typeof(error_details)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (batch_id, item_key),
  FOREIGN KEY (published_edition_id, published_media_id) REFERENCES editions (id, media_id),
  CHECK ((stage='published' AND published_media_id IS NOT NULL AND published_at IS NOT NULL AND execution_status='completed') OR (stage<>'published' AND published_media_id IS NULL AND published_edition_id IS NULL AND published_at IS NULL)),
  CHECK ((reviewed_revision IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL) OR (reviewed_revision IS NOT NULL AND reviewed_revision = draft_revision AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)),
  CHECK (stage <> 'published' OR reviewed_revision IS NOT NULL)
);
--> statement-breakpoint
CREATE TRIGGER import_items_revision BEFORE UPDATE ON import_items FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TABLE import_item_files (
  item_id uuid NOT NULL REFERENCES import_items(id),
  file_id uuid NOT NULL REFERENCES media_files(id),
  edition_key text NOT NULL DEFAULT 'default' CHECK (length(btrim(edition_key)) > 0),
  part_no integer NOT NULL CHECK (part_no > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (item_id, edition_key, file_id),
  UNIQUE (item_id, edition_key, part_no) DEFERRABLE INITIALLY IMMEDIATE
);
--> statement-breakpoint
CREATE UNIQUE INDEX imports_one_scan ON import_batches(root_id) WHERE finished_at IS NULL AND mode='scan';
--> statement-breakpoint
CREATE UNIQUE INDEX editions_one_default ON editions(media_id) WHERE is_default AND archived_at IS NULL;
--> statement-breakpoint
CREATE INDEX import_item_files_file_idx ON import_item_files(file_id);
--> statement-breakpoint
CREATE INDEX edition_parts_file_idx ON edition_parts(file_id);
--> statement-breakpoint
CREATE INDEX import_items_queue_idx ON import_items(created_at DESC,id);
