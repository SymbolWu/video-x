CREATE SCHEMA video_x;
--> statement-breakpoint
SET LOCAL search_path = video_x, public;
--> statement-breakpoint
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username = lower(btrim(username)) AND length(username) BETWEEN 1 AND 80),
  password_hash text NOT NULL,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
COMMENT ON TABLE accounts IS 'M1 · 登录账号';
--> statement-breakpoint
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
COMMENT ON TABLE profiles IS 'M1 · 个人资料';
--> statement-breakpoint
CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  installation_id uuid NOT NULL,
  client_kind text NOT NULL CHECK (client_kind IN ('web','android')),
  display_name text NOT NULL,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (profile_id, installation_id),
  UNIQUE (id, profile_id)
);
--> statement-breakpoint
COMMENT ON TABLE devices IS 'M1 · 已登记客户端';
--> statement-breakpoint
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id),
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
--> statement-breakpoint
CREATE INDEX auth_sessions_device_idx ON auth_sessions (device_id);
--> statement-breakpoint
COMMENT ON TABLE auth_sessions IS 'M1 · 登录会话';
--> statement-breakpoint
CREATE TABLE libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
COMMENT ON TABLE libraries IS 'M1 · 逻辑媒体库';
--> statement-breakpoint
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{0,63}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  parent_id uuid REFERENCES categories(id),
  description text,
  position integer NOT NULL CHECK (position > 0),
  is_visible boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  CHECK (parent_id IS DISTINCT FROM id),
  CHECK (NOT is_system OR (code='unsorted' AND parent_id IS NULL AND archived_at IS NULL))
);
--> statement-breakpoint
CREATE INDEX categories_parent_order_idx ON categories (parent_id, position, id) WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX categories_system_uq ON categories (is_system) WHERE is_system;
--> statement-breakpoint
COMMENT ON TABLE categories IS 'M1 · 主分类树';
--> statement-breakpoint
CREATE TABLE media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  kind text NOT NULL CHECK (kind IN ('movie','group','show','season','episode','video')),
  parent_id uuid,
  parent_kind text,
  season_number smallint CHECK (season_number >= 0),
  episode_number integer CHECK (episode_number >= 0),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 1000),
  summary text,
  release_year smallint CHECK (release_year BETWEEN 1800 AND 2500),
  release_date date,
  release_precision text NOT NULL DEFAULT 'unknown' CHECK (release_precision IN ('unknown','year','day')),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  published_at timestamptz,
  notes text,
  cover_layout text NOT NULL DEFAULT 'landscape' CHECK (cover_layout IN ('landscape','portrait')),
  supports_chinese boolean,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (id, kind),
  UNIQUE (id, kind, library_id),
  FOREIGN KEY (parent_id, parent_kind, library_id) REFERENCES media_items (id, kind, library_id) DEFERRABLE INITIALLY IMMEDIATE,
  CHECK ((kind IN ('movie','group','show','video') AND parent_id IS NULL AND parent_kind IS NULL AND season_number IS NULL AND episode_number IS NULL) OR (kind='season' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind='show' AND season_number IS NOT NULL AND episode_number IS NULL) OR (kind='episode' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind IN ('group','show','season') AND episode_number IS NOT NULL AND season_number IS NULL)),
  CHECK ((release_precision='unknown' AND release_year IS NULL AND release_date IS NULL) OR (release_precision='year' AND release_year IS NOT NULL AND release_date IS NULL) OR (release_precision='day' AND release_year IS NOT NULL AND release_date IS NOT NULL AND extract(year FROM release_date)=release_year)),
  UNIQUE (parent_id, season_number) DEFERRABLE INITIALLY IMMEDIATE,
  UNIQUE (parent_id, episode_number) DEFERRABLE INITIALLY IMMEDIATE
);
--> statement-breakpoint
CREATE INDEX media_items_browse_idx ON media_items (library_id, primary_category_id, published_at DESC, id) WHERE published_at IS NOT NULL AND archived_at IS NULL;
--> statement-breakpoint
CREATE INDEX media_items_parent_idx ON media_items (parent_id);
--> statement-breakpoint
COMMENT ON TABLE media_items IS 'M1 · 作品与剧集资料';
--> statement-breakpoint
CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 300),
  detailed_name text,
  gender text NOT NULL DEFAULT 'unknown' CHECK (gender IN ('unknown','female','male','other')),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
