ALTER TABLE video_x.import_items ADD COLUMN merged_into_id uuid REFERENCES video_x.import_items(id);
--> statement-breakpoint
CREATE TABLE video_x.import_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES video_x.import_items(id),
  provider text NOT NULL,
  query text NOT NULL,
  state text NOT NULL CHECK (state IN ('queued','running','choices','succeeded','failed')),
  candidate jsonb,
  choices jsonb NOT NULL DEFAULT '[]',
  message text,
  applied_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE INDEX import_lookups_item_idx ON video_x.import_lookups(item_id,created_at DESC,id DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX import_lookup_active ON video_x.import_lookups(item_id) WHERE state IN ('queued','running');
