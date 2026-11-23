CREATE TABLE video_x.import_move_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES video_x.import_items(id),
  profile_id uuid NOT NULL REFERENCES video_x.profiles(id),
  members uuid[] NOT NULL,
  state text NOT NULL CHECK (state IN ('queued','running','failed','cleanup','done','cancelled')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX import_move_active_members ON video_x.import_move_runs USING gin(members) WHERE state IN ('queued','running','failed','cleanup');
--> statement-breakpoint
CREATE TABLE video_x.import_move_plans (
  item_id uuid PRIMARY KEY REFERENCES video_x.import_items(id),
  file_id uuid NOT NULL REFERENCES video_x.media_files(id),
  source_root uuid NOT NULL REFERENCES video_x.storage_roots(id),
  source_path text NOT NULL,
  target_root uuid NOT NULL REFERENCES video_x.storage_roots(id),
  target_path text NOT NULL,
  target_key text NOT NULL,
  create_dir boolean NOT NULL DEFAULT false,
  run_id uuid REFERENCES video_x.import_move_runs(id),
  scratch jsonb, verified jsonb,
  cleaned boolean NOT NULL DEFAULT false,
  UNIQUE(target_root,target_path)
);
--> statement-breakpoint
CREATE FUNCTION video_x.check_move_edit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage <> 'published' AND EXISTS (SELECT 1 FROM video_x.import_move_runs WHERE NEW.id=ANY(members) AND state IN ('queued','running','failed')) THEN
    RAISE EXCEPTION '该草稿已提交整理发布，请等待或重试任务。' USING ERRCODE='VX409';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER import_move_freeze BEFORE UPDATE ON video_x.import_items FOR EACH ROW EXECUTE FUNCTION video_x.check_move_edit();