COMMENT ON TABLE people IS 'M1 · 人物资料';
--> statement-breakpoint
CREATE TABLE credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  person_id uuid NOT NULL REFERENCES people(id),
  job text NOT NULL CHECK (job IN ('actor','director','writer','producer','other')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, person_id, job)
);
--> statement-breakpoint
CREATE INDEX credits_person_media_idx ON credits (person_id, job, media_id);
--> statement-breakpoint
CREATE INDEX credits_media_order_idx ON credits (media_id, position, id);
--> statement-breakpoint
COMMENT ON TABLE credits IS 'M1 · 作品演职员关系';
--> statement-breakpoint
CREATE TABLE franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
  description text,
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
CREATE INDEX franchises_category_idx ON franchises (primary_category_id, name, id) WHERE archived_at IS NULL;
--> statement-breakpoint
COMMENT ON TABLE franchises IS 'M1 · 作品系列';
--> statement-breakpoint
CREATE TABLE franchise_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES franchises(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  position integer NOT NULL CHECK (position > 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, media_id),
  UNIQUE (franchise_id, position) DEFERRABLE INITIALLY IMMEDIATE
);
--> statement-breakpoint
CREATE INDEX franchise_items_media_idx ON franchise_items (media_id);
--> statement-breakpoint
COMMENT ON TABLE franchise_items IS 'M1 · 系列有序作品';
--> statement-breakpoint
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  normalized_name text NOT NULL CHECK (length(normalized_name)>0),
  description text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX collection_active_name_uq ON collections (profile_id, normalized_name) WHERE archived_at IS NULL;
--> statement-breakpoint
COMMENT ON TABLE collections IS 'M1 · 私人收藏夹';
--> statement-breakpoint
CREATE TABLE collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  position integer NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, media_id),
  UNIQUE (collection_id, position) DEFERRABLE INITIALLY IMMEDIATE
);
--> statement-breakpoint
CREATE INDEX collection_items_media_idx ON collection_items (media_id, collection_id);
--> statement-breakpoint
COMMENT ON TABLE collection_items IS 'M1 · 收藏夹有序成员';
--> statement-breakpoint
CREATE TABLE user_media_state (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  watched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  PRIMARY KEY (profile_id, media_id),
  CHECK (is_favorite OR favorited_at IS NULL)
);
--> statement-breakpoint
CREATE INDEX user_media_favorites_idx ON user_media_state (profile_id, favorited_at DESC NULLS LAST, media_id) WHERE is_favorite;
--> statement-breakpoint
COMMENT ON TABLE user_media_state IS 'M1 · 个人作品状态';
--> statement-breakpoint
CREATE TABLE user_person_state (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  person_id uuid NOT NULL REFERENCES people(id),
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  PRIMARY KEY (profile_id, person_id),
  CHECK (is_favorite OR favorited_at IS NULL)
);
--> statement-breakpoint
CREATE INDEX user_person_favorites_idx ON user_person_state (profile_id, favorited_at DESC NULLS LAST, person_id) WHERE is_favorite;
--> statement-breakpoint
COMMENT ON TABLE user_person_state IS 'M1 · 个人喜欢人物';
--> statement-breakpoint
CREATE UNIQUE INDEX accounts_single_owner ON accounts ((true));
--> statement-breakpoint
CREATE FUNCTION video_x.touch_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Identity is immutable' USING ERRCODE='23514'; END IF;
 NEW.revision := OLD.revision + 1;
 NEW.updated_at := clock_timestamp();
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER accounts_revision BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER profiles_revision BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER devices_revision BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER libraries_revision BEFORE UPDATE ON libraries FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER categories_revision BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER media_items_revision BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER people_revision BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER franchises_revision BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE TRIGGER collections_revision BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION video_x.touch_revision();
--> statement-breakpoint
CREATE FUNCTION video_x.touch_state_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.revision := OLD.revision + 1; NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
--> statement-breakpoint
CREATE TRIGGER user_media_state_revision BEFORE UPDATE ON user_media_state FOR EACH ROW EXECUTE FUNCTION video_x.touch_state_revision();
--> statement-breakpoint
CREATE TRIGGER user_person_state_revision BEFORE UPDATE ON user_person_state FOR EACH ROW EXECUTE FUNCTION video_x.touch_state_revision();
