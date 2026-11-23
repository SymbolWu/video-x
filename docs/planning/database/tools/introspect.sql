SELECT jsonb_agg(table_info ORDER BY table_info->>'name')
FROM (
 SELECT jsonb_build_object(
  'name',c.relname,'comment',obj_description(c.oid,'pg_class'),
  'columns',(
   SELECT jsonb_agg(jsonb_build_object(
    'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull,
    'default',pg_get_expr(d.adbin,d.adrelid),'comment',col_description(c.oid,a.attnum),
    'pk',EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='p' AND a.attnum=ANY(k.conkey)),
    'fk',EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='f' AND a.attnum=ANY(k.conkey))
   ) ORDER BY a.attnum)
   FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT jsonb_agg(jsonb_build_object('name',k.conname,'kind',k.contype,'definition',pg_get_constraintdef(k.oid)) ORDER BY k.contype,k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid),
  'indexes',(SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes WHERE schemaname='video_x' AND tablename=c.relname),
  'fks',(SELECT jsonb_agg(jsonb_build_object('to',rc.relname,'definition',pg_get_constraintdef(k.oid)) ORDER BY rc.relname,k.conname) FROM pg_constraint k JOIN pg_class rc ON rc.oid=k.confrelid WHERE k.conrelid=c.oid AND k.contype='f')
 ) AS table_info
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='video_x' AND c.relkind='r'
) t;
