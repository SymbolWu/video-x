import re,json
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
root=BASE.parents[3]
agg=json.loads((BASE/'legacy-data-summary.json').read_text())
# 每行均为审查结论；不将推测去向伪装为已经完成的迁移。
M={}
def put(t,c,d,n='',status='已有对应，待迁移验证'):
 M[t,c]=(status,d,n)
def gap(t,c,n):put(t,c,'待修订',n,'缺口')
def review(t,c,d,n):put(t,c,d,n,'语义/转换待核对')
for c,d,n in [
 ('display_name','media_items.title','旧值允许空，新必填约束须检查当前数据'),
 ('category_code','media_items.primary_category_id','按 category_code→新 category ID 映射'),
 ('release_date','media_items.release_date / release_year / release_precision','字符串先验证格式与精度，不补造未知月日'),
 ('is_favorite','user_media_state.is_favorite','不等于收藏夹成员'),
 ('user_rating','user_media_state.rating','保留 1～5 星；历史备份为空但当前服务支持写入'),
 ('play_count','user_media_state.legacy_play_count','须定义旧基数与新播放会话计数的合并规则'),
 ('last_played_at','user_media_state.last_played_at','保留原时间及其未知值'),
 ('file_path','storage_roots + media_files.relative_path','校验根目录归属、挂载映射和文件实际存在性'),
 ('file_name','media_files.relative_path 的末段','通常可派生；若与旧 file_name 不同，记录冲突并保留原值'),
 ('file_format','media_files.container_format / probe_result','旧值是文件扩展名，新容器格式语义须由探测确认'),
 ('file_size','media_files.size_bytes','旧值是已舍入的展示字符串，精确字节数须重读文件'),
 ('resolution','media_streams.width / height','解析旧字符串；实际轨道信息需重新探测'),
 ('serial_number','media_identifiers.value','标记编号体系；不能等同 movie_code 或来源页面 ID'),
 ('movie_desc','media_items.summary','保留原文'),
 ('cover_image_path','assets.storage_key + media_images.asset_id','需迁入受控资源并验证文件，不把旧路径当新资源键'),
 ('duration','media_files.duration_ms','旧 HH:mm:ss 精度只有秒；重新探测时记录新事实'),
 ('remark','media_items.notes','保留人工备注')]:put('movie',c,d,n)
for c in ['release_date','play_count','file_path','file_name','file_format','file_size','resolution','cover_image_path','duration']:
 status,d,n=M['movie',c];M['movie',c]=('语义/转换待核对',d,n)
review('movie','parent_movie_code','media_items.parent_id 或 edition_parts 等组织关系','现有 14 组父子样例须确认是独立内容还是文件分段，不能自动套用剧季集')
review('movie','episode_order','episode_number 或 edition_parts.part_no','取决于父子实际语义，旧库没有季号')
review('movie','series_code','franchise_items + 来源/旧编码映射','与 series_id 同时存在；须核对一致性并保留编码身份')
put('movie','series_id','franchise_items.franchise_id','旧单系列关系可以迁入；多系列和人工排序属于新增选择')
review('movie','watch_progress','旧百分比保留策略待定；可作为新进度的迁移依据','没有精确断点时不得伪造毫秒位置；已看与非零百分比也不等同')
review('movie','last_play_position_ms','playback_progress.position_ms 等接续状态','当前实体存在，历史备份缺列；版本、段、会话必填关联尚无完整迁移方案')
gap('movie','marked_for_review','现有批量标记和筛选功能；需明确作品/文件层面的专用待清理状态')
gap('movie','cover_layout','有 1/2 两种实际值和编辑入口；须保留横竖展示偏好')
gap('movie','supports_chinese','保留旧支持中文判断；与本地字幕轨道检测和来源宣称分开')
review('movie','extra_info','credits（导演）+ organizations / media_organizations（片商）+ 原始迁移归档','同时识别 directors/makers 与 director/studio；不能丢失原文、类型和 code')
put('actor','full_name','people.name','详细名优先级与展示策略仍待核对')
put('actor','gender','people.gender','先确认旧数值枚举含义，再转新枚举，不凭数字猜测')
put('actor','profile_image_path','assets + people.portrait_asset_id','验证并迁移头像文件')
gap('actor','detailed_name','2,257 条非空且用于补全和搜索；新模型未明确保留原文与展示/别名关系')
review('actor','alias','person_aliases.display_alias','保留原文；不能未经样例核对就按逗号或空格拆分')
put('actor','category','people.primary_category_id','核对旧值是否都能对应分类编码')
put('actor','is_collected','user_person_state.is_favorite','保留演员喜欢；旧 NULL 的归一规则须明确')
put('series','series_name','franchises.name','保留系列身份，不按同名自动合并')
put('series','category','franchises.primary_category_id','核对旧分类值映射')
put('category','category_code','categories.code','保留稳定分类编码')
put('category','cat_name','categories.name','空值与重命名规则需检查')
put('category','parent_category_code','categories.parent_id','以编码映射父 ID；检查环和缺失父节点')
put('category','is_visible','categories.is_visible','隐藏与归档分开；首版新导航需保持此语义')
put('tag','tag_name','tags.name','不自动按同名合并不同分组、分类的标签')
gap('tag','attr_value','现有属性分组，共 10 种；新 tags 没有对应结构')
gap('tag','category','现有标签分类归属；新 tags 没有对应结构')
gap('tag','is_visible','377 个历史标签隐藏；新 tags 缺显示开关，archived_at 不能代替')
put('collections','coll_name','collections.name','旧名称无唯一约束，迁移前检查新规范化唯一规则冲突')
for t,c in [('movie','movie_code'),('actor','actor_code'),('series','series_code'),('tag','tag_code'),('collections','coll_code')]:
 gap(t,c,'旧业务编码需有可查询、带命名空间的追溯映射；不能只迁旧数值 ID 或假定都为某网站 ID')
