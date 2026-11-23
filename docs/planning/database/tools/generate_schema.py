"""从 model-spec.json 和 field-provenance.json 生成独立 schema 草案，不执行数据库。"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
tables=json.loads((ROOT/'model-spec.json').read_text())
provenance=json.loads((ROOT/'field-provenance.json').read_text())['fields']
def column_note(table, field, note):
    p=provenance[table+'.'+field]
    source='、'.join(p['old_sources']) if p['old_sources'] else '无旧字段（'+p['basis']+'）'
    return note+'；来源类别：'+p['origin']+'；来源：'+source+'；应用：'+p['usage']+'；写入：'+p['writer']+'；迁移/初始化：'+p['initialization']+'；首版建议：'+p['stage']

def quote(s):return "'"+s.replace("'","''")+"'"
lines=['-- video-x PostgreSQL 16+ review draft v0.5 (2026-11-17)',
 '-- 58 张候选表含后置能力；逐字段依据见 field-guide.md / field-provenance.json。',
 '-- 在全新数据库或独立 schema 中验证；不是旧库升级脚本。',
 '-- 本文件创建 video_x schema，绝不 DROP/ALTER 旧业务表。',
 'BEGIN;','CREATE SCHEMA video_x;','SET LOCAL search_path = video_x, public;','']
for t in tables:
 lines+=['-- '+t['domain']+' / '+t['label'],'CREATE TABLE '+t['name']+' (']
 lines += [',\n'.join('  '+n+' '+d for n,d,_ in t['columns'])+(' ,\n  '+',\n  '.join(t['constraints']) if t['constraints'] else '')]
 lines+=[');',f"COMMENT ON TABLE {t['name']} IS {quote(t['label'])};"]
 lines += [f'COMMENT ON COLUMN {t["name"]}.{n} IS {quote(column_note(t["name"], n, note))};' for n,_,note in t['columns']]
 lines += t['indexes']+['']
lines += [
 '''CREATE FUNCTION protect_category_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN RAISE EXCEPTION 'system category cannot be deleted' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code OR (OLD.is_system AND (NOT NEW.is_system OR NEW.archived_at IS NOT NULL OR NEW.parent_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'category identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER categories_identity BEFORE UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION protect_category_identity();''',
 'ALTER TABLE import_items ADD CONSTRAINT import_selected_candidate_fk FOREIGN KEY (selected_candidate_id, id) REFERENCES import_candidates (id, item_id) DEFERRABLE INITIALLY IMMEDIATE;',
 '''CREATE FUNCTION touch_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END $$;''']
for t in tables:
 if t['mutable']:lines += [f'CREATE TRIGGER {t["name"]}_touch BEFORE UPDATE ON {t["name"]} FOR EACH ROW EXECUTE FUNCTION touch_revision();']
lines += [
"""CREATE FUNCTION protect_import_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_kind text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage = 'published' AND (NEW.stage <> 'published'
       OR NEW.published_media_id IS DISTINCT FROM OLD.published_media_id
       OR NEW.published_edition_id IS DISTINCT FROM OLD.published_edition_id
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.reviewed_revision IS DISTINCT FROM OLD.reviewed_revision
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by) THEN
      RAISE EXCEPTION 'published import receipt is immutable' USING ERRCODE='23514';
    END IF;
    IF NEW.draft IS DISTINCT FROM OLD.draft OR NEW.draft_schema_version IS DISTINCT FROM OLD.draft_schema_version
       OR NEW.selected_candidate_id IS DISTINCT FROM OLD.selected_candidate_id OR NEW.draft_revision IS DISTINCT FROM OLD.draft_revision THEN
      IF OLD.stage = 'published' THEN RAISE EXCEPTION 'published import draft is immutable' USING ERRCODE='23514'; END IF;
      NEW.draft_revision := OLD.draft_revision + 1;
      NEW.reviewed_revision := NULL; NEW.reviewed_at := NULL; NEW.reviewed_by := NULL;
      IF NEW.stage = 'ready' THEN NEW.stage := 'matched'; END IF;
    END IF;
  END IF;
  IF NEW.stage = 'published' THEN
    SELECT kind INTO target_kind FROM media_items WHERE id=NEW.published_media_id;
    IF target_kind IN ('group','show','season') AND NEW.published_edition_id IS NOT NULL THEN
      RAISE EXCEPTION 'container has no playback edition' USING ERRCODE='23514';
    ELSIF target_kind IN ('movie','episode','video') AND NEW.published_edition_id IS NULL THEN
      RAISE EXCEPTION 'playable publication requires an edition' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER import_review BEFORE INSERT OR UPDATE ON import_items FOR EACH ROW EXECUTE FUNCTION protect_import_review();
CREATE FUNCTION invalidate_import_file_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    key_id := OLD.item_id;
    UPDATE import_items SET draft_revision=draft_revision+1 WHERE id=key_id;
  END IF;
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id) THEN
    key_id := NEW.item_id;
    UPDATE import_items SET draft_revision=draft_revision+1 WHERE id=key_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER import_file_review AFTER INSERT OR UPDATE OR DELETE ON import_item_files FOR EACH ROW EXECUTE FUNCTION invalidate_import_file_review();"""
]
lines += [
 "INSERT INTO categories (id,code,name,parent_id,position,is_system) VALUES ('00000000-0000-4000-8000-000000000001','unsorted','未分类',NULL,1,true);",
 'INSERT INTO catalog_revisions (singleton) VALUES (true);',
 'COMMIT;','']
(ROOT/'schema.sql').write_text('\n'.join(lines))
print(f'生成候选 schema：{len(tables)} 张表，{sum(len(t["columns"]) for t in tables)} 个字段')
