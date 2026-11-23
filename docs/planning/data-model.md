# video-x 数据模型与业务约束

> 新增[产品与数据库承接说明](database/product-reconciliation.md)：完整草稿协议、人工确认版本、按版本绑定文件、组无版本发布与恢复筛选的口径。

本规格覆盖作品、文件、人物、系列、分类、个人整理和来源资料。2026-11-17 已同步[数据库详细设计 v0.5](database/README.md)：58 张候选表、568 个字段、127 条外键，79 项数据库约束检查通过；[字段阅读指南](database/field-guide.md)与五组字典逐项标出来源、用途、写入者、迁移/初始化及首版建议。人物使用 full_name/detailed_name，首版取消 alias 和影片待清理，保留评分。后置候选不等于首版定稿；应用、正式 migration 和真实迁移尚未实施。HTML 原型仅用于演示。

## 1 术语与关系基线

| 概念 | 含义 | 主要关系 |
| --- | --- | --- |
| 作品 media item | 电影、通用作品组、电视剧、可选季、集或独立视频的资料 | 电影、集、独立视频可有多个播放版本；作品组、剧和可选季用于组织 |
| 版本 edition | 同一可播放作品的一套具体播放内容 | 一套版本可由多个有序文件段构成 |
| 文件 media file | 根目录下实际存在的文件 | 被版本段引用，拥有独立的探测与在线状态 |
| 人物 person | 演员、导演等真实资料身份 | 与作品多对多，演员是人物在演职员关系中的职责 |
| 系列 franchise | 多个作品的创作或发行系列 | 与作品多对多，带系列内顺序；独立于剧/季/集 |
| 分类 category | 用户组织片库的主分区 | 树结构；作品、人物、系列各有一个主分类 |
| 分类与标签 | 喜剧、动作等由分类承接；标签提供补充描述 | 作品单分类、标签多对多；独立类型后置 |
| 收藏夹 collection | 个人建立的有序作品分组 | 归属 profile，与作品多对多 |
| 喜欢 favorite | 对作品或人物的个人快速标记 | 与收藏夹成员关系独立 |

内部主键统一为 UUID，来源编码和旧库编码作为可追溯身份。页面路径、关联和缓存均使用内部 ID；改名不改 ID。界面显示名称，管理详情可查看编码。API 的 BIGINT 字节和毫秒字段采用十进制字符串编码，客户端显式转换，避免 JavaScript 数字精度损失。

## 2 核心表组

各可编辑聚合根包含 `created_at`、`updated_at`、`revision`；可归档资料包含 `archived_at`。时间点使用 UTC `timestamptz`，发行日期另用 `date` 和精度信息。

