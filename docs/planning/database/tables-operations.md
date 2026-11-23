# 导入、任务、可靠写入与迁移 · 字段与业务依据 v0.5

[阅读指南](field-guide.md) · [模型入口](README.md) · [分域关系图](relationships.md) · [建表 SQL](schema.sql)

更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**

每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](evidence-review.md)。

| 表 | 字段数 | 本表首版建议 | 业务依据 |
| --- | ---: | --- | --- |
| [import_batches](#import_batches) · 导入批次 | 11 | 建议保留 | 现有本地解析+抓取+录入流程；新增服务端草稿与候选复核 |
| [import_items](#import_items) · 服务端导入草稿与发布结果 | 21 | 建议保留 | 现有本地解析+抓取+录入流程；新增服务端草稿与候选复核 |
| [import_item_files](#import_item_files) · 导入项文件与候选段顺序 | 5 | 建议保留 | 现有本地解析+抓取+录入流程；新增服务端草稿与候选复核 |
| [import_candidates](#import_candidates) · 来源匹配候选 | 7 | 建议保留 | 现有本地解析+抓取+录入流程；新增服务端草稿与候选复核 |
| [tasks](#tasks) · 业务任务与持久摘要 | 10 | 建议保留 | 保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立 |
| [task_items](#task_items) · 逐项检查点与结构化结果 | 17 | 建议保留 | 保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立 |
| [outbox_events](#outbox_events) · 事务后可靠投递 | 10 | 待裁剪 | 网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段 |
| [idempotency_keys](#idempotency_keys) · 命令幂等结果 | 8 | 待裁剪 | 网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段 |
| [audit_log](#audit_log) · 追加写操作审计 | 10 | 待裁剪 | 人物合并、分类迁移与来源接受的追溯；旧库无审计日志 |
| [legacy_mappings](#legacy_mappings) · 旧库到新库的稳定映射 | 17 | 建议保留 | 全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写 |

<a id="import_batches"></a>
## import_batches · 导入批次

本表依据：现有本地解析+抓取+录入流程；新增服务端草稿与候选复核。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="import_batches-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="import_batches-library_id"></a>`library_id` | `uuid` | 否 | FK | — | 本批次目标媒体库 |
| <a id="import_batches-root_id"></a>`root_id` | `uuid` | 是 | FK | — | 扫描指定根；人工选择多个根内文件时可为空 |
| <a id="import_batches-created_by"></a>`created_by` | `uuid` | 否 | FK | — | 发起账号 |
| <a id="import_batches-mode"></a>`mode` | `text` | 否 | — | — | 扫描、选文件、手动资料草稿、迁移 |
| <a id="import_batches-is_paused"></a>`is_paused` | `boolean` | 否 | — | `false` | 暂停领取新项；不抹掉已完成阶段 |
| <a id="import_batches-cancel_requested_at"></a>`cancel_requested_at` | `timestamptz` | 是 | — | — | 用户请求取消的时间 |
| <a id="import_batches-finished_at"></a>`finished_at` | `timestamptz` | 是 | — | — | 所有项完成或终止的时间 |
| <a id="import_batches-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="import_batches-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="import_batches-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID | 扫描/匹配/复核/发布用例；服务端生成；不要求用户填写 | 建议保留 |
| `library_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `root_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `created_by` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `mode` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `is_paused` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `cancel_requested_at` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `finished_at` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 扫描/匹配/复核/发布用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
import_batches_mode_check: CHECK ((mode = ANY (ARRAY['scan'::text, 'selected_files'::text, 'manual'::text, 'legacy'::text])));
import_batches_revision_check: CHECK ((revision > 0));
import_batches_created_by_fkey: FOREIGN KEY (created_by) REFERENCES video_x.accounts(id);
import_batches_library_id_fkey: FOREIGN KEY (library_id) REFERENCES video_x.libraries(id);
import_batches_root_id_fkey: FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id);
import_batches_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX import_batches_pkey ON video_x.import_batches USING btree (id)
```

</details>

<a id="import_items"></a>
## import_items · 服务端导入草稿与发布结果

本表依据：现有本地解析+抓取+录入流程；新增服务端草稿与候选复核。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="import_items-id"></a>`id` | `uuid` | 否 | PK/FK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="import_items-batch_id"></a>`batch_id` | `uuid` | 否 | FK | — | 所属批次 |
| <a id="import_items-item_key"></a>`item_key` | `text` | 否 | — | — | 批次内稳定幂等键，例如分组文件指纹，不随重试改变 |
| <a id="import_items-stage"></a>`stage` | `text` | 否 | — | `'discovered'::text` | 已持久化资料阶段，不与执行状态混用 |
| <a id="import_items-execution_status"></a>`execution_status` | `text` | 否 | — | `'queued'::text` | 任务执行状态 |
| <a id="import_items-selected_candidate_id"></a>`selected_candidate_id` | `uuid` | 是 | FK | — | 选中的来源候选，在候选表建立后补复合外键 |
| <a id="import_items-draft"></a>`draft` | `jsonb` | 否 | — | `'{}'::jsonb` | 有版本 schema 的人工草稿，可表达创建作品 / 新版本 / 分段 / 真分集 |
| <a id="import_items-draft_schema_version"></a>`draft_schema_version` | `integer` | 否 | — | `2` | 导入草稿格式版本 |
| <a id="import_items-draft_revision"></a>`draft_revision` | `bigint` | 否 | — | `1` | 用户核对内容的版本；任务进度变动不改变，资料/候选/绑定变动递增 |
| <a id="import_items-reviewed_revision"></a>`reviewed_revision` | `bigint` | 是 | — | — | 人工确认对应的草稿版本；必须等于当前 draft_revision，否则重新核对 |
| <a id="import_items-reviewed_at"></a>`reviewed_at` | `timestamptz` | 是 | — | — | 本次人工确认的服务端时间；草稿修改时清空 |
| <a id="import_items-reviewed_by"></a>`reviewed_by` | `uuid` | 是 | FK | — | 人工确认的账号；任务 worker 不能创建发布决定 |
| <a id="import_items-publish_key"></a>`publish_key` | `uuid` | 否 | — | `gen_random_uuid()` | 该项发布的稳定幂等身份，重试不得生成新 key |
| <a id="import_items-published_media_id"></a>`published_media_id` | `uuid` | 是 | FK | — | 成功发布的作品 |
| <a id="import_items-published_edition_id"></a>`published_edition_id` | `uuid` | 是 | FK | — | 成功发布的版本；复合外键保证属于该作品 |
| <a id="import_items-published_at"></a>`published_at` | `timestamptz` | 是 | — | — | 发布事务提交时间 |
| <a id="import_items-error_code"></a>`error_code` | `text` | 是 | — | — | 最后错误码 |
| <a id="import_items-error_details"></a>`error_details` | `jsonb` | 是 | — | — | 脱敏错误详情，用户草稿独立保留 |
| <a id="import_items-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="import_items-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="import_items-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID | 扫描/匹配/复核/发布用例；服务端生成；不要求用户填写 | 建议保留 |
| `batch_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `item_key` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `stage` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `execution_status` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `selected_candidate_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `draft` | **方案新增**：无旧字段；按本表设计依据新增 | 导入工作台恢复标题、人物、分类、系列与标签的未发布选择 | 扫描/匹配/复核/发布用例；服务端按版本化草稿契约保存；未发布草稿不污染正式片库 | 建议保留 |
| `draft_schema_version` | **方案新增**：无旧字段；按本表设计依据新增 | 版本2定义完整资料、临时演职员/系列、图片、版本与字段选择；由服务端校验 | 扫描/匹配/复核/发布用例；新草稿为2；旧应用任务和浏览器草稿不迁 | 建议保留 |
| `draft_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认 | 草稿用例/人工确认命令/数据库约束；新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移 | 建议保留 |
| `reviewed_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认 | 草稿用例/人工确认命令/数据库约束；新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移 | 建议保留 |
| `reviewed_at` | **技术新增**：无旧字段；按本表设计依据新增 | 完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认 | 草稿用例/人工确认命令/数据库约束；新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移 | 建议保留 |
| `reviewed_by` | **技术新增**：无旧字段；按本表设计依据新增 | 完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认 | 草稿用例/人工确认命令/数据库约束；新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移 | 建议保留 |
| `publish_key` | **技术新增**：无旧字段；按本表设计依据新增 | 发布超时重试返回同一结果，避免重复建作品/版本 | 扫描/匹配/复核/发布用例；导入项创建时生成稳定发布键；重试不换键 | 建议保留 |
| `published_media_id` | **技术新增**：无旧字段；按本表设计依据新增 | 任务发布结果链接和幂等返回；标记已完成项 | 扫描/匹配/复核/发布用例；仅成功的发布事务同时填写；尚未发布保持 NULL | 建议保留 |
| `published_edition_id` | **技术新增**：无旧字段；按本表设计依据新增 | 任务发布结果链接和幂等返回；标记已完成项 | 扫描/匹配/复核/发布用例；仅成功的发布事务同时填写；尚未发布保持 NULL | 建议保留 |
| `published_at` | **技术新增**：无旧字段；按本表设计依据新增 | 任务发布结果链接和幂等返回；标记已完成项 | 扫描/匹配/复核/发布用例；仅成功的发布事务同时填写；尚未发布保持 NULL | 建议保留 |
| `error_code` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `error_details` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 扫描/匹配/复核/发布用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
import_items_check: CHECK ((((stage = 'published'::text) AND (published_media_id IS NOT NULL) AND (published_at IS NOT NULL) AND (execution_status = 'completed'::text)) OR ((stage <> 'published'::text) AND (published_media_id IS NULL) AND (published_edition_id IS NULL) AND (published_at IS NULL))));
import_items_check1: CHECK ((((reviewed_revision IS NULL) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL)) OR ((reviewed_revision IS NOT NULL) AND (reviewed_revision = draft_revision) AND (reviewed_at IS NOT NULL) AND (reviewed_by IS NOT NULL))));
import_items_check2: CHECK (((stage <> 'published'::text) OR (reviewed_revision IS NOT NULL)));
import_items_draft_check: CHECK ((jsonb_typeof(draft) = 'object'::text));
import_items_draft_revision_check: CHECK ((draft_revision > 0));
import_items_draft_schema_version_check: CHECK ((draft_schema_version > 0));
import_items_error_details_check: CHECK (((error_details IS NULL) OR (jsonb_typeof(error_details) = 'object'::text)));
import_items_execution_status_check: CHECK ((execution_status = ANY (ARRAY['queued'::text, 'running'::text, 'waiting_user'::text, 'retry_wait'::text, 'failed'::text, 'cancelled'::text, 'completed'::text])));
import_items_reviewed_revision_check: CHECK ((reviewed_revision > 0));
import_items_revision_check: CHECK ((revision > 0));
import_items_stage_check: CHECK ((stage = ANY (ARRAY['discovered'::text, 'probed'::text, 'matched'::text, 'ready'::text, 'published'::text])));
import_items_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES video_x.import_batches(id);
import_items_published_edition_id_published_media_id_fkey: FOREIGN KEY (published_edition_id, published_media_id) REFERENCES video_x.editions(id, media_id);
import_items_published_media_id_fkey: FOREIGN KEY (published_media_id) REFERENCES video_x.media_items(id);
import_items_reviewed_by_fkey: FOREIGN KEY (reviewed_by) REFERENCES video_x.accounts(id);
import_selected_candidate_fk: FOREIGN KEY (selected_candidate_id, id) REFERENCES video_x.import_candidates(id, item_id) DEFERRABLE;
import_items_pkey: PRIMARY KEY (id);
import_items_batch_id_item_key_key: UNIQUE (batch_id, item_key);
import_items_publish_key_key: UNIQUE (publish_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX import_items_batch_id_item_key_key ON video_x.import_items USING btree (batch_id, item_key)
CREATE INDEX import_items_batch_idx ON video_x.import_items USING btree (batch_id, stage, execution_status, id)
CREATE UNIQUE INDEX import_items_pkey ON video_x.import_items USING btree (id)
CREATE UNIQUE INDEX import_items_publish_key_key ON video_x.import_items USING btree (publish_key)
```

</details>

<a id="import_item_files"></a>
## import_item_files · 导入项文件与候选段顺序

本表依据：现有本地解析+抓取+录入流程；新增服务端草稿与候选复核。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="import_item_files-item_id"></a>`item_id` | `uuid` | 否 | PK/FK | — | 一条草稿允许多个 CD 文件 |
| <a id="import_item_files-file_id"></a>`file_id` | `uuid` | 否 | PK/FK | — | 已登记文件 |
| <a id="import_item_files-edition_key"></a>`edition_key` | `text` | 否 | PK | `'default'::text` | 草稿版本临时键；同一导入作品可维护多个版本，每个版本独立排序文件段 |
| <a id="import_item_files-part_no"></a>`part_no` | `integer` | 否 | — | — | 准备发布的段顺序 |
| <a id="import_item_files-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `item_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `file_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `edition_key` | **技术新增**：无旧字段；按本表设计依据新增 | 草稿版本与文件选择；发布时映射为正式 editions.id | 扫描/匹配/复核/发布用例；首个版本使用 default；新增版本使用草稿内唯一键 | 建议保留 |
| `part_no` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
import_item_files_edition_key_check: CHECK ((length(btrim(edition_key)) > 0));
import_item_files_part_no_check: CHECK ((part_no > 0));
import_item_files_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id);
import_item_files_item_id_fkey: FOREIGN KEY (item_id) REFERENCES video_x.import_items(id);
import_item_files_pkey: PRIMARY KEY (item_id, edition_key, file_id);
import_item_files_item_id_edition_key_part_no_key: UNIQUE (item_id, edition_key, part_no) DEFERRABLE;

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX import_item_files_item_id_edition_key_part_no_key ON video_x.import_item_files USING btree (item_id, edition_key, part_no)
CREATE UNIQUE INDEX import_item_files_pkey ON video_x.import_item_files USING btree (item_id, edition_key, file_id)
```

</details>

<a id="import_candidates"></a>
## import_candidates · 来源匹配候选

本表依据：现有本地解析+抓取+录入流程；新增服务端草稿与候选复核。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="import_candidates-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="import_candidates-item_id"></a>`item_id` | `uuid` | 否 | FK | — | 所属导入项 |
| <a id="import_candidates-source_record_id"></a>`source_record_id` | `uuid` | 否 | FK | — | 来源身份，尚未入库也可存在 |
| <a id="import_candidates-snapshot_id"></a>`snapshot_id` | `uuid` | 是 | FK | — | 已读取详情的快照；仅搜索结果时为空 |
| <a id="import_candidates-confidence"></a>`confidence` | `numeric(5,4)` | 是 | — | — | 可选匹配置信值，不代替人工决定 |
| <a id="import_candidates-evidence"></a>`evidence` | `jsonb` | 否 | — | `'{}'::jsonb` | 编号、标题、年份等匹配依据 |
| <a id="import_candidates-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID | 扫描/匹配/复核/发布用例；服务端生成；不要求用户填写 | 建议保留 |
| `item_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `confidence` | **技术新增**：无旧字段；按本表设计依据新增 | 候选排序和人工复核提示；启发式匹配分不宣称为真实概率 | 扫描/匹配/复核/发布用例；匹配器按版本化规则计算；无规则时不假定高可信 | 建议保留 |
| `evidence` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端导入工作台、批次状态、草稿恢复与发布结果 | 扫描/匹配/复核/发布用例；服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描/匹配/复核/发布用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
import_candidates_confidence_check: CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)));
import_candidates_evidence_check: CHECK ((jsonb_typeof(evidence) = 'object'::text));
import_candidates_item_id_fkey: FOREIGN KEY (item_id) REFERENCES video_x.import_items(id);
import_candidates_snapshot_id_source_record_id_fkey: FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id);
import_candidates_source_record_id_fkey: FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id);
import_candidates_pkey: PRIMARY KEY (id);
import_candidates_id_item_id_key: UNIQUE (id, item_id);
import_candidates_item_id_source_record_id_key: UNIQUE (item_id, source_record_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX import_candidates_id_item_id_key ON video_x.import_candidates USING btree (id, item_id)
CREATE UNIQUE INDEX import_candidates_item_id_source_record_id_key ON video_x.import_candidates USING btree (item_id, source_record_id)
CREATE UNIQUE INDEX import_candidates_pkey ON video_x.import_candidates USING btree (id)
```

</details>

<a id="tasks"></a>
## tasks · 业务任务与持久摘要

本表依据：保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="tasks-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="tasks-kind"></a>`kind` | `text` | 否 | — | — | 任务处理器类型 |
| <a id="tasks-requested_by"></a>`requested_by` | `uuid` | 是 | FK | — | 发起人，系统任务可为空 |
| <a id="tasks-batch_id"></a>`batch_id` | `uuid` | 是 | FK | — | 可选批次上下文 |
| <a id="tasks-status"></a>`status` | `text` | 否 | — | `'queued'::text` | UI 展示的业务聚合状态；租约与重试调度由 pg-boss 拥有 |
| <a id="tasks-cancel_requested_at"></a>`cancel_requested_at` | `timestamptz` | 是 | — | — | 取消信号持久记录 |
| <a id="tasks-finished_at"></a>`finished_at` | `timestamptz` | 是 | — | — | 终态时间 |
| <a id="tasks-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="tasks-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="tasks-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行；关联和路由使用此 ID | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `kind` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心按导入、探测、刷新、人物补全等分组 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `requested_by` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `batch_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `status` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `cancel_requested_at` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `finished_at` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
tasks_kind_check: CHECK ((kind = ANY (ARRAY['scan'::text, 'probe'::text, 'match'::text, 'publish'::text, 'metadata_refresh'::text, 'person_enrich'::text, 'asset_download'::text, 'backup'::text])));
tasks_revision_check: CHECK ((revision > 0));
tasks_status_check: CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'waiting_user'::text, 'failed'::text, 'cancelled'::text, 'completed'::text])));
tasks_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES video_x.import_batches(id);
tasks_requested_by_fkey: FOREIGN KEY (requested_by) REFERENCES video_x.accounts(id);
tasks_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX tasks_pkey ON video_x.tasks USING btree (id)
```

</details>

<a id="task_items"></a>
## task_items · 逐项检查点与结构化结果

本表依据：保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="task_items-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="task_items-task_id"></a>`task_id` | `uuid` | 否 | FK | — | 所属任务 |
| <a id="task_items-item_key"></a>`item_key` | `text` | 否 | — | — | 任务内稳定对象键 |
| <a id="task_items-import_item_id"></a>`import_item_id` | `uuid` | 是 | FK | — | 目标导入项 |
| <a id="task_items-file_id"></a>`file_id` | `uuid` | 是 | FK | — | 目标文件 |
| <a id="task_items-media_id"></a>`media_id` | `uuid` | 是 | FK | — | 目标作品 |
| <a id="task_items-person_id"></a>`person_id` | `uuid` | 是 | FK | — | 目标人物 |
| <a id="task_items-root_id"></a>`root_id` | `uuid` | 是 | FK | — | 目标根目录 |
| <a id="task_items-status"></a>`status` | `text` | 否 | — | `'queued'::text` | 当前业务状态，不代替队列 claim/lease |
| <a id="task_items-checkpoint"></a>`checkpoint` | `jsonb` | 否 | — | `'{}'::jsonb` | 已完成阶段与幂等外部操作标识，版本由处理器维护 |
| <a id="task_items-result"></a>`result` | `jsonb` | 是 | — | — | 结构化结果与资源引用，不把结果仅存进程内 Map |
| <a id="task_items-error_code"></a>`error_code` | `text` | 是 | — | — | 结构化失败类别 |
| <a id="task_items-error_details"></a>`error_details` | `jsonb` | 是 | — | — | 脱敏错误详情 |
| <a id="task_items-queue_job_id"></a>`queue_job_id` | `uuid` | 是 | — | — | pg-boss 拥有的工作项标识，不跨 schema 建外键 |
| <a id="task_items-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="task_items-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="task_items-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行；关联和路由使用此 ID | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `task_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `item_key` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `import_item_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `file_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `person_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `root_id` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `status` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `checkpoint` | **技术新增**：无旧字段；按本表设计依据新增 | 仅用于新任务在重启后恢复已完成阶段；不是迁移旧任务百分比 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `result` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `error_code` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `error_details` | **方案新增**：无旧字段；按本表设计依据新增 | 任务中心、失败重试、Mac 登录恢复后继续执行 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `queue_job_id` | **技术新增**：无旧字段；按本表设计依据新增 | 定位队列执行记录；业务状态不依赖一个可过期的队列 ID | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 任务创建用例/worker；不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
task_items_check: CHECK ((num_nonnulls(import_item_id, file_id, media_id, person_id, root_id) <= 1));
task_items_checkpoint_check: CHECK ((jsonb_typeof(checkpoint) = 'object'::text));
task_items_error_details_check: CHECK (((error_details IS NULL) OR (jsonb_typeof(error_details) = 'object'::text)));
task_items_result_check: CHECK (((result IS NULL) OR (jsonb_typeof(result) = 'object'::text)));
task_items_revision_check: CHECK ((revision > 0));
task_items_status_check: CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'waiting_user'::text, 'retry_wait'::text, 'failed'::text, 'cancelled'::text, 'completed'::text])));
task_items_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id);
task_items_import_item_id_fkey: FOREIGN KEY (import_item_id) REFERENCES video_x.import_items(id);
task_items_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
task_items_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
task_items_root_id_fkey: FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id);
task_items_task_id_fkey: FOREIGN KEY (task_id) REFERENCES video_x.tasks(id);
task_items_pkey: PRIMARY KEY (id);
task_items_task_id_item_key_key: UNIQUE (task_id, item_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX task_items_pkey ON video_x.task_items USING btree (id)
CREATE UNIQUE INDEX task_items_task_id_item_key_key ON video_x.task_items USING btree (task_id, item_key)
```