for t,targets,fields in [
 ('movie_actor','credits',{'movie_id':'media_id','actor_id':'person_id'}),
 ('movie_tag','media_tags',{'movie_id':'media_id','tag_id':'tag_id'}),
 ('collections_movie','collection_items',{'movie_id':'media_id','collection_id':'collection_id'})]:
 for c,d in fields.items():put(t,c,targets+'.'+d,'通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor')
for t in ['task','actor_profile_task']:
 review(t,'status','tasks.status / task_items.status','两个旧任务实体合并为任务类型；需明确旧枚举映射及是否迁移历史运行态')
 review(t,'progress','由任务项状态派生，历史原百分比另存迁移归档','当前新 tasks 没有 progress；不能把旧百分比当作可恢复检查点')
 review(t,'result_url','导入结果 / task_items.result 或受控历史任务归档','旧值指向外部结果 JSON；只搬数据库路径不会得到结果，文件还未检查')
 review(t,'error','task_items.error_details 或受控历史任务归档','保留错误原文并脱敏；新聚合任务没有同义 error 列')
target={'movie':'media_items','actor':'people','series':'franchises','category':'categories','tag':'tags','collections':'collections','movie_actor':'credits','movie_tag':'media_tags','collections_movie':'collection_items','task':'tasks','actor_profile_task':'tasks'}
items=[]
for f in sorted((root/'packages/entities/src').glob('*.entity.ts')):
 s=f.read_text();t=re.search(r'@Entity\([\'"]([^\'"]+)',s)[1];columns=[]
 for m in re.finditer(r'@(?:Column|PrimaryGeneratedColumn)\((.*?)\)\s*\n\s*(\w+)[!?]?:',s,re.S):
  opts,prop=m.groups();named=re.search(r'name:\s*[\'"]([^\'"]+)',opts);c=named[1] if named else prop
  if c not in ['id','created_at','updated_at','is_deleted']:assert (t,c) in M,(t,c)
  if c=='id':
   if t=='tag':gap(t,c,'legacy_mappings 当前没有 tag 目标类型和外键，须补齐标签旧 ID 追溯')
   elif t in ['task','actor_profile_task'] or t in ['movie_actor','movie_tag','collections_movie']:
    review(t,c,target[t]+'.id（新 ID）+ 旧行归档','现有 legacy_mappings 不包含此类目标；是否迁移历史任务/关系主键需按实际引用确认')
   else:put(t,c,target[t]+'.id + legacy_mappings','生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值')
  elif c in ['created_at','updated_at']:
   review(t,c,target[t]+'.'+c if t not in ['movie_actor','movie_tag','collections_movie'] else target[t]+'.created_at / 旧行归档','保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime')
  elif c=='is_deleted':review(t,c,target[t]+'.archived_at','仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间')
  stats=agg['tables'][t]['columns'].get(c)
  evidence=f"{stats['non_null']}/{agg['tables'][t]['rows']} 非 NULL；{stats['non_empty']} 非空" if stats else '此备份无该列；依据当前实体与读写逻辑'
  if t=='actor' and c=='full_name':put(t,c,'people.full_name','保留常用名，与详细名共同参与检索')
  if t=='actor' and c=='detailed_name':put(t,c,'people.detailed_name','v0.4 补齐；原文保留，不拆成别名')
  if t=='actor' and c=='alias':put(t,c,'不设新列/表','用户 2026-11-13 明确首版取消；保留原备份，不自动写入 detailed_name','主动取消（首版）')
  if t=='movie' and c=='marked_for_review':put(t,c,'不设新业务状态','用户 2026-11-13 明确首版取消影片待清理；不生成清理入口或任务','主动取消（首版）')
  if t=='movie' and c=='cover_layout':put(t,c,'media_items.cover_layout','v0.4 补齐；1→landscape，2→portrait，保留展示偏好')
  if t=='movie' and c=='supports_chinese':put(t,c,'media_items.supports_chinese','v0.4 补齐；旧 1/0→true/false，属于资料标记，不保证本地字幕轨道')
  if t=='movie' and c=='user_rating':put(t,c,'user_media_state.rating','用户明确保留；1～5 星整数，NULL=未评分；可设置、修改和取消')
  if t=='tag' and c in ['attr_value','category','is_visible']:
   dest={'attr_value':'attribute_group','category':'primary_category_id','is_visible':'is_visible'}[c]
   put(t,c,'tags.'+dest,'v0.4 补齐；保留属性分组、分类归属和隐藏语义；分类编码转换为 ID')
  if (t,c) in [('movie','movie_code'),('actor','actor_code'),('series','series_code'),('tag','tag_code'),('collections','coll_code')]:
   put(t,c,'legacy_mappings.key_name + legacy_id + 对应目标外键','v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用')
  if t=='tag' and c=='id':put(t,c,'tags.id + legacy_mappings.tag_id','v0.4 新增 tag 目标外键；保留旧标签 ID 与新 UUID 映射')
  if t in ['task','actor_profile_task']:
   put(t,c,'不进入新库','用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力','不迁移（旧任务）')
  if t=='movie' and c=='parent_movie_code':put(t,c,'media_items.parent_id','用户已确认均为上下部/Part 分集；旧父项→group，已有子项→episode，不强制季')
  if t=='movie' and c=='episode_order':put(t,c,'media_items.episode_number','沿用集顺序，不映射为同一版本内的文件段')
  if t=='movie' and c in ['watch_progress','last_play_position_ms']:
   put(t,c,'不进入新播放状态','用户 2026-11-16 确认观看进度重新建立；不换算、不生成新会话或断点，旧库备份保留原始值','不迁移（旧进度）')
  status,d,n=M[t,c];columns.append((c,status,d,n,evidence))
 items.append((t,f,columns))
