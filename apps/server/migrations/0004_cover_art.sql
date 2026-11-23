SET LOCAL search_path = video_x, public;
--> statement-breakpoint
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  sha256 bytea NOT NULL CHECK (octet_length(sha256)=32),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','ready','failed')),
  unreferenced_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
CREATE TABLE media_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  purpose text NOT NULL CHECK (purpose IN ('poster','backdrop','still')),
  position integer NOT NULL CHECK (position > 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, asset_id, purpose),
  UNIQUE (media_id, purpose, position) DEFERRABLE INITIALLY IMMEDIATE
);
--> statement-breakpoint
ALTER TABLE people ADD COLUMN portrait_asset_id uuid REFERENCES assets(id);
--> statement-breakpoint
ALTER TABLE franchises ADD COLUMN cover_asset_id uuid REFERENCES assets(id);
--> statement-breakpoint
ALTER TABLE media_items ADD COLUMN declared_runtime_ms bigint CHECK (declared_runtime_ms >= 0);
