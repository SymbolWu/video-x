-- System defaults only; no sample films or publication side effects.
INSERT INTO video_x.libraries(id,name) VALUES ('10000000-0000-4000-8000-000000000001','我的片库') ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO video_x.categories(id,code,name,position,is_system) VALUES ('20000000-0000-4000-8000-000000000001','unsorted','未分类',99,true) ON CONFLICT(id) DO NOTHING;
