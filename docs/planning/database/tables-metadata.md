# 来源、字段维护与差异 · 字段与业务依据 v0.5

[阅读指南](field-guide.md) · [模型入口](README.md) · [分域关系图](relationships.md) · [建表 SQL](schema.sql)

更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**

每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](evidence-review.md)。

| 表 | 字段数 | 本表首版建议 | 业务依据 |
| --- | ---: | --- | --- |
| [providers](#providers) · 资料来源注册 | 9 | 建议保留 | 现有 JavService / HavtwService；用户明确要求可扩展抓取来源 |
| [provider_configs](#provider_configs) · 来源运行配置 | 8 | 建议保留 | 现有 JavService / HavtwService；用户明确要求可扩展抓取来源 |
| [source_records](#source_records) · 尚未或已经入库的来源身份 | 9 | 建议保留 | 抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞 |
| [provider_media](#provider_media) · 来源作品映射 | 4 | 建议保留 | 抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞 |
| [provider_people](#provider_people) · 来源人物映射 | 4 | 建议保留 | 抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞 |
| [provider_franchises](#provider_franchises) · 来源系列映射 | 4 | 建议保留 | 抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞 |
| [metadata_snapshots](#metadata_snapshots) · 不可变来源快照 | 8 | 建议保留 | 旧任务结果承载抓取资料；新增不可变结构化快照 |
| [metadata_ratings](#metadata_ratings) · 网站评分 | 9 | 后置 | 现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分 |
| [media_field_state](#media_field_state) · 作品字段来源与锁定 | 9 | 建议保留 | 管理端人工维护与来源刷新共存；旧库没有字段锁定表 |
| [person_field_state](#person_field_state) · 人物字段来源与锁定 | 9 | 建议保留 | 管理端人工维护与来源刷新共存；旧库没有字段锁定表 |
| [franchise_field_state](#franchise_field_state) · 系列字段来源与锁定 | 9 | 建议保留 | 管理端人工维护与来源刷新共存；旧库没有字段锁定表 |
| [relationship_sources](#relationship_sources) · 关联关系的来源依据 | 11 | 待裁剪 | 多来源关系刷新不能误删人工关系；关系级追溯是设计新增 |
| [source_value_mappings](#source_value_mappings) · 来源类型与标签归一 | 9 | 后置 | 独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接 |
| [metadata_change_sets](#metadata_change_sets) · 待接受的资料差异 | 13 | 建议保留 | 用户要求改进录入/资料维护；先预览再接受来源结果 |

<a id="providers"></a>
## providers · 资料来源注册

本表依据：现有 JavService / HavtwService；用户明确要求可扩展抓取来源。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="providers-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="providers-code"></a>`code` | `text` | 否 | — | — | 稳定适配器 ID，如 javdb / nfo |
| <a id="providers-name"></a>`name` | `text` | 否 | — | — | 用户可读来源名称 |
| <a id="providers-kind"></a>`kind` | `text` | 否 | — | — | 在线来源或本地旁车解析器 |
| <a id="providers-adapter_version"></a>`adapter_version` | `text` | 否 | — | — | 已安装适配器版本 |
| <a id="providers-capabilities"></a>`capabilities` | `text[]` | 否 | — | `'{}'::text[]` | 已安装适配器声明的能力快照，代码注册表仍为执行依据 |
| <a id="providers-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="providers-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="providers-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断；关联和路由使用此 ID | 启动注册/来源设置；服务端生成；不要求用户填写 | 建议保留 |
| `code` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；适配器启动注册 code、名称、版本、能力；只有实现的能力才声明 | 建议保留 |
| `name` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；适配器启动注册 code、名称、版本、能力；只有实现的能力才声明 | 建议保留 |
| `kind` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；已有两个来源登记 remote；local/NFO 为后置能力，不登记未实现来源 | 建议保留 |
| `adapter_version` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；适配器启动注册 code、名称、版本、能力；只有实现的能力才声明 | 建议保留 |
| `capabilities` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；适配器启动注册 code、名称、版本、能力；只有实现的能力才声明 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 启动注册/来源设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 启动注册/来源设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 启动注册/来源设置；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
providers_code_check: CHECK ((code ~ '^[a-z][a-z0-9_-]{0,63}$'::text));
providers_kind_check: CHECK ((kind = ANY (ARRAY['remote'::text, 'local'::text])));
providers_revision_check: CHECK ((revision > 0));
providers_pkey: PRIMARY KEY (id);
providers_code_key: UNIQUE (code);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX providers_code_key ON video_x.providers USING btree (code)
CREATE UNIQUE INDEX providers_pkey ON video_x.providers USING btree (id)
```

</details>

<a id="provider_configs"></a>
## provider_configs · 来源运行配置

本表依据：现有 JavService / HavtwService；用户明确要求可扩展抓取来源。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="provider_configs-provider_id"></a>`provider_id` | `uuid` | 否 | PK/FK | — | 首版每个来源一份运行配置 |
| <a id="provider_configs-enabled"></a>`enabled` | `boolean` | 否 | — | `true` | 是否启用来源 |
| <a id="provider_configs-settings"></a>`settings` | `jsonb` | 否 | — | `'{}'::jsonb` | 按适配器 schema 校验的非敏感配置，不放 Cookie |
| <a id="provider_configs-credential_ref"></a>`credential_ref` | `text` | 是 | — | — | 凭据存储引用，不是凭据正文 |
| <a id="provider_configs-outbound_policy"></a>`outbound_policy` | `jsonb` | 否 | — | `'{}'::jsonb` | 受控代理引用、域名规则、并发和超时；平台代码设上限 |
| <a id="provider_configs-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="provider_configs-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="provider_configs-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `provider_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `enabled` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端来源开关、凭据引用和外网抓取诊断 | 启动注册/来源设置；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `settings` | **技术新增**：无旧字段；按本表设计依据新增 | 来源设置、抓取登录和外网出站诊断，不为观看端开放凭据 | 启动注册/来源设置；从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置 | 建议保留 |
| `credential_ref` | **技术新增**：无旧字段；按本表设计依据新增 | 来源设置、抓取登录和外网出站诊断，不为观看端开放凭据 | 启动注册/来源设置；从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置 | 建议保留 |
| `outbound_policy` | **技术新增**：无旧字段；按本表设计依据新增 | 来源设置、抓取登录和外网出站诊断，不为观看端开放凭据 | 启动注册/来源设置；从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 启动注册/来源设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 启动注册/来源设置；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 启动注册/来源设置；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
provider_configs_outbound_policy_check: CHECK ((jsonb_typeof(outbound_policy) = 'object'::text));
provider_configs_revision_check: CHECK ((revision > 0));
provider_configs_settings_check: CHECK ((jsonb_typeof(settings) = 'object'::text));
provider_configs_provider_id_fkey: FOREIGN KEY (provider_id) REFERENCES video_x.providers(id);
provider_configs_pkey: PRIMARY KEY (provider_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX provider_configs_pkey ON video_x.provider_configs USING btree (provider_id)
```

</details>

<a id="source_records"></a>
## source_records · 尚未或已经入库的来源身份

本表依据：抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="source_records-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="source_records-provider_id"></a>`provider_id` | `uuid` | 否 | FK | — | 来源命名空间 |
| <a id="source_records-entity_kind"></a>`entity_kind` | `text` | 否 | — | — | 同站作品 ID 和人物 ID 不共享身份空间 |
| <a id="source_records-external_id"></a>`external_id` | `text` | 否 | — | — | 来源内部稳定 ID；NFO 使用受控 sidecar file UUID 字符串 |
| <a id="source_records-source_url"></a>`source_url` | `text` | 是 | — | — | 用于审阅的规范来源 URL，禁止包含凭据 |
| <a id="source_records-local_file_id"></a>`local_file_id` | `uuid` | 是 | FK | — | 仅本地来源使用，指向 NFO 等受控旁车文件 |
| <a id="source_records-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="source_records-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="source_records-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯；关联和路由使用此 ID | 来源适配器/候选匹配/人工接受；服务端生成；不要求用户填写 | 建议保留 |
| `provider_id` | **方案新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `entity_kind` | **方案新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `external_id` | **拆分重组**：`actor.actor_code`、`series.series_code`、`movie.extra_info.code` | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；仅当确认是来源页面身份才映射；作品来源 ID 从实际抓取页提取，不能把 movie_code 当作 JavDB ID | 建议保留 |
| `source_url` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端跳转来源与抓取诊断 | 来源适配器/候选匹配/人工接受；适配器写入实际来源详情页 URL；不伪造地址 | 建议保留 |
| `local_file_id` | **待定扩展**：无旧字段；按本表设计依据新增 | 未来本地来源的身份绑定；首版远程来源保持 NULL | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器/候选匹配/人工接受；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器/候选匹配/人工接受；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 来源适配器/候选匹配/人工接受；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
source_records_entity_kind_check: CHECK ((entity_kind = ANY (ARRAY['media'::text, 'person'::text, 'franchise'::text])));
source_records_external_id_check: CHECK ((length(btrim(external_id)) > 0));
source_records_revision_check: CHECK ((revision > 0));
source_records_local_file_id_fkey: FOREIGN KEY (local_file_id) REFERENCES video_x.media_files(id);
source_records_provider_id_fkey: FOREIGN KEY (provider_id) REFERENCES video_x.providers(id);
source_records_pkey: PRIMARY KEY (id);
source_records_id_entity_kind_key: UNIQUE (id, entity_kind);
source_records_provider_id_entity_kind_external_id_key: UNIQUE (provider_id, entity_kind, external_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX source_records_id_entity_kind_key ON video_x.source_records USING btree (id, entity_kind)
CREATE UNIQUE INDEX source_records_pkey ON video_x.source_records USING btree (id)
CREATE UNIQUE INDEX source_records_provider_id_entity_kind_external_id_key ON video_x.source_records USING btree (provider_id, entity_kind, external_id)
```

</details>

<a id="provider_media"></a>
## provider_media · 来源作品映射

本表依据：抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="provider_media-source_record_id"></a>`source_record_id` | `uuid` | 否 | PK/FK | — | 每个来源身份至多映射一个平台实体 |
| <a id="provider_media-entity_kind"></a>`entity_kind` | `text` | 否 | FK | `'media'::text` | 固定类型判别，防止把人物来源误连到作品 |
| <a id="provider_media-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 平台实体，允许多个来源身份指向同一实体 |
| <a id="provider_media-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `entity_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 固定判别列，防止把人物来源链接到作品或系列 | 来源适配器/候选匹配/人工接受；按表固定写 media/person/franchise，不能由用户自由选 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器/候选匹配/人工接受；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
provider_media_entity_kind_check: CHECK ((entity_kind = 'media'::text));
provider_media_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
provider_media_source_record_id_entity_kind_fkey: FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind);
provider_media_pkey: PRIMARY KEY (source_record_id);
provider_media_source_record_id_media_id_key: UNIQUE (source_record_id, media_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX provider_media_pkey ON video_x.provider_media USING btree (source_record_id)
CREATE UNIQUE INDEX provider_media_source_record_id_media_id_key ON video_x.provider_media USING btree (source_record_id, media_id)
CREATE INDEX provider_media_target_idx ON video_x.provider_media USING btree (media_id)
```

</details>

<a id="provider_people"></a>
## provider_people · 来源人物映射

本表依据：抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="provider_people-source_record_id"></a>`source_record_id` | `uuid` | 否 | PK/FK | — | 每个来源身份至多映射一个平台实体 |
| <a id="provider_people-entity_kind"></a>`entity_kind` | `text` | 否 | FK | `'person'::text` | 固定类型判别，防止把人物来源误连到作品 |
| <a id="provider_people-person_id"></a>`person_id` | `uuid` | 否 | FK | — | 平台实体，允许多个来源身份指向同一实体 |
| <a id="provider_people-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `entity_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 固定判别列，防止把人物来源链接到作品或系列 | 来源适配器/候选匹配/人工接受；按表固定写 media/person/franchise，不能由用户自由选 | 建议保留 |
| `person_id` | **拆分重组**：`actor.id` | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器/候选匹配/人工接受；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
provider_people_entity_kind_check: CHECK ((entity_kind = 'person'::text));
provider_people_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
provider_people_source_record_id_entity_kind_fkey: FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind);
provider_people_pkey: PRIMARY KEY (source_record_id);
provider_people_source_record_id_person_id_key: UNIQUE (source_record_id, person_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX provider_people_pkey ON video_x.provider_people USING btree (source_record_id)
CREATE UNIQUE INDEX provider_people_source_record_id_person_id_key ON video_x.provider_people USING btree (source_record_id, person_id)
CREATE INDEX provider_people_target_idx ON video_x.provider_people USING btree (person_id)
```

</details>

<a id="provider_franchises"></a>
## provider_franchises · 来源系列映射

本表依据：抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="provider_franchises-source_record_id"></a>`source_record_id` | `uuid` | 否 | PK/FK | — | 每个来源身份至多映射一个平台实体 |
| <a id="provider_franchises-entity_kind"></a>`entity_kind` | `text` | 否 | FK | `'franchise'::text` | 固定类型判别，防止把人物来源误连到作品 |
| <a id="provider_franchises-franchise_id"></a>`franchise_id` | `uuid` | 否 | FK | — | 平台实体，允许多个来源身份指向同一实体 |
| <a id="provider_franchises-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `entity_kind` | **技术新增**：无旧字段；按本表设计依据新增 | 固定判别列，防止把人物来源链接到作品或系列 | 来源适配器/候选匹配/人工接受；按表固定写 media/person/franchise，不能由用户自由选 | 建议保留 |
| `franchise_id` | **拆分重组**：`series.id` | 录入候选、再次刷新定位、人物与系列的来源追溯 | 来源适配器/候选匹配/人工接受；来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器/候选匹配/人工接受；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
provider_franchises_entity_kind_check: CHECK ((entity_kind = 'franchise'::text));
provider_franchises_franchise_id_fkey: FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id);
provider_franchises_source_record_id_entity_kind_fkey: FOREIGN KEY (source_record_id, entity_kind) REFERENCES video_x.source_records(id, entity_kind);
provider_franchises_pkey: PRIMARY KEY (source_record_id);
provider_franchises_source_record_id_franchise_id_key: UNIQUE (source_record_id, franchise_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX provider_franchises_pkey ON video_x.provider_franchises USING btree (source_record_id)
CREATE UNIQUE INDEX provider_franchises_source_record_id_franchise_id_key ON video_x.provider_franchises USING btree (source_record_id, franchise_id)
CREATE INDEX provider_franchises_target_idx ON video_x.provider_franchises USING btree (franchise_id)
```

</details>

<a id="metadata_snapshots"></a>
## metadata_snapshots · 不可变来源快照

本表依据：旧任务结果承载抓取资料；新增不可变结构化快照。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="metadata_snapshots-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="metadata_snapshots-source_record_id"></a>`source_record_id` | `uuid` | 否 | FK | — | 可在发布实体之前存在，支持导入候选 |
| <a id="metadata_snapshots-adapter_version"></a>`adapter_version` | `text` | 否 | — | — | 本次解析代码版本 |
| <a id="metadata_snapshots-schema_version"></a>`schema_version` | `integer` | 否 | — | — | 标准化提案的版本 |
| <a id="metadata_snapshots-fetched_at"></a>`fetched_at` | `timestamptz` | 否 | — | `now()` | 抓取或读取时间 |
| <a id="metadata_snapshots-content_sha256"></a>`content_sha256` | `bytea` | 否 | — | — | 标准化内容摘要 |
| <a id="metadata_snapshots-payload"></a>`payload` | `jsonb` | 否 | — | — | 结构化来源结果，保留未知字段；不保存 Cookie 或授权页正文 |
| <a id="metadata_snapshots-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定；关联和路由使用此 ID | 来源适配器；服务端生成；不要求用户填写 | 建议保留 |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定 | 来源适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `adapter_version` | **方案新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定 | 来源适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `schema_version` | **方案新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定 | 来源适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `fetched_at` | **方案新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定 | 来源适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `content_sha256` | **方案新增**：无旧字段；按本表设计依据新增 | 导入预览、来源刷新差异、失败排查；保留策略待确定 | 来源适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `payload` | **方案新增**：无旧字段；按本表设计依据新增 | 新导入候选预览和来源刷新差异，不存 Cookie/授权页面或旧任务快照 | 来源适配器；仅新抓取成功后保存规范化 payload；旧影片 extra_info 仍按资料迁移，不读取旧任务结果 JSON | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源适配器；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
metadata_snapshots_content_sha256_check: CHECK ((octet_length(content_sha256) = 32));
metadata_snapshots_payload_check: CHECK ((jsonb_typeof(payload) = 'object'::text));
metadata_snapshots_schema_version_check: CHECK ((schema_version > 0));
metadata_snapshots_source_record_id_fkey: FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id);
metadata_snapshots_pkey: PRIMARY KEY (id);
metadata_snapshots_id_source_record_id_key: UNIQUE (id, source_record_id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX metadata_snapshot_latest_idx ON video_x.metadata_snapshots USING btree (source_record_id, fetched_at DESC, id)
CREATE UNIQUE INDEX metadata_snapshots_id_source_record_id_key ON video_x.metadata_snapshots USING btree (id, source_record_id)
CREATE UNIQUE INDEX metadata_snapshots_pkey ON video_x.metadata_snapshots USING btree (id)
```

</details>

<a id="metadata_ratings"></a>
## metadata_ratings · 网站评分

本表依据：现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分。建议：**后置**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="metadata_ratings-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="metadata_ratings-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 评分对应作品 |
| <a id="metadata_ratings-source_record_id"></a>`source_record_id` | `uuid` | 否 | FK | — | 来源作品身份，用例检查已映射到当前作品 |
| <a id="metadata_ratings-snapshot_id"></a>`snapshot_id` | `uuid` | 否 | FK | — | 提供评分的来源快照 |
| <a id="metadata_ratings-rating_kind"></a>`rating_kind` | `text` | 否 | — | `'audience'::text` | 例如 audience / critic |
| <a id="metadata_ratings-value"></a>`value` | `numeric(8,3)` | 否 | — | — | 来源原始评分 |
| <a id="metadata_ratings-scale_max"></a>`scale_max` | `numeric(8,3)` | 否 | — | — | 来源满分，例如 10 或 100 |
| <a id="metadata_ratings-vote_count"></a>`vote_count` | `bigint` | 是 | — | — | 投票数，未知 NULL |
| <a id="metadata_ratings-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表；关联和路由使用此 ID | 未来支持评分的适配器；服务端生成；不要求用户填写 | 后置 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `rating_kind` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `value` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `scale_max` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `vote_count` | **方案新增**：无旧字段；按本表设计依据新增 | 未来网站评分展示；首版个人评分不依赖本表 | 未来支持评分的适配器；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来支持评分的适配器；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |

<details>
<summary>数据库约束与索引</summary>

```sql
metadata_ratings_check: CHECK ((value <= scale_max));
metadata_ratings_scale_max_check: CHECK ((scale_max > (0)::numeric));
metadata_ratings_value_check: CHECK ((value >= (0)::numeric));
metadata_ratings_vote_count_check: CHECK ((vote_count >= 0));
metadata_ratings_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
metadata_ratings_snapshot_id_source_record_id_fkey: FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id);
metadata_ratings_source_record_id_fkey: FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id);
metadata_ratings_source_record_id_media_id_fkey: FOREIGN KEY (source_record_id, media_id) REFERENCES video_x.provider_media(source_record_id, media_id);
metadata_ratings_pkey: PRIMARY KEY (id);
metadata_ratings_media_id_source_record_id_rating_kind_key: UNIQUE (media_id, source_record_id, rating_kind);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX metadata_ratings_media_id_source_record_id_rating_kind_key ON video_x.metadata_ratings USING btree (media_id, source_record_id, rating_kind)
CREATE UNIQUE INDEX metadata_ratings_pkey ON video_x.metadata_ratings USING btree (id)
```

</details>

<a id="media_field_state"></a>
## media_field_state · 作品字段来源与锁定

本表依据：管理端人工维护与来源刷新共存；旧库没有字段锁定表。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="media_field_state-media_id"></a>`media_id` | `uuid` | 否 | PK/FK | — | 对应有效实体 |
| <a id="media_field_state-field_key"></a>`field_key` | `text` | 否 | PK | — | 契约白名单；复合字段如 release 一次提交 |
| <a id="media_field_state-override_value"></a>`override_value` | `jsonb` | 是 | — | — | SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本 |
| <a id="media_field_state-is_locked"></a>`is_locked` | `boolean` | 否 | — | `false` | 逐字段或整组关联锁定；集合锁定后来源不改变当前成员 |
| <a id="media_field_state-accepted_snapshot_id"></a>`accepted_snapshot_id` | `uuid` | 是 | FK | — | 最近被接受并实际生效的来源；人工字段可为 NULL |
| <a id="media_field_state-edited_by"></a>`edited_by` | `uuid` | 是 | FK | — | 人工编辑或接受来源的账号 |
| <a id="media_field_state-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="media_field_state-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="media_field_state-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪 | 人工字段维护/接受来源差异；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `field_key` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `override_value` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `is_locked` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `accepted_snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `edited_by` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人工字段维护/接受来源差异；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
media_field_state_check: CHECK (((override_value IS NULL) OR is_locked));
media_field_state_field_key_check: CHECK ((field_key = ANY (ARRAY['title'::text, 'original_title'::text, 'summary'::text, 'release'::text, 'declared_runtime_ms'::text, 'primary_category_id'::text, 'cover_layout'::text, 'supports_chinese'::text, 'credits'::text, 'genres'::text, 'tags'::text, 'franchises'::text, 'organizations'::text, 'images'::text])));
media_field_state_revision_check: CHECK ((revision > 0));
media_field_state_accepted_snapshot_id_fkey: FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id);
media_field_state_edited_by_fkey: FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id);
media_field_state_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
media_field_state_pkey: PRIMARY KEY (media_id, field_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX media_field_state_pkey ON video_x.media_field_state USING btree (media_id, field_key)
```

</details>

<a id="person_field_state"></a>
## person_field_state · 人物字段来源与锁定

本表依据：管理端人工维护与来源刷新共存；旧库没有字段锁定表。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="person_field_state-person_id"></a>`person_id` | `uuid` | 否 | PK/FK | — | 对应有效实体 |
| <a id="person_field_state-field_key"></a>`field_key` | `text` | 否 | PK | — | 契约白名单；复合字段如 release 一次提交 |
| <a id="person_field_state-override_value"></a>`override_value` | `jsonb` | 是 | — | — | SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本 |
| <a id="person_field_state-is_locked"></a>`is_locked` | `boolean` | 否 | — | `false` | 逐字段或整组关联锁定；集合锁定后来源不改变当前成员 |
| <a id="person_field_state-accepted_snapshot_id"></a>`accepted_snapshot_id` | `uuid` | 是 | FK | — | 最近被接受并实际生效的来源；人工字段可为 NULL |
| <a id="person_field_state-edited_by"></a>`edited_by` | `uuid` | 是 | FK | — | 人工编辑或接受来源的账号 |
| <a id="person_field_state-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="person_field_state-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="person_field_state-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `person_id` | **方案新增**：无旧字段；按本表设计依据新增 | 资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪 | 人工字段维护/接受来源差异；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `field_key` | **方案新增**：无旧字段；按本表设计依据新增 | 只接受 full_name/detailed_name 等白名单；无 aliases。生日/简介等后置字段首版 API 不开放 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `override_value` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `is_locked` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `accepted_snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `edited_by` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人工字段维护/接受来源差异；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
person_field_state_check: CHECK (((override_value IS NULL) OR is_locked));
person_field_state_field_key_check: CHECK ((field_key = ANY (ARRAY['full_name'::text, 'detailed_name'::text, 'biography'::text, 'gender'::text, 'birth_date'::text, 'portrait_asset_id'::text, 'primary_category_id'::text])));
person_field_state_revision_check: CHECK ((revision > 0));
person_field_state_accepted_snapshot_id_fkey: FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id);
person_field_state_edited_by_fkey: FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id);
person_field_state_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
person_field_state_pkey: PRIMARY KEY (person_id, field_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX person_field_state_pkey ON video_x.person_field_state USING btree (person_id, field_key)
```

</details>

<a id="franchise_field_state"></a>
## franchise_field_state · 系列字段来源与锁定

本表依据：管理端人工维护与来源刷新共存；旧库没有字段锁定表。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="franchise_field_state-franchise_id"></a>`franchise_id` | `uuid` | 否 | PK/FK | — | 对应有效实体 |
| <a id="franchise_field_state-field_key"></a>`field_key` | `text` | 否 | PK | — | 契约白名单；复合字段如 release 一次提交 |
| <a id="franchise_field_state-override_value"></a>`override_value` | `jsonb` | 是 | — | — | SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本 |
| <a id="franchise_field_state-is_locked"></a>`is_locked` | `boolean` | 否 | — | `false` | 逐字段或整组关联锁定；集合锁定后来源不改变当前成员 |
| <a id="franchise_field_state-accepted_snapshot_id"></a>`accepted_snapshot_id` | `uuid` | 是 | FK | — | 最近被接受并实际生效的来源；人工字段可为 NULL |
| <a id="franchise_field_state-edited_by"></a>`edited_by` | `uuid` | 是 | FK | — | 人工编辑或接受来源的账号 |
| <a id="franchise_field_state-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="franchise_field_state-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="franchise_field_state-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `franchise_id` | **方案新增**：无旧字段；按本表设计依据新增 | 资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪 | 人工字段维护/接受来源差异；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `field_key` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `override_value` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `is_locked` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `accepted_snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `edited_by` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值 | 人工字段维护/接受来源差异；新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人工字段维护/接受来源差异；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人工字段维护/接受来源差异；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
franchise_field_state_check: CHECK (((override_value IS NULL) OR is_locked));
franchise_field_state_field_key_check: CHECK ((field_key = ANY (ARRAY['name'::text, 'description'::text, 'primary_category_id'::text, 'cover'::text, 'items'::text])));
franchise_field_state_revision_check: CHECK ((revision > 0));
franchise_field_state_accepted_snapshot_id_fkey: FOREIGN KEY (accepted_snapshot_id) REFERENCES video_x.metadata_snapshots(id);
franchise_field_state_edited_by_fkey: FOREIGN KEY (edited_by) REFERENCES video_x.accounts(id);
franchise_field_state_franchise_id_fkey: FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id);
franchise_field_state_pkey: PRIMARY KEY (franchise_id, field_key);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX franchise_field_state_pkey ON video_x.franchise_field_state USING btree (franchise_id, field_key)
```

</details>

<a id="relationship_sources"></a>
## relationship_sources · 关联关系的来源依据

本表依据：多来源关系刷新不能误删人工关系；关系级追溯是设计新增。建议：**待裁剪**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="relationship_sources-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="relationship_sources-source_record_id"></a>`source_record_id` | `uuid` | 否 | FK | — | 声明该关系的来源主体，来源刷新只能撤回自己的声明 |
| <a id="relationship_sources-snapshot_id"></a>`snapshot_id` | `uuid` | 否 | FK | — | 最近支持这条关系的来源快照 |
| <a id="relationship_sources-credit_id"></a>`credit_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-genre_link_id"></a>`genre_link_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-tag_link_id"></a>`tag_link_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-franchise_item_id"></a>`franchise_item_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-organization_link_id"></a>`organization_link_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-image_link_id"></a>`image_link_id` | `uuid` | 是 | FK | — | 目标关系，六个显式外键中恰好一个非空 |
| <a id="relationship_sources-attributes"></a>`attributes` | `jsonb` | 否 | — | `'{}'::jsonb` | 来源自己的角色名等属性；合并有效关系时保留依据 |
| <a id="relationship_sources-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；关联和路由使用此 ID | 接受来源关系差异/人工关系维护；服务端生成；不要求用户填写 | 待裁剪 |
| `source_record_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `credit_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `genre_link_id` | **待定扩展**：无旧字段；按本表设计依据新增 | 随独立 genre 域后置；首版不得产生此类关系依据 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `tag_link_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `franchise_item_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `organization_link_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `image_link_id` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `attributes` | **方案新增**：无旧字段；按本表设计依据新增 | 刷新关系差异与管理详情；首版可评审是否需要全部关系粒度 | 接受来源关系差异/人工关系维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 待裁剪 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 接受来源关系差异/人工关系维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 待裁剪 |

<details>
<summary>数据库约束与索引</summary>

```sql
relationship_sources_attributes_check: CHECK ((jsonb_typeof(attributes) = 'object'::text));
relationship_sources_check: CHECK ((num_nonnulls(credit_id, genre_link_id, tag_link_id, franchise_item_id, organization_link_id, image_link_id) = 1));
relationship_sources_credit_id_fkey: FOREIGN KEY (credit_id) REFERENCES video_x.credits(id) ON DELETE CASCADE;
relationship_sources_franchise_item_id_fkey: FOREIGN KEY (franchise_item_id) REFERENCES video_x.franchise_items(id) ON DELETE CASCADE;
relationship_sources_genre_link_id_fkey: FOREIGN KEY (genre_link_id) REFERENCES video_x.media_genres(id) ON DELETE CASCADE;
relationship_sources_image_link_id_fkey: FOREIGN KEY (image_link_id) REFERENCES video_x.media_images(id) ON DELETE CASCADE;
relationship_sources_organization_link_id_fkey: FOREIGN KEY (organization_link_id) REFERENCES video_x.media_organizations(id) ON DELETE CASCADE;
relationship_sources_snapshot_id_source_record_id_fkey: FOREIGN KEY (snapshot_id, source_record_id) REFERENCES video_x.metadata_snapshots(id, source_record_id);
relationship_sources_source_record_id_fkey: FOREIGN KEY (source_record_id) REFERENCES video_x.source_records(id);
relationship_sources_tag_link_id_fkey: FOREIGN KEY (tag_link_id) REFERENCES video_x.media_tags(id) ON DELETE CASCADE;
relationship_sources_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX relation_source_credit_id_uq ON video_x.relationship_sources USING btree (source_record_id, credit_id) WHERE (credit_id IS NOT NULL)
CREATE UNIQUE INDEX relation_source_franchise_item_id_uq ON video_x.relationship_sources USING btree (source_record_id, franchise_item_id) WHERE (franchise_item_id IS NOT NULL)
CREATE UNIQUE INDEX relation_source_genre_link_id_uq ON video_x.relationship_sources USING btree (source_record_id, genre_link_id) WHERE (genre_link_id IS NOT NULL)
CREATE UNIQUE INDEX relation_source_image_link_id_uq ON video_x.relationship_sources USING btree (source_record_id, image_link_id) WHERE (image_link_id IS NOT NULL)
CREATE UNIQUE INDEX relation_source_organization_link_id_uq ON video_x.relationship_sources USING btree (source_record_id, organization_link_id) WHERE (organization_link_id IS NOT NULL)
CREATE UNIQUE INDEX relation_source_tag_link_id_uq ON video_x.relationship_sources USING btree (source_record_id, tag_link_id) WHERE (tag_link_id IS NOT NULL)
CREATE UNIQUE INDEX relationship_sources_pkey ON video_x.relationship_sources USING btree (id)
```

</details>

<a id="source_value_mappings"></a>
## source_value_mappings · 来源类型与标签归一

本表依据：独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接。建议：**后置**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="source_value_mappings-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="source_value_mappings-provider_id"></a>`provider_id` | `uuid` | 否 | FK | — | 来源命名空间 |
| <a id="source_value_mappings-source_field"></a>`source_field` | `text` | 否 | — | — | 来源词汇类别 |
| <a id="source_value_mappings-source_value"></a>`source_value` | `text` | 否 | — | — | 经约定规范化的来源原词 |
| <a id="source_value_mappings-genre_id"></a>`genre_id` | `uuid` | 是 | FK | — | 规范类型目标 |
| <a id="source_value_mappings-tag_id"></a>`tag_id` | `uuid` | 是 | FK | — | 规范标签目标 |
| <a id="source_value_mappings-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="source_value_mappings-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="source_value_mappings-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID | 未来来源词汇映射/类型维护；服务端生成；不要求用户填写 | 后置 |
| `provider_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `source_field` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `source_value` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `genre_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `tag_id` | **方案新增**：无旧字段；按本表设计依据新增 | 未来类型筛选；首版不自动将旧标签拆成 genre | 未来来源词汇映射/类型维护；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 后置 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来来源词汇映射/类型维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 未来来源词汇映射/类型维护；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 后置 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 未来来源词汇映射/类型维护；从 1 开始，更新触发器递增；旧库无对应并发版本 | 后置 |

<details>
<summary>数据库约束与索引</summary>

```sql
source_value_mappings_check: CHECK ((((source_field = 'genre'::text) AND (genre_id IS NOT NULL) AND (tag_id IS NULL)) OR ((source_field = 'tag'::text) AND (tag_id IS NOT NULL) AND (genre_id IS NULL))));
source_value_mappings_revision_check: CHECK ((revision > 0));
source_value_mappings_source_field_check: CHECK ((source_field = ANY (ARRAY['genre'::text, 'tag'::text])));
source_value_mappings_source_value_check: CHECK ((length(source_value) > 0));
source_value_mappings_genre_id_fkey: FOREIGN KEY (genre_id) REFERENCES video_x.genres(id);
source_value_mappings_provider_id_fkey: FOREIGN KEY (provider_id) REFERENCES video_x.providers(id);
source_value_mappings_tag_id_fkey: FOREIGN KEY (tag_id) REFERENCES video_x.tags(id);
source_value_mappings_pkey: PRIMARY KEY (id);
source_value_mappings_provider_id_source_field_source_value_key: UNIQUE (provider_id, source_field, source_value);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX source_value_mappings_pkey ON video_x.source_value_mappings USING btree (id)
CREATE UNIQUE INDEX source_value_mappings_provider_id_source_field_source_value_key ON video_x.source_value_mappings USING btree (provider_id, source_field, source_value)
```

</details>

<a id="metadata_change_sets"></a>
## metadata_change_sets · 待接受的资料差异

本表依据：用户要求改进录入/资料维护；先预览再接受来源结果。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="metadata_change_sets-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="metadata_change_sets-snapshot_id"></a>`snapshot_id` | `uuid` | 否 | FK | — | 来源快照 |
| <a id="metadata_change_sets-media_id"></a>`media_id` | `uuid` | 是 | FK | — | 目标作品 |
| <a id="metadata_change_sets-person_id"></a>`person_id` | `uuid` | 是 | FK | — | 目标人物 |
| <a id="metadata_change_sets-franchise_id"></a>`franchise_id` | `uuid` | 是 | FK | — | 目标系列 |
| <a id="metadata_change_sets-base_revision"></a>`base_revision` | `bigint` | 否 | — | — | 生成差异时的聚合版本，接受前重新比较 |
| <a id="metadata_change_sets-patch"></a>`patch` | `jsonb` | 否 | — | — | 白名单字段与关联变更提案；这是暂存命令，不是有效资料关系 |
| <a id="metadata_change_sets-status"></a>`status` | `text` | 否 | — | `'pending'::text` | 差异处理状态 |
| <a id="metadata_change_sets-decided_by"></a>`decided_by` | `uuid` | 是 | FK | — | 接受或拒绝账号 |
| <a id="metadata_change_sets-decided_at"></a>`decided_at` | `timestamptz` | 是 | — | — | 决定时间 |
| <a id="metadata_change_sets-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="metadata_change_sets-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="metadata_change_sets-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料；关联和路由使用此 ID | 来源刷新比较器/人工接受用例；服务端生成；不要求用户填写 | 建议保留 |
| `snapshot_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `person_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `franchise_id` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `base_revision` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `patch` | **方案新增**：无旧字段；按本表设计依据新增 | 资料刷新差异：显示旧值、来源值与将接受的变更；接受后同事务改正式字段 | 来源刷新比较器/人工接受用例；比较器基于实际快照生成白名单补丁，不把任意 JSON 当成可执行命令 | 建议保留 |
| `status` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `decided_by` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `decided_at` | **方案新增**：无旧字段；按本表设计依据新增 | 管理端差异预览与确认，避免抓取直接覆盖人工资料 | 来源刷新比较器/人工接受用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源刷新比较器/人工接受用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 来源刷新比较器/人工接受用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 来源刷新比较器/人工接受用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
metadata_change_sets_base_revision_check: CHECK ((base_revision > 0));
metadata_change_sets_check: CHECK ((num_nonnulls(media_id, person_id, franchise_id) = 1));
metadata_change_sets_check1: CHECK ((((status = ANY (ARRAY['pending'::text, 'superseded'::text])) AND (decided_at IS NULL)) OR ((status = ANY (ARRAY['applied'::text, 'rejected'::text])) AND (decided_at IS NOT NULL) AND (decided_by IS NOT NULL))));
metadata_change_sets_patch_check: CHECK ((jsonb_typeof(patch) = 'object'::text));
metadata_change_sets_revision_check: CHECK ((revision > 0));
metadata_change_sets_status_check: CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'rejected'::text, 'superseded'::text])));
metadata_change_sets_decided_by_fkey: FOREIGN KEY (decided_by) REFERENCES video_x.accounts(id);
metadata_change_sets_franchise_id_fkey: FOREIGN KEY (franchise_id) REFERENCES video_x.franchises(id);
metadata_change_sets_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
metadata_change_sets_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
metadata_change_sets_snapshot_id_fkey: FOREIGN KEY (snapshot_id) REFERENCES video_x.metadata_snapshots(id);
metadata_change_sets_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX metadata_change_sets_pkey ON video_x.metadata_change_sets USING btree (id)
CREATE INDEX metadata_changes_pending_idx ON video_x.metadata_change_sets USING btree (created_at, id) WHERE (status = 'pending'::text)
```

</details>
