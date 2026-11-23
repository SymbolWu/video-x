SET search_path TO video_x, public;
--> statement-breakpoint
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  normalized_name text NOT NULL CHECK (length(normalized_name)>0),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  attribute_group text NOT NULL DEFAULT 'other' CHECK (length(btrim(attribute_group)) > 0),
  is_visible boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (primary_category_id, attribute_group, normalized_name)
);
--> statement-breakpoint
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
  description text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
--> statement-breakpoint
CREATE TABLE media_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  tag_id uuid NOT NULL REFERENCES tags(id),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, tag_id)
);
--> statement-breakpoint
CREATE TABLE media_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  role text NOT NULL CHECK (role IN ('studio','publisher','label')),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, organization_id, role)
);
--> statement-breakpoint
CREATE TRIGGER tags_touch BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION touch_revision();
--> statement-breakpoint
CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION touch_revision();
