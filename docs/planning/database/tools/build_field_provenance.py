"""生成字段业务说明。来源是设计审查标签，不代表应用已经实现或旧库迁移通过。"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SPEC=json.loads((ROOT/'model-spec.json').read_text())
# table: 首版建议、业务依据、计划写入方、读取位置。均为设计，不冒称现有实现。
D={}
def group(names,stage,basis,writer,usage):
 for name in names.split():D[name]=dict(stage=stage,basis=basis,writer=writer,usage=usage)
group('accounts profiles devices auth_sessions','待裁剪','个人自用的身份和跨端状态归属方案；旧库无账号/设备表，外网出站抓取不等于公网播放需求','初始化/认证服务/客户端登记用例','Web/Android 登录与个人状态归属；无对应首版页面的字段应裁剪')
group('libraries','建议保留','作品与磁盘目录分开；旧库无逻辑库实体','部署初始化/媒体库设置','默认片库、扫描范围与作品归属')
group('storage_roots','建议保留','旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验','媒体根设置/扫描 worker','管理端媒体根设置、扫描前检查、文件离线提示')
group('media_files','建议保留','拆出旧 movie 的文件事实；补充扫描与探测状态','扫描器/ffprobe worker','文件管理、导入复核、播放器可用性与媒体信息')
group('media_streams','建议保留','现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化','ffprobe 标准化器','作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留')
group('assets','建议保留','movie.cover_image_path、actor.profile_image_path 的资源托管与完整性','图片导入/下载/上传服务','作品海报、演员头像、系列/收藏夹封面')
group('categories catalog_revisions','建议保留','category 原有分类树；补充产品已规划的分类整理和并发保护','分类维护用例/初始化','观看端分类范围与管理端分类迁移、排序')
group('media_items','建议保留','movie 资料部分；将文件、个人状态和资料分开','人工资料维护/接受来源/导入发布','片库、作品详情、筛选与检索')
group('media_identifiers','建议保留','movie.serial_number；编号与平台内部 ID 分开','导入匹配/来源解析/人工编号维护','编号展示、搜索与候选匹配')
group('editions edition_parts','建议保留','movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开','导入复核/版本维护/发布事务','作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段')
group('edition_subtitles','后置','外挂字幕版本绑定尚无现有实体/业务数据依据','未来字幕识别与人工绑定','未来播放器字幕选择；首版不强制实现')
group('media_images','建议保留','movie.cover_image_path；把图片身份和作品用途分开','图片维护/接受来源/发布事务','作品卡片、详情海报；背景与剧照按来源能力开放')
group('people','建议保留','actor 的资料身份；沿用 full_name / detailed_name，取消别名能力','人物维护/人物补全/接受来源','演员列表、演员详情、参演作品、姓名检索')
group('credits','建议保留','movie_actor；extra_info 中的导演，人物与作品的职责关系','导入发布/演职员维护/人物合并','演员下的影片、作品演员区与导演信息')
group('franchises franchise_items','建议保留','series、movie.series_id / series_code；增加成员维护与顺序','系列资料/成员维护/导入发布','系列详情、系列下影片、管理端系列整理')
group('genres media_genres source_value_mappings','后置','独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接','未来来源词汇映射/类型维护','未来类型筛选；首版不自动将旧标签拆成 genre')
group('tags media_tags','建议保留','tag、movie_tag，保留分类归属、属性组和可见性','标签维护/导入发布/接受来源','作品筛选、资料标签选择器与分组维护')
group('organizations media_organizations','建议保留','movie.extra_info 的 makers/studio 片商信息','两代 extra_info 迁移/来源解析/人工复核','作品资料中的片商，不增加独立机构管理产品模块')
group('collections collection_items','建议保留','collections、collections_movie；增加整理顺序和封面方案','个人收藏夹用例','观看端收藏夹浏览、作品加入多个收藏夹、整理模式')
group('user_media_state','建议保留','movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开','个人状态/评分/播放用例','喜欢、评分筛选、继续观看、作品的收藏夹选择')
group('user_person_state','建议保留','actor.is_collected；人物喜欢独立于参演关系','人物喜欢用例','收藏页人物视图与演员详情喜欢按钮')
group('playback_sessions playback_events playback_progress','建议保留','movie.last_play_position_ms / watch_progress / play_count 的跨端接续；会话、序号是新增方案','播放开始用例/客户端事件接收/进度投影','继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛')
group('providers provider_configs','建议保留','现有 JavService / HavtwService；用户明确要求可扩展抓取来源','启动注册/来源设置','管理端来源开关、凭据引用和外网抓取诊断')
group('source_records provider_media provider_people provider_franchises','建议保留','抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞','来源适配器/候选匹配/人工接受','录入候选、再次刷新定位、人物与系列的来源追溯')
group('metadata_snapshots','建议保留','旧任务结果承载抓取资料；新增不可变结构化快照','来源适配器','导入预览、来源刷新差异、失败排查；保留策略待确定')
group('metadata_ratings','后置','现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分','未来支持评分的适配器','未来网站评分展示；首版个人评分不依赖本表')
group('media_field_state person_field_state franchise_field_state','建议保留','管理端人工维护与来源刷新共存；旧库没有字段锁定表','人工字段维护/接受来源差异','资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪')
group('relationship_sources','待裁剪','多来源关系刷新不能误删人工关系；关系级追溯是设计新增','接受来源关系差异/人工关系维护','刷新关系差异与管理详情；首版可评审是否需要全部关系粒度')
group('metadata_change_sets','建议保留','用户要求改进录入/资料维护；先预览再接受来源结果','来源刷新比较器/人工接受用例','管理端差异预览与确认，避免抓取直接覆盖人工资料')
group('import_batches import_items import_item_files import_candidates','建议保留','现有本地解析+抓取+录入流程；新增服务端草稿与候选复核','扫描/匹配/复核/发布用例','管理端导入工作台、批次状态、草稿恢复与发布结果')
group('tasks task_items','建议保留','task、actor_profile_task；把结果文件和易丢进度变为持久任务项','任务创建用例/worker','任务中心、失败重试、Mac 登录恢复后继续执行')
group('outbox_events idempotency_keys','待裁剪','网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段','业务事务/事件派发器/幂等中间层','系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表')
group('audit_log','待裁剪','人物合并、分类迁移与来源接受的追溯；旧库无审计日志','业务事务内审计记录','管理端操作记录与错误排查；范围和保留周期待评审')
group('legacy_mappings','建议保留','全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写','迁移程序','迁移核对、旧链接定位、重复执行迁移时查已有结果')
assert set(D)=={t['name'] for t in SPEC},set(t['name'] for t in SPEC)-set(D)
P={}
for t in SPEC:
 d=D[t['name']]
 for name,definition,note in t['columns']:
  P[t['name']+'.'+name]=dict(table=t['name'],field=name,origin='方案新增',old_sources=[],basis=d['basis'],purpose=note,usage=d['usage'],writer=d['writer'],initialization='新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实',stage=d['stage'])
def setp(t,c,origin=None,old=None,**kw):
 p=P[t+'.'+c]
 if origin:p['origin']=origin
 if old is not None:p['old_sources']=old.split('|') if isinstance(old,str) else old
 p.update(kw)
def old(t,c,s,how='保留业务含义；类型/ID 转换须由迁移程序验证',kind='沿用',**kw):
 setp(t,c,kind,s,initialization=how,**kw)
def later(t,fields,basis,usage):
 for c in fields.split():setp(t,c,'待定扩展',stage='后置',basis=basis,usage=usage,initialization='首版不填充、不要求前端录入；启用对应功能前再确定契约')
oldtable={'categories':'category','media_items':'movie','people':'actor','franchises':'series','tags':'tag','collections':'collections','credits':'movie_actor','media_tags':'movie_tag','collection_items':'collections_movie','user_media_state':'movie','user_person_state':'actor','tasks':'task|actor_profile_task'}
for t in SPEC:
 name=t['name']
 for c,definition,note in t['columns']:
  if c in ['id','created_at','updated_at','revision','archived_at']:
   setp(name,c,'技术新增',initialization='服务端生成；不要求用户填写')
   if c=='id':
    setp(name,c,purpose='新内部 UUID，改名和路径变化不改变关联；不是旧 ID 数值',usage=D[name]['usage']+'；关联和路由使用此 ID')
    if name in oldtable:setp(name,c,'拆分重组',old=[x+'.id' for x in oldtable[name].split('|')],initialization='生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并')
   elif c in ['created_at','updated_at']:
    setp(name,c,usage='记录创建/修改时间；用于维护详情、同步和稳定排序',initialization='新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区')
    if name in oldtable and (c!='updated_at' or t.get('mutable')):setp(name,c,'转换沿用',old=[x+'.'+c for x in oldtable[name].split('|')],basis='旧实体时间；movie 的时间还可能来自文件 birthtime/mtime，不冒称入库时间')
   elif c=='revision':setp(name,c,usage='编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对',initialization='从 1 开始，更新触发器递增；旧库无对应并发版本')
   elif c=='archived_at':
    if name in oldtable:setp(name,c,'转换沿用',old=[x+'.is_deleted' for x in oldtable[name].split('|')],initialization='未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知')
    else:setp(name,c,initialization='默认 NULL；明确归档操作写服务端时间',usage='归档过滤与恢复，不表示删除磁盘视频')
# 分类
for n,o in [('code','category_code'),('name','cat_name'),('is_visible','is_visible')]:old('categories',n,'category.'+o)
old('categories','parent_id','category.parent_category_code','先按旧分类编码定位，再改为新父分类 UUID；检查缺失父节点和环','转换沿用')
setp('categories','position',usage='管理端同级分类排序；观看端按此顺序展示',initialization='按迁移报告确认的稳定旧顺序初始化，再允许人工调整')
setp('catalog_revisions','singleton','技术新增',purpose='全分类树只有一行的哨兵键',usage='分类移动、迁移、排序时锁定树的基线',initialization='初始化写 true，revision 从 1 开始')
# 作品
for n,o in [('title','display_name'),('summary','movie_desc'),('notes','remark')]:old('media_items',n,'movie.'+o)
old('media_items','primary_category_id','movie.category_code','通过旧 category_code→新分类 ID 映射；无分类时进入明确的未分类','转换沿用')
for c in ['release_date','release_year','release_precision']:old('media_items',c,'movie.release_date','先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日','拆分重组')
old('media_items','parent_id','movie.parent_movie_code','依据真实父子样例决定是独立内容父子还是播放分段；不自动造季','拆分重组',stage='待裁剪')
old('media_items','episode_number','movie.episode_order','只有确认是独立集时才保留为集号；分段文件应进入 part_no','拆分重组',stage='待裁剪')
setp('media_items','kind','方案新增',basis='旧 movie 没有作品类型列；只有父编码和分集顺序',usage='区分可播放资料与组织容器；剧季集是待验证扩展',initialization='由导入/人工按实际内容判断；不得仅按文件数推断电影或电视剧')
for c in ['parent_kind','season_number']:setp('media_items',c,'待定扩展',stage='后置',basis='固定剧→季→集层级是新增选择；旧库无季号',usage='未来剧集组织及类型约束；先验证现有 14 组父子样例')
old('media_items','cover_layout','movie.cover_layout','1→landscape；2→portrait；其他值报迁移异常，不按图片宽高覆盖人工偏好','转换沿用',usage='Web/Android 作品卡片和详情封面的横竖展示')
old('media_items','supports_chinese','movie.supports_chinese','1→true，0→false；新资料未知 NULL；保留为资料标记，不宣称本地检测成功','转换沿用',usage='中文支持筛选与资料标记；播放器真实字幕仍读取文件轨道')
setp('media_items','library_id','方案新增',usage='默认逻辑库归属和文件同库校验',initialization='首版旧作品统一映射到明确创建的默认库')
setp('media_items','published_at','方案新增',usage='只有发布成功的资料进入观看端；导入半成品留在草稿',initialization='成功迁入的作品写迁移发布时间并注明来源；不伪造旧发布时间')
later('media_items','original_title sort_title declared_runtime_ms','旧实体没有独立原名、排序名或来源宣称时长；本次未证实来源会提供','未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测')
# 文件和版本
old('media_files','relative_path','movie.file_path|movie.file_name','识别受控根目录后保留相对路径；文件名可从末段派生，冲突记录报告','拆分重组')
old('storage_roots','mount_path','movie.file_path','以受控配置确定根路径和挂载映射，不自动信任旧路径前缀','拆分重组')
old('media_files','root_id','movie.file_path','识别并登记媒体根，再映射文件的根 UUID','拆分重组')
old('media_files','size_bytes','movie.file_size','旧展示字符串有舍入；精确字节数以重新 stat 为准，文件离线进入待处理，不伪造精确值','转换沿用')
old('media_files','container_format','movie.file_format','旧值是扩展名；真实容器格式重新 ffprobe，不能承诺两者完全一致','转换沿用')
old('media_files','duration_ms','movie.duration','旧 HH:mm:ss 转毫秒仅精确到秒；重新探测可得到更准确事实','转换沿用')
setp('media_files','mtime_ns','技术新增',basis='旧 LocalService 读取 stat.mtime 并混写 movie.updated_at；新列来自文件系统',initialization='重新 stat 获取；离线时不把旧 updated_at 冒认为精确纳秒值',usage='扫描比对文件变化与探测过期判定')
for c in ['fingerprint','fingerprint_algorithm']:setp('media_files',c,'技术新增',usage='只生成重复候选，不凭抽样指纹自动合并或删除文件',initialization='按明确版本算法计算，未计算为 NULL',stage='待裁剪')
for c in ['content_revision','probed_content_revision','probe_status','probed_at','probe_version','probe_error_code','probe_result']:
 setp('media_files',c,'技术新增',usage='导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果',initialization='新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误')
for c in ['first_seen_at','last_seen_at','missing_since','availability']:
 setp('media_files',c,'技术新增',usage='区分文件缺失和整盘离线；管理端展示异常并避免误清空库',initialization='扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing')
setp('media_files','file_kind',initialization='首版已支持的主视频记 video；subtitle/sidecar 枚举是候选，不代表首版实现 NFO')
for c in ['width','height']:old('media_streams',c,'movie.resolution','解析旧宽×高字符串，最终由 ffprobe 视频轨道核验','拆分重组')
for c in ['stream_index','kind','codec','language','title','is_default','is_forced','channels','channel_layout']:
 setp('media_streams',c,'探测新增',basis='现有 ffprobe 能产生轨道事实，旧数据库未单独保存',initialization='成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测')
for c in ['bit_depth','color_transfer','sample_rate_hz','frame_rate_num','frame_rate_den']:
 setp('media_streams',c,'探测新增',stage='待裁剪',usage='媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result')
setp('media_files','bitrate_bps','探测新增',stage='待裁剪',usage='媒体信息详情；没有首版读取需求时保留在原始探测结果即可')
for c in ['last_checked_at','last_complete_scan_at','expected_marker','status','scan_enabled']:
 setp('storage_roots',c,'技术新增',usage='扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失',initialization='登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间')
old('editions','media_id','movie.id','旧普通作品先建立默认版本；有父子/多文件时必须复核组织关系','拆分重组')
setp('editions','media_kind','技术新增',usage='与作品类型复合外键配合，防止组织容器误建可播放版本',initialization='从所属作品 kind 复制受控判别值，客户端不能任意指定')
setp('editions','name',usage='播放器和作品详情选择可播放版本',initialization='旧单文件作品使用“默认版本”；不自动生成导演剪辑/语言版本事实')
setp('editions','is_default',initialization='旧单版本标 true；多版本由复核选择，数据库保证至多一个有效默认')
later('editions','cut language','旧实体无剪辑版本/语言版本身份；实际轨道语言另有探测事实','未来多个实际版本的选择；没有真实样例前不强迫用户填写')
old('edition_parts','file_id','movie.file_path','映射已登记实际文件的 UUID，普通影片为一个整文件段','拆分重组')
old('edition_parts','part_no','movie.episode_order','普通单文件记 1；旧子记录只有确认为分段时才转为段顺序','拆分重组')
setp('edition_parts','bound_content_revision','技术新增',usage='文件被替换后阻止直接复用旧播放关系和断点',initialization='发布或人工重新绑定时写当前 file.content_revision')
# 图片
old('assets','storage_key','movie.cover_image_path|actor.profile_image_path','验证并复制到受控资源目录后生成键，不直接使用任意旧绝对路径','拆分重组')
for c in ['sha256','mime_type','size_bytes','width','height','state','unreferenced_since']:
 setp('assets',c,'技术新增',initialization='由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值',usage='图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能')
old('media_images','asset_id','movie.cover_image_path','先完成图片托管再关联到作品','拆分重组')
setp('media_images','purpose',initialization='旧封面映射 poster；backdrop/still 仅来源实际提供时启用')
# 人物与关系
old('people','full_name','actor.full_name','原文保留为常用名；新姓名不唯一，不能据此合并',usage='演员卡片主标题、作品演员区与常用名称检索')
old('people','detailed_name','actor.detailed_name','按原文迁移，不拆成 alias；未知 NULL',usage='演员详情和资料维护副名称；full_name 与 detailed_name 均参与检索')
old('people','gender','actor.gender','核对旧枚举含义后映射；无法确认则 unknown','转换沿用')
old('people','portrait_asset_id','actor.profile_image_path','导入头像资源并映射 asset ID；缺失记录异常','拆分重组')
old('people','primary_category_id','actor.category','核对旧分类编码后映射；不限制参演影片的分类','转换沿用')
for c in ['merged_into_id','merged_at']:setp('people',c,usage='管理端合并重复人物与旧链接跳转；合并不同姓名时由用户选保留全名和详细名，不自动生成别名',initialization='默认 NULL；仅明确合并成功后记录')
later('people','sort_name biography birth_date','本次旧实体与人物补全代码没有独立排序名/简介/生日数据；非用户确认必需','未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准')
old('credits','media_id','movie_actor.movie_id|movie.extra_info','演员关系按旧作品映射；导演从结构化 extra_info 解析','拆分重组')
old('credits','person_id','movie_actor.actor_id|movie.extra_info','演员用旧 actor ID 映射；导演不按同名静默并入演员身份','拆分重组')
old('credits','job','movie_actor|movie.extra_info.type','movie_actor→actor；directors/director→director；writer/producer 是后置枚举','拆分重组')
later('credits','character_names','旧演职员关系和已检查抓取中没有角色名资料','未来适配器明确返回角色名时才启用；首版只展示参演关系和职责')
setp('credits','position',initialization='旧库无人工顺序：采用迁移报告确认的稳定顺序，来源提供或人工调整后写入',usage='作品详情演员区与管理端演职员排序')
old('franchises','name','series.series_name')
old('franchises','primary_category_id','series.category','校验旧分类编码并映射为 ID','转换沿用')
for c in ['cover_asset_id','cover_media_id']:setp('franchises',c,usage='系列详情封面；手工图与借用成员海报二选一',initialization='旧无此值时 NULL，按产品约定回退到成员海报，不复制或编造旧封面')
old('franchise_items','franchise_id','movie.series_id|movie.series_code','验证两旧字段一致后映射 series→franchises；冲突进入迁移报告','拆分重组')
old('franchise_items','media_id','movie.id','映射有系列归属的旧作品；多系列归属是新增能力','拆分重组')
setp('franchise_items','position',initialization='旧库无人工系列顺序，按明确迁移排序规则初始化并报告，之后允许人工整理')
# 标签
old('tags','name','tag.tag_name')
old('tags','normalized_name','tag.tag_name','用于匹配的规范化派生值，不修改原显示名；不同分类/属性组的同名标签不合并','转换沿用')
old('tags','primary_category_id','tag.category','旧分类编码→新分类 ID','转换沿用',usage='标签维护与标签选择器按分类显示')
old('tags','attribute_group','tag.attr_value','沿用现有分组码，不自动拆为类型、机构或角色实体',usage='按主题、角色、服装等属性分组维护和选择标签')
old('tags','is_visible','tag.is_visible','1→true，0→false；隐藏保留已有关系','转换沿用',usage='新选择时隐藏该标签；既有作品详情仍可展示已关联标签，不等同归档')
old('media_tags','media_id','movie_tag.movie_id','通过旧 movie ID 映射为新作品 UUID','转换沿用')
old('media_tags','tag_id','movie_tag.tag_id','通过旧 tag ID 映射为新标签 UUID；不按同名乱合并','转换沿用')
old('organizations','name','movie.extra_info.name','只取 makers/studio 片商项，保留类型与 code 的原始迁移归档','拆分重组')
old('media_organizations','media_id','movie.id','关联存在片商资料的作品','拆分重组')
old('media_organizations','organization_id','movie.extra_info.code|movie.extra_info.name','依据来源身份复用机构，不能仅按名字静默合并','拆分重组')
old('media_organizations','role','movie.extra_info.type','makers/studio→studio；publisher/label 作为后置枚举','转换沿用')
for t in ['credits','franchise_items','media_images','media_tags','media_genres','media_organizations']:
 setp(t,'is_manual','方案新增',usage='人工保留的关联在来源刷新时继续存在',initialization='明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略')
# 收藏与评分
old('collections','name','collections.coll_name')
old('collections','normalized_name','collections.coll_name','规范化派生，用于重名检查；若新约束冲突报报告，不静默删夹','转换沿用')
setp('collections','profile_id',initialization='全部旧收藏夹归入默认个人资料；个人身份层级仍待裁剪')
for c in ['cover_asset_id','cover_media_id']:setp('collections',c,usage='收藏页与收藏夹详情封面；借用封面作品必须为本夹成员',initialization='旧无自定义封面，默认 NULL 并按首个成员回退')
old('collection_items','collection_id','collections_movie.collection_id','通过旧收藏夹 ID 映射','转换沿用')
old('collection_items','media_id','collections_movie.movie_id','通过旧作品 ID 映射；保持一个作品加入多个收藏夹','转换沿用')
setp('collection_items','position',initialization='旧无显式顺序，按旧关系创建时间/ID 的确定规则初始化；这是新顺序，不冒称旧人工排序',usage='收藏夹“整理”模式拖动顺序，浏览临时排序不改此值')
old('user_media_state','media_id','movie.id','个人状态关联到作品，而非文件','拆分重组')
old('user_media_state','is_favorite','movie.is_favorite','1→true，0/明确空语义→false；不自动加入收藏夹','转换沿用')
old('user_media_state','rating','movie.user_rating','合法 1～5 整数原值迁入；NULL 保持未评分；0 或越界值报异常','转换沿用',basis='用户 2026-11-13 明确保留打分机制；历史未评分不影响此需求',usage='作品详情点选 1～5 星、取消评分、评分筛选与排序；与喜欢和网站评分独立',writer='个人评分用例：设置 1～5 或清空为 NULL')
old('user_media_state','last_played_at','movie.last_played_at','保留已知旧时间；未知为 NULL',usage='继续观看列表与最近播放排序')
old('user_media_state','legacy_play_count','movie.play_count','保留旧累计基数；新播放次数从实际已开始会话计算，不伪造历史事件','拆分重组')
setp('user_media_state','resume_edition_id','拆分重组',old='movie.last_play_position_ms|movie.watch_progress',initialization='只有成功匹配到确切版本/文件段时才能建立接续入口；未知保持待处理',usage='“继续观看”定位到版本；不让一个文件版本断点覆盖另一个版本')
setp('user_media_state','watched_at','方案新增',basis='旧 watch_progress 可达 100，但没有独立已看时间',initialization='新标记动作写时间；旧进度完成也不能伪造真实标记时间，待迁移规则确认',usage='“已看”筛选和人工标记；改变已看不强制修改断点')
for t in ['user_media_state','user_person_state']:
 setp(t,'favorited_at','方案新增',initialization='新喜欢动作写服务端时间；旧库没有喜欢时间，允许 true+NULL，取消后清空',usage='最近喜欢排序；旧时间未知排在已知时间之后')
for c in ['takeover_generation','memberships_revision']:
 setp('user_media_state',c,'技术新增',usage='分别保护跨设备播放接管和多收藏夹选择，防止旧请求覆盖新选择',initialization='旧无此值：接管代数 0，收藏夹成员版本 1，由服务端用例更新')
old('user_person_state','person_id','actor.id','通过旧演员 ID 映射到人物身份','转换沿用')
old('user_person_state','is_favorite','actor.is_collected','1→true；旧 NULL/0 按现有未收藏语义归为 false','转换沿用')
# 播放事件不补造历史会话
for t in ['playback_sessions','playback_events','playback_progress']:
 for c,_,_ in next(x for x in SPEC if x['name']==t)['columns']:
  if c not in ['id','created_at']:
   setp(t,c,'技术新增',initialization='由真实的新播放会话/事件生成；旧库没有事件序号、设备会话和接管代数，不补造历史播放')
old('playback_progress','position_ms','movie.last_play_position_ms|movie.watch_progress','优先真实毫秒位置；只有百分比的记录保留原值与不确定性，不能直接声称精确断点','拆分重组',usage='同一版本的断点位置；需先确定所属段和迁移专用会话规则')
for t in ['playback_events','playback_progress']:
 setp(t,'part_id','拆分重组',old='movie.file_path|movie.parent_movie_code|movie.episode_order',initialization='新播放由所选版本的有序段确定；旧父子在语义复核后映射',usage='断点归属到准确文件段，避免多个 CD/文件混用位置')
# 来源
for c in ['code','name','kind','adapter_version','capabilities']:
 setp('providers',c,'方案新增',basis='现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展',initialization='适配器启动注册 code、名称、版本、能力；只有实现的能力才声明')
setp('providers','kind',initialization='已有两个来源登记 remote；local/NFO 为后置能力，不登记未实现来源')
for c in ['settings','credential_ref','outbound_policy']:
 setp('provider_configs',c,'技术新增',initialization='从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置',usage='来源设置、抓取登录和外网出站诊断，不为观看端开放凭据')
old('source_records','external_id','actor.actor_code|series.series_code|movie.extra_info.code','仅当确认是来源页面身份才映射；作品来源 ID 从实际抓取页提取，不能把 movie_code 当作 JavDB ID','拆分重组')
setp('source_records','source_url','方案新增',basis='当前抓取使用页面地址，但核心实体未统一保存来源 URL',initialization='适配器写入实际来源详情页 URL；不伪造地址',usage='管理端跳转来源与抓取诊断')
setp('source_records','local_file_id','待定扩展',stage='后置',basis='NFO/sidecar 尚未确认',usage='未来本地来源的身份绑定；首版远程来源保持 NULL')
for t,key,src in [('provider_media','media_id','movie.id'),('provider_people','person_id','actor.id'),('provider_franchises','franchise_id','series.id')]:
 old(t,key,src,'来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体','拆分重组')
 setp(t,'entity_kind','技术新增',usage='固定判别列，防止把人物来源链接到作品或系列',initialization='按表固定写 media/person/franchise，不能由用户自由选')
setp('metadata_snapshots','payload','拆分重组',old='task.result_url|actor_profile_task.result_url|movie.extra_info',initialization='新来源结果规范化后保存；旧 result_url 指向的 JSON 文件需要另外检查并导入，不凭数据库路径恢复正文',usage='导入候选预览和再次刷新差异；不存 Cookie 或授权页面')
for t in ['media_field_state','person_field_state','franchise_field_state']:
 for c in ['field_key','override_value','is_locked','accepted_snapshot_id','edited_by']:
  setp(t,c,'方案新增',initialization='新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照',usage='管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值')
setp('person_field_state','field_key',usage='只接受 full_name/detailed_name 等白名单；无 aliases。生日/简介等后置字段首版 API 不开放')
setp('relationship_sources','genre_link_id','待定扩展',stage='后置',usage='随独立 genre 域后置；首版不得产生此类关系依据')
setp('metadata_change_sets','patch',usage='资料刷新差异：显示旧值、来源值与将接受的变更；接受后同事务改正式字段',initialization='比较器基于实际快照生成白名单补丁，不把任意 JSON 当成可执行命令')
# 导入与任务
for t in ['import_batches','import_items','import_item_files','import_candidates']:
 for c,_,_ in next(x for x in SPEC if x['name']==t)['columns']:
  if c not in ['id','created_at','updated_at','revision']:
   setp(t,c,'方案新增',initialization='服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程')
setp('import_candidates','confidence','技术新增',usage='候选排序和人工复核提示；启发式匹配分不宣称为真实概率',initialization='匹配器按版本化规则计算；无规则时不假定高可信')
setp('import_items','draft',usage='导入工作台恢复标题、人物、分类、系列与标签的未发布选择',initialization='服务端按版本化草稿契约保存；未发布草稿不污染正式片库')
setp('import_items','publish_key','技术新增',usage='发布超时重试返回同一结果，避免重复建作品/版本',initialization='导入项创建时生成稳定发布键；重试不换键')
for c in ['published_media_id','published_edition_id','published_at']:setp('import_items',c,'技术新增',usage='任务发布结果链接和幂等返回；标记已完成项',initialization='仅成功的发布事务同时填写；尚未发布保持 NULL')
old('tasks','status','task.status|actor_profile_task.status','按明确枚举映射；历史运行中任务不直接冒充新队列的可恢复执行','转换沿用')
setp('tasks','kind','拆分重组',old='task|actor_profile_task',initialization='人物补全映射 person_enrich；旧通用任务须结合结果识别类型',usage='任务中心按导入、探测、刷新、人物补全等分组')
old('task_items','result','task.result_url|actor_profile_task.result_url','读取并校验旧 JSON 文件后才能导入历史结果；新任务保存结构化结果','拆分重组')
old('task_items','error_details','task.error|actor_profile_task.error','保留可用错误并脱敏；无法归属任务项的历史错误归入受控迁移归档','拆分重组')
setp('task_items','checkpoint','技术新增',basis='旧 progress 仅百分比，不包含可恢复阶段信息',usage='任务重启后按持久阶段继续，而不是按旧百分比猜进度',initialization='worker 事务性提交实际完成的业务阶段；旧百分比只保留在迁移报告')
setp('task_items','queue_job_id','技术新增',usage='定位队列执行记录；业务状态不依赖一个可过期的队列 ID',initialization='投递队列时记录；旧无对应值保持 NULL')
# 迁移映射
for c in ['source_system','source_table','key_name','target_kind']:
 setp('legacy_mappings',c,'技术新增',initialization='迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写')
old('legacy_mappings','legacy_id','movie.id|movie.movie_code|actor.id|actor.actor_code|series.id|series.series_code|category.id|category.category_code|tag.id|tag.tag_code|collections.id|collections.coll_code','按 key_name 保存主键或业务编码原始文本；同一旧身份可映射作品/版本/文件多个目标','拆分重组',usage='按旧表+旧字段+旧值找新 ID，保留旧代码检索和迁移可重复性')
for c,src in [('media_id','movie.id'),('edition_id','movie.id'),('file_id','movie.id'),('person_id','actor.id'),('franchise_id','series.id'),('category_id','category.id'),('collection_id','collections.id'),('tag_id','tag.id')]:
 old('legacy_mappings',c,src,'填入对应新实体 UUID；八个目标外键恰好一个非空','拆分重组')
for t in ['outbox_events','idempotency_keys','audit_log']:
 for c,_,_ in next(x for x in SPEC if x['name']==t)['columns']:
  setp(t,c,'技术新增',initialization='相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录')
# identity/devices 的安装标识不是硬件指纹；会话 token 不是密码。
setp('devices','installation_id','技术新增',initialization='客户端首次安装/站点存储初始化生成 UUID 并持久化；不采集硬件指纹')
setp('auth_sessions','token_hash','技术新增',initialization='对新生成的随机会话令牌保存摘要，正文只在建立会话时交付客户端')
# 2026-11-16 用户确认：单账号通用身份、有序分集、人物扩展后置、旧任务全部不迁。
for table in ['accounts','profiles','devices','auth_sessions']:
 D[table].update(stage='建议保留',basis='用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系',usage='单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理')
 for key,p in P.items():
  if p['table']==table:p.update(stage='建议保留',basis=D[table]['basis'],usage=D[table]['usage'])
setp('collections','profile_id',initialization='全部旧收藏夹归默认单账号的默认 profile；不建立多资料切换入口')
old('media_items','parent_id','movie.parent_movie_code','用户已确认 14 组为上下部/Part 等有序分集：父记录→group，子记录→episode；通过旧父编码建立 parent_id，不造季','拆分重组',stage='建议保留',usage='作品组详情的选集和下一集；父记录原有文件路径另登记盘点，不自动当作新增集或丢弃')
old('media_items','episode_number','movie.episode_order','沿用子记录顺序，缺失/重复单独报告；第 1/2/3 集不转成版本内文件段','转换沿用',stage='建议保留',usage='作品组选集顺序、下一集和续播定位')
setp('media_items','kind','方案新增',basis='用户确认上下部/Part1/Part2 均按集管理；需要不强制季的通用组织',initialization='14 组旧父项→group，已有子项→episode；普通单文件按内容使用 movie/video。未来剧可直接带集，也可带季',usage='通用 group→episode；未来 show→episode 或 show→season→episode；组/剧/季不直接绑定播放版本')
setp('media_items','parent_kind','技术新增',stage='建议保留',basis='有序分集的父子类型及同库引用保护',initialization='从实际父记录 kind 写入 group/show/season，不由客户端随意指定',usage='复合外键约束父类型和媒体库；避免把分集挂到错误主体')
setp('media_items','season_number','待定扩展',stage='后置',basis='现有分集没有季，首版不要求；以后确有季时可扩展',initialization='当前 group→episode 不生成季号；只有真实 season 行才填写季号',usage='未来可选季编号；集可以直接挂组/剧，不强制补一季')
old('editions','media_id','movie.id','旧普通作品或子集各建默认版本；group 容器不建版本、不假造可播放文件','拆分重组')
setp('editions','media_kind','技术新增',initialization='从所属 movie/episode/video 复制判别值；group/show/season 为不可播放容器',usage='确保版本归可播放条目，防止作品组、剧或季误绑定直接播放')
setp('edition_parts','part_no','方案新增',old=[],basis='有序分集与文件分段已区分；旧 episode_order 是集号，不直接迁为文件段序号',initialization='每个单文件版本的段序号为 1；只有确实属于同一集/作品的多个物理文件才维护多个段',usage='一个具体版本内的物理文件顺序；Part1/Part2 作为分集时各有自己的第 1 段')
for table in ['playback_events','playback_progress']:
 setp(table,'part_id','拆分重组',old='movie.file_path',initialization='旧子集的 file_path 对应该集默认版本内第 1 段；不把不同集压成同一版本的段',usage='精确断点归该集的具体版本和文件；作品组继续观看由子集状态汇总，不写组的虚假断点')
setp('user_media_state','resume_edition_id',initialization='精确断点归所属普通作品/子集版本；group 容器不填写，此组的接续入口通过子集 last_played_at 查询得到')
setp('legacy_mappings','edition_id',initialization='仅旧普通可播放条目或子集映射新版本 UUID；group 容器不生成版本映射')
for table in ['tasks','task_items']:
 D[table]['basis']='保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立'
 for key,p in P.items():
  if p['table']==table:
   p.update(origin='技术新增' if p['field'] in ['id','created_at','updated_at','revision','checkpoint','queue_job_id'] else '方案新增',old_sources=[],basis=D[table]['basis'],initialization='不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造')
setp('task_items','checkpoint',usage='仅用于新任务在重启后恢复已完成阶段；不是迁移旧任务百分比')
setp('metadata_snapshots','payload','方案新增',old=[],basis='可扩展来源的新抓取结果快照；旧任务 JSON 全部不迁',initialization='仅新抓取成功后保存规范化 payload；旧影片 extra_info 仍按资料迁移，不读取旧任务结果 JSON',usage='新导入候选预览和来源刷新差异，不存 Cookie/授权页面或旧任务快照')

# 用户随后确认：旧继续播放不可作为新系统基线，旧观看进度/断点全部不迁。
for table in ['playback_sessions','playback_events','playback_progress']:
 D[table]['basis']='用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放'
 for p in P.values():
  if p['table']==table:
   p.update(origin='技术新增',old_sources=[],basis=D[table]['basis'],initialization='初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点')
setp('playback_sessions','start_mode','方案新增',usage='区分首次播放、继续播放和明确从头；重试使用同一会话固定意图',initialization='创建会话事务按用户意图及有效进度确定 fresh/resume/restart；首次不写 progress')
setp('playback_sessions','start_part_id','技术新增',usage='客户端真正加载的起播文件段；复合外键确保属于本会话版本',initialization='事务重查最新有效目标后保存；不是从旧 file_path 补造会话')
setp('playback_sessions','start_position_ms','方案新增',usage='播放器就绪后必须定位到该毫秒位置，再确认实际起播；避免默认 0 覆盖断点',initialization='resume 取新系统已确认断点；fresh/restart 为 0。旧百分比和旧毫秒均不导入')
setp('playback_sessions','has_started',usage='确认目标定位并实际播放才置 true；重复 start 不重复计数，加载失败不计播放')
setp('playback_progress','position_ms','方案新增',usage='段内实际毫秒位置；定位确认前不更新，接受用户主动后退，不用百分比恢复')
setp('playback_progress','completed_at','方案新增',usage='真实播放完最后一段时写入，继续观看排除完成项；不自动改变手动 watched_at',initialization='新进度默认 NULL；自然结束写服务端时间，有效重新起播或 seek 后清空')
for table in ['playback_events','playback_progress']:
 setp(table,'part_id','技术新增',old=[],usage='精确绑定新系统实际播放的集/版本/文件段；组本身不建立断点')
setp('user_media_state','resume_edition_id','技术新增',old=[],basis='用户确认不迁移旧进度；续播入口仅由新真实播放建立',initialization='迁移初始化 NULL；实际定位并起播成功后更新到该集/作品版本；group 始终不填写',usage='联合新 progress 的有效坐标与未完成状态展示续播；不以旧最近播放时间生成卡片')
setp('user_media_state','last_played_at',usage='最近播放时间；可保留旧历史汇总，但续播必须同时有新系统有效未完成 progress，不能仅凭该时间推断断点')
setp('user_media_state','watched_at',initialization='默认 NULL；只由新的个人标记动作写入，不根据旧百分比或新播放结束自动补造')

# Product reconciliation: explicit review receipt and multi-edition draft bindings.
for c in ['draft_revision','reviewed_revision','reviewed_at','reviewed_by']:
 setp('import_items',c,'技术新增',old=[],basis='用户要求全部人工确认和手动发布；旧草稿缺少可核验确认凭据',usage='完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认',writer='草稿用例/人工确认命令/数据库约束',initialization='新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移',stage='建议保留')
setp('import_item_files','edition_key','技术新增',old=[],basis='完整编辑器支持一个草稿中的多个播放版本；每个版本分别管理文件段',usage='草稿版本与文件选择；发布时映射为正式 editions.id',initialization='首个版本使用 default；新增版本使用草稿内唯一键',stage='建议保留')
setp('import_items','draft_schema_version',usage='版本2定义完整资料、临时演职员/系列、图片、版本与字段选择；由服务端校验',initialization='新草稿为2；旧应用任务和浏览器草稿不迁')
setp('user_media_state','legacy_play_count',usage='保留历史累计基数；与新 has_started 会话计数共同用于播放次数筛选/排序，不是完播次数')
# 结构完整性与来源引用检查。
assert len(P)==sum(len(t['columns']) for t in SPEC)
for k,p in P.items():
 assert all(p[x] for x in ['basis','purpose','usage','writer','initialization','stage']),k
 if p['origin'] in ['沿用','转换沿用','拆分重组']:assert p['old_sources'],k
out={'version':'0.5','date':'2026-11-17','notice':'来源为设计依据，writer/usage 表示计划行为；未实现应用或执行真实迁移。待裁剪/后置不等于首版已确认。','tables':D,'fields':P,'migration_exclusions':['task','actor_profile_task','两个旧任务表的 result_url 指向的全部结果 JSON','movie.watch_progress','movie.last_play_position_ms'],'cancelled':[{'old':'actor.alias','decision':'首版取消；无 alias 列、别名表、别名检索或合并自动别名；原备份保留，不自动塞进 detailed_name'},{'old':'movie.marked_for_review','decision':'首版取消影片待清理功能；无对应新字段、筛选和任务；与来源差异复核及技术资源回收分开'}]}
(ROOT/'field-provenance.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print({'fields':len(P),'origins':dict(Counter(p['origin'] for p in P.values())),'scope':dict(Counter(p['stage'] for p in P.values()))})
