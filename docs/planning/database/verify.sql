-- 仅连接临时测试库执行。全部样例位于事务中，最后回滚。
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = video_x, public;
CREATE TEMP TABLE checks_passed (name text NOT NULL);
CREATE FUNCTION pg_temp.assert_ok(label text, condition boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  INSERT INTO checks_passed VALUES (label);
END $$;
CREATE FUNCTION pg_temp.expect_error(label text, statement text, wanted_state text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_state text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
    IF actual_state <> wanted_state THEN RAISE EXCEPTION 'FAIL: %, expected %, got %',label,wanted_state,actual_state; END IF;
    INSERT INTO checks_passed VALUES (label);
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: %, invalid data was accepted',label;
END $$;

INSERT INTO accounts (id,username,password_hash) VALUES ('00000000-0000-4000-8000-000000000010','fixture','test-only-placeholder');
INSERT INTO profiles (id,account_id,display_name) VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010','样例');
INSERT INTO devices (id,profile_id,installation_id,client_kind,display_name) VALUES ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011',gen_random_uuid(),'web','测试浏览器');
INSERT INTO libraries (id,name) VALUES ('00000000-0000-4000-8000-000000000020','库 A'),('00000000-0000-4000-8000-000000000021','库 B');
INSERT INTO storage_roots (id,library_id,name,mount_path,expected_marker) VALUES ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000020','测试磁盘','/media/test',gen_random_uuid());
INSERT INTO media_files (id,root_id,relative_path,file_kind,size_bytes,mtime_ns) VALUES
 ('00000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000022','movie/cd1.mkv','video',1000,0),
 ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000022','movie/cd2.mkv','video',1000,0),
 ('00000000-0000-4000-8000-000000000062','00000000-0000-4000-8000-000000000022','other/movie.mkv','video',1000,0);
INSERT INTO media_items (id,library_id,kind,title,primary_category_id) VALUES
 ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000020','movie','电影 A','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000020','movie','电影 B','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000020','show','剧 A','00000000-0000-4000-8000-000000000001');
INSERT INTO media_items (id,library_id,kind,parent_id,parent_kind,season_number,title,primary_category_id) VALUES
 ('00000000-0000-4000-8000-000000000043','00000000-0000-4000-8000-000000000020','season','00000000-0000-4000-8000-000000000042','show',1,'第一季','00000000-0000-4000-8000-000000000001');
INSERT INTO media_items (id,library_id,kind,parent_id,parent_kind,episode_number,title,primary_category_id) VALUES
 ('00000000-0000-4000-8000-000000000044','00000000-0000-4000-8000-000000000020','episode','00000000-0000-4000-8000-000000000043','season',1,'第一集','00000000-0000-4000-8000-000000000001');
INSERT INTO editions (id,media_id,media_kind,name,is_default) VALUES
 ('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000040','movie','4K 原声版',true),
 ('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000041','movie','1080p',true);
INSERT INTO edition_parts (id,edition_id,part_no,file_id,bound_content_revision) VALUES
 ('00000000-0000-4000-8000-000000000070','00000000-0000-4000-8000-000000000050',1,'00000000-0000-4000-8000-000000000060',1),
 ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000050',2,'00000000-0000-4000-8000-000000000061',1),
 ('00000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000051',1,'00000000-0000-4000-8000-000000000062',1);
SELECT pg_temp.assert_ok('合法的剧—季—集与电影版本可以创建',(SELECT count(*)=5 FROM media_items));
SELECT pg_temp.expect_error('季不能归到电影',$s$INSERT INTO media_items (library_id,kind,parent_id,parent_kind,season_number,title,primary_category_id) VALUES ('00000000-0000-4000-8000-000000000020','season','00000000-0000-4000-8000-000000000040','show',2,'错误季','00000000-0000-4000-8000-000000000001')$s$,'23503');
SELECT pg_temp.expect_error('不允许以 NULL 父类型绕过层级约束',$s$INSERT INTO media_items (library_id,kind,parent_id,season_number,title,primary_category_id) VALUES ('00000000-0000-4000-8000-000000000020','season','00000000-0000-4000-8000-000000000042',2,'错误季','00000000-0000-4000-8000-000000000001')$s$,'23514');
SELECT pg_temp.expect_error('剧和季必须在同一逻辑库',$s$INSERT INTO media_items (library_id,kind,parent_id,parent_kind,season_number,title,primary_category_id) VALUES ('00000000-0000-4000-8000-000000000021','season','00000000-0000-4000-8000-000000000042','show',2,'错误季','00000000-0000-4000-8000-000000000001')$s$,'23503');
SELECT pg_temp.expect_error('剧不能直接建立播放版本',$s$INSERT INTO editions (media_id,media_kind,name) VALUES ('00000000-0000-4000-8000-000000000042','show','错误版本')$s$,'23514');
SELECT pg_temp.expect_error('版本的类型判别不能伪造',$s$INSERT INTO editions (media_id,media_kind,name) VALUES ('00000000-0000-4000-8000-000000000042','movie','错误版本')$s$,'23503');
SELECT pg_temp.expect_error('同一作品只能有一个有效默认版本',$s$INSERT INTO editions (media_id,media_kind,name,is_default) VALUES ('00000000-0000-4000-8000-000000000040','movie','另一个默认版',true)$s$,'23505');
SELECT pg_temp.expect_error('发行日期不能与年份矛盾',$s$UPDATE media_items SET release_precision='day',release_year=2025,release_date='2024-01-02' WHERE id='00000000-0000-4000-8000-000000000040'$s$,'23514');
SELECT pg_temp.expect_error('文件路径不能越过根目录',$s$UPDATE media_files SET relative_path='../escape.mkv' WHERE id='00000000-0000-4000-8000-000000000060'$s$,'23514');
SELECT pg_temp.expect_error('文件路径统一为斜杠',$s$UPDATE media_files SET relative_path=E'folder\\file.mkv' WHERE id='00000000-0000-4000-8000-000000000060'$s$,'23514');
SELECT pg_temp.expect_error('同根相同路径不能重复登记',$s$INSERT INTO media_files (root_id,relative_path,file_kind,size_bytes,mtime_ns) VALUES ('00000000-0000-4000-8000-000000000022','movie/cd1.mkv','video',1000,0)$s$,'23505');
SELECT pg_temp.expect_error('缺失状态必须带确认起点',$s$UPDATE media_files SET availability='missing' WHERE id='00000000-0000-4000-8000-000000000060'$s$,'23514');
SET CONSTRAINTS ALL DEFERRED;
UPDATE edition_parts SET part_no=3-part_no WHERE edition_id='00000000-0000-4000-8000-000000000050';
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.assert_ok('可延迟唯一约束允许事务内交换段序号',(SELECT part_no=2 FROM edition_parts WHERE id='00000000-0000-4000-8000-000000000070'));

INSERT INTO people (id,full_name,primary_category_id) VALUES ('00000000-0000-4000-8000-000000000080','同一人','00000000-0000-4000-8000-000000000001');
INSERT INTO credits (id,media_id,person_id,job) VALUES ('00000000-0000-4000-8000-000000000090','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000080','actor');
INSERT INTO credits (media_id,person_id,job) VALUES ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000080','director');
SELECT pg_temp.expect_error('同作品同人物同职责不能重复',$s$INSERT INTO credits (media_id,person_id,job) VALUES ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000080','actor')$s$,'23505');
SELECT pg_temp.assert_ok('一个人可以兼任演员与导演',(SELECT count(*)=2 FROM credits));
UPDATE people SET archived_at=now() WHERE id='00000000-0000-4000-8000-000000000080';
SELECT pg_temp.assert_ok('归档人物不删除参演关系',(SELECT count(*)=2 FROM credits));
UPDATE people SET archived_at=NULL,full_name='改名后' WHERE id='00000000-0000-4000-8000-000000000080';
SELECT pg_temp.assert_ok('更新自动增加 revision，改名不改变关联身份',(SELECT revision=3 FROM people WHERE id='00000000-0000-4000-8000-000000000080'));
SELECT pg_temp.expect_error('系统未分类不能归档',$s$UPDATE categories SET archived_at=now() WHERE code='unsorted'$s$,'23514');
SELECT pg_temp.expect_error('系统未分类不能解除保护',$s$UPDATE categories SET is_system=false WHERE code='unsorted'$s$,'23514');
SELECT pg_temp.expect_error('系统未分类不能删除',$s$DELETE FROM categories WHERE code='unsorted'$s$,'23514');

INSERT INTO collections (id,profile_id,name,normalized_name) VALUES ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000011','周末','周末');
INSERT INTO collection_items (collection_id,media_id,position) VALUES ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000040',1);
UPDATE collections SET archived_at=now() WHERE id='00000000-0000-4000-8000-0000000000b0';
INSERT INTO collections (profile_id,name,normalized_name) VALUES ('00000000-0000-4000-8000-000000000011','周末','周末');
SELECT pg_temp.expect_error('归档收藏夹恢复时检查有效名称冲突',$s$UPDATE collections SET archived_at=NULL WHERE id='00000000-0000-4000-8000-0000000000b0'$s$,'23505');
SELECT pg_temp.assert_ok('归档收藏夹保留成员和顺序',(SELECT count(*)=1 FROM collection_items));
INSERT INTO user_media_state (profile_id,media_id) VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000040');
SELECT pg_temp.expect_error('个人评分只接受 1 到 5 星',$s$UPDATE user_media_state SET rating=6 WHERE media_id='00000000-0000-4000-8000-000000000040'$s$,'23514');
SELECT pg_temp.expect_error('作品接续版本必须属于该作品',$s$UPDATE user_media_state SET resume_edition_id='00000000-0000-4000-8000-000000000051' WHERE media_id='00000000-0000-4000-8000-000000000040'$s$,'23503');
INSERT INTO playback_sessions (id,profile_id,device_id,media_id,edition_id,start_mode,start_part_id,start_position_ms,takeover_generation) VALUES ('00000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000050','resume','00000000-0000-4000-8000-000000000070',12000,1);
INSERT INTO playback_events (session_id,seq,event_id,edition_id,part_id,position_ms,kind) VALUES ('00000000-0000-4000-8000-0000000000f1',1,gen_random_uuid(),'00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000070',12000,'progress');
INSERT INTO playback_progress (profile_id,edition_id,session_id,last_seq,part_id,position_ms) VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-0000000000f1',1,'00000000-0000-4000-8000-000000000070',12000);
SELECT pg_temp.expect_error('播放事件不能引用别的版本的段',$s$INSERT INTO playback_events (session_id,seq,event_id,edition_id,part_id,position_ms,kind) VALUES ('00000000-0000-4000-8000-0000000000f1',2,gen_random_uuid(),'00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000072',100,'progress')$s$,'23503');
SELECT pg_temp.expect_error('事件会话内序号不能重复',$s$INSERT INTO playback_events (session_id,seq,event_id,edition_id,part_id,position_ms,kind) VALUES ('00000000-0000-4000-8000-0000000000f1',1,gen_random_uuid(),'00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000070',500,'seek')$s$,'23505');
INSERT INTO playback_events (session_id,seq,event_id,edition_id,part_id,position_ms,kind) VALUES ('00000000-0000-4000-8000-0000000000f1',3,gen_random_uuid(),'00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000070',3000,'seek');
SELECT pg_temp.assert_ok('主动 seek 后退可以保存为有效事件',(SELECT position_ms=3000 FROM playback_events WHERE seq=3));

INSERT INTO providers (id,code,name,kind,adapter_version) VALUES ('00000000-0000-4000-8000-0000000000d0','fixture','测试来源','remote','1');
INSERT INTO source_records (id,provider_id,entity_kind,external_id) VALUES
 ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000d0','media','same-id'),
 ('00000000-0000-4000-8000-0000000000d2','00000000-0000-4000-8000-0000000000d0','person','same-id');
SELECT pg_temp.assert_ok('同来源作品和人物可使用相同外部 ID',(SELECT count(*)=2 FROM source_records));
SELECT pg_temp.expect_error('来源作品身份不能误连到人物映射',$s$INSERT INTO provider_people (source_record_id,person_id) VALUES ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-000000000080')$s$,'23503');
INSERT INTO metadata_snapshots (id,source_record_id,adapter_version,schema_version,content_sha256,payload) VALUES ('00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-0000000000d1','1',1,decode(repeat('aa',32),'hex'),'{"title":"候选"}');
SELECT pg_temp.assert_ok('候选快照可在正式来源映射之前保存',(SELECT count(*)=0 FROM provider_media));
INSERT INTO provider_media (source_record_id,media_id) VALUES ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-000000000040');
SELECT pg_temp.expect_error('关系来源必须指定一个真实关系',$s$INSERT INTO relationship_sources (source_record_id,snapshot_id) VALUES ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000e1')$s$,'23514');
SELECT pg_temp.expect_error('关系来源快照必须属于同一个来源身份',$s$INSERT INTO relationship_sources (source_record_id,snapshot_id,credit_id) VALUES ('00000000-0000-4000-8000-0000000000d2','00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-000000000090')$s$,'23503');
INSERT INTO metadata_ratings (media_id,source_record_id,snapshot_id,value,scale_max) VALUES ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000e1',8.7,10);
SELECT pg_temp.expect_error('网站评分不能超过网站满分',$s$UPDATE metadata_ratings SET value=11$s$,'23514');
INSERT INTO media_field_state (media_id,field_key,override_value,is_locked) VALUES ('00000000-0000-4000-8000-000000000040','summary','null'::jsonb,true);
SELECT pg_temp.assert_ok('JSON null 能表达显式清空而不等于 SQL NULL',(SELECT override_value IS NOT NULL AND jsonb_typeof(override_value)='null' FROM media_field_state));
SELECT pg_temp.expect_error('人工覆盖值需要明确锁定',$s$UPDATE media_field_state SET is_locked=false$s$,'23514');
SELECT pg_temp.expect_error('探测成功结果必须对应当前文件内容代数',$s$UPDATE media_files SET probe_status='succeeded',probed_content_revision=99 WHERE id='00000000-0000-4000-8000-000000000060'$s$,'23514');

-- v0.2：已确认的人物双名称、取消别名/待清理、评分空值和标签分组。
SELECT pg_temp.assert_ok('人物无别名表且支持两个姓名字段',to_regclass('video_x.person_aliases') IS NULL AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='video_x' AND table_name='people' AND column_name='detailed_name'));
UPDATE people SET detailed_name='详细名称原文' WHERE id='00000000-0000-4000-8000-000000000080';
SELECT pg_temp.assert_ok('常用名和详细名独立保留',(SELECT full_name='改名后' AND detailed_name='详细名称原文' FROM people WHERE id='00000000-0000-4000-8000-000000000080'));
SELECT pg_temp.assert_ok('首版无影片待清理字段',NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='video_x' AND column_name='marked_for_review'));
UPDATE user_media_state SET rating=NULL WHERE media_id='00000000-0000-4000-8000-000000000040';
SELECT pg_temp.assert_ok('NULL 表示未评分',(SELECT rating IS NULL FROM user_media_state WHERE media_id='00000000-0000-4000-8000-000000000040'));
SELECT pg_temp.expect_error('零不表示未评分',$s$UPDATE user_media_state SET rating=0 WHERE media_id='00000000-0000-4000-8000-000000000040'$s$,'23514');
UPDATE user_media_state SET rating=5,is_favorite=true,favorited_at=NULL WHERE media_id='00000000-0000-4000-8000-000000000040';
SELECT pg_temp.assert_ok('旧喜欢状态允许时间未知',(SELECT is_favorite AND favorited_at IS NULL AND rating=5 FROM user_media_state WHERE media_id='00000000-0000-4000-8000-000000000040'));
SELECT pg_temp.expect_error('取消喜欢后不能保留喜欢时间',$s$UPDATE user_media_state SET is_favorite=false,favorited_at=now() WHERE media_id='00000000-0000-4000-8000-000000000040'$s$,'23514');
INSERT INTO tags (id,name,normalized_name,primary_category_id,attribute_group,is_visible) VALUES
('00000000-0000-4000-8000-000000000101','同一显示名','same','00000000-0000-4000-8000-000000000001','theme',false),
('00000000-0000-4000-8000-000000000102','同一显示名','same','00000000-0000-4000-8000-000000000001','role',true);
SELECT pg_temp.assert_ok('同名标签在不同属性组保留独立身份',(SELECT count(*)=2 FROM tags WHERE normalized_name='same'));
SELECT pg_temp.expect_error('同分类同属性组规范名不可重复',$s$INSERT INTO tags (name,normalized_name,primary_category_id,attribute_group) VALUES ('重复','same','00000000-0000-4000-8000-000000000001','theme')$s$,'23505');
INSERT INTO media_tags (media_id,tag_id) VALUES ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000101');
SELECT pg_temp.assert_ok('隐藏标签不删除既有影片关系',(SELECT NOT t.is_visible AND m.tag_id=t.id FROM tags t JOIN media_tags m ON m.tag_id=t.id WHERE t.id='00000000-0000-4000-8000-000000000101'));
INSERT INTO legacy_mappings (source_system,source_table,key_name,legacy_id,target_kind,tag_id) VALUES
('test','tag','id','123','tag','00000000-0000-4000-8000-000000000101'),
('test','tag','tag_code','123','tag','00000000-0000-4000-8000-000000000101');
SELECT pg_temp.assert_ok('旧主键和业务编码可分别追溯同一标签',(SELECT count(*)=2 FROM legacy_mappings WHERE source_table='tag' AND legacy_id='123'));
UPDATE media_items SET cover_layout='portrait',supports_chinese=true WHERE id='00000000-0000-4000-8000-000000000040';
SELECT pg_temp.assert_ok('旧封面方向和中文标记有正式承接位置',(SELECT cover_layout='portrait' AND supports_chinese FROM media_items WHERE id='00000000-0000-4000-8000-000000000040'));
SELECT pg_temp.expect_error('人物字段维护不再接受 aliases',$s$INSERT INTO person_field_state (person_id,field_key) VALUES ('00000000-0000-4000-8000-000000000080','aliases')$s$,'23514');


-- v0.3：通用作品组直接含集，剧也可直接含集，不强制添加季。
INSERT INTO media_items (id,library_id,kind,title,primary_category_id) VALUES
('00000000-0000-4000-8000-000000000200','00000000-0000-4000-8000-000000000020','group','上下部样例','00000000-0000-4000-8000-000000000001');
INSERT INTO media_items (id,library_id,kind,parent_id,parent_kind,episode_number,title,primary_category_id) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000020','episode','00000000-0000-4000-8000-000000000200','group',1,'上部','00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000020','episode','00000000-0000-4000-8000-000000000200','group',2,'下部','00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000020','episode','00000000-0000-4000-8000-000000000042','show',9,'无季分集','00000000-0000-4000-8000-000000000001');
SELECT pg_temp.assert_ok('上下部按两个独立分集组织',(SELECT count(*)=2 FROM media_items WHERE parent_id='00000000-0000-4000-8000-000000000200' AND kind='episode'));
SELECT pg_temp.assert_ok('剧可以直接含集而不补造季',(SELECT parent_kind='show' AND season_number IS NULL FROM media_items WHERE id='00000000-0000-4000-8000-000000000203'));
SELECT pg_temp.expect_error('作品组不能直接绑定播放版本',$s$INSERT INTO editions (media_id,media_kind,name) VALUES ('00000000-0000-4000-8000-000000000200','group','错误版本')$s$,'23514');
SELECT pg_temp.expect_error('作品组内集号不可重复',$s$INSERT INTO media_items (library_id,kind,parent_id,parent_kind,episode_number,title,primary_category_id) VALUES ('00000000-0000-4000-8000-000000000020','episode','00000000-0000-4000-8000-000000000200','group',2,'重复下部','00000000-0000-4000-8000-000000000001')$s$,'23505');
SELECT pg_temp.expect_error('通用分集也不允许伪造父类型',$s$UPDATE media_items SET parent_kind='show' WHERE id='00000000-0000-4000-8000-000000000201'$s$,'23503');
SELECT pg_temp.expect_error('通用分集不可跨库归组',$s$UPDATE media_items SET library_id='00000000-0000-4000-8000-000000000021' WHERE id='00000000-0000-4000-8000-000000000201'$s$,'23503');
SELECT pg_temp.expect_error('分集不能以另一个分集为父',$s$UPDATE media_items SET parent_id='00000000-0000-4000-8000-000000000201',parent_kind='episode' WHERE id='00000000-0000-4000-8000-000000000202'$s$,'23514');
INSERT INTO editions (id,media_id,media_kind,name,is_default) VALUES
('00000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000201','episode','上部默认版本',true),
('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000202','episode','下部默认版本',true);
SELECT pg_temp.assert_ok('上下部分别拥有自己的播放版本',(SELECT count(DISTINCT media_id)=2 FROM editions WHERE id IN ('00000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000211')));

-- v0.4：固定起播目标，避免继续播放请求退化为默认 0；应用时序另作真实播放器验收。
SELECT pg_temp.assert_ok('续播会话固定实际段与毫秒目标',(SELECT start_mode='resume' AND start_part_id='00000000-0000-4000-8000-000000000070' AND start_position_ms=12000 AND NOT has_started FROM playback_sessions WHERE id='00000000-0000-4000-8000-0000000000f1'));
SELECT pg_temp.expect_error('起播目标不能使用别的版本的文件段',$s$UPDATE playback_sessions SET start_part_id='00000000-0000-4000-8000-000000000072' WHERE id='00000000-0000-4000-8000-0000000000f1'$s$,'23503');
SELECT pg_temp.expect_error('首次起播不能声明非零目标',$s$UPDATE playback_sessions SET start_mode='fresh' WHERE id='00000000-0000-4000-8000-0000000000f1'$s$,'23514');
SELECT pg_temp.expect_error('明确从头不能声明非零目标',$s$UPDATE playback_sessions SET start_mode='restart' WHERE id='00000000-0000-4000-8000-0000000000f1'$s$,'23514');
SELECT pg_temp.expect_error('起播毫秒位置不能小于零',$s$UPDATE playback_sessions SET start_position_ms=-1 WHERE id='00000000-0000-4000-8000-0000000000f1'$s$,'23514');

-- v0.5: review receipt, multiple draft editions and non-playable publication.
INSERT INTO import_batches (id,library_id,created_by,mode) VALUES ('00000000-0000-4000-8000-000000000300','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','manual');
INSERT INTO import_items (id,batch_id,item_key,draft) VALUES ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000300','manual-group','{"title":"manual"}');
SELECT pg_temp.assert_ok('手动草稿默认未确认',(SELECT draft_revision=1 AND reviewed_revision IS NULL AND draft_schema_version=2 FROM import_items WHERE item_key='manual-group'));
SELECT pg_temp.expect_error('确认凭据不能只有时间',$s$UPDATE import_items SET reviewed_at=now() WHERE item_key='manual-group'$s$,'23514');
SELECT pg_temp.expect_error('确认人和时间不能代替确认版本',$s$UPDATE import_items SET reviewed_at=now(),reviewed_by='00000000-0000-4000-8000-000000000010' WHERE item_key='manual-group'$s$,'23514');
UPDATE import_items SET reviewed_revision=draft_revision,reviewed_at=now(),reviewed_by='00000000-0000-4000-8000-000000000010',stage='ready' WHERE item_key='manual-group';
SELECT pg_temp.assert_ok('确认绑定当前草稿版本',(SELECT reviewed_revision=draft_revision AND stage='ready' FROM import_items WHERE item_key='manual-group'));
UPDATE import_items SET execution_status='running' WHERE item_key='manual-group';
SELECT pg_temp.assert_ok('任务进度不使人工确认失效',(SELECT draft_revision=1 AND reviewed_revision=1 FROM import_items WHERE item_key='manual-group'));
UPDATE import_items SET draft='{"title":"changed"}' WHERE item_key='manual-group';
SELECT pg_temp.assert_ok('修改资料递增草稿版本并清空确认',(SELECT draft_revision=2 AND reviewed_revision IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL AND stage='matched' FROM import_items WHERE item_key='manual-group'));
SELECT pg_temp.expect_error('旧确认版本不可复用',$s$UPDATE import_items SET reviewed_revision=1,reviewed_at=now(),reviewed_by='00000000-0000-4000-8000-000000000010' WHERE item_key='manual-group'$s$,'23514');
UPDATE import_items SET reviewed_revision=draft_revision,reviewed_at=now(),reviewed_by='00000000-0000-4000-8000-000000000010',stage='ready' WHERE item_key='manual-group';
INSERT INTO import_item_files (item_id,edition_key,file_id,part_no) VALUES ('00000000-0000-4000-8000-000000000301','v1','00000000-0000-4000-8000-000000000060',1);
SELECT pg_temp.assert_ok('增加文件绑定取消确认',(SELECT draft_revision=3 AND reviewed_revision IS NULL FROM import_items WHERE item_key='manual-group'));
INSERT INTO import_item_files (item_id,edition_key,file_id,part_no) VALUES ('00000000-0000-4000-8000-000000000301','v2','00000000-0000-4000-8000-000000000060',1);
SELECT pg_temp.assert_ok('多个草稿版本可各有第一段',(SELECT count(*)=2 FROM import_item_files WHERE item_id='00000000-0000-4000-8000-000000000301' AND part_no=1));
SELECT pg_temp.expect_error('同草稿版本段号不能重复',$s$INSERT INTO import_item_files (item_id,edition_key,file_id,part_no) VALUES ('00000000-0000-4000-8000-000000000301','v1','00000000-0000-4000-8000-000000000061',1)$s$,'23505');
DELETE FROM import_item_files WHERE item_id='00000000-0000-4000-8000-000000000301';
SELECT pg_temp.expect_error('未确认不能发布',$s$UPDATE import_items SET stage='published',published_media_id='00000000-0000-4000-8000-000000000200',published_at=now(),execution_status='completed' WHERE item_key='manual-group'$s$,'23514');
UPDATE import_items SET reviewed_revision=draft_revision,reviewed_at=now(),reviewed_by='00000000-0000-4000-8000-000000000010',stage='ready' WHERE item_key='manual-group';
SELECT pg_temp.expect_error('普通影片发布必须有版本',$s$UPDATE import_items SET stage='published',published_media_id='00000000-0000-4000-8000-000000000040',published_at=now(),execution_status='completed' WHERE item_key='manual-group'$s$,'23514');
UPDATE import_items SET stage='published',published_media_id='00000000-0000-4000-8000-000000000200',published_at=now(),execution_status='completed' WHERE item_key='manual-group';
SELECT pg_temp.assert_ok('作品组可以无播放版本发布',(SELECT stage='published' AND published_edition_id IS NULL FROM import_items WHERE item_key='manual-group'));
SELECT pg_temp.expect_error('已发布草稿不再原地改资料',$s$UPDATE import_items SET draft='{}' WHERE item_key='manual-group'$s$,'23514');
SELECT pg_temp.expect_error('已发布导入记录不可再改绑文件',$s$INSERT INTO import_item_files (item_id,file_id,part_no) VALUES ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000060',1)$s$,'23514');

SELECT pg_temp.expect_error('已发布导入不能回退阶段绕过内容锁',$s$UPDATE import_items SET stage='matched' WHERE item_key='manual-group'$s$,'23514');
SELECT pg_temp.expect_error('已发布导入不能更改确认收据',$s$UPDATE import_items SET reviewed_at=now()+interval '1 day' WHERE item_key='manual-group'$s$,'23514');

SELECT count(*) || ' database checks passed' AS result FROM checks_passed;
ROLLBACK;
