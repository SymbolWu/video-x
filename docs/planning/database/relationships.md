# video-x 分域表关系图 · v0.4

[设计入口](README.md) · [实际外键清单](foreign-keys.md) · [建表 SQL](schema.sql)

这是 v0.4 候选结构图，已同步单账号、通用分集、取消别名、双名称、标签分类归属与旧标签映射。组可直接含集、剧可直接含集或按真实资料带季；旧任务及结果不迁移。独立 genre、网站评分、外挂字幕等后置候选也在图中，不代表首版必须实现；逐字段来源和首版建议见[阅读指南](field-guide.md)。

图中显示主干字段与关系，完整字段、默认值、可空性和约束在各组字段字典。`||` 表示恰好一条，`o|` 表示零或一条，`o{` 表示零到多条；外键存在不等于引用的资料当前未归档。为保持可读性，图中没有重复画出每个编辑者、图片资源和所有复合判别列。

## 1 作品、人物、系列与分类

[作品与资料字段字典](tables-catalog.md)

```mermaid
erDiagram
  categories o|--o{ categories : 父分类
  categories ||--o{ media_items : 主分类
  categories ||--o{ people : 资料主归属
  categories ||--o{ franchises : 主分类
  categories ||--o{ tags : 标签分类
  media_items o|--o{ media_items : 组或剧或可选季下的集
  media_items ||--o{ media_identifiers : 发行编号
  media_items ||--o{ credits : 演职员
  people ||--o{ credits : 职责与角色
  people o|--o{ people : 合并目标
  franchises ||--o{ franchise_items : 有序成员
  media_items ||--o{ franchise_items : 参与系列
  media_items ||--o{ media_genres : 类型关联
  genres ||--o{ media_genres : 规范类型
  media_items ||--o{ media_tags : 标签关联
  tags ||--o{ media_tags : 标签
  media_items ||--o{ media_organizations : 片商发行
  organizations ||--o{ media_organizations : 制作与发行职责
  media_items {
    uuid id PK
    uuid library_id FK
    text kind
    uuid parent_id FK
    text title
    text cover_layout
    boolean supports_chinese
    uuid primary_category_id FK
    timestamptz published_at
    timestamptz archived_at
    bigint revision
  }
  people {
    uuid id PK
    text full_name
    text detailed_name
    uuid primary_category_id FK
    uuid merged_into_id FK
    timestamptz archived_at
    bigint revision
  }
  credits {
    uuid id PK
    uuid media_id FK
    uuid person_id FK
    text job
    int position
    boolean is_manual
  }
  franchise_items {
    uuid franchise_id FK
    uuid media_id FK
    int position
  }
```

演员作品列表按 `credits.job=actor` 查询并去重作品；导演也走 credits。人物检索匹配 full_name 和 detailed_name；没有别名表。tags 同时保留 primary_category_id、attribute_group 和 is_visible。类型、标签、发行编号与片商均不挤进作品 JSON。catalog_revisions 是独立的一行树版本，用来串行化分类结构事务，不逐行关联到所有分类。

## 2 作品、版本、文件、轨道与图片

