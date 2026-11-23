SET search_path TO video_x, public;
--> statement-breakpoint
CREATE TABLE media_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  scheme text NOT NULL,
  value text NOT NULL CHECK (length(btrim(value)) > 0),
  normalized_value text NOT NULL CHECK (length(normalized_value) > 0),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, scheme, normalized_value)
);
--> statement-breakpoint
CREATE UNIQUE INDEX media_identifier_primary_uq ON media_identifiers (media_id, scheme) WHERE is_primary;
--> statement-breakpoint
CREATE INDEX media_identifier_lookup_idx ON media_identifiers (scheme, normalized_value);
