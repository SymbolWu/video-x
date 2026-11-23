# 媒体库与文件 · 字段与业务依据 v0.5

[阅读指南](field-guide.md) · [模型入口](README.md) · [分域关系图](relationships.md) · [建表 SQL](schema.sql)

更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**

每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](evidence-review.md)。

| 表 | 字段数 | 本表首版建议 | 业务依据 |
| --- | ---: | --- | --- |
| [libraries](#libraries) · 逻辑媒体库 | 7 | 建议保留 | 作品与磁盘目录分开；旧库无逻辑库实体 |
| [storage_roots](#storage_roots) · 媒体根目录 | 13 | 建议保留 | 旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验 |
| [media_files](#media_files) · 实际文件 | 25 | 建议保留 | 拆出旧 movie 的文件事实；补充扫描与探测状态 |
| [media_streams](#media_streams) · 文件内轨道 | 19 | 建议保留 | 现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化 |
| [editions](#editions) · 播放版本 | 12 | 建议保留 | movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开 |
| [edition_parts](#edition_parts) · 版本内有序文件段 | 6 | 建议保留 | movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开 |
| [edition_subtitles](#edition_subtitles) · 版本外挂字幕 | 8 | 后置 | 外挂字幕版本绑定尚无现有实体/业务数据依据 |

<a id="libraries"></a>
## libraries · 逻辑媒体库

本表依据：作品与磁盘目录分开；旧库无逻辑库实体。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="libraries-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="libraries-name"></a>`name` | `text` | 否 | — | — | 逻辑片库名，首版建立一个默认媒体库 |
| <a id="libraries-description"></a>`description` | `text` | 是 | — | — | 说明 |
| <a id="libraries-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="libraries-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="libraries-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="libraries-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 默认片库、扫描范围与作品归属；关联和路由使用此 ID | 部署初始化/媒体库设置；服务端生成；不要求用户填写 | 建议保留 |
| `name` | **方案新增**：无旧字段；按本表设计依据新增 | 默认片库、扫描范围与作品归属 | 部署初始化/媒体库设置；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `description` | **方案新增**：无旧字段；按本表设计依据新增 | 默认片库、扫描范围与作品归属 | 部署初始化/媒体库设置；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `archived_at` | **技术新增**：无旧字段；按本表设计依据新增 | 归档过滤与恢复，不表示删除磁盘视频 | 部署初始化/媒体库设置；默认 NULL；明确归档操作写服务端时间 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 部署初始化/媒体库设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 部署初始化/媒体库设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 部署初始化/媒体库设置；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
libraries_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120)));
libraries_revision_check: CHECK ((revision > 0));
libraries_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX libraries_pkey ON video_x.libraries USING btree (id)
```

</details>

<a id="storage_roots"></a>
## storage_roots · 媒体根目录

本表依据：旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="storage_roots-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="storage_roots-library_id"></a>`library_id` | `uuid` | 否 | FK | — | 一个库允许挂载多个磁盘根目录 |
| <a id="storage_roots-name"></a>`name` | `text` | 否 | — | — | 用户可读名称 |
| <a id="storage_roots-mount_path"></a>`mount_path` | `text` | 否 | — | — | worker 内部受控挂载路径；宿主映射由 Compose 配置管理 |
| <a id="storage_roots-expected_marker"></a>`expected_marker` | `uuid` | 否 | — | — | 根目录标识文件中应读取到的 UUID；用于识别空挂载和错盘 |
| <a id="storage_roots-status"></a>`status` | `text` | 否 | — | `'unknown'::text` | 根目录可用性，与单文件缺失分开 |
| <a id="storage_roots-last_checked_at"></a>`last_checked_at` | `timestamptz` | 是 | — | — | 最近核验根标识的时间 |
| <a id="storage_roots-last_complete_scan_at"></a>`last_complete_scan_at` | `timestamptz` | 是 | — | — | 最近一次完整且成功扫描时间 |
| <a id="storage_roots-scan_enabled"></a>`scan_enabled` | `boolean` | 否 | — | `true` | 是否参与扫描 |
| <a id="storage_roots-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="storage_roots-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="storage_roots-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="storage_roots-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端媒体根设置、扫描前检查、文件离线提示；关联和路由使用此 ID | 媒体根设置/扫描 worker；服务端生成；不要求用户填写 | 建议保留 |
| `library_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端媒体根设置、扫描前检查、文件离线提示 | 媒体根设置/扫描 worker；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `name` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端媒体根设置、扫描前检查、文件离线提示 | 媒体根设置/扫描 worker；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `mount_path` | **拆分重组**：`movie.file_path` | 管理端媒体根设置、扫描前检查、文件离线提示 | 媒体根设置/扫描 worker；以受控配置确定根路径和挂载映射，不自动信任旧路径前缀 | 建议保留 |
| `expected_marker` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失 | 媒体根设置/扫描 worker；登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间 | 建议保留 |
| `status` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失 | 媒体根设置/扫描 worker；登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间 | 建议保留 |
| `last_checked_at` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失 | 媒体根设置/扫描 worker；登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间 | 建议保留 |
| `last_complete_scan_at` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失 | 媒体根设置/扫描 worker；登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间 | 建议保留 |
| `scan_enabled` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失 | 媒体根设置/扫描 worker；登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间 | 建议保留 |
| `archived_at` | **技术新增**：无旧字段；按本表设计依据新增 | 归档过滤与恢复，不表示删除磁盘视频 | 媒体根设置/扫描 worker；默认 NULL；明确归档操作写服务端时间 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 媒体根设置/扫描 worker；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 媒体根设置/扫描 worker；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 媒体根设置/扫描 worker；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
storage_roots_mount_path_check: CHECK (("left"(mount_path, 1) = '/'::text));
storage_roots_revision_check: CHECK ((revision > 0));
storage_roots_status_check: CHECK ((status = ANY (ARRAY['unknown'::text, 'online'::text, 'offline'::text, 'identity_mismatch'::text])));
storage_roots_library_id_fkey: FOREIGN KEY (library_id) REFERENCES video_x.libraries(id);
storage_roots_pkey: PRIMARY KEY (id);
storage_roots_expected_marker_key: UNIQUE (expected_marker);
storage_roots_library_id_mount_path_key: UNIQUE (library_id, mount_path);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX storage_roots_expected_marker_key ON video_x.storage_roots USING btree (expected_marker)
CREATE UNIQUE INDEX storage_roots_library_id_mount_path_key ON video_x.storage_roots USING btree (library_id, mount_path)
CREATE INDEX storage_roots_library_idx ON video_x.storage_roots USING btree (library_id)
CREATE UNIQUE INDEX storage_roots_pkey ON video_x.storage_roots USING btree (id)
```

</details>

<a id="media_files"></a>
## media_files · 实际文件

本表依据：拆出旧 movie 的文件事实；补充扫描与探测状态。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_files-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_files-root_id"></a>`root_id` | `uuid` | 否 | FK | — | 文件所在受控根目录 |
| <a id="media_files-relative_path"></a>`relative_path` | `text` | 否 | — | — | 使用 / 的相对路径，首版最多 2048 字节；超长路径报异常而非截断；应用仍须检查符号链接边界 |
| <a id="media_files-file_kind"></a>`file_kind` | `text` | 否 | — | — | 主视频、外挂字幕、NFO 等旁车文件 |
| <a id="media_files-content_revision"></a>`content_revision` | `bigint` | 否 | — | `1` | 文件内容代数；stat 变化时用例递增并重置探测状态 |
| <a id="media_files-size_bytes"></a>`size_bytes` | `bigint` | 否 | — | — | 精确字节数，API 以十进制字符串传输 |
| <a id="media_files-mtime_ns"></a>`mtime_ns` | `bigint` | 否 | — | — | 修改时间的 Unix 纳秒整数，避免时间点精度不足 |
| <a id="media_files-fingerprint_algorithm"></a>`fingerprint_algorithm` | `text` | 是 | — | — | 如 sampled-sha256-v1；版本属于算法名 |
| <a id="media_files-fingerprint"></a>`fingerprint` | `text` | 是 | — | — | 重复候选指纹；不全局唯一，不证明内容完全相同 |
| <a id="media_files-availability"></a>`availability` | `text` | 否 | — | `'present'::text` | 仅在根在线且完成核验后才标 missing；有效可用性还需联查根状态 |
| <a id="media_files-first_seen_at"></a>`first_seen_at` | `timestamptz` | 否 | — | `now()` | 初次发现时间 |
| <a id="media_files-last_seen_at"></a>`last_seen_at` | `timestamptz` | 否 | — | `now()` | 最近一次扫描发现时间 |
| <a id="media_files-missing_since"></a>`missing_since` | `timestamptz` | 是 | — | — | 文件确认缺失的起始时间 |
| <a id="media_files-probe_status"></a>`probe_status` | `text` | 否 | — | `'pending'::text` | 探测状态，不与在线状态混合 |
| <a id="media_files-probed_content_revision"></a>`probed_content_revision` | `bigint` | 是 | — | — | 本次成功探测对应的内容代数；旧 worker 结果必须按代数 CAS 丢弃 |
| <a id="media_files-probed_at"></a>`probed_at` | `timestamptz` | 是 | — | — | 最近成功探测时间 |
| <a id="media_files-probe_version"></a>`probe_version` | `text` | 是 | — | — | ffprobe 与标准化器版本 |
| <a id="media_files-probe_error_code"></a>`probe_error_code` | `text` | 是 | — | — | 结构化错误码 |
| <a id="media_files-container_format"></a>`container_format` | `text` | 是 | — | — | 探测得到的真实容器格式 |
| <a id="media_files-duration_ms"></a>`duration_ms` | `bigint` | 是 | — | — | 探测得到的真实时长，未知为 NULL |
| <a id="media_files-bitrate_bps"></a>`bitrate_bps` | `bigint` | 是 | — | — | 真实总码率 |
| <a id="media_files-probe_result"></a>`probe_result` | `jsonb` | 是 | — | — | 原始结构化 ffprobe 输出，不保存任意命令文本 |
| <a id="media_files-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="media_files-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="media_files-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 文件管理、导入复核、播放器可用性与媒体信息；关联和路由使用此 ID | 扫描器/ffprobe worker；服务端生成；不要求用户填写 | 建议保留 |
| `root_id` | **拆分重组**：`movie.file_path` | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；识别并登记媒体根，再映射文件的根 UUID | 建议保留 |
| `relative_path` | **拆分重组**：`movie.file_path`、`movie.file_name` | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；识别受控根目录后保留相对路径；文件名可从末段派生，冲突记录报告 | 建议保留 |
| `file_kind` | **方案新增**：无旧字段；按本表设计依据新增 | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；首版已支持的主视频记 video；subtitle/sidecar 枚举是候选，不代表首版实现 NFO | 建议保留 |
| `content_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `size_bytes` | **转换沿用**：`movie.file_size` | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；旧展示字符串有舍入；精确字节数以重新 stat 为准，文件离线进入待处理，不伪造精确值 | 建议保留 |
| `mtime_ns` | **技术新增**：无旧字段；按本表设计依据新增 | 扫描比对文件变化与探测过期判定 | 扫描器/ffprobe worker；重新 stat 获取；离线时不把旧 updated_at 冒认为精确纳秒值 | 建议保留 |
| `fingerprint_algorithm` | **技术新增**：无旧字段；按本表设计依据新增 | 只生成重复候选，不凭抽样指纹自动合并或删除文件 | 扫描器/ffprobe worker；按明确版本算法计算，未计算为 NULL | 待裁剪 |
| `fingerprint` | **技术新增**：无旧字段；按本表设计依据新增 | 只生成重复候选，不凭抽样指纹自动合并或删除文件 | 扫描器/ffprobe worker；按明确版本算法计算，未计算为 NULL | 待裁剪 |
| `availability` | **技术新增**：无旧字段；按本表设计依据新增 | 区分文件缺失和整盘离线；管理端展示异常并避免误清空库 | 扫描器/ffprobe worker；扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing | 建议保留 |
| `first_seen_at` | **技术新增**：无旧字段；按本表设计依据新增 | 区分文件缺失和整盘离线；管理端展示异常并避免误清空库 | 扫描器/ffprobe worker；扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing | 建议保留 |
| `last_seen_at` | **技术新增**：无旧字段；按本表设计依据新增 | 区分文件缺失和整盘离线；管理端展示异常并避免误清空库 | 扫描器/ffprobe worker；扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing | 建议保留 |
| `missing_since` | **技术新增**：无旧字段；按本表设计依据新增 | 区分文件缺失和整盘离线；管理端展示异常并避免误清空库 | 扫描器/ffprobe worker；扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing | 建议保留 |
| `probe_status` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `probed_content_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `probed_at` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `probe_version` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `probe_error_code` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `container_format` | **转换沿用**：`movie.file_format` | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；旧值是扩展名；真实容器格式重新 ffprobe，不能承诺两者完全一致 | 建议保留 |
| `duration_ms` | **转换沿用**：`movie.duration` | 文件管理、导入复核、播放器可用性与媒体信息 | 扫描器/ffprobe worker；旧 HH:mm:ss 转毫秒仅精确到秒；重新探测可得到更准确事实 | 建议保留 |
| `bitrate_bps` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情；没有首版读取需求时保留在原始探测结果即可 | 扫描器/ffprobe worker；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `probe_result` | **技术新增**：无旧字段；按本表设计依据新增 | 导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果 | 扫描器/ffprobe worker；新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描器/ffprobe worker；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 扫描器/ffprobe worker；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 扫描器/ffprobe worker；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_files_availability_check: CHECK ((availability = ANY (ARRAY['present'::text, 'missing'::text])));
media_files_bitrate_bps_check: CHECK ((bitrate_bps >= 0));
media_files_check: CHECK (((probe_status <> 'succeeded'::text) OR ((probed_content_revision IS NOT NULL) AND (probed_content_revision = content_revision))));
media_files_check1: CHECK (((fingerprint IS NULL) = (fingerprint_algorithm IS NULL)));
media_files_check2: CHECK (((availability = 'missing'::text) = (missing_since IS NOT NULL)));
media_files_content_revision_check: CHECK ((content_revision > 0));
media_files_duration_ms_check: CHECK ((duration_ms >= 0));
media_files_file_kind_check: CHECK ((file_kind = ANY (ARRAY['video'::text, 'subtitle'::text, 'sidecar'::text])));
media_files_mtime_ns_check: CHECK ((mtime_ns >= 0));
media_files_probe_result_check: CHECK (((probe_result IS NULL) OR (jsonb_typeof(probe_result) = 'object'::text)));
media_files_probe_status_check: CHECK ((probe_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'running'::text, 'succeeded'::text, 'failed'::text])));
media_files_probed_content_revision_check: CHECK ((probed_content_revision > 0));
media_files_relative_path_check: CHECK (((relative_path <> ''::text) AND (octet_length(relative_path) <= 2048) AND (relative_path !~ '(^/|(^|/)\.\.(/|$))'::text) AND (relative_path !~ '\\'::text)));
media_files_revision_check: CHECK ((revision > 0));
media_files_size_bytes_check: CHECK ((size_bytes >= 0));
media_files_root_id_fkey: FOREIGN KEY (root_id) REFERENCES video_x.storage_roots(id);
media_files_pkey: PRIMARY KEY (id);
media_files_root_id_relative_path_key: UNIQUE (root_id, relative_path);

-- 含主键、唯一约束的支撑索引
CREATE INDEX media_files_fingerprint_idx ON video_x.media_files USING btree (fingerprint_algorithm, fingerprint) WHERE (fingerprint IS NOT NULL)
CREATE UNIQUE INDEX media_files_pkey ON video_x.media_files USING btree (id)
CREATE UNIQUE INDEX media_files_root_id_relative_path_key ON video_x.media_files USING btree (root_id, relative_path)
```

</details>

<a id="media_streams"></a>
## media_streams · 文件内轨道

本表依据：现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_streams-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_streams-file_id"></a>`file_id` | `uuid` | 否 | FK | — | 轨道依附文件探测结果，重探测可事务替换 |
| <a id="media_streams-stream_index"></a>`stream_index` | `integer` | 否 | — | — | ffprobe 轨道索引 |
| <a id="media_streams-kind"></a>`kind` | `text` | 否 | — | — | 轨道类别 |
| <a id="media_streams-codec"></a>`codec` | `text` | 是 | — | — | 真实编码名 |
| <a id="media_streams-language"></a>`language` | `text` | 是 | — | — | 规范语言标签；未知 NULL |
| <a id="media_streams-title"></a>`title` | `text` | 是 | — | — | 轨道名称 |
| <a id="media_streams-is_default"></a>`is_default` | `boolean` | 否 | — | `false` | 容器默认轨道标志 |
| <a id="media_streams-is_forced"></a>`is_forced` | `boolean` | 否 | — | `false` | 强制字幕标志 |
| <a id="media_streams-width"></a>`width` | `integer` | 是 | — | — | 视频宽度 |
| <a id="media_streams-height"></a>`height` | `integer` | 是 | — | — | 视频高度 |
| <a id="media_streams-frame_rate_num"></a>`frame_rate_num` | `integer` | 是 | — | — | 帧率分子 |
| <a id="media_streams-frame_rate_den"></a>`frame_rate_den` | `integer` | 是 | — | — | 帧率分母，保留 24000/1001 之类有理数 |
| <a id="media_streams-channels"></a>`channels` | `smallint` | 是 | — | — | 音频声道数 |
| <a id="media_streams-channel_layout"></a>`channel_layout` | `text` | 是 | — | — | 如 5.1 |
| <a id="media_streams-sample_rate_hz"></a>`sample_rate_hz` | `integer` | 是 | — | — | 音频采样率 |
| <a id="media_streams-color_transfer"></a>`color_transfer` | `text` | 是 | — | — | 如 smpte2084；不直接硬编码 HDR 标签 |
| <a id="media_streams-bit_depth"></a>`bit_depth` | `smallint` | 是 | — | — | 位深 |
| <a id="media_streams-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；关联和路由使用此 ID | ffprobe 标准化器；服务端生成；不要求用户填写 | 建议保留 |
| `file_id` | **方案新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `stream_index` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `kind` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `codec` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `language` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `title` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `is_default` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `is_forced` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `width` | **拆分重组**：`movie.resolution` | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；解析旧宽×高字符串，最终由 ffprobe 视频轨道核验 | 建议保留 |
| `height` | **拆分重组**：`movie.resolution` | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；解析旧宽×高字符串，最终由 ffprobe 视频轨道核验 | 建议保留 |
| `frame_rate_num` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `frame_rate_den` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `channels` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `channel_layout` | **探测新增**：无旧字段；按本表设计依据新增 | 作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留 | ffprobe 标准化器；成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测 | 建议保留 |
| `sample_rate_hz` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `color_transfer` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `bit_depth` | **探测新增**：无旧字段；按本表设计依据新增 | 媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result | ffprobe 标准化器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | ffprobe 标准化器；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_streams_bit_depth_check: CHECK ((bit_depth > 0));
media_streams_channels_check: CHECK ((channels > 0));
media_streams_check: CHECK (((frame_rate_num IS NULL) = (frame_rate_den IS NULL)));
media_streams_frame_rate_den_check: CHECK ((frame_rate_den > 0));
media_streams_frame_rate_num_check: CHECK ((frame_rate_num > 0));
media_streams_height_check: CHECK ((height > 0));
media_streams_kind_check: CHECK ((kind = ANY (ARRAY['video'::text, 'audio'::text, 'subtitle'::text, 'attachment'::text, 'data'::text])));
media_streams_sample_rate_hz_check: CHECK ((sample_rate_hz > 0));
media_streams_stream_index_check: CHECK ((stream_index >= 0));
media_streams_width_check: CHECK ((width > 0));
media_streams_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id) ON DELETE CASCADE;
media_streams_pkey: PRIMARY KEY (id);
media_streams_file_id_stream_index_key: UNIQUE (file_id, stream_index);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX media_streams_file_id_stream_index_key ON video_x.media_streams USING btree (file_id, stream_index)
CREATE UNIQUE INDEX media_streams_pkey ON video_x.media_streams USING btree (id)
```

</details>

<a id="editions"></a>
## editions · 播放版本

本表依据：movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="editions-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="editions-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属可播放作品 |
| <a id="editions-media_kind"></a>`media_kind` | `text` | 否 | FK | — | 类型判别列；组、剧与季无法通过复合外键创建播放版本 |
| <a id="editions-name"></a>`name` | `text` | 否 | — | — | 如 4K 原声版 / 导演剪辑版 |
| <a id="editions-cut"></a>`cut` | `text` | 是 | — | — | 如 theatrical / director，允许来源扩展 |
| <a id="editions-language"></a>`language` | `text` | 是 | — | — | 主要音轨语言标签；具体轨道仍在 media_streams |
| <a id="editions-is_default"></a>`is_default` | `boolean` | 否 | — | `false` | 同一作品最多一个有效默认版本 |
| <a id="editions-notes"></a>`notes` | `text` | 是 | — | — | 版本备注 |
| <a id="editions-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="editions-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="editions-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="editions-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；关联和路由使用此 ID | 导入复核/版本维护/发布事务；服务端生成；不要求用户填写 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段 | 导入复核/版本维护/发布事务；旧普通作品或子集各建默认版本；group 容器不建版本、不假造可播放文件 | 建议保留 |
| `media_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 确保版本归可播放条目，防止作品组、剧或季误绑定直接播放 | 导入复核/版本维护/发布事务；从所属 movie/episode/video 复制判别值；group/show/season 为不可播放容器 | 建议保留 |
| `name` | **方案新增**：无旧字段；按本表设计依据新增 | 播放器和作品详情选择可播放版本 | 导入复核/版本维护/发布事务；旧单文件作品使用“默认版本”；不自动生成导演剪辑/语言版本事实 | 建议保留 |
| `cut` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来多个实际版本的选择；没有真实样例前不强迫用户填写 | 导入复核/版本维护/发布事务；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `language` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来多个实际版本的选择；没有真实样例前不强迫用户填写 | 导入复核/版本维护/发布事务；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `is_default` | **方案新增**：无旧字段；按本表设计依据新增 | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段 | 导入复核/版本维护/发布事务；旧单版本标 true；多版本由复核选择，数据库保证至多一个有效默认 | 建议保留 |
| `notes` | **方案新增**：无旧字段；按本表设计依据新增 | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段 | 导入复核/版本维护/发布事务；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `archived_at` | **技术新增**：无旧字段；按本表设计依据新增 | 归档过滤与恢复，不表示删除磁盘视频 | 导入复核/版本维护/发布事务；默认 NULL；明确归档操作写服务端时间 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 导入复核/版本维护/发布事务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 导入复核/版本维护/发布事务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 导入复核/版本维护/发布事务；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
editions_media_kind_check: CHECK ((media_kind = ANY (ARRAY['movie'::text, 'episode'::text, 'video'::text])));
editions_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 160)));
editions_revision_check: CHECK ((revision > 0));
editions_media_id_media_kind_fkey: FOREIGN KEY (media_id, media_kind) REFERENCES video_x.media_items(id, kind);
editions_pkey: PRIMARY KEY (id);
editions_id_media_id_key: UNIQUE (id, media_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX edition_default_uq ON video_x.editions USING btree (media_id) WHERE (is_default AND (archived_at IS NULL))
CREATE UNIQUE INDEX editions_id_media_id_key ON video_x.editions USING btree (id, media_id)
CREATE INDEX editions_media_idx ON video_x.editions USING btree (media_id)
CREATE UNIQUE INDEX editions_pkey ON video_x.editions USING btree (id)
```

</details>

<a id="edition_parts"></a>
## edition_parts · 版本内有序文件段

本表依据：movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="edition_parts-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="edition_parts-edition_id"></a>`edition_id` | `uuid` | 否 | FK | — | 所属播放版本 |
| <a id="edition_parts-part_no"></a>`part_no` | `integer` | 否 | — | — | CD1/CD2 的顺序，不是分集序号 |
| <a id="edition_parts-file_id"></a>`file_id` | `uuid` | 否 | FK | — | 首版整文件引用，时长从 media_files 读取 |
| <a id="edition_parts-bound_content_revision"></a>`bound_content_revision` | `bigint` | 否 | — | — | 发布时确认的文件内容代数；与当前文件不符时停止续播并要求复核，不能直接套旧断点 |
| <a id="edition_parts-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；关联和路由使用此 ID | 导入复核/版本维护/发布事务；服务端生成；不要求用户填写 | 建议保留 |
| `edition_id` | **方案新增**：无旧字段；按本表设计依据新增 | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段 | 导入复核/版本维护/发布事务；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `part_no` | **方案新增**：无旧字段；按本表设计依据新增 | 一个具体版本内的物理文件顺序；Part1/Part2 作为分集时各有自己的第 1 段 | 导入复核/版本维护/发布事务；每个单文件版本的段序号为 1；只有确实属于同一集/作品的多个物理文件才维护多个段 | 建议保留 |
| `file_id` | **拆分重组**：`movie.file_path` | 作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段 | 导入复核/版本维护/发布事务；映射已登记实际文件的 UUID，普通影片为一个整文件段 | 建议保留 |
| `bound_content_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 文件被替换后阻止直接复用旧播放关系和断点 | 导入复核/版本维护/发布事务；发布或人工重新绑定时写当前 file.content_revision | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 导入复核/版本维护/发布事务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
edition_parts_bound_content_revision_check: CHECK ((bound_content_revision > 0));
edition_parts_part_no_check: CHECK ((part_no > 0));
edition_parts_edition_id_fkey: FOREIGN KEY (edition_id) REFERENCES video_x.editions(id);
edition_parts_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id);
edition_parts_pkey: PRIMARY KEY (id);
edition_parts_edition_id_file_id_key: UNIQUE (edition_id, file_id);
edition_parts_edition_id_part_no_key: UNIQUE (edition_id, part_no) DEFERRABLE;
edition_parts_id_edition_id_key: UNIQUE (id, edition_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX edition_parts_edition_id_file_id_key ON video_x.edition_parts USING btree (edition_id, file_id)
CREATE UNIQUE INDEX edition_parts_edition_id_part_no_key ON video_x.edition_parts USING btree (edition_id, part_no)
CREATE INDEX edition_parts_file_idx ON video_x.edition_parts USING btree (file_id)
CREATE UNIQUE INDEX edition_parts_id_edition_id_key ON video_x.edition_parts USING btree (id, edition_id)
CREATE UNIQUE INDEX edition_parts_pkey ON video_x.edition_parts USING btree (id)
```

</details>

<a id="edition_subtitles"></a>
## edition_subtitles · 版本外挂字幕

本表依据：外挂字幕版本绑定尚无现有实体/业务数据依据。建议：**后置**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="edition_subtitles-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="edition_subtitles-edition_id"></a>`edition_id` | `uuid` | 否 | FK | — | 字幕属于具体版本，避免不同剪辑时间轴混用 |
| <a id="edition_subtitles-file_id"></a>`file_id` | `uuid` | 否 | FK | — | 外挂字幕文件；用例检查 file_kind=subtitle |
| <a id="edition_subtitles-language"></a>`language` | `text` | 是 | — | — | 字幕语言标签 |
| <a id="edition_subtitles-label"></a>`label` | `text` | 是 | — | — | 字幕显示名 |
| <a id="edition_subtitles-is_forced"></a>`is_forced` | `boolean` | 否 | — | `false` | 是否为强制字幕 |
| <a id="edition_subtitles-is_default"></a>`is_default` | `boolean` | 否 | — | `false` | 版本的默认外挂字幕 |
| <a id="edition_subtitles-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现；关联和路由使用此 ID | 未来字幕识别与人工绑定；服务端生成；不要求用户填写 | 后置 |
| `edition_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `file_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `language` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `label` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `is_forced` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `is_default` | **方案新增**：无旧字段；按本表设计依据新增 | 未来播放器字幕选择；首版不强制实现 | 未来字幕识别与人工绑定；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来字幕识别与人工绑定；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |

<details>
<summary>数据库约束与索引</summary>

```sql
edition_subtitles_edition_id_fkey: FOREIGN KEY (edition_id) REFERENCES video_x.editions(id);
edition_subtitles_file_id_fkey: FOREIGN KEY (file_id) REFERENCES video_x.media_files(id);
edition_subtitles_pkey: PRIMARY KEY (id);
edition_subtitles_edition_id_file_id_key: UNIQUE (edition_id, file_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX edition_subtitle_default_uq ON video_x.edition_subtitles USING btree (edition_id) WHERE is_default
CREATE UNIQUE INDEX edition_subtitles_edition_id_file_id_key ON video_x.edition_subtitles USING btree (edition_id, file_id)
CREATE UNIQUE INDEX edition_subtitles_pkey ON video_x.edition_subtitles USING btree (id)
```

</details>