| 表 | 关键字段与关系 | 数据库约束与用例规则 |
| --- | --- | --- |
| `media_items` | id、kind、parent_id、title、release_year/date/precision、primary_category_id | 类型判别复合外键保证同库 group→episode、show→episode 或 show→season→episode，合法层级排环；编号唯一；发布与有效性仍由事务用例校验 |
| `editions` | media_id、name、cut、language、default 标记 | 仅可播放作品允许创建；同一作品最多一个默认版本，用部分唯一索引保证 |
| `edition_parts` | edition_id、part_no、file_id、bound_content_revision | `(edition_id, part_no)` 唯一；part_no > 0；首版一个段引用整个文件；时长从文件事实读取，内容代数不符时要求复核 |
| `libraries` / `storage_roots` | 媒体库、根目录 ID、容器挂载路径、宿主映射与根标识 | 物理根与分类分离；根标识校验通过才能执行扫描，不依赖路径存在这一条件 |
| `media_files` | root_id、relative_path、size_bytes、mtime_ns、content_revision、fingerprint、availability、probe_status | `(root_id, relative_path)` 唯一；大小非负；离线、缺失和探测失败分别保存 |
| `media_streams` | file_id、stream_index、codec、language、dimensions、audio/subtitle 信息 | `(file_id, stream_index)` 唯一；原始探测 JSON 与标准化字段分别保存 |
| `assets` | storage_key、checksum、mime、width/height、state | 资源地址由服务端生成；只删除无引用且超过宽限期的资源 |
| `media_images` | media_id、asset_id、purpose、position | 用途区分 poster/backdrop/still；图片不存到原视频目录 |
| `people` | full_name、detailed_name、gender（允许未知）、portrait_asset_id、primary_category_id、merged_into_id | 姓名不唯一；merged_into 不自指；合并目标必须为有效人物 |
| `credits` | media_id、person_id、job、position | `(media_id, person_id, job)` 唯一；同职责去重，character_names 后置 |
| `franchises` / `franchise_items` | 名称、简介、封面、分类；franchise_id、media_id、position | `(franchise_id, media_id)` 唯一；系列内 position 唯一且为正数 |
| `categories` / `catalog_revisions` | name、code、parent_id、position、is_visible、is_system；分类树的整体 revision | code 唯一且首版创建后固定；parent 外键；系统未分类不可删除；层级事务防环，结构变更增加树 revision |
| `genres` / `media_genres` | 后置候选 | 首版不迁移、不开放类型筛选或录入 |
| `tags` / `media_tags` | 标签、作品关联、人工或来源归属 | 人工标签与来源标签可区分；再次抓取不清空人工关系 |
| `profiles` | 账号下的默认个人资料 | 首版只有默认资料；写入时由会话确定 profile，不信任客户端任意传入值 |
| `user_media_state` | profile_id、media_id、is_favorite、rating、watched_at、memberships_revision、resume_edition_id、takeover_generation | `(profile_id, media_id)` 唯一；评分标度在契约中固定，未知为 NULL；成员版本保护多收藏夹选择；断点入口指向最近接管的版本 |
| `user_person_state` | profile_id、person_id、is_favorite | `(profile_id, person_id)` 唯一；保留旧演员收藏能力 |
| `collections` / `collection_items` | profile_id、名称、说明、封面；media_id、position、added_at | profile 内有效收藏夹的规范化名称唯一；成员和顺序各有唯一约束 |
| `playback_sessions` / `playback_progress` | profile、设备、版本、起播模式/目标段/目标毫秒、seq、takeover_generation、completed_at | 实际定位并播放才保存进度；主动后退有效；整部播完与手动已看独立 |
| `import_batches` / `import_items` | 根目录、文件、候选、选定关系、复核与发布状态 | 一个发布命令的幂等身份固定；已发布项保留目标作品/版本 ID |
| `tasks` / `task_items` | 任务类型、业务对象、持久阶段、结果/错误引用及 queue_job_id | 业务检查点为恢复依据；运行租约、领取及重试调度由队列负责，不另建一套竞争的调度器 |
| `outbox_events` / `idempotency_keys` | 待投递事件、投递结果；命令范围、key、请求摘要和结果 | 业务结果与 outbox 同事务；账号+命令范围+key 唯一，同 key 不同摘要拒绝执行 |
| `audit_log` | 操作、对象、前后 revision、影响和 requestId | 追加写入，保存关系整理的必要变更；不含凭据与未脱敏来源正文 |

图片封面若由某部作品提供，保存 `cover_media_id` 并检查其属于当前系列或收藏夹；手工资源使用 `cover_asset_id`。两者至多指定一种。移出封面作品时回退到剩余首项；没有作品时显示占位。收藏夹/系列“自动封面”不要求复制原图片。

2026-11-17 用户确认作品、演员各属一个分类，沿用 primary_category_id 单外键；未指定时使用系统“未分类”。喜剧片、动作片等可以直接作为分类，不依赖后置 genres 表。系列沿用一个主分类。人物的分类是资料归属，不从参演作品推导，也不限制其参演作品的分类；演员作品页按作品的分类筛选。跨分类的参演、系列成员和收藏夹成员均允许存在。

## 3 来源与人工维护

| 表组 | 职责 | 约束 |
| --- | --- | --- |
| `providers` / `provider_configs` | 来源 ID、适配器版本、能力、出站策略、凭据引用 | 持久配置与代码实现分离；凭据正文不进入普通配置响应 |
| `source_records` / `provider_media` / `provider_people` / `provider_franchises` | 先登记带类型的来源身份，发布后分别映射到平台实体 | `(provider_id, entity_kind, external_id)` 唯一；快照和候选可以先于平台作品存在；映射表通过类型判别复合外键防止误连 |
| `metadata_snapshots` | 抓取时间、解析器版本、结构化结果、来源身份 | 不含 Cookie 和原始授权页；快照保留策略可配置 |
| `media_field_state` / `person_field_state` / `franchise_field_state` | 人工覆盖值、锁定、最近接受来源、编辑者 | 三类实体各自真实外键；field_key 白名单；SQL NULL 与 JSON null 分别表达无覆盖与显式清空；有效值仍保存在实体强类型字段 |
| `relationship_sources` / `source_value_mappings` | 关系来源依据与类型/标签归一 | 六个显式关系外键恰好选一个；只撤回自己来源的声明；来源词汇显式映射 |
| `metadata_ratings` | 网站原评分、满分与票数 | 与个人 1～5 星分开；快照和作品来源映射均有复合外键 |
| `metadata_change_sets` | 待应用的字段和关联差异、基线 revision | 接受差异前校验实体 revision；旧快照不能直接覆盖新人工维护 |