</details>

<a id="outbox_events"></a>
## outbox_events · 事务后可靠投递

本表依据：网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段。建议：**待裁剪**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="outbox_events-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="outbox_events-event_type"></a>`event_type` | `text` | 否 | — | — | 例如 catalog.media-published.v1 |
| <a id="outbox_events-aggregate_type"></a>`aggregate_type` | `text` | 否 | — | — | 审计式聚合类型，不是业务关系外键 |
| <a id="outbox_events-aggregate_id"></a>`aggregate_id` | `uuid` | 否 | — | — | 事件发生时聚合 ID，允许日后归档和清理 |
| <a id="outbox_events-dedupe_key"></a>`dedupe_key` | `text` | 否 | — | — | 事件稳定身份，重复投递消费者仍须幂等 |
| <a id="outbox_events-payload"></a>`payload` | `jsonb` | 否 | — | — | 脱敏消息载荷，禁止携带凭据 |
| <a id="outbox_events-sent_at"></a>`sent_at` | `timestamptz` | 是 | — | — | 已成功交给队列的时间 |
| <a id="outbox_events-send_attempts"></a>`send_attempts` | `integer` | 否 | — | `0` | outbox 投递计数，不承担业务任务重试租约 |
| <a id="outbox_events-last_error_code"></a>`last_error_code` | `text` | 是 | — | — | 最近投递失败原因 |
| <a id="outbox_events-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；关联和路由使用此 ID | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `event_type` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `aggregate_type` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `aggregate_id` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `dedupe_key` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `payload` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `sent_at` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `send_attempts` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `last_error_code` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |

