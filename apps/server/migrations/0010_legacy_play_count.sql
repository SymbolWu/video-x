ALTER TABLE video_x.user_media_state ADD COLUMN legacy_play_count bigint NOT NULL DEFAULT 0 CHECK (legacy_play_count >= 0);