来源资料先形成提案，用户接受后才应用；人工锁定字段须先显式解除或选择覆盖。其他来源补空同样需要人工接受。首版常用名、详细名称、头像及作品简介可锁定，人物简介后置。参演、标签和系列属于关联集合，单独维护保护规则，不能用标题锁定代替。

来源关系带来源身份或关系来源记录；重新抓取只移除该来源已撤回且无人工作覆盖的关系。人物名字相同只产生复用候选，来源 ID 一致才可按既定映射定位。外部 ID 冲突进入待处理，不把两个人物静默合并。

## 4 关系变更的事务规则

### 4.1 演员合并

1. 预览返回来源人物、目标人物、受影响作品数、重复职责、不同字段、来源身份和收藏影响，以及双方 revision。
2. 确认时重新检查 revision，按稳定 ID 顺序锁定两个人物；所有新增/修改演职员及来源映射的用例遵守同一人物锁协议。
3. 将参演关系指向目标人物；同作品同职责去重并保留来源依据（角色名后置）；常用名和详细名称分别选择保留值，不创建别名。字段冲突由预览中的选择决定，目标人工锁定值不会被默认覆盖。
4. 迁移来源身份；无法满足唯一身份规则则整笔回滚。个人喜欢取双方并集，保留目标的个人状态。
5. 源人物标为合并，保留 `merged_into_id`；旧链接可解析到有效人物。拒绝合并环路，解析链有深度限制并可在后续合并时压平。
6. 同一事务写审计及待通知事件，提交后使人物、关联影片、收藏和搜索缓存失效。作品数按 distinct media_id 重算。

合并首版不提供“一键拆回”，因为合并后的再次编辑会产生歧义。确认页必须展示影响；完整恢复依赖事前备份或后续人工整理。归档是另一项操作，可以恢复源资料；它不等同于合并撤销。

### 4.2 有序关系与多端编辑

系列与收藏夹使用正整数 position；插入、删除与排序锁定父记录，事务内重排，最后增加父 revision。唯一顺序约束采用可延迟检查或等价的两阶段写入，避免交换序号时临时碰撞。客户端提交完整排序时必须带基线 revision；列表成员已变化则返回冲突并重新加载，不能覆盖另一端刚加的影片。

添加成员幂等，重复添加返回已有关系；从收藏夹移出仅改该关系。批量操作返回成功、跳过与失败的明确范围，不能把部分成功包装成全部成功。

### 4.3 分类层级与迁移

分类创建、改父级、迁移和归档共享一个数据库事务级层级锁，再校验新父节点、目标分支和 revision，防止并发改父级各自合法、合在一起成环。子级编码不保存路径，父级改名不重写后代外键。

删除当前分类时仅迁移直接归属该分类的作品、人物、系列；直接子分类提升到原父级，其归属数据不变。预览分别显示直接归属与含后代数量，避免误以为整个分支都会搬走。迁移目标必须有效且不在被删除节点的子树中；当前节点最后归档。

分类迁移包含所有未永久清理的归属记录，避免归档资料恢复后指向失效分类。计数 API 同时返回 direct 与 subtree 口径，页面明确使用哪一个。隐藏只改变分类导航，和资料归档的排除规则分开。

2026-11-17 用户确认保留 is_visible 配置以收起空分类。显示→隐藏时按观看列表口径统计本级及全部后代的已发布未归档作品（含离线作品、隐藏子分类），按作品去重而不按版本/文件计数。为零直接保存；非零提示数量并允许确认后隐藏，取消不修改。保存时重新统计，预览失效则更新提示。此为应用用例规则，现有布尔字段可承接，不增加“是否为空”持久字段或自动隐藏规则。