<details>
<summary>数据库约束与索引</summary>

```sql
outbox_events_payload_check: CHECK ((jsonb_typeof(payload) = 'object'::text));
outbox_events_send_attempts_check: CHECK ((send_attempts >= 0));
outbox_events_pkey: PRIMARY KEY (id);
outbox_events_dedupe_key_key: UNIQUE (dedupe_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX outbox_events_dedupe_key_key ON video_x.outbox_events USING btree (dedupe_key)
CREATE UNIQUE INDEX outbox_events_pkey ON video_x.outbox_events USING btree (id)
CREATE INDEX outbox_pending_idx ON video_x.outbox_events USING btree (created_at, id) WHERE (sent_at IS NULL)
```

</details>

<a id="idempotency_keys"></a>
## idempotency_keys · 命令幂等结果

本表依据：网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段。建议：**待裁剪**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="idempotency_keys-account_id"></a>`account_id` | `uuid` | 否 | PK/FK | — | 命令调用账号 |
| <a id="idempotency_keys-scope"></a>`scope` | `text` | 否 | PK | — | 命令种类与目标资源的规范化作用域 |
| <a id="idempotency_keys-key"></a>`key` | `text` | 否 | PK | — | 客户端 Idempotency-Key |
| <a id="idempotency_keys-request_sha256"></a>`request_sha256` | `bytea` | 否 | — | — | 规范化请求摘要，同 key 不同请求拒绝 |
| <a id="idempotency_keys-response_status"></a>`response_status` | `smallint` | 否 | — | — | 已提交结果的 HTTP 状态 |
| <a id="idempotency_keys-response_body"></a>`response_body` | `jsonb` | 否 | — | — | 脱敏响应；与业务写入同事务，只保留已完成结果 |
| <a id="idempotency_keys-expires_at"></a>`expires_at` | `timestamptz` | 否 | — | — | 可回收时间；业务唯一键仍永久保护已发布项 |
| <a id="idempotency_keys-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `account_id` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `scope` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `key` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `request_sha256` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `response_status` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `response_body` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `expires_at` | **技术新增**：无旧字段；按本表设计依据新增 | 系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 业务事务/事件派发器/幂等中间层；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |

