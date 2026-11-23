# 作品与资料 · 字段与业务依据 v0.5

[阅读指南](field-guide.md) · [模型入口](README.md) · [分域关系图](relationships.md) · [建表 SQL](schema.sql)

更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**

每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](evidence-review.md)。

| 表 | 字段数 | 本表首版建议 | 业务依据 |
| --- | ---: | --- | --- |
| [assets](#assets) · 托管图片资源 | 12 | 建议保留 | movie.cover_image_path、actor.profile_image_path 的资源托管与完整性 |
| [categories](#categories) · 主分类树 | 12 | 建议保留 | category 原有分类树；补充产品已规划的分类整理和并发保护 |
| [catalog_revisions](#catalog_revisions) · 分类树结构版本 | 4 | 建议保留 | category 原有分类树；补充产品已规划的分类整理和并发保护 |
| [media_items](#media_items) · 作品与剧集资料 | 24 | 建议保留 | movie 资料部分；将文件、个人状态和资料分开 |
| [media_identifiers](#media_identifiers) · 作品发行编号 | 7 | 建议保留 | movie.serial_number；编号与平台内部 ID 分开 |
| [media_images](#media_images) · 作品图片用途 | 7 | 建议保留 | movie.cover_image_path；把图片身份和作品用途分开 |
| [people](#people) · 人物资料 | 15 | 建议保留 | actor 的资料身份；沿用 full_name / detailed_name，取消别名能力 |
| [credits](#credits) · 作品演职员关系 | 8 | 建议保留 | movie_actor；extra_info 中的导演，人物与作品的职责关系 |
| [franchises](#franchises) · 作品系列 | 10 | 建议保留 | series、movie.series_id / series_code；增加成员维护与顺序 |
| [franchise_items](#franchise_items) · 系列有序作品 | 6 | 建议保留 | series、movie.series_id / series_code；增加成员维护与顺序 |
| [genres](#genres) · 规范影片类型 | 7 | 后置 | 独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接 |
| [tags](#tags) · 用户与来源标签 | 10 | 建议保留 | tag、movie_tag，保留分类归属、属性组和可见性 |
| [media_genres](#media_genres) · 作品类型关联 | 5 | 后置 | 独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接 |
| [media_tags](#media_tags) · 作品标签关联 | 5 | 建议保留 | tag、movie_tag，保留分类归属、属性组和可见性 |
| [organizations](#organizations) · 片商与发行机构 | 7 | 建议保留 | movie.extra_info 的 makers/studio 片商信息 |
| [media_organizations](#media_organizations) · 作品机构关系 | 6 | 建议保留 | movie.extra_info 的 makers/studio 片商信息 |

<a id="assets"></a>
## assets · 托管图片资源

本表依据：movie.cover_image_path、actor.profile_image_path 的资源托管与完整性。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="assets-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="assets-storage_key"></a>`storage_key` | `text` | 否 | — | — | 受控资源目录内的键，不是任意外部 URL |
| <a id="assets-sha256"></a>`sha256` | `bytea` | 否 | — | — | 内容校验摘要；允许不同处理版本使用相同摘要 |
| <a id="assets-mime_type"></a>`mime_type` | `text` | 否 | — | — | 经过校验的图片 MIME |
| <a id="assets-size_bytes"></a>`size_bytes` | `bigint` | 否 | — | — | 资源精确字节数 |
| <a id="assets-width"></a>`width` | `integer` | 否 | — | — | 像素宽度 |
| <a id="assets-height"></a>`height` | `integer` | 否 | — | — | 像素高度 |
| <a id="assets-state"></a>`state` | `text` | 否 | — | `'pending'::text` | 写入资源存储的状态 |
| <a id="assets-unreferenced_since"></a>`unreferenced_since` | `timestamptz` | 是 | — | — | 无引用宽限期起点；GC 还须重新检查所有引用 |
| <a id="assets-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="assets-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="assets-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品海报、演员头像、系列/收藏夹封面；关联和路由使用此 ID | 图片导入/下载/上传服务；服务端生成；不要求用户填写 | 建议保留 |
| `storage_key` | **拆分重组**：`movie.cover_image_path`、`actor.profile_image_path` | 作品海报、演员头像、系列/收藏夹封面 | 图片导入/下载/上传服务；验证并复制到受控资源目录后生成键，不直接使用任意旧绝对路径 | 建议保留 |
| `sha256` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `mime_type` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `size_bytes` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `width` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `height` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `state` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `unreferenced_since` | **技术新增**：无旧字段；按本表设计依据新增 | 图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能 | 图片导入/下载/上传服务；由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 图片导入/下载/上传服务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 图片导入/下载/上传服务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 图片导入/下载/上传服务；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
assets_height_check: CHECK ((height > 0));
assets_mime_type_check: CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/avif'::text])));
assets_revision_check: CHECK ((revision > 0));
assets_sha256_check: CHECK ((octet_length(sha256) = 32));
assets_size_bytes_check: CHECK ((size_bytes > 0));
assets_state_check: CHECK ((state = ANY (ARRAY['pending'::text, 'ready'::text, 'failed'::text])));
assets_width_check: CHECK ((width > 0));
assets_pkey: PRIMARY KEY (id);
assets_storage_key_key: UNIQUE (storage_key);

-- 含主键、唯一约束的支撑索引
CREATE INDEX assets_checksum_idx ON video_x.assets USING btree (sha256)
CREATE UNIQUE INDEX assets_pkey ON video_x.assets USING btree (id)
CREATE UNIQUE INDEX assets_storage_key_key ON video_x.assets USING btree (storage_key)
```

</details>

<a id="categories"></a>
## categories · 主分类树

本表依据：category 原有分类树；补充产品已规划的分类整理和并发保护。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="categories-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="categories-code"></a>`code` | `text` | 否 | — | — | 全局稳定编码，创建后由用例禁止修改 |
| <a id="categories-name"></a>`name` | `text` | 否 | — | — | 分类展示名 |
| <a id="categories-parent_id"></a>`parent_id` | `uuid` | 是 | FK | — | 父分类；NULL 表示根层 |
| <a id="categories-description"></a>`description` | `text` | 是 | — | — | 分类说明 |
| <a id="categories-position"></a>`position` | `integer` | 否 | — | — | 同级正整数顺序 |
| <a id="categories-is_visible"></a>`is_visible` | `boolean` | 否 | — | `true` | 导航可见性；父隐藏时分支也不在范围选择器出现 |
| <a id="categories-is_system"></a>`is_system` | `boolean` | 否 | — | `false` | 唯一系统未分类，禁止归档和改变身份 |
| <a id="categories-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="categories-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="categories-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="categories-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`category.id` | 观看端分类范围与管理端分类迁移、排序；关联和路由使用此 ID | 分类维护用例/初始化；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `code` | **沿用**：`category.category_code` | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `name` | **沿用**：`category.cat_name` | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `parent_id` | **转换沿用**：`category.parent_category_code` | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；先按旧分类编码定位，再改为新父分类 UUID；检查缺失父节点和环 | 建议保留 |
| `description` | **方案新增**：无旧字段；按本表设计依据新增 | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `position` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端同级分类排序；观看端按此顺序展示 | 分类维护用例/初始化；按迁移报告确认的稳定旧顺序初始化，再允许人工调整 | 建议保留 |
| `is_visible` | **沿用**：`category.is_visible` | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `is_system` | **方案新增**：无旧字段；按本表设计依据新增 | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `archived_at` | **转换沿用**：`category.is_deleted` | 观看端分类范围与管理端分类迁移、排序 | 分类维护用例/初始化；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`category.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 分类维护用例/初始化；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`category.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 分类维护用例/初始化；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 分类维护用例/初始化；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
categories_check: CHECK ((parent_id IS DISTINCT FROM id));
categories_check1: CHECK (((NOT is_system) OR ((code = 'unsorted'::text) AND (parent_id IS NULL) AND (archived_at IS NULL))));
categories_code_check: CHECK ((code ~ '^[a-z][a-z0-9_-]{0,63}$'::text));
categories_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120)));
categories_position_check: CHECK (("position" > 0));
categories_revision_check: CHECK ((revision > 0));
categories_parent_id_fkey: FOREIGN KEY (parent_id) REFERENCES video_x.categories(id);
categories_pkey: PRIMARY KEY (id);
categories_code_key: UNIQUE (code);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX categories_code_key ON video_x.categories USING btree (code)
CREATE INDEX categories_parent_order_idx ON video_x.categories USING btree (parent_id, "position", id) WHERE (archived_at IS NULL)
CREATE UNIQUE INDEX categories_pkey ON video_x.categories USING btree (id)
CREATE UNIQUE INDEX categories_system_uq ON video_x.categories USING btree (is_system) WHERE is_system
```

</details>

<a id="catalog_revisions"></a>
## catalog_revisions · 分类树结构版本

本表依据：category 原有分类树；补充产品已规划的分类整理和并发保护。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="catalog_revisions-singleton"></a>`singleton` | `boolean` | 否 | PK | `true` | 仅允许 true 一行，分类结构变更先锁该行 |
| <a id="catalog_revisions-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="catalog_revisions-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="catalog_revisions-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `singleton` | **技术新增**：无旧字段；按本表设计依据新增 | 分类移动、迁移、排序时锁定树的基线 | 分类维护用例/初始化；初始化写 true，revision 从 1 开始 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 分类维护用例/初始化；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 分类维护用例/初始化；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 分类维护用例/初始化；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
catalog_revisions_revision_check: CHECK ((revision > 0));
catalog_revisions_singleton_check: CHECK (singleton);
catalog_revisions_pkey: PRIMARY KEY (singleton);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX catalog_revisions_pkey ON video_x.catalog_revisions USING btree (singleton)
```

</details>

<a id="media_items"></a>
## media_items · 作品与剧集资料

本表依据：movie 资料部分；将文件、个人状态和资料分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_items-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_items-library_id"></a>`library_id` | `uuid` | 否 | FK | — | 作品只属于一个逻辑库；人物、系列、分类是全局资料 |
| <a id="media_items-kind"></a>`kind` | `text` | 否 | — | — | 电影、通用分集作品组、剧、可选季、集、独立视频；上下部/Part1/Part2 使用 group→episode |
| <a id="media_items-parent_id"></a>`parent_id` | `uuid` | 是 | FK | — | 集可以直接归作品组或剧，也可归可选季；季归剧，不强制设置季 |
| <a id="media_items-parent_kind"></a>`parent_kind` | `text` | 是 | FK | — | 受控父类型判别，用于同库复合外键；group/show/season 均可直接包含集 |
| <a id="media_items-season_number"></a>`season_number` | `smallint` | 是 | — | — | 仅季使用，0 可表示特别篇季 |
| <a id="media_items-episode_number"></a>`episode_number` | `integer` | 是 | — | — | 仅集使用，0 可表示特别集 |
| <a id="media_items-title"></a>`title` | `text` | 否 | — | — | 观看端标题 |
| <a id="media_items-original_title"></a>`original_title` | `text` | 是 | — | — | 原始语言标题 |
| <a id="media_items-sort_title"></a>`sort_title` | `text` | 是 | — | — | 可选排序标题，不作为身份 |
| <a id="media_items-summary"></a>`summary` | `text` | 是 | — | — | 作品简介 |
| <a id="media_items-release_year"></a>`release_year` | `smallint` | 是 | — | — | 仅知年份也可保存 |
| <a id="media_items-release_date"></a>`release_date` | `date` | 是 | — | — | 有完整月日时才保存 |
| <a id="media_items-release_precision"></a>`release_precision` | `text` | 否 | — | `'unknown'::text` | 不以 1 月 1 日填补未知月日 |
| <a id="media_items-declared_runtime_ms"></a>`declared_runtime_ms` | `bigint` | 是 | — | — | 来源宣称时长，和文件探测时长分别保存 |
| <a id="media_items-primary_category_id"></a>`primary_category_id` | `uuid` | 否 | FK | — | 主分类；默认用种子中的未分类 ID |
| <a id="media_items-published_at"></a>`published_at` | `timestamptz` | 是 | — | — | NULL 为管理草稿；发布成功才出现在观看端 |
| <a id="media_items-notes"></a>`notes` | `text` | 是 | — | — | 人工备注；来源刷新不覆盖 |
| <a id="media_items-cover_layout"></a>`cover_layout` | `text` | 否 | — | `'landscape'::text` | 封面展示方向，旧 cover_layout=1→landscape，2→portrait；不等同图片用途或像素尺寸 |
| <a id="media_items-supports_chinese"></a>`supports_chinese` | `boolean` | 是 | — | — | 资料层的中文支持标记；旧 1/0 保留为 true/false，新资料未知 NULL；不等同本地字幕检测结果 |
| <a id="media_items-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="media_items-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="media_items-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="media_items-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`movie.id` | 片库、作品详情、筛选与检索；关联和路由使用此 ID | 人工资料维护/接受来源/导入发布；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `library_id` | **方案新增**：无旧字段；按本表设计依据新增 | 默认逻辑库归属和文件同库校验 | 人工资料维护/接受来源/导入发布；首版旧作品统一映射到明确创建的默认库 | 建议保留 |
| `kind` | **方案新增**：无旧字段；按本表设计依据新增 | 通用 group→episode；未来 show→episode 或 show→season→episode；组/剧/季不直接绑定播放版本 | 人工资料维护/接受来源/导入发布；14 组旧父项→group，已有子项→episode；普通单文件按内容使用 movie/video。未来剧可直接带集，也可带季 | 建议保留 |
| `parent_id` | **拆分重组**：`movie.parent_movie_code` | 作品组详情的选集和下一集；父记录原有文件路径另登记盘点，不自动当作新增集或丢弃 | 人工资料维护/接受来源/导入发布；用户已确认 14 组为上下部/Part 等有序分集：父记录→group，子记录→episode；通过旧父编码建立 parent_id，不造季 | 建议保留 |
| `parent_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 复合外键约束父类型和媒体库；避免把分集挂到错误主体 | 人工资料维护/接受来源/导入发布；从实际父记录 kind 写入 group/show/season，不由客户端随意指定 | 建议保留 |
| `season_number` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来可选季编号；集可以直接挂组/剧，不强制补一季 | 人工资料维护/接受来源/导入发布；当前 group→episode 不生成季号；只有真实 season 行才填写季号 | 后置 |
| `episode_number` | **转换沿用**：`movie.episode_order` | 作品组选集顺序、下一集和续播定位 | 人工资料维护/接受来源/导入发布；沿用子记录顺序，缺失/重复单独报告；第 1/2/3 集不转成版本内文件段 | 建议保留 |
| `title` | **沿用**：`movie.display_name` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `original_title` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测 | 人工资料维护/接受来源/导入发布；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `sort_title` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测 | 人工资料维护/接受来源/导入发布；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `summary` | **沿用**：`movie.movie_desc` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `release_year` | **拆分重组**：`movie.release_date` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日 | 建议保留 |
| `release_date` | **拆分重组**：`movie.release_date` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日 | 建议保留 |
| `release_precision` | **拆分重组**：`movie.release_date` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日 | 建议保留 |
| `declared_runtime_ms` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测 | 人工资料维护/接受来源/导入发布；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `primary_category_id` | **转换沿用**：`movie.category_code` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；通过旧 category_code→新分类 ID 映射；无分类时进入明确的未分类 | 建议保留 |
| `published_at` | **方案新增**：无旧字段；按本表设计依据新增 | 只有发布成功的资料进入观看端；导入半成品留在草稿 | 人工资料维护/接受来源/导入发布；成功迁入的作品写迁移发布时间并注明来源；不伪造旧发布时间 | 建议保留 |
| `notes` | **沿用**：`movie.remark` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `cover_layout` | **转换沿用**：`movie.cover_layout` | Web/Android 作品卡片和详情封面的横竖展示 | 人工资料维护/接受来源/导入发布；1→landscape；2→portrait；其他值报迁移异常，不按图片宽高覆盖人工偏好 | 建议保留 |
| `supports_chinese` | **转换沿用**：`movie.supports_chinese` | 中文支持筛选与资料标记；播放器真实字幕仍读取文件轨道 | 人工资料维护/接受来源/导入发布；1→true，0→false；新资料未知 NULL；保留为资料标记，不宣称本地检测成功 | 建议保留 |
| `archived_at` | **转换沿用**：`movie.is_deleted` | 片库、作品详情、筛选与检索 | 人工资料维护/接受来源/导入发布；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`movie.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工资料维护/接受来源/导入发布；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`movie.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工资料维护/接受来源/导入发布；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人工资料维护/接受来源/导入发布；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_items_check: CHECK ((((kind = ANY (ARRAY['movie'::text, 'group'::text, 'show'::text, 'video'::text])) AND (parent_id IS NULL) AND (parent_kind IS NULL) AND (season_number IS NULL) AND (episode_number IS NULL)) OR ((kind = 'season'::text) AND (parent_id IS NOT NULL) AND (parent_kind IS NOT NULL) AND (parent_kind = 'show'::text) AND (season_number IS NOT NULL) AND (episode_number IS NULL)) OR ((kind = 'episode'::text) AND (parent_id IS NOT NULL) AND (parent_kind IS NOT NULL) AND (parent_kind = ANY (ARRAY['group'::text, 'show'::text, 'season'::text])) AND (episode_number IS NOT NULL) AND (season_number IS NULL))));
media_items_check1: CHECK ((((release_precision = 'unknown'::text) AND (release_year IS NULL) AND (release_date IS NULL)) OR ((release_precision = 'year'::text) AND (release_year IS NOT NULL) AND (release_date IS NULL)) OR ((release_precision = 'day'::text) AND (release_year IS NOT NULL) AND (release_date IS NOT NULL) AND (EXTRACT(year FROM release_date) = (release_year)::numeric))));
media_items_cover_layout_check: CHECK ((cover_layout = ANY (ARRAY['landscape'::text, 'portrait'::text])));
media_items_declared_runtime_ms_check: CHECK ((declared_runtime_ms >= 0));
media_items_episode_number_check: CHECK ((episode_number >= 0));
media_items_kind_check: CHECK ((kind = ANY (ARRAY['movie'::text, 'group'::text, 'show'::text, 'season'::text, 'episode'::text, 'video'::text])));
media_items_release_precision_check: CHECK ((release_precision = ANY (ARRAY['unknown'::text, 'year'::text, 'day'::text])));
media_items_release_year_check: CHECK (((release_year >= 1800) AND (release_year <= 2500)));
media_items_revision_check: CHECK ((revision > 0));
media_items_season_number_check: CHECK ((season_number >= 0));
media_items_title_check: CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 1000)));
media_items_library_id_fkey: FOREIGN KEY (library_id) REFERENCES video_x.libraries(id);
media_items_parent_id_parent_kind_library_id_fkey: FOREIGN KEY (parent_id, parent_kind, library_id) REFERENCES video_x.media_items(id, kind, library_id) DEFERRABLE;
media_items_primary_category_id_fkey: FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id);
media_items_pkey: PRIMARY KEY (id);
media_items_id_kind_key: UNIQUE (id, kind);
media_items_id_kind_library_id_key: UNIQUE (id, kind, library_id);
media_items_parent_id_episode_number_key: UNIQUE (parent_id, episode_number) DEFERRABLE;
media_items_parent_id_season_number_key: UNIQUE (parent_id, season_number) DEFERRABLE;

-- 含主键、唯一约束的支撑索引
CREATE INDEX media_items_browse_idx ON video_x.media_items USING btree (library_id, primary_category_id, published_at DESC, id) WHERE ((published_at IS NOT NULL) AND (archived_at IS NULL))
CREATE UNIQUE INDEX media_items_id_kind_key ON video_x.media_items USING btree (id, kind)
CREATE UNIQUE INDEX media_items_id_kind_library_id_key ON video_x.media_items USING btree (id, kind, library_id)
CREATE UNIQUE INDEX media_items_parent_id_episode_number_key ON video_x.media_items USING btree (parent_id, episode_number)
CREATE UNIQUE INDEX media_items_parent_id_season_number_key ON video_x.media_items USING btree (parent_id, season_number)
CREATE INDEX media_items_parent_idx ON video_x.media_items USING btree (parent_id)
CREATE UNIQUE INDEX media_items_pkey ON video_x.media_items USING btree (id)
```

</details>

<a id="media_identifiers"></a>
## media_identifiers · 作品发行编号

本表依据：movie.serial_number；编号与平台内部 ID 分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_identifiers-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_identifiers-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属作品 |
| <a id="media_identifiers-scheme"></a>`scheme` | `text` | 否 | — | — | 编号命名空间，如 catalog-number / imdb；采用白名单契约 |
| <a id="media_identifiers-value"></a>`value` | `text` | 否 | — | — | 展示值 |
| <a id="media_identifiers-normalized_value"></a>`normalized_value` | `text` | 否 | — | — | 按 scheme 规范化后的值 |
| <a id="media_identifiers-is_primary"></a>`is_primary` | `boolean` | 否 | — | `false` | 当前 scheme 的主要展示编号 |
| <a id="media_identifiers-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配；关联和路由使用此 ID | 导入匹配/来源解析/人工编号维护；服务端生成；不要求用户填写 | 建议保留 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配 | 导入匹配/来源解析/人工编号维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `scheme` | **方案新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配 | 导入匹配/来源解析/人工编号维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `value` | **方案新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配 | 导入匹配/来源解析/人工编号维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `normalized_value` | **方案新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配 | 导入匹配/来源解析/人工编号维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `is_primary` | **方案新增**：无旧字段；按本表设计依据新增 | 编号展示、搜索与候选匹配 | 导入匹配/来源解析/人工编号维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 导入匹配/来源解析/人工编号维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_identifiers_normalized_value_check: CHECK ((length(normalized_value) > 0));
media_identifiers_value_check: CHECK ((length(btrim(value)) > 0));
media_identifiers_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_identifiers_pkey: PRIMARY KEY (id);
media_identifiers_media_id_scheme_normalized_value_key: UNIQUE (media_id, scheme, normalized_value);

-- 含主键、唯一约束的支撑索引
CREATE INDEX media_identifier_lookup_idx ON video_x.media_identifiers USING btree (scheme, normalized_value)
CREATE UNIQUE INDEX media_identifier_primary_uq ON video_x.media_identifiers USING btree (media_id, scheme) WHERE is_primary
CREATE UNIQUE INDEX media_identifiers_media_id_scheme_normalized_value_key ON video_x.media_identifiers USING btree (media_id, scheme, normalized_value)
CREATE UNIQUE INDEX media_identifiers_pkey ON video_x.media_identifiers USING btree (id)
```

</details>

<a id="media_images"></a>
## media_images · 作品图片用途

本表依据：movie.cover_image_path；把图片身份和作品用途分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_images-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_images-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属作品 |
| <a id="media_images-asset_id"></a>`asset_id` | `uuid` | 否 | FK | — | 受控图片资源 |
| <a id="media_images-purpose"></a>`purpose` | `text` | 否 | — | — | 海报、背景、剧照 |
| <a id="media_images-position"></a>`position` | `integer` | 否 | — | — | 各用途内的顺序；首项为默认展示 |
| <a id="media_images-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留标记，不被来源撤回时清除 |
| <a id="media_images-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品卡片、详情海报；背景与剧照按来源能力开放；关联和路由使用此 ID | 图片维护/接受来源/发布事务；服务端生成；不要求用户填写 | 建议保留 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 作品卡片、详情海报；背景与剧照按来源能力开放 | 图片维护/接受来源/发布事务；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `asset_id` | **拆分重组**：`movie.cover_image_path` | 作品卡片、详情海报；背景与剧照按来源能力开放 | 图片维护/接受来源/发布事务；先完成图片托管再关联到作品 | 建议保留 |
| `purpose` | **方案新增**：无旧字段；按本表设计依据新增 | 作品卡片、详情海报；背景与剧照按来源能力开放 | 图片维护/接受来源/发布事务；旧封面映射 poster；backdrop/still 仅来源实际提供时启用 | 建议保留 |
| `position` | **方案新增**：无旧字段；按本表设计依据新增 | 作品卡片、详情海报；背景与剧照按来源能力开放 | 图片维护/接受来源/发布事务；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 图片维护/接受来源/发布事务；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 图片维护/接受来源/发布事务；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_images_position_check: CHECK (("position" > 0));
media_images_purpose_check: CHECK ((purpose = ANY (ARRAY['poster'::text, 'backdrop'::text, 'still'::text])));
media_images_asset_id_fkey: FOREIGN KEY (asset_id) REFERENCES video_x.assets(id);
media_images_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_images_pkey: PRIMARY KEY (id);
media_images_media_id_asset_id_purpose_key: UNIQUE (media_id, asset_id, purpose);
media_images_media_id_purpose_position_key: UNIQUE (media_id, purpose, "position") DEFERRABLE;

-- 含主键、唯一约束的支撑索引
CREATE INDEX media_images_asset_idx ON video_x.media_images USING btree (asset_id)
CREATE UNIQUE INDEX media_images_media_id_asset_id_purpose_key ON video_x.media_images USING btree (media_id, asset_id, purpose)
CREATE UNIQUE INDEX media_images_media_id_purpose_position_key ON video_x.media_images USING btree (media_id, purpose, "position")
CREATE UNIQUE INDEX media_images_pkey ON video_x.media_images USING btree (id)
```

</details>

<a id="people"></a>
## people · 人物资料

本表依据：actor 的资料身份；沿用 full_name / detailed_name，取消别名能力。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="people-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="people-full_name"></a>`full_name` | `text` | 否 | — | — | 人物常用名称，沿用 actor.full_name；不唯一，不作为合并依据 |
| <a id="people-detailed_name"></a>`detailed_name` | `text` | 是 | — | — | 人物详细名称，沿用 actor.detailed_name 原文；用于副标题、详情和检索，不按别名拆分 |
| <a id="people-sort_name"></a>`sort_name` | `text` | 是 | — | — | 排序名称 |
| <a id="people-biography"></a>`biography` | `text` | 是 | — | — | 人物简介 |
| <a id="people-gender"></a>`gender` | `text` | 否 | — | `'unknown'::text` | 未知可用，来源值需显式映射 |
| <a id="people-birth_date"></a>`birth_date` | `date` | 是 | — | — | 来源确认的出生日期，未知 NULL |
| <a id="people-portrait_asset_id"></a>`portrait_asset_id` | `uuid` | 是 | FK | — | 人物头像 |
| <a id="people-primary_category_id"></a>`primary_category_id` | `uuid` | 否 | FK | — | 人物资料主归属，不限制参演作品范围 |
| <a id="people-merged_into_id"></a>`merged_into_id` | `uuid` | 是 | FK | — | 合并目标；保留源记录实现旧链接解析 |
| <a id="people-merged_at"></a>`merged_at` | `timestamptz` | 是 | — | — | 合并完成时间 |
| <a id="people-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="people-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="people-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="people-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`actor.id` | 演员列表、演员详情、参演作品、姓名检索；关联和路由使用此 ID | 人物维护/人物补全/接受来源；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `full_name` | **沿用**：`actor.full_name` | 演员卡片主标题、作品演员区与常用名称检索 | 人物维护/人物补全/接受来源；原文保留为常用名；新姓名不唯一，不能据此合并 | 建议保留 |
| `detailed_name` | **沿用**：`actor.detailed_name` | 演员详情和资料维护副名称；full_name 与 detailed_name 均参与检索 | 人物维护/人物补全/接受来源；按原文迁移，不拆成 alias；未知 NULL | 建议保留 |
| `sort_name` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准 | 人物维护/人物补全/接受来源；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `biography` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准 | 人物维护/人物补全/接受来源；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `gender` | **转换沿用**：`actor.gender` | 演员列表、演员详情、参演作品、姓名检索 | 人物维护/人物补全/接受来源；核对旧枚举含义后映射；无法确认则 unknown | 建议保留 |
| `birth_date` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准 | 人物维护/人物补全/接受来源；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `portrait_asset_id` | **拆分重组**：`actor.profile_image_path` | 演员列表、演员详情、参演作品、姓名检索 | 人物维护/人物补全/接受来源；导入头像资源并映射 asset ID；缺失记录异常 | 建议保留 |
| `primary_category_id` | **转换沿用**：`actor.category` | 演员列表、演员详情、参演作品、姓名检索 | 人物维护/人物补全/接受来源；核对旧分类编码后映射；不限制参演影片的分类 | 建议保留 |
| `merged_into_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端合并重复人物与旧链接跳转；合并不同姓名时由用户选保留全名和详细名，不自动生成别名 | 人物维护/人物补全/接受来源；默认 NULL；仅明确合并成功后记录 | 建议保留 |
| `merged_at` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端合并重复人物与旧链接跳转；合并不同姓名时由用户选保留全名和详细名，不自动生成别名 | 人物维护/人物补全/接受来源；默认 NULL；仅明确合并成功后记录 | 建议保留 |
| `archived_at` | **转换沿用**：`actor.is_deleted` | 演员列表、演员详情、参演作品、姓名检索 | 人物维护/人物补全/接受来源；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`actor.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人物维护/人物补全/接受来源；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`actor.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人物维护/人物补全/接受来源；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人物维护/人物补全/接受来源；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
people_check: CHECK ((merged_into_id IS DISTINCT FROM id));
people_check1: CHECK (((merged_into_id IS NULL) = (merged_at IS NULL)));
people_full_name_check: CHECK (((length(btrim(full_name)) >= 1) AND (length(btrim(full_name)) <= 300)));
people_gender_check: CHECK ((gender = ANY (ARRAY['unknown'::text, 'female'::text, 'male'::text, 'other'::text])));
people_revision_check: CHECK ((revision > 0));
people_merged_into_id_fkey: FOREIGN KEY (merged_into_id) REFERENCES video_x.people(id);
people_portrait_asset_id_fkey: FOREIGN KEY (portrait_asset_id) REFERENCES video_x.assets(id);
people_primary_category_id_fkey: FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id);
people_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX people_category_idx ON video_x.people USING btree (primary_category_id, full_name, id) WHERE ((archived_at IS NULL) AND (merged_into_id IS NULL))
CREATE UNIQUE INDEX people_pkey ON video_x.people USING btree (id)
CREATE INDEX people_portrait_idx ON video_x.people USING btree (portrait_asset_id) WHERE (portrait_asset_id IS NOT NULL)
```

</details>

<a id="credits"></a>
## credits · 作品演职员关系

本表依据：movie_actor；extra_info 中的导演，人物与作品的职责关系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="credits-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="credits-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 参演或参与制作的作品 |
| <a id="credits-person_id"></a>`person_id` | `uuid` | 否 | FK | — | 同一人可同时是演员和导演 |
| <a id="credits-job"></a>`job` | `text` | 否 | — | — | 演职员职责；演员列表筛选 actor |
| <a id="credits-character_names"></a>`character_names` | `text[]` | 否 | — | `'{}'::text[]` | 同一人物同一职责可有多个角色名，避免重复计算参演作品 |
| <a id="credits-position"></a>`position` | `integer` | 否 | — | `0` | 当前作品内的展示顺序；同位以 ID 稳定排序 |
| <a id="credits-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留的关系 |
| <a id="credits-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`movie_actor.id` | 演员下的影片、作品演员区与导演信息；关联和路由使用此 ID | 导入发布/演职员维护/人物合并；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `media_id` | **拆分重组**：`movie_actor.movie_id`、`movie.extra_info` | 演员下的影片、作品演员区与导演信息 | 导入发布/演职员维护/人物合并；演员关系按旧作品映射；导演从结构化 extra_info 解析 | 建议保留 |
| `person_id` | **拆分重组**：`movie_actor.actor_id`、`movie.extra_info` | 演员下的影片、作品演员区与导演信息 | 导入发布/演职员维护/人物合并；演员用旧 actor ID 映射；导演不按同名静默并入演员身份 | 建议保留 |
| `job` | **拆分重组**：`movie_actor`、`movie.extra_info.type` | 演员下的影片、作品演员区与导演信息 | 导入发布/演职员维护/人物合并；movie_actor→actor；directors/director→director；writer/producer 是后置枚举 | 建议保留 |
| `character_names` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来适配器明确返回角色名时才启用；首版只展示参演关系和职责 | 导入发布/演职员维护/人物合并；首版不填充、不要求前端录入；启用对应功能前再确定契约 | 后置 |
| `position` | **方案新增**：无旧字段；按本表设计依据新增 | 作品详情演员区与管理端演职员排序 | 导入发布/演职员维护/人物合并；旧库无人工顺序：采用迁移报告确认的稳定顺序，来源提供或人工调整后写入 | 建议保留 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 导入发布/演职员维护/人物合并；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 建议保留 |
| `created_at` | **转换沿用**：`movie_actor.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 导入发布/演职员维护/人物合并；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
credits_job_check: CHECK ((job = ANY (ARRAY['actor'::text, 'director'::text, 'writer'::text, 'producer'::text, 'other'::text])));
credits_position_check: CHECK (("position" >= 0));
credits_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
credits_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
credits_pkey: PRIMARY KEY (id);
credits_media_id_person_id_job_key: UNIQUE (media_id, person_id, job);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX credits_media_id_person_id_job_key ON video_x.credits USING btree (media_id, person_id, job)
CREATE INDEX credits_media_order_idx ON video_x.credits USING btree (media_id, "position", id)
CREATE INDEX credits_person_media_idx ON video_x.credits USING btree (person_id, job, media_id)
CREATE UNIQUE INDEX credits_pkey ON video_x.credits USING btree (id)
```

</details>

<a id="franchises"></a>
## franchises · 作品系列

本表依据：series、movie.series_id / series_code；增加成员维护与顺序。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="franchises-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="franchises-name"></a>`name` | `text` | 否 | — | — | 如海岸来信；不等同 show/season |
| <a id="franchises-description"></a>`description` | `text` | 是 | — | — | 系列简介 |
| <a id="franchises-primary_category_id"></a>`primary_category_id` | `uuid` | 否 | FK | — | 主分类 |
| <a id="franchises-cover_asset_id"></a>`cover_asset_id` | `uuid` | 是 | FK | — | 手工封面资源 |
| <a id="franchises-cover_media_id"></a>`cover_media_id` | `uuid` | 是 | FK | — | 借用成员作品海报；用例校验该作品属于本系列 |
| <a id="franchises-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="franchises-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="franchises-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="franchises-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`series.id` | 系列详情、系列下影片、管理端系列整理；关联和路由使用此 ID | 系列资料/成员维护/导入发布；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `name` | **沿用**：`series.series_name` | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `description` | **方案新增**：无旧字段；按本表设计依据新增 | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `primary_category_id` | **转换沿用**：`series.category` | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；校验旧分类编码并映射为 ID | 建议保留 |
| `cover_asset_id` | **方案新增**：无旧字段；按本表设计依据新增 | 系列详情封面；手工图与借用成员海报二选一 | 系列资料/成员维护/导入发布；旧无此值时 NULL，按产品约定回退到成员海报，不复制或编造旧封面 | 建议保留 |
| `cover_media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 系列详情封面；手工图与借用成员海报二选一 | 系列资料/成员维护/导入发布；旧无此值时 NULL，按产品约定回退到成员海报，不复制或编造旧封面 | 建议保留 |
| `archived_at` | **转换沿用**：`series.is_deleted` | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`series.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 系列资料/成员维护/导入发布；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`series.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 系列资料/成员维护/导入发布；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 系列资料/成员维护/导入发布；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
franchises_check: CHECK ((num_nonnulls(cover_asset_id, cover_media_id) <= 1));
franchises_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 300)));
franchises_revision_check: CHECK ((revision > 0));
franchises_cover_asset_id_fkey: FOREIGN KEY (cover_asset_id) REFERENCES video_x.assets(id);
franchises_cover_media_id_fkey: FOREIGN KEY (cover_media_id) REFERENCES video_x.media_items(id);
franchises_primary_category_id_fkey: FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id);
franchises_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX franchises_category_idx ON video_x.franchises USING btree (primary_category_id, name, id) WHERE (archived_at IS NULL)
CREATE UNIQUE INDEX franchises_pkey ON video_x.franchises USING btree (id)
```

</details>

<a id="franchise_items"></a>
## franchise_items · 系列有序作品

本表依据：series、movie.series_id / series_code；增加成员维护与顺序。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="franchise_items-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="franchise_items-franchise_id"></a>`franchise_id` | `uuid` | 否 | FK | — | 所属系列 |
| <a id="franchise_items-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 系列成员作品；可跨分类和逻辑库 |
| <a id="franchise_items-position"></a>`position` | `integer` | 否 | — | — | 保存的系列顺序 |
| <a id="franchise_items-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留的成员 |
| <a id="franchise_items-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 系列详情、系列下影片、管理端系列整理；关联和路由使用此 ID | 系列资料/成员维护/导入发布；服务端生成；不要求用户填写 | 建议保留 |
| `franchise_id` | **拆分重组**：`movie.series_id`、`movie.series_code` | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；验证两旧字段一致后映射 series→franchises；冲突进入迁移报告 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；映射有系列归属的旧作品；多系列归属是新增能力 | 建议保留 |
| `position` | **方案新增**：无旧字段；按本表设计依据新增 | 系列详情、系列下影片、管理端系列整理 | 系列资料/成员维护/导入发布；旧库无人工系列顺序，按明确迁移排序规则初始化并报告，之后允许人工整理 | 建议保留 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 系列资料/成员维护/导入发布；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 系列资料/成员维护/导入发布；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
franchise_items_position_check: CHECK (("position" > 0));
franchise_items_franchise_id_fkey: FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id);
franchise_items_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
franchise_items_pkey: PRIMARY KEY (id);
franchise_items_franchise_id_media_id_key: UNIQUE (franchise_id, media_id);
franchise_items_franchise_id_position_key: UNIQUE (franchise_id, "position") DEFERRABLE;

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX franchise_items_franchise_id_media_id_key ON video_x.franchise_items USING btree (franchise_id, media_id)
CREATE UNIQUE INDEX franchise_items_franchise_id_position_key ON video_x.franchise_items USING btree (franchise_id, "position")
CREATE INDEX franchise_items_media_idx ON video_x.franchise_items USING btree (media_id)
CREATE UNIQUE INDEX franchise_items_pkey ON video_x.franchise_items USING btree (id)
```

</details>

<a id="genres"></a>
## genres · 规范影片类型

本表依据：独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接。建议：**后置**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="genres-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="genres-name"></a>`name` | `text` | 否 | — | — | 显示名称 |
| <a id="genres-normalized_name"></a>`normalized_name` | `text` | 否 | — | — | 应用按统一规则规范化名称，归档后仍保留身份 |
| <a id="genres-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="genres-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="genres-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="genres-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID | 未来来源词汇映射/类型维护；服务端生成；不要求用户填写 | 后置 |
| `name` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `normalized_name` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `archived_at` | **技术新增**：无旧字段；按本表设计依据新增 | 归档过滤与恢复，不表示删除磁盘视频 | 未来来源词汇映射/类型维护；默认 NULL；明确归档操作写服务端时间 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来来源词汇映射/类型维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来来源词汇映射/类型维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 未来来源词汇映射/类型维护；从 1 开始，更新触发器递增；旧库无对应并发版本 | 后置 |

<details>
<summary>数据库约束与索引</summary>

```sql
genres_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120)));
genres_normalized_name_check: CHECK ((length(normalized_name) > 0));
genres_revision_check: CHECK ((revision > 0));
genres_pkey: PRIMARY KEY (id);
genres_normalized_name_key: UNIQUE (normalized_name);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX genres_normalized_name_key ON video_x.genres USING btree (normalized_name)
CREATE UNIQUE INDEX genres_pkey ON video_x.genres USING btree (id)
```

</details>

<a id="tags"></a>
## tags · 用户与来源标签

本表依据：tag、movie_tag，保留分类归属、属性组和可见性。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="tags-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="tags-name"></a>`name` | `text` | 否 | — | — | 显示名称 |
| <a id="tags-normalized_name"></a>`normalized_name` | `text` | 否 | — | — | 规范化名称，仅在同一分类与属性组内用于重名校验；不按全库同名静默合并 |
| <a id="tags-primary_category_id"></a>`primary_category_id` | `uuid` | 否 | FK | — | 标签所属分类，沿用 tag.category 的分类编码映射 |
| <a id="tags-attribute_group"></a>`attribute_group` | `text` | 否 | — | `'other'::text` | 标签属性分组，沿用 tag.attr_value；如 theme/role/clothing，首版沿用既有分组码 |
| <a id="tags-is_visible"></a>`is_visible` | `boolean` | 否 | — | `true` | 标签选择器与导航中的显示开关，沿用 tag.is_visible；隐藏不归档、不删除已有作品关联 |
| <a id="tags-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="tags-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="tags-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="tags-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`tag.id` | 作品筛选、资料标签选择器与分组维护；关联和路由使用此 ID | 标签维护/导入发布/接受来源；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `name` | **沿用**：`tag.tag_name` | 作品筛选、资料标签选择器与分组维护 | 标签维护/导入发布/接受来源；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `normalized_name` | **转换沿用**：`tag.tag_name` | 作品筛选、资料标签选择器与分组维护 | 标签维护/导入发布/接受来源；用于匹配的规范化派生值，不修改原显示名；不同分类/属性组的同名标签不合并 | 建议保留 |
| `primary_category_id` | **转换沿用**：`tag.category` | 标签维护与标签选择器按分类显示 | 标签维护/导入发布/接受来源；旧分类编码→新分类 ID | 建议保留 |
| `attribute_group` | **沿用**：`tag.attr_value` | 按主题、角色、服装等属性分组维护和选择标签 | 标签维护/导入发布/接受来源；沿用现有分组码，不自动拆为类型、机构或角色实体 | 建议保留 |
| `is_visible` | **转换沿用**：`tag.is_visible` | 新选择时隐藏该标签；既有作品详情仍可展示已关联标签，不等同归档 | 标签维护/导入发布/接受来源；1→true，0→false；隐藏保留已有关系 | 建议保留 |
| `archived_at` | **转换沿用**：`tag.is_deleted` | 作品筛选、资料标签选择器与分组维护 | 标签维护/导入发布/接受来源；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`tag.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 标签维护/导入发布/接受来源；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`tag.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 标签维护/导入发布/接受来源；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 标签维护/导入发布/接受来源；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
tags_attribute_group_check: CHECK ((length(btrim(attribute_group)) > 0));
tags_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120)));
tags_normalized_name_check: CHECK ((length(normalized_name) > 0));
tags_revision_check: CHECK ((revision > 0));
tags_primary_category_id_fkey: FOREIGN KEY (primary_category_id) REFERENCES video_x.categories(id);
tags_pkey: PRIMARY KEY (id);
tags_primary_category_id_attribute_group_normalized_name_key: UNIQUE (primary_category_id, attribute_group, normalized_name);

-- 含主键、唯一约束的支撑索引
CREATE INDEX tags_group_idx ON video_x.tags USING btree (primary_category_id, attribute_group, name, id) WHERE (archived_at IS NULL)
CREATE UNIQUE INDEX tags_pkey ON video_x.tags USING btree (id)
CREATE UNIQUE INDEX tags_primary_category_id_attribute_group_normalized_name_key ON video_x.tags USING btree (primary_category_id, attribute_group, normalized_name)
```

</details>

<a id="media_genres"></a>
## media_genres · 作品类型关联

本表依据：独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接。建议：**后置**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_genres-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_genres-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属作品 |
| <a id="media_genres-genre_id"></a>`genre_id` | `uuid` | 否 | FK | — | 类型或标签 |
| <a id="media_genres-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留的关系，不被来源刷新覆盖 |
| <a id="media_genres-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID | 未来来源词汇映射/类型维护；服务端生成；不要求用户填写 | 后置 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `genre_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 未来来源词汇映射/类型维护；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来来源词汇映射/类型维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_genres_genre_id_fkey: FOREIGN KEY (genre_id) REFERENCES video_x.genres(id);
media_genres_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_genres_pkey: PRIMARY KEY (id);
media_genres_media_id_genre_id_key: UNIQUE (media_id, genre_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX media_genres_media_id_genre_id_key ON video_x.media_genres USING btree (media_id, genre_id)
CREATE UNIQUE INDEX media_genres_pkey ON video_x.media_genres USING btree (id)
CREATE INDEX media_genres_reverse_idx ON video_x.media_genres USING btree (genre_id, media_id)
```

</details>

<a id="media_tags"></a>
## media_tags · 作品标签关联

本表依据：tag、movie_tag，保留分类归属、属性组和可见性。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_tags-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_tags-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属作品 |
| <a id="media_tags-tag_id"></a>`tag_id` | `uuid` | 否 | FK | — | 类型或标签 |
| <a id="media_tags-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留的关系，不被来源刷新覆盖 |
| <a id="media_tags-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`movie_tag.id` | 作品筛选、资料标签选择器与分组维护；关联和路由使用此 ID | 标签维护/导入发布/接受来源；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `media_id` | **转换沿用**：`movie_tag.movie_id` | 作品筛选、资料标签选择器与分组维护 | 标签维护/导入发布/接受来源；通过旧 movie ID 映射为新作品 UUID | 建议保留 |
| `tag_id` | **转换沿用**：`movie_tag.tag_id` | 作品筛选、资料标签选择器与分组维护 | 标签维护/导入发布/接受来源；通过旧 tag ID 映射为新标签 UUID；不按同名乱合并 | 建议保留 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 标签维护/导入发布/接受来源；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 建议保留 |
| `created_at` | **转换沿用**：`movie_tag.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 标签维护/导入发布/接受来源；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_tags_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_tags_tag_id_fkey: FOREIGN KEY (tag_id) REFERENCES video_x.tags(id);
media_tags_pkey: PRIMARY KEY (id);
media_tags_media_id_tag_id_key: UNIQUE (media_id, tag_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX media_tags_media_id_tag_id_key ON video_x.media_tags USING btree (media_id, tag_id)
CREATE UNIQUE INDEX media_tags_pkey ON video_x.media_tags USING btree (id)
CREATE INDEX media_tags_reverse_idx ON video_x.media_tags USING btree (tag_id, media_id)
```

</details>

<a id="organizations"></a>
## organizations · 片商与发行机构

本表依据：movie.extra_info 的 makers/studio 片商信息。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="organizations-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="organizations-name"></a>`name` | `text` | 否 | — | — | 机构名称，不按名字自动合并 |
| <a id="organizations-description"></a>`description` | `text` | 是 | — | — | 机构说明 |
| <a id="organizations-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="organizations-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="organizations-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="organizations-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品资料中的片商，不增加独立机构管理产品模块；关联和路由使用此 ID | 两代 extra_info 迁移/来源解析/人工复核；服务端生成；不要求用户填写 | 建议保留 |
| `name` | **拆分重组**：`movie.extra_info.name` | 作品资料中的片商，不增加独立机构管理产品模块 | 两代 extra_info 迁移/来源解析/人工复核；只取 makers/studio 片商项，保留类型与 code 的原始迁移归档 | 建议保留 |
| `description` | **方案新增**：无旧字段；按本表设计依据新增 | 作品资料中的片商，不增加独立机构管理产品模块 | 两代 extra_info 迁移/来源解析/人工复核；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `archived_at` | **技术新增**：无旧字段；按本表设计依据新增 | 归档过滤与恢复，不表示删除磁盘视频 | 两代 extra_info 迁移/来源解析/人工复核；默认 NULL；明确归档操作写服务端时间 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 两代 extra_info 迁移/来源解析/人工复核；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 两代 extra_info 迁移/来源解析/人工复核；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 两代 extra_info 迁移/来源解析/人工复核；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
organizations_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 300)));
organizations_revision_check: CHECK ((revision > 0));
organizations_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX organizations_pkey ON video_x.organizations USING btree (id)
```

</details>

<a id="media_organizations"></a>
## media_organizations · 作品机构关系

本表依据：movie.extra_info 的 makers/studio 片商信息。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_organizations-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="media_organizations-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 所属作品 |
| <a id="media_organizations-organization_id"></a>`organization_id` | `uuid` | 否 | FK | — | 片商或发行机构 |
| <a id="media_organizations-role"></a>`role` | `text` | 否 | — | — | 制作片商、发行、品牌 |
| <a id="media_organizations-is_manual"></a>`is_manual` | `boolean` | 否 | — | `false` | 人工保留标记 |
| <a id="media_organizations-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 作品资料中的片商，不增加独立机构管理产品模块；关联和路由使用此 ID | 两代 extra_info 迁移/来源解析/人工复核；服务端生成；不要求用户填写 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 作品资料中的片商，不增加独立机构管理产品模块 | 两代 extra_info 迁移/来源解析/人工复核；关联存在片商资料的作品 | 建议保留 |
| `organization_id` | **拆分重组**：`movie.extra_info.code`、`movie.extra_info.name` | 作品资料中的片商，不增加独立机构管理产品模块 | 两代 extra_info 迁移/来源解析/人工复核；依据来源身份复用机构，不能仅按名字静默合并 | 建议保留 |
| `role` | **转换沿用**：`movie.extra_info.type` | 作品资料中的片商，不增加独立机构管理产品模块 | 两代 extra_info 迁移/来源解析/人工复核；makers/studio→studio；publisher/label 作为后置枚举 | 建议保留 |
| `is_manual` | **方案新增**：无旧字段；按本表设计依据新增 | 人工保留的关联在来源刷新时继续存在 | 两代 extra_info 迁移/来源解析/人工复核；明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 两代 extra_info 迁移/来源解析/人工复核；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_organizations_role_check: CHECK ((role = ANY (ARRAY['studio'::text, 'publisher'::text, 'label'::text])));
media_organizations_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_organizations_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES video_x.organizations(id);
media_organizations_pkey: PRIMARY KEY (id);
media_organizations_media_id_organization_id_role_key: UNIQUE (media_id, organization_id, role);

-- 含主键、唯一约束的支撑索引
CREATE INDEX media_org_reverse_idx ON video_x.media_organizations USING btree (organization_id, media_id)
CREATE UNIQUE INDEX media_organizations_media_id_organization_id_role_key ON video_x.media_organizations USING btree (media_id, organization_id, role)
CREATE UNIQUE INDEX media_organizations_pkey ON video_x.media_organizations USING btree (id)
```

</details>