assert sum(len(c) for _,_,c in items)==103
lines=['# 现有持久字段 → v0.4 候选模型 · 映射审查','',
'更新于 2026-11-16。按用户决定取消 alias / 待清理，保留双名称与评分；14 组父子确认为分集、旧任务与旧观看进度不迁；已补齐编码、标签、封面和中文标记。覆盖当前 11 个实体的 **103 个持久字段**；历史证据取自文件名日期为 2026-09-29 的 SQL 备份，并非运行库即时状态。[复核结论与处理原则](./evidence-review.md)。','',
'“已有对应”只说明新模型有承接位置，尚未执行迁移；“语义/转换待核对”表示不能机械复制；“缺口”表示新 DDL 尚无完整表达。所有“待修订/归档策略”都还不是已经实现的迁移逻辑。','',
'非 NULL/非空计数包含 0 和 false，不能据此认定该功能被使用；实际正值与枚举分布见复核报告。UUID、关联 ID 和来源身份需要映射，不直接复制数值。','']
from collections import Counter
counts=Counter()
for t,f,columns in sorted(items):
 lines += [f'## {t}', '', f'实体：[{f.name}](../../../../packages/entities/src/{f.name})；历史备份 {agg["tables"][t]["rows"]:,} 行。','', '| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |','| --- | --- | --- | --- | --- |']
 for c,status,d,n,e in columns:
  counts[status]+=1
  lines.append(f'| `{c}` | {status} | {d} | {n} | {e} |')
 lines.append('')
lines += ['## 覆盖检查','',f'已列出 103/103 个实体持久字段：'+ '；'.join(f'{k} {v} 项' for k,v in counts.items())+'。','',
'103 个旧字段的处置与 563 个新字段的说明是两套方向不同的清单；一个旧字段可拆为多个新字段。新字段的来源、用途、写入和首版建议已逐项列在[阅读指南与字段字典](./field-guide.md)，不代表真实迁移已通过。','']
(root/'docs/engineering/video-x/database/legacy-field-mapping.md').write_text('\n'.join(lines))
print({'fields':sum(counts.values()),'review_status':dict(counts),'tables':len(items)})