<details>
<summary>数据库约束与索引</summary>

```sql
idempotency_keys_check: CHECK ((expires_at > created_at));
idempotency_keys_key_check: CHECK (((length(key) >= 1) AND (length(key) <= 200)));
idempotency_keys_request_sha256_check: CHECK ((octet_length(request_sha256) = 32));
idempotency_keys_response_status_check: CHECK (((response_status >= 200) AND (response_status <= 499)));
idempotency_keys_account_id_fkey: FOREIGN KEY (account_id) REFERENCES video_x.accounts(id);
idempotency_keys_pkey: PRIMARY KEY (account_id, scope, key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX idempotency_keys_pkey ON video_x.idempotency_keys USING btree (account_id, scope, key)
```

</details>

<a id="audit_log"></a>
## audit_log · 追加写操作审计

本表依据：人物合并、分类迁移与来源接受的追溯；旧库无审计日志。建议：**待裁剪**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="audit_log-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="audit_log-actor_account_id"></a>`actor_account_id` | `uuid` | 是 | FK | — | 操作者，系统任务可为空 |
| <a id="audit_log-action"></a>`action` | `text` | 否 | — | — | 动作代码，如 person.merge / category.migrate |
| <a id="audit_log-entity_type"></a>`entity_type` | `text` | 否 | — | — | 当时的实体种类；历史定位，不是实时业务关系 |
| <a id="audit_log-entity_id"></a>`entity_id` | `uuid` | 否 | — | — | 当时的稳定 ID，不因后续归档删除历史审计 |
| <a id="audit_log-before_revision"></a>`before_revision` | `bigint` | 是 | — | — | 操作前版本 |
| <a id="audit_log-after_revision"></a>`after_revision` | `bigint` | 是 | — | — | 操作后版本 |
| <a id="audit_log-changes"></a>`changes` | `jsonb` | 否 | — | `'{}'::jsonb` | 必要字段与关系影响，不存密码、Cookie 或未脱敏抓取正文 |
| <a id="audit_log-request_id"></a>`request_id` | `uuid` | 否 | — | — | 链路定位 ID |
| <a id="audit_log-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审；关联和路由使用此 ID | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `actor_account_id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `action` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `entity_type` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `entity_id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `before_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `after_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `changes` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `request_id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端操作记录与错误排查；范围和保留周期待评审 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 业务事务内审计记录；相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录 | 待裁剪 |

