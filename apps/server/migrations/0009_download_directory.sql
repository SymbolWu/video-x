ALTER TABLE video_x.storage_roots ADD COLUMN download_directory text;
--> statement-breakpoint
ALTER TABLE video_x.import_item_files ADD COLUMN requires_move boolean NOT NULL DEFAULT false;