### 4.4 删除与恢复语义

| 操作 | 首版语义 | 原文件影响 |
| --- | --- | --- |
| 移出收藏夹或系列 | 删除指定成员关系，其余关系与个人状态保留 | 无 |
| 归档人物 | 从观看与常规检索隐藏，保留资料及演职员记录以便恢复 | 无 |
| 归档系列或收藏夹 | 从入口隐藏，保留成员顺序；恢复时重新校验失效成员和封面 | 无 |
| 分类迁移后归档 | 搬移直接归属、提升子级；恢复资料不自动撤销已发生的迁移 | 无 |
| 移出媒体库 | 归档作品及对应发布状态，保留可追溯映射 | 无 |
| 删除视频文件 | 后续单独设计的文件操作，首版不提供 | 首版不执行 |

归档后所有观看查询及计数采用同一有效性过滤。归档资料的关联禁止被刷新任务重新“创建”成重复资料；导入时提示恢复或重新关联。管理员可查询归档资料并恢复，存在唯一名称冲突时要求先改名。

HTML V0.3 已演示本地归档与恢复；正式产品仍需按上表实现服务端事务、归档可见性与恢复冲突。

## 5 发布 文件与观看一致性

发布以单个 import_item 为事务单位，创建或关联作品、版本、文件段、演职员、系列和分类，再记录发布结果与 outbox。数据库提交后，观看查询才能看到完整关系。图片未准备完可显示占位；失败下载能重试，不能把半成品作品标成发布成功。

所有发布必须来自人工确认和显式发布命令。ready 不触发自动发布；扫描/探测/匹配 worker 不直接写正式资料。批量发布冻结人工已核对的 item revision 和所选快照，执行前变化则等待重新核对。幂等重试只能完成同一次人工发布决定，不能扩大到新发现项。来源刷新亦须人工接受差异，不能绕过字段锁定。

文件在扫描时绑定根目录标识与相对路径。根标识不匹配时暂停整根扫描；根在线但单个文件缺失时才标记 missing。重新出现则重新 stat，必要时探测，不能将“空挂载目录”解释为删光了全部视频。

播放位置存储在版本和有序段坐标中，`playback_progress` 按 profile+edition 唯一，以 completed_at 区分整个版本自然播完。会话固定 start_mode、start_part_id、start_position_ms；创建只分配接管代数，实际定位并起播成功后才更新 resume_edition_id、进度与播放计数，避免默认 0 覆盖有效断点。版本百分比仅供已知时长时显示；跨设备以接管代数与会话 seq 排序，不按位置大小取最大值。喜欢、评分、手动已看分别更新。

旧 watch_progress、last_play_position_ms 全部不迁，新播放表初始为空。起播确认、从头重播、自然完成、文件变化与跨端恢复详见[观看进度与继续播放设计](playback.md)；这些播放器与应用事务尚未实现或实测。

## 6 查询与索引

| 主要查询 | 初始索引候选与验证重点 |
| --- | --- |
| 演员参演作品 | credits(person_id, job, media_id)；演职员次序索引；统计与结果去重一致 |
| 按分类浏览 | categories(parent_id, position)；三类资料的 category_id 与有效状态索引；递归范围无重复 |
| 系列/收藏夹成员 | 父 ID + position；成员唯一约束；过滤归档作品后排序稳定 |
| 片库列表 | 实际常用的分类、发行时间、入库时间及 id 组合；禁止为全部排列组合建索引 |
| 来源定位 | 各映射表 provider_id + external_id 唯一；导入查重不按展示名称判定 |
| 个人收藏与续播 | profile + favorite/last_active_at + id；人物喜欢与影片喜欢分开 |
| 姓名搜索 | full_name、detailed_name 与来源编号；先验证中文、日文、罗马字、编号与子串检索，再决定是否加 trigram |

列表首版用 page/pageSize 与稳定的次级 ID 排序，pageSize 设上限；从片库返回时恢复页码和滚动。数据规模扩大后再增加 cursor 接口，不同时建设两套分页。计数使用 COUNT DISTINCT 或先去重的关系查询，避免 join 图片、多角色后数量翻倍。