<details>
<summary>数据库约束与索引</summary>

```sql
audit_log_after_revision_check: CHECK ((after_revision > 0));
audit_log_before_revision_check: CHECK ((before_revision > 0));
audit_log_changes_check: CHECK ((jsonb_typeof(changes) = 'object'::text));
audit_log_actor_account_id_fkey: FOREIGN KEY (actor_account_id) REFERENCES video_x.accounts(id);
audit_log_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX audit_entity_idx ON video_x.audit_log USING btree (entity_type, entity_id, created_at DESC)
CREATE UNIQUE INDEX audit_log_pkey ON video_x.audit_log USING btree (id)
```

</details>

<a id="legacy_mappings"></a>
## legacy_mappings · 旧库到新库的稳定映射

本表依据：全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="legacy_mappings-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="legacy_mappings-source_system"></a>`source_system` | `text` | 否 | — | — | 旧数据库或迁移来源标识 |
| <a id="legacy_mappings-source_table"></a>`source_table` | `text` | 否 | — | — | 旧表名 |
| <a id="legacy_mappings-key_name"></a>`key_name` | `text` | 否 | — | `'id'::text` | 旧身份字段名，例如 id / movie_code / actor_code / tag_code；与旧值共同追溯 |
| <a id="legacy_mappings-legacy_id"></a>`legacy_id` | `text` | 否 | — | — | 由 key_name 指定的旧身份原始文本；既可为旧主键，也可为旧业务编码，不丢 BIGINT 精度 |
| <a id="legacy_mappings-target_kind"></a>`target_kind` | `text` | 否 | — | — | 一个旧 movie 可分别映射作品、版本和文件三行 |
| <a id="legacy_mappings-media_id"></a>`media_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-edition_id"></a>`edition_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-file_id"></a>`file_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-person_id"></a>`person_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-franchise_id"></a>`franchise_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-category_id"></a>`category_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-collection_id"></a>`collection_id` | `uuid` | 是 | FK | — | 目标真实外键；八个目标外键恰好一个非空 |
| <a id="legacy_mappings-tag_id"></a>`tag_id` | `uuid` | 是 | FK | — | 目标标签外键，补齐旧 tag.id / tag_code 的追溯 |
| <a id="legacy_mappings-source_checksum"></a>`source_checksum` | `bytea` | 是 | — | — | 旧行规范导出的校验摘要 |
| <a id="legacy_mappings-notes"></a>`notes` | `jsonb` | 否 | — | `'{}'::jsonb` | 不确定判定、生成顺序等迁移备注 |
| <a id="legacy_mappings-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果；关联和路由使用此 ID | 迁移程序；服务端生成；不要求用户填写 | 建议保留 |
| `source_system` | **技术新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写 | 建议保留 |
| `source_table` | **技术新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写 | 建议保留 |
| `key_name` | **技术新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写 | 建议保留 |
| `legacy_id` | **拆分重组**：`movie.id`、`movie.movie_code`、`actor.id`、`actor.actor_code`、`series.id`、`series.series_code`、`category.id`、`category.category_code`、`tag.id`、`tag.tag_code`、`collections.id`、`collections.coll_code` | 按旧表+旧字段+旧值找新 ID，保留旧代码检索和迁移可重复性 | 迁移程序；按 key_name 保存主键或业务编码原始文本；同一旧身份可映射作品/版本/文件多个目标 | 建议保留 |
| `target_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `edition_id` | **拆分重组**：`movie.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；仅旧普通可播放条目或子集映射新版本 UUID；group 容器不生成版本映射 | 建议保留 |
| `file_id` | **拆分重组**：`movie.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `person_id` | **拆分重组**：`actor.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `franchise_id` | **拆分重组**：`series.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `category_id` | **拆分重组**：`category.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `collection_id` | **拆分重组**：`collections.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `tag_id` | **拆分重组**：`tag.id` | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；填入对应新实体 UUID；八个目标外键恰好一个非空 | 建议保留 |
| `source_checksum` | **方案新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `notes` | **方案新增**：无旧字段；按本表设计依据新增 | 迁移核对、旧链接定位、重复执行迁移时查已有结果 | 迁移程序；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 迁移程序；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
legacy_mappings_check: CHECK ((num_nonnulls(media_id, edition_id, file_id, person_id, franchise_id, category_id, collection_id, tag_id) = 1));
legacy_mappings_check1: CHECK ((((target_kind = 'media'::text) AND (media_id IS NOT NULL)) OR ((target_kind = 'edition'::text) AND (edition_id IS NOT NULL)) OR ((target_kind = 'file'::text) AND (file_id IS NOT NULL)) OR ((target_kind = 'person'::text) AND (person_id IS NOT NULL)) OR ((target_kind = 'franchise'::text) AND (franchise_id IS NOT NULL)) OR ((target_kind = 'category'::text) AND (category_id IS NOT NULL)) OR ((target_kind = 'collection'::text) AND (collection_id IS NOT NULL)) OR ((target_kind = 'tag'::text) AND (tag_id IS NOT NULL))));
legacy_mappings_notes_check: CHECK ((jsonb_typeof(notes) = 'object'::text));
legacy_mappings_source_checksum_check: CHECK ((octet_length(source_checksum) = 32));
legacy_mappings_target_kind_check: CHECK ((target_kind = ANY (ARRAY['media'::text, 'edition'::text, 'file'::text, 'person'::text, 'franchise'::text, 'category'::text, 'collection'::text, 'tag'::text])));
legacy_mappings_category_id_fkey: FOREIGN KEY (category_id) REFERENCES video_x.categories(id);
legacy_mappings_collection_id_fkey: FOREIGN KEY (collection_id) REFERENCES video_x.collections(id);
legacy_mappings_edition_id_fkey: FOREIGN KEY (edition_id) REFERENCES video_x.editions(id);
legacy_mappings_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id);
legacy_mappings_franchise_id_fkey: FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id);
legacy_mappings_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
legacy_mappings_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
legacy_mappings_tag_id_fkey: FOREIGN KEY (tag_id) REFERENCES video_x.tags(id);
legacy_mappings_pkey: PRIMARY KEY (id);
legacy_mappings_source_system_source_table_key_name_legacy__key: UNIQUE (source_system, source_table, key_name, legacy_id, target_kind);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX legacy_mappings_pkey ON video_x.legacy_mappings USING btree (id)
CREATE UNIQUE INDEX legacy_mappings_source_system_source_table_key_name_legacy__key ON video_x.legacy_mappings USING btree (source_system, source_table, key_name, legacy_id, target_kind)
```

</details>