[媒体库与文件字段字典](tables-library.md) · [图片字段](tables-catalog.md#assets)

```mermaid
erDiagram
  libraries ||--o{ media_items : 逻辑库收录
  libraries ||--o{ storage_roots : 多个物理挂载
  storage_roots ||--o{ media_files : 相对路径登记
  media_files ||--o{ media_streams : 探测轨道
  media_items ||--o{ editions : 可播放版本
  editions ||--o{ edition_parts : 有序文件段
  media_files ||--o{ edition_parts : 整文件引用
  editions ||--o{ edition_subtitles : 外挂字幕
  media_files ||--o{ edition_subtitles : 字幕文件
  media_items ||--o{ media_images : 图片用途与次序
  assets ||--o{ media_images : 托管资源
  assets o|--o{ people : 人物头像
  editions {
    uuid id PK
    uuid media_id FK
    text media_kind FK
    text name
    boolean is_default
  }
  edition_parts {
    uuid id PK
    uuid edition_id FK
    int part_no
    uuid file_id FK
    bigint bound_content_revision
  }
  media_files {
    uuid id PK
    uuid root_id FK
    text relative_path
    bigint content_revision
    bigint size_bytes
    bigint duration_ms
    text availability
    text probe_status
  }
```

`edition_parts.file_id` 不全局唯一，支持明确复用文件；同版本不得重复引用同文件。不同版本的段内毫秒位置不能直接互换。没有已知完整段时长时，不计算看似精确的总百分比。

## 3 账号、人物喜欢、收藏夹与播放断点

[账号、个人与播放字段字典](tables-personal.md)

```mermaid
erDiagram
  accounts ||--o| profiles : 首版默认资料
  profiles ||--o{ devices : 登记设备
  devices ||--o{ auth_sessions : 登录会话
  profiles ||--o{ collections : 私人片单
  collections ||--o{ collection_items : 有序作品
  media_items ||--o{ collection_items : 加入多个片单
  profiles ||--o{ user_media_state : 个人作品状态
  media_items ||--o{ user_media_state : 喜欢评分已看
  profiles ||--o{ user_person_state : 人物喜欢
  people ||--o{ user_person_state : 被喜欢
  profiles ||--o{ playback_sessions : 播放会话
  devices ||--o{ playback_sessions : 发起播放
  editions ||--o{ playback_sessions : 实际版本
  edition_parts ||--o{ playback_sessions : 固定起播文件段
  playback_sessions ||--o{ playback_events : 递增序号去重
  edition_parts ||--o{ playback_events : 段内毫秒位置
  profiles ||--o{ playback_progress : 各版本断点
  editions ||--o{ playback_progress : 版本坐标
  playback_events ||--o| playback_progress : 当前接受事件
  user_media_state {
    uuid profile_id PK,FK
    uuid media_id PK,FK
    boolean is_favorite
    smallint rating
    timestamptz watched_at
    uuid resume_edition_id FK
    bigint takeover_generation
    bigint memberships_revision
  }
  playback_progress {
    uuid profile_id PK,FK
    uuid edition_id PK,FK
    uuid session_id FK
    bigint last_seq FK
    uuid part_id FK
    bigint position_ms
    timestamptz completed_at
  }
  playback_sessions {
    uuid id PK
    text start_mode
    uuid start_part_id FK
    bigint start_position_ms
    boolean has_started
  }
```

一部作品有一个“最近接续版本”入口，各版本保留各自坐标。会话固定起播目标，实际定位并播放后才更新断点；completed_at 区分版本播放完成与手动已看。新设备接管增加作品级 generation；旧设备离线事件迟到不会覆盖当前断点。旧进度不迁，初始化无续播；详见[观看进度设计](../playback.md)。喜欢影片、喜欢演员和加入片单是三条独立关系。

## 4 来源身份、候选快照与正式映射

[来源字段字典](tables-metadata.md)

```mermaid
erDiagram
  providers ||--o| provider_configs : 运行配置
  providers ||--o{ source_records : 带类型的外部身份
  source_records ||--o{ metadata_snapshots : 不可变抓取记录
  source_records ||--o| provider_media : 作品身份映射
  source_records ||--o| provider_people : 人物身份映射
  source_records ||--o| provider_franchises : 系列身份映射
  media_items ||--o{ provider_media : 多来源或多外部身份
  people ||--o{ provider_people : 同一真实人物
  franchises ||--o{ provider_franchises : 同一作品系列
  provider_media ||--o{ metadata_ratings : 网站评分
  metadata_snapshots ||--o{ metadata_ratings : 原分值与满分
  import_items ||--o{ import_candidates : 待人工选择
  source_records ||--o{ import_candidates : 尚未正式映射也可用
  metadata_snapshots o|--o{ import_candidates : 可选详情快照
  source_records {
    uuid id PK
    uuid provider_id FK
    text entity_kind
    text external_id
    uuid local_file_id FK
  }
  provider_media {
    uuid source_record_id PK,FK
    text entity_kind FK
    uuid media_id FK
  }
  metadata_snapshots {
    uuid id PK
    uuid source_record_id FK
    text adapter_version
    int schema_version
    timestamptz fetched_at
    jsonb payload
  }
```

同一 provider 的 media/person/franchise 分别有身份空间。适配器版本属于解析过程，不属于作品主键；换解析器或刷新数据不会创建新作品身份。来源配置只存 credential_ref，不在普通 JSON 配置中保存 Cookie。

## 5 人工锁定、差异与关联来源依据

```mermaid
erDiagram
  media_items ||--o{ media_field_state : 白名单字段与集合锁
  people ||--o{ person_field_state : 人工覆盖与来源
  franchises ||--o{ franchise_field_state : 字段与成员锁
  metadata_snapshots o|--o{ media_field_state : 最近接受来源
  metadata_snapshots o|--o{ person_field_state : 最近接受来源
  metadata_snapshots o|--o{ franchise_field_state : 最近接受来源
  metadata_snapshots ||--o{ metadata_change_sets : 待接受差异
  media_items o|--o{ metadata_change_sets : 三选一作品
  people o|--o{ metadata_change_sets : 三选一人物
  franchises o|--o{ metadata_change_sets : 三选一系列
  source_records ||--o{ relationship_sources : 来源声明
  metadata_snapshots ||--o{ relationship_sources : 声明依据
  credits o|--o{ relationship_sources : 六选一演职员
  media_genres o|--o{ relationship_sources : 六选一类型
  media_tags o|--o{ relationship_sources : 六选一标签
  franchise_items o|--o{ relationship_sources : 六选一系列成员
  media_organizations o|--o{ relationship_sources : 六选一片商
  media_images o|--o{ relationship_sources : 六选一图片
```

`metadata_change_sets` 的三个目标外键恰好一个非空。`relationship_sources` 的六个目标外键也恰好一个非空，均由 CHECK + 真实 FK 保证；图中的多条可选线不是允许同时选择所有目标。来源词汇归一 source_value_mappings 单独指向 genre 或 tag，二者恰好选一个。

## 6 导入、任务、可靠提交与旧库映射

[导入与运行字段字典](tables-operations.md)

```mermaid
erDiagram
  libraries ||--o{ import_batches : 入库目标
  storage_roots o|--o{ import_batches : 可选扫描根
  import_batches ||--o{ import_items : 服务端草稿
  import_items ||--o{ import_item_files : 有序候选文件
  media_files ||--o{ import_item_files : 已登记文件
  import_items ||--o{ import_candidates : 来源候选
  import_candidates o|--o| import_items : 当前选中且属于本项
  media_items o|--o{ import_items : 发布结果作品
  editions o|--o{ import_items : 发布结果版本
  import_batches o|--o{ tasks : 可选任务上下文
  tasks ||--o{ task_items : 逐项结果与检查点
  import_items o|--o{ task_items : 可选业务对象
  accounts ||--o{ idempotency_keys : 命令去重
  accounts o|--o{ audit_log : 人工或系统操作
  media_items o|--o{ legacy_mappings : 旧作品追溯
  editions o|--o{ legacy_mappings : 旧版本追溯
  media_files o|--o{ legacy_mappings : 旧文件追溯
  people o|--o{ legacy_mappings : 旧人物追溯
  tags o|--o{ legacy_mappings : 旧标签追溯
  import_items {
    uuid id PK
    uuid batch_id FK
    text stage
    text execution_status
    jsonb draft
    uuid publish_key UK
    uuid published_media_id FK
    uuid published_edition_id FK
    bigint revision
  }
```

task_items 的业务目标还可以是文件、作品、人物或根目录，至多选一个；备份等无实体目标的任务允许为空。legacy_mappings 的七类目标恰好一个非空，全量定义见字段字典。

outbox_events 的聚合定位与 audit_log 的历史定位是故意保留的事件/审计标识，不建立“外键到任意表”。它们不承载正式业务关系；outbox 与业务变更在同一事务提交。pg-boss 的队列内部表不属于本模型，不与业务表建立跨 schema 外键。