数据库约束负责外键、唯一、非负及同一行条件；候选 SQL 使用类型判别复合外键保护作品层级、版本和播放坐标。分类防环、归档有效性、来源应用与合并冲突仍由事务用例及锁协议负责，不能用跨行 CHECK 代替。[PostgreSQL 约束文档](https://www.postgresql.org/docs/current/ddl-constraints.html)解释了 CHECK 与外键的边界；并发更新需结合[事务隔离规则](https://www.postgresql.org/docs/current/transaction-iso.html)设计并验证。

## 7 旧库映射与异常处理

| 旧表或字段 | 新位置 | 必须核对的异常 |
| --- | --- | --- |
| movie 与 parent_movie_code | media_items / editions / edition_parts | 14 组已确认有序分集：父项 group，子项 episode；父项残留文件路径另行盘点，不自动增集 |
| actor.full_name / detailed_name / is_collected | people.full_name / detailed_name / user_person_state | 同名不同人、两个名称原文、空姓名和人物喜欢；alias 按用户决定首版取消，原备份保留 |
| movie_actor | credits(job=actor) | 孤立引用、重复关系、未知演职员排序 |
| series + movie.series_id/series_code | franchises / franchise_items | 两种系列身份不一致、顺序缺失；不自动变为电视剧 |
| category + 三类资料分类字段 | categories + primary_category_id | 父码失联、环路、字符串与编码混用；不存在的分类进入映射待办 |
| collections / collections_movie | collections / collection_items | profile 内重名、重复成员、失联影片、顺序无历史值 |
| 文件路径、大小、时长 | storage_roots / media_files / media_streams | 根映射、大小格式丢精度、文件失联；原样导出后重新采集 |
| 喜欢、评分、播放次数和最近时间 | 默认 profile 的个人状态及历史汇总 | 喜欢时间未知可空；旧次数与最近时间不产生新播放会话或续播 |
| watch_progress、last_play_position_ms | 明确排除，不进入新播放状态 | 用户确认重新建立观看进度；progress/session/event 初始为空，接续版本 NULL |

每项旧资料都记录稳定的 legacy_mappings：旧系统、表、key_name、旧主键或业务编码原文、目标种类、目标真实外键与校验摘要；一个旧 movie 可分别映射作品、版本、文件多行。重复运行只读源、对照映射更新目标，不重复创建。不能按 actor_code 或片名独自推断完整身份；旧编码保留作追溯。

顺序缺失时采用固定的旧创建时间+旧 ID 顺序，并在报告标注“生成顺序”。不能把生成值说成用户原有排序。归档状态、来源资料、孤立引用和缺图分别统计；不静默清除异常。完整迁移演练见[实施与验收](delivery.md)。

## 8 详细设计阅读入口

先看[模型总览与取舍](database/README.md)，再看[分域 ER 图](database/relationships.md)。完整字段、可空性、主外键、默认值及索引分成五份字典；[model-spec.json](database/model-spec.json)生成候选 [schema.sql](database/schema.sql)。结构字典基于实际 PostgreSQL 系统目录，逐字段业务依据共用 [field-provenance.json](database/field-provenance.json)，避免图、文档、SQL 注释各说一套。

## 9 本轮明确的范围与评分规则

常用名与详细名均原文保留、参与检索，不拆 alias；人物合并不自动创建别名。`user_media_state.rating` 为 1～5 星整数，NULL 表示未评分，可设置/修改/清空，按作品保存并与喜欢、已看、收藏夹和网站评分独立。旧库未评分不影响保留该机制；首版不设置影片待清理字段或任务。

旧 cover_layout 对应新作品封面方向；supports_chinese 保留为资料标记，不冒充本地检测。tags 补齐 primary_category_id、attribute_group、is_visible；隐藏不删除既有作品关联，不按全局同名自动合并。旧喜欢状态允许 favorited_at 未知。独立 genre、生日、角色名、NFO 等以字段指南中的后置建议为准。

## 10 2026-11-16 范围确认

首版使用单账号、一个默认 profile、通用设备与会话；不做多账号公网流程。上下部/Part1/Part2 按 group→episode，各集各有版本和断点；show 可以直接含 episode，season 是可选层。人物生日/简介/角色名等后置。全部旧 task、actor_profile_task 行和结果 JSON 排除迁移，正式影片资料照常迁移。三个旧数据来源和具体迁移边界见[确认说明](database/confirmed-scope.md)。

查询细则以[列表筛选与排序规格](list-query-spec.md)为准，包括默认版本聚合、固定关系范围、空值与双向排序。这些查询不新增实体冗余列。
