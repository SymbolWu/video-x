# 数据库启用范围

2026-11-19：正式 migration 0002 启用 storage_roots、media_files、media_streams、import_batches、import_items、import_item_files、editions、edition_parts。import_items.selected_candidate_id 留至 M4。enabled 表示该列实际进入数据库，可空列是否采集以应用逻辑为准。以下为 M1 历史基线和各阶段总体归属。

0003 启用 playback_sessions、playback_events、playback_progress，以及 user_media_state 的恢复版本、最近播放时间、设备接管代数。0004 启用 assets、media_images 及人物肖像、系列封面和资料片长，0005 启用标签、片商和作品的两种关联，当时共 32 张业务表。0006 启用作品发行编号，当时为 33 张业务表。创建播放会话固定起播目标，播放器实际起播后才建立断点。旧百分比不迁入新表。

0007 增加第 34 张业务表 `import_lookups`。每次抓取记录来源、查询、候选、失败原因以及手工采用的字段。
`import_items.merged_into_id` 记录自动扫描稿并入手动稿的去向。

以候选 v0.5 的 568 列逐列登记，完整记录见 [机器清单](schema-scope.json)。M1 启用 15 张业务表，后续按依赖迁移；没有取消未启用的业务能力。

M1 SQL 源自候选结构；仅新增单账号唯一索引，版本触发器服务端递增。播放、文件、来源、导入等未迁入本次数据库，pg-boss 自管表在独立 pgboss schema。M1 不提供新作品发布接口；开发样例由显式 CLI 写入。

| 表 | 阶段 | 说明 |
| --- | --- | --- |
| accounts | M1 | 登录账号 |
| profiles | M1 | 个人资料 |
| devices | M1 | 已登记客户端 |
| auth_sessions | M1 | 登录会话 |
| libraries | M1 | 逻辑媒体库 |
| storage_roots | M2 | 媒体根目录 |
| media_files | M2 | 实际文件 |
| media_streams | M2 | 文件内轨道 |
| assets | M3 | 托管图片资源 |
| categories | M1 | 主分类树 |
| catalog_revisions | M3 | 分类树结构版本 |
| media_items | M1 | 作品与剧集资料 |
| media_identifiers | M3 | 作品发行编号 |
| editions | M2 | 播放版本 |
| edition_parts | M2 | 版本内有序文件段 |
| edition_subtitles | 后置 | 版本外挂字幕 |
| media_images | M3 | 作品图片用途 |
| people | M1 | 人物资料 |
| credits | M1 | 作品演职员关系 |
| franchises | M1 | 作品系列 |
| franchise_items | M1 | 系列有序作品 |
| genres | 后置 | 规范影片类型 |
| tags | M3 | 用户与来源标签 |
| media_genres | 后置 | 作品类型关联 |
| media_tags | M3 | 作品标签关联 |
| organizations | M3 | 片商与发行机构 |
| media_organizations | M3 | 作品机构关系 |
| collections | M1 | 私人收藏夹 |
| collection_items | M1 | 收藏夹有序成员 |
| user_media_state | M1 | 个人作品状态 |
| user_person_state | M1 | 个人喜欢人物 |
| playback_sessions | M2 | 一次播放会话 |
| playback_events | M2 | 播放事件与去重 |
| playback_progress | M2 | 每个版本的最新断点 |
| providers | M4 | 资料来源注册 |
| provider_configs | M4 | 来源运行配置 |
| source_records | M4 | 尚未或已经入库的来源身份 |
| provider_media | M4 | 来源作品映射 |
| provider_people | M4 | 来源人物映射 |
| provider_franchises | M4 | 来源系列映射 |
| metadata_snapshots | M4 | 不可变来源快照 |
| metadata_ratings | 后置 | 网站评分 |
| media_field_state | M4 | 作品字段来源与锁定 |
| person_field_state | M4 | 人物字段来源与锁定 |
| franchise_field_state | M4 | 系列字段来源与锁定 |
| relationship_sources | M4 | 关联关系的来源依据 |
| source_value_mappings | M4 | 来源类型与标签归一 |
| metadata_change_sets | M4 | 待接受的资料差异 |
| import_batches | M2/M4 | 导入批次 |
| import_items | M2/M4 | 服务端导入草稿与发布结果 |
| import_item_files | M2/M4 | 导入项文件与候选段顺序 |
| import_candidates | M2/M4 | 来源匹配候选 |
| tasks | M4 | 业务任务与持久摘要 |
| task_items | M4 | 逐项检查点与结构化结果 |
| outbox_events | M4 | 事务后可靠投递 |
| idempotency_keys | M4 | 命令幂等结果 |
| audit_log | M4 | 追加写操作审计 |
| legacy_mappings | M6 | 旧库到新库的稳定映射 |

0008 增加两张表，业务表合计 36 张。`import_move_plans` 持久化每份草稿的文件、源与目标相对路径、目标位置预留、暂存身份、校验结果和清理进度。`import_move_runs` 记录人工提交者、成员列表、执行阶段及失败原因。正式影片、版本和播放分段沿用原有表与文件 ID。
