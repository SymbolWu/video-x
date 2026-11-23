# 账号、个人整理与播放 · 字段与业务依据 v0.5

[阅读指南](field-guide.md) · [模型入口](README.md) · [分域关系图](relationships.md) · [建表 SQL](schema.sql)

更新于 2026-11-17。结构来自临时 PostgreSQL 16.14 实际执行结果；业务说明来自逐字段设计依据。PK=主键，FK=参与外键。**“写入者、使用场景”为计划行为，尚未接入应用；首版建议为建议，不等于所有候选字段已经定稿。**

每表先看类型和含义，再看同名字段的“来源与使用规则”。旧字段名指当前旧实体，历史数据证据见[依据复核](evidence-review.md)。

| 表 | 字段数 | 本表首版建议 | 业务依据 |
| --- | ---: | --- | --- |
| [accounts](#accounts) · 登录账号 | 7 | 建议保留 | 用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系 |
| [profiles](#profiles) · 个人资料 | 7 | 建议保留 | 用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系 |
| [devices](#devices) · 已登记客户端 | 10 | 建议保留 | 用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系 |
| [auth_sessions](#auth_sessions) · 登录会话 | 7 | 建议保留 | 用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系 |
| [collections](#collections) · 私人收藏夹 | 11 | 建议保留 | collections、collections_movie；增加整理顺序和封面方案 |
| [collection_items](#collection_items) · 收藏夹有序成员 | 5 | 建议保留 | collections、collections_movie；增加整理顺序和封面方案 |
| [user_media_state](#user_media_state) · 个人作品状态 | 14 | 建议保留 | movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开 |
| [user_person_state](#user_person_state) · 个人喜欢人物 | 7 | 建议保留 | actor.is_collected；人物喜欢独立于参演关系 |
| [playback_sessions](#playback_sessions) · 一次播放会话 | 15 | 建议保留 | 用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放 |
| [playback_events](#playback_events) · 播放事件与去重 | 10 | 建议保留 | 用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放 |
| [playback_progress](#playback_progress) · 每个版本的最新断点 | 9 | 建议保留 | 用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放 |

<a id="accounts"></a>
## accounts · 登录账号

本表依据：用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="accounts-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="accounts-username"></a>`username` | `text` | 否 | — | — | 规范化登录名；首版初始化一个个人账号 |
| <a id="accounts-password_hash"></a>`password_hash` | `text` | 否 | — | — | 仅保存带算法参数的密码哈希 |
| <a id="accounts-disabled_at"></a>`disabled_at` | `timestamptz` | 是 | — | — | 停用账号时间 |
| <a id="accounts-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="accounts-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="accounts-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；服务端生成；不要求用户填写 | 建议保留 |
| `username` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `password_hash` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `disabled_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
accounts_revision_check: CHECK ((revision > 0));
accounts_username_check: CHECK (((username = lower(btrim(username))) AND ((length(username) >= 1) AND (length(username) <= 80))));
accounts_pkey: PRIMARY KEY (id);
accounts_username_key: UNIQUE (username);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX accounts_pkey ON video_x.accounts USING btree (id)
CREATE UNIQUE INDEX accounts_username_key ON video_x.accounts USING btree (username)
```

</details>

<a id="profiles"></a>
## profiles · 个人资料

本表依据：用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="profiles-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="profiles-account_id"></a>`account_id` | `uuid` | 否 | FK | — | 所属账号；首版一个账号一个 profile |
| <a id="profiles-display_name"></a>`display_name` | `text` | 否 | — | — | 页面显示名称 |
| <a id="profiles-preferences"></a>`preferences` | `jsonb` | 否 | — | `'{}'::jsonb` | 有版本契约的播放偏好，不存关系或认证凭据 |
| <a id="profiles-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="profiles-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="profiles-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；服务端生成；不要求用户填写 | 建议保留 |
| `account_id` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `display_name` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `preferences` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
profiles_display_name_check: CHECK (((length(btrim(display_name)) >= 1) AND (length(btrim(display_name)) <= 120)));
profiles_preferences_check: CHECK ((jsonb_typeof(preferences) = 'object'::text));
profiles_revision_check: CHECK ((revision > 0));
profiles_account_id_fkey: FOREIGN KEY (account_id) REFERENCES video_x.accounts(id);
profiles_pkey: PRIMARY KEY (id);
profiles_account_id_key: UNIQUE (account_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX profiles_account_id_key ON video_x.profiles USING btree (account_id)
CREATE UNIQUE INDEX profiles_pkey ON video_x.profiles USING btree (id)
```

</details>

<a id="devices"></a>
## devices · 已登记客户端

本表依据：用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="devices-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="devices-profile_id"></a>`profile_id` | `uuid` | 否 | FK | — | 设备所属个人资料 |
| <a id="devices-installation_id"></a>`installation_id` | `uuid` | 否 | — | — | 客户端生成并持久化的安装标识，不是硬件指纹 |
| <a id="devices-client_kind"></a>`client_kind` | `text` | 否 | — | — | 客户端类型 |
| <a id="devices-display_name"></a>`display_name` | `text` | 否 | — | — | 例如 Chrome / 我的 Android |
| <a id="devices-last_seen_at"></a>`last_seen_at` | `timestamptz` | 是 | — | — | 服务端最后活动时间 |
| <a id="devices-revoked_at"></a>`revoked_at` | `timestamptz` | 是 | — | — | 撤销设备后拒绝建立新会话 |
| <a id="devices-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="devices-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="devices-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；服务端生成；不要求用户填写 | 建议保留 |
| `profile_id` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `installation_id` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；客户端首次安装/站点存储初始化生成 UUID 并持久化；不采集硬件指纹 | 建议保留 |
| `client_kind` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `display_name` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `last_seen_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `revoked_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
devices_client_kind_check: CHECK ((client_kind = ANY (ARRAY['web'::text, 'android'::text])));
devices_revision_check: CHECK ((revision > 0));
devices_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
devices_pkey: PRIMARY KEY (id);
devices_id_profile_id_key: UNIQUE (id, profile_id);
devices_profile_id_installation_id_key: UNIQUE (profile_id, installation_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX devices_id_profile_id_key ON video_x.devices USING btree (id, profile_id)
CREATE UNIQUE INDEX devices_pkey ON video_x.devices USING btree (id)
CREATE UNIQUE INDEX devices_profile_id_installation_id_key ON video_x.devices USING btree (profile_id, installation_id)
```

</details>

<a id="auth_sessions"></a>
## auth_sessions · 登录会话

本表依据：用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="auth_sessions-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="auth_sessions-device_id"></a>`device_id` | `uuid` | 否 | FK | — | 关联设备，再由设备取得 profile 和账号 |
| <a id="auth_sessions-token_hash"></a>`token_hash` | `bytea` | 否 | — | — | 随机会话令牌的 SHA-256 摘要；不存原令牌 |
| <a id="auth_sessions-expires_at"></a>`expires_at` | `timestamptz` | 否 | — | — | 服务端到期时间 |
| <a id="auth_sessions-revoked_at"></a>`revoked_at` | `timestamptz` | 是 | — | — | 主动登出或撤销时间 |
| <a id="auth_sessions-last_used_at"></a>`last_used_at` | `timestamptz` | 是 | — | — | 最后使用时间 |
| <a id="auth_sessions-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；服务端生成；不要求用户填写 | 建议保留 |
| `device_id` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `token_hash` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；对新生成的随机会话令牌保存摘要，正文只在建立会话时交付客户端 | 建议保留 |
| `expires_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `revoked_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `last_used_at` | **方案新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理 | 初始化/认证服务/客户端登记用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
auth_sessions_check: CHECK ((expires_at > created_at));
auth_sessions_token_hash_check: CHECK ((octet_length(token_hash) = 32));
auth_sessions_device_id_fkey: FOREIGN KEY (device_id) REFERENCES video_x.devices(id);
auth_sessions_pkey: PRIMARY KEY (id);
auth_sessions_token_hash_key: UNIQUE (token_hash);

-- 含主键、唯一约束的支撑索引
CREATE INDEX auth_sessions_device_idx ON video_x.auth_sessions USING btree (device_id)
CREATE UNIQUE INDEX auth_sessions_pkey ON video_x.auth_sessions USING btree (id)
CREATE UNIQUE INDEX auth_sessions_token_hash_key ON video_x.auth_sessions USING btree (token_hash)
```

</details>

<a id="collections"></a>
## collections · 私人收藏夹

本表依据：collections、collections_movie；增加整理顺序和封面方案。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="collections-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="collections-profile_id"></a>`profile_id` | `uuid` | 否 | FK | — | 所属个人资料；API 从会话取得 |
| <a id="collections-name"></a>`name` | `text` | 否 | — | — | 收藏夹显示名 |
| <a id="collections-normalized_name"></a>`normalized_name` | `text` | 否 | — | — | 规范化名称，用于 profile 内重名判断 |
| <a id="collections-description"></a>`description` | `text` | 是 | — | — | 收藏夹说明 |
| <a id="collections-cover_asset_id"></a>`cover_asset_id` | `uuid` | 是 | FK | — | 手工封面 |
| <a id="collections-cover_media_id"></a>`cover_media_id` | `uuid` | 是 | FK | — | 借用本夹成员作品封面 |
| <a id="collections-archived_at"></a>`archived_at` | `timestamptz` | 是 | — | — | 归档时间；NULL 表示未归档，保留原记录及关系 |
| <a id="collections-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="collections-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="collections-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`collections.id` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式；关联和路由使用此 ID | 个人收藏夹用例；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `profile_id` | **方案新增**：无旧字段；按本表设计依据新增 | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；全部旧收藏夹归默认单账号的默认 profile；不建立多资料切换入口 | 建议保留 |
| `name` | **沿用**：`collections.coll_name` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；保留业务含义；类型/ID 转换须由迁移程序验证 | 建议保留 |
| `normalized_name` | **转换沿用**：`collections.coll_name` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；规范化派生，用于重名检查；若新约束冲突报报告，不静默删夹 | 建议保留 |
| `description` | **方案新增**：无旧字段；按本表设计依据新增 | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `cover_asset_id` | **方案新增**：无旧字段；按本表设计依据新增 | 收藏页与收藏夹详情封面；借用封面作品必须为本夹成员 | 个人收藏夹用例；旧无自定义封面，默认 NULL 并按首个成员回退 | 建议保留 |
| `cover_media_id` | **方案新增**：无旧字段；按本表设计依据新增 | 收藏页与收藏夹详情封面；借用封面作品必须为本夹成员 | 个人收藏夹用例；旧无自定义封面，默认 NULL 并按首个成员回退 | 建议保留 |
| `archived_at` | **转换沿用**：`collections.is_deleted` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知 | 建议保留 |
| `created_at` | **转换沿用**：`collections.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 个人收藏夹用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`collections.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 个人收藏夹用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 个人收藏夹用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
collections_check: CHECK ((num_nonnulls(cover_asset_id, cover_media_id) <= 1));
collections_name_check: CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120)));
collections_normalized_name_check: CHECK ((length(normalized_name) > 0));
collections_revision_check: CHECK ((revision > 0));
collections_cover_asset_id_fkey: FOREIGN KEY (cover_asset_id) REFERENCES video_x.assets(id);
collections_cover_media_id_fkey: FOREIGN KEY (cover_media_id) REFERENCES video_x.media_items(id);
collections_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
collections_pkey: PRIMARY KEY (id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX collection_active_name_uq ON video_x.collections USING btree (profile_id, normalized_name) WHERE (archived_at IS NULL)
CREATE UNIQUE INDEX collections_pkey ON video_x.collections USING btree (id)
```

</details>

<a id="collection_items"></a>
## collection_items · 收藏夹有序成员

本表依据：collections、collections_movie；增加整理顺序和封面方案。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="collection_items-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="collection_items-collection_id"></a>`collection_id` | `uuid` | 否 | FK | — | 所属收藏夹 |
| <a id="collection_items-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 作品，可跨逻辑库和分类 |
| <a id="collection_items-position"></a>`position` | `integer` | 否 | — | — | 收藏夹自定义顺序；展示排序不改写本字段 |
| <a id="collection_items-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **拆分重组**：`collections_movie.id` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式；关联和路由使用此 ID | 个人收藏夹用例；生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并 | 建议保留 |
| `collection_id` | **转换沿用**：`collections_movie.collection_id` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；通过旧收藏夹 ID 映射 | 建议保留 |
| `media_id` | **转换沿用**：`collections_movie.movie_id` | 观看端收藏夹浏览、作品加入多个收藏夹、整理模式 | 个人收藏夹用例；通过旧作品 ID 映射；保持一个作品加入多个收藏夹 | 建议保留 |
| `position` | **方案新增**：无旧字段；按本表设计依据新增 | 收藏夹“整理”模式拖动顺序，浏览临时排序不改此值 | 个人收藏夹用例；旧无显式顺序，按旧关系创建时间/ID 的确定规则初始化；这是新顺序，不冒称旧人工排序 | 建议保留 |
| `created_at` | **转换沿用**：`collections_movie.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 个人收藏夹用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
collection_items_position_check: CHECK (("position" > 0));
collection_items_collection_id_fkey: FOREIGN KEY (collection_id) REFERENCES video_x.collections(id);
collection_items_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
collection_items_pkey: PRIMARY KEY (id);
collection_items_collection_id_media_id_key: UNIQUE (collection_id, media_id);
collection_items_collection_id_position_key: UNIQUE (collection_id, "position") DEFERRABLE;

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX collection_items_collection_id_media_id_key ON video_x.collection_items USING btree (collection_id, media_id)
CREATE UNIQUE INDEX collection_items_collection_id_position_key ON video_x.collection_items USING btree (collection_id, "position")
CREATE INDEX collection_items_media_idx ON video_x.collection_items USING btree (media_id, collection_id)
CREATE UNIQUE INDEX collection_items_pkey ON video_x.collection_items USING btree (id)
```

</details>

<a id="user_media_state"></a>
## user_media_state · 个人作品状态

本表依据：movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="user_media_state-profile_id"></a>`profile_id` | `uuid` | 否 | PK/FK | — | 当前个人资料 |
| <a id="user_media_state-media_id"></a>`media_id` | `uuid` | 否 | PK/FK | — | 作品身份，与播放版本独立 |
| <a id="user_media_state-is_favorite"></a>`is_favorite` | `boolean` | 否 | — | `false` | 喜欢影片，不表示加入某个收藏夹 |
| <a id="user_media_state-favorited_at"></a>`favorited_at` | `timestamptz` | 是 | — | — | 最近喜欢时间；旧库无时间时保留 NULL，新喜欢动作写服务端时间；取消喜欢置 NULL |
| <a id="user_media_state-rating"></a>`rating` | `smallint` | 是 | — | — | 个人 1～5 星整数；NULL 表示未评分 |
| <a id="user_media_state-watched_at"></a>`watched_at` | `timestamptz` | 是 | — | — | 最近标记已看时间；NULL 表示未标记 |
| <a id="user_media_state-last_played_at"></a>`last_played_at` | `timestamptz` | 是 | — | — | 最近有效播放时间，服务端记录 |
| <a id="user_media_state-resume_edition_id"></a>`resume_edition_id` | `uuid` | 是 | FK | — | 作品当前接续版本 |
| <a id="user_media_state-takeover_generation"></a>`takeover_generation` | `bigint` | 否 | — | `0` | 作品级播放接管代数，新会话原子递增 |
| <a id="user_media_state-memberships_revision"></a>`memberships_revision` | `bigint` | 否 | — | `1` | 该作品多收藏夹成员选择的并发版本 |
| <a id="user_media_state-legacy_play_count"></a>`legacy_play_count` | `bigint` | 否 | — | `0` | 旧库迁入的不可重建播放次数；新次数来自已开始会话 |
| <a id="user_media_state-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="user_media_state-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="user_media_state-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `profile_id` | **方案新增**：无旧字段；按本表设计依据新增 | 喜欢、评分筛选、继续观看、作品的收藏夹选择 | 个人状态/评分/播放用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `media_id` | **拆分重组**：`movie.id` | 喜欢、评分筛选、继续观看、作品的收藏夹选择 | 个人状态/评分/播放用例；个人状态关联到作品，而非文件 | 建议保留 |
| `is_favorite` | **转换沿用**：`movie.is_favorite` | 喜欢、评分筛选、继续观看、作品的收藏夹选择 | 个人状态/评分/播放用例；1→true，0/明确空语义→false；不自动加入收藏夹 | 建议保留 |
| `favorited_at` | **方案新增**：无旧字段；按本表设计依据新增 | 最近喜欢排序；旧时间未知排在已知时间之后 | 个人状态/评分/播放用例；新喜欢动作写服务端时间；旧库没有喜欢时间，允许 true+NULL，取消后清空 | 建议保留 |
| `rating` | **转换沿用**：`movie.user_rating` | 作品详情点选 1～5 星、取消评分、评分筛选与排序；与喜欢和网站评分独立 | 个人评分用例：设置 1～5 或清空为 NULL；合法 1～5 整数原值迁入；NULL 保持未评分；0 或越界值报异常 | 建议保留 |
| `watched_at` | **方案新增**：无旧字段；按本表设计依据新增 | “已看”筛选和人工标记；改变已看不强制修改断点 | 个人状态/评分/播放用例；默认 NULL；只由新的个人标记动作写入，不根据旧百分比或新播放结束自动补造 | 建议保留 |
| `last_played_at` | **沿用**：`movie.last_played_at` | 最近播放时间；可保留旧历史汇总，但续播必须同时有新系统有效未完成 progress，不能仅凭该时间推断断点 | 个人状态/评分/播放用例；保留已知旧时间；未知为 NULL | 建议保留 |
| `resume_edition_id` | **技术新增**：无旧字段；按本表设计依据新增 | 联合新 progress 的有效坐标与未完成状态展示续播；不以旧最近播放时间生成卡片 | 个人状态/评分/播放用例；迁移初始化 NULL；实际定位并起播成功后更新到该集/作品版本；group 始终不填写 | 建议保留 |
| `takeover_generation` | **技术新增**：无旧字段；按本表设计依据新增 | 分别保护跨设备播放接管和多收藏夹选择，防止旧请求覆盖新选择 | 个人状态/评分/播放用例；旧无此值：接管代数 0，收藏夹成员版本 1，由服务端用例更新 | 建议保留 |
| `memberships_revision` | **技术新增**：无旧字段；按本表设计依据新增 | 分别保护跨设备播放接管和多收藏夹选择，防止旧请求覆盖新选择 | 个人状态/评分/播放用例；旧无此值：接管代数 0，收藏夹成员版本 1，由服务端用例更新 | 建议保留 |
| `legacy_play_count` | **拆分重组**：`movie.play_count` | 保留历史累计基数；与新 has_started 会话计数共同用于播放次数筛选/排序，不是完播次数 | 个人状态/评分/播放用例；保留旧累计基数；新播放次数从实际已开始会话计算，不伪造历史事件 | 建议保留 |
| `created_at` | **转换沿用**：`movie.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 个人状态/评分/播放用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`movie.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 个人状态/评分/播放用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 个人状态/评分/播放用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
user_media_state_check: CHECK ((is_favorite OR (favorited_at IS NULL)));
user_media_state_legacy_play_count_check: CHECK ((legacy_play_count >= 0));
user_media_state_memberships_revision_check: CHECK ((memberships_revision > 0));
user_media_state_rating_check: CHECK (((rating >= 1) AND (rating <= 5)));
user_media_state_revision_check: CHECK ((revision > 0));
user_media_state_takeover_generation_check: CHECK ((takeover_generation >= 0));
user_media_state_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
user_media_state_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
user_media_state_resume_edition_id_media_id_fkey: FOREIGN KEY (resume_edition_id, media_id) REFERENCES video_x.editions(id, media_id) DEFERRABLE;
user_media_state_pkey: PRIMARY KEY (profile_id, media_id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX user_media_continue_idx ON video_x.user_media_state USING btree (profile_id, last_played_at DESC, media_id) WHERE (resume_edition_id IS NOT NULL)
CREATE INDEX user_media_favorites_idx ON video_x.user_media_state USING btree (profile_id, favorited_at DESC NULLS LAST, media_id) WHERE is_favorite
CREATE UNIQUE INDEX user_media_state_pkey ON video_x.user_media_state USING btree (profile_id, media_id)
```

</details>

<a id="user_person_state"></a>
## user_person_state · 个人喜欢人物

本表依据：actor.is_collected；人物喜欢独立于参演关系。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="user_person_state-profile_id"></a>`profile_id` | `uuid` | 否 | PK/FK | — | 所属个人资料 |
| <a id="user_person_state-person_id"></a>`person_id` | `uuid` | 否 | PK/FK | — | 人物身份；合并时迁移到有效目标 |
| <a id="user_person_state-is_favorite"></a>`is_favorite` | `boolean` | 否 | — | `false` | 喜欢该人物 |
| <a id="user_person_state-favorited_at"></a>`favorited_at` | `timestamptz` | 是 | — | — | 最近喜欢时间；旧库无时间时保留 NULL，新喜欢动作写服务端时间；取消喜欢置 NULL |
| <a id="user_person_state-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |
| <a id="user_person_state-updated_at"></a>`updated_at` | `timestamptz` | 否 | — | `now()` | 服务端最后更新时间 |
| <a id="user_person_state-revision"></a>`revision` | `bigint` | 否 | — | `1` | 聚合并发版本；更新触发器递增，写入用例校验 expectedRevision |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `profile_id` | **方案新增**：无旧字段；按本表设计依据新增 | 收藏页人物视图与演员详情喜欢按钮 | 人物喜欢用例；新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实 | 建议保留 |
| `person_id` | **转换沿用**：`actor.id` | 收藏页人物视图与演员详情喜欢按钮 | 人物喜欢用例；通过旧演员 ID 映射到人物身份 | 建议保留 |
| `is_favorite` | **转换沿用**：`actor.is_collected` | 收藏页人物视图与演员详情喜欢按钮 | 人物喜欢用例；1→true；旧 NULL/0 按现有未收藏语义归为 false | 建议保留 |
| `favorited_at` | **方案新增**：无旧字段；按本表设计依据新增 | 最近喜欢排序；旧时间未知排在已知时间之后 | 人物喜欢用例；新喜欢动作写服务端时间；旧库没有喜欢时间，允许 true+NULL，取消后清空 | 建议保留 |
| `created_at` | **转换沿用**：`actor.created_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人物喜欢用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `updated_at` | **转换沿用**：`actor.updated_at` | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 人物喜欢用例；新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区 | 建议保留 |
| `revision` | **技术新增**：无旧字段；按本表设计依据新增 | 编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对 | 人物喜欢用例；从 1 开始，更新触发器递增；旧库无对应并发版本 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
user_person_state_check: CHECK ((is_favorite OR (favorited_at IS NULL)));
user_person_state_revision_check: CHECK ((revision > 0));
user_person_state_person_id_fkey: FOREIGN KEY (person_id) REFERENCES video_x.people(id);
user_person_state_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
user_person_state_pkey: PRIMARY KEY (profile_id, person_id);

-- 含主键、唯一约束的支撑索引
CREATE INDEX user_person_favorites_idx ON video_x.user_person_state USING btree (profile_id, favorited_at DESC NULLS LAST, person_id) WHERE is_favorite
CREATE UNIQUE INDEX user_person_state_pkey ON video_x.user_person_state USING btree (profile_id, person_id)
```

</details>

<a id="playback_sessions"></a>
## playback_sessions · 一次播放会话

本表依据：用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="playback_sessions-id"></a>`id` | `uuid` | 否 | PK | `gen_random_uuid()` | 内部稳定主键；改名、迁移目录不会改变 ID |
| <a id="playback_sessions-profile_id"></a>`profile_id` | `uuid` | 否 | FK | — | 当前个人资料 |
| <a id="playback_sessions-device_id"></a>`device_id` | `uuid` | 否 | FK | — | 发起设备，复合外键保证设备归属 |
| <a id="playback_sessions-media_id"></a>`media_id` | `uuid` | 否 | FK | — | 可播放作品 |
| <a id="playback_sessions-edition_id"></a>`edition_id` | `uuid` | 否 | FK | — | 实际版本，复合外键保证属于该作品 |
| <a id="playback_sessions-start_mode"></a>`start_mode` | `text` | 否 | — | — | 本次起播模式；新播、续播、明确从头，固定于会话创建事务 |
| <a id="playback_sessions-start_part_id"></a>`start_part_id` | `uuid` | 否 | FK | — | 固定起播文件段，必须属于本会话版本；加载失败不覆盖原断点 |
| <a id="playback_sessions-start_position_ms"></a>`start_position_ms` | `bigint` | 否 | — | — | 固定起播目标毫秒；定位确认前禁止上报默认零位置 |
| <a id="playback_sessions-takeover_generation"></a>`takeover_generation` | `bigint` | 否 | — | — | 创建会话时分配的接管代数 |
| <a id="playback_sessions-last_seq"></a>`last_seq` | `bigint` | 否 | — | `0` | 本会话已处理的最大递增序号，保留到会话清理 |
| <a id="playback_sessions-has_started"></a>`has_started` | `boolean` | 否 | — | `false` | 确认真实定位并实际播放后才置 true；创建会话与加载失败不计播放 |
| <a id="playback_sessions-last_received_at"></a>`last_received_at` | `timestamptz` | 是 | — | — | 服务端最近接收事件时间 |
| <a id="playback_sessions-ended_at"></a>`ended_at` | `timestamptz` | 是 | — | — | 会话结束时间 |
| <a id="playback_sessions-end_reason"></a>`end_reason` | `text` | 是 | — | — | 结束原因 |
| <a id="playback_sessions-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；关联和路由使用此 ID | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `profile_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `device_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `media_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `edition_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `start_mode` | **方案新增**：无旧字段；按本表设计依据新增 | 区分首次播放、继续播放和明确从头；重试使用同一会话固定意图 | 播放开始用例/客户端事件接收/进度投影；创建会话事务按用户意图及有效进度确定 fresh/resume/restart；首次不写 progress | 建议保留 |
| `start_part_id` | **技术新增**：无旧字段；按本表设计依据新增 | 客户端真正加载的起播文件段；复合外键确保属于本会话版本 | 播放开始用例/客户端事件接收/进度投影；事务重查最新有效目标后保存；不是从旧 file_path 补造会话 | 建议保留 |
| `start_position_ms` | **方案新增**：无旧字段；按本表设计依据新增 | 播放器就绪后必须定位到该毫秒位置，再确认实际起播；避免默认 0 覆盖断点 | 播放开始用例/客户端事件接收/进度投影；resume 取新系统已确认断点；fresh/restart 为 0。旧百分比和旧毫秒均不导入 | 建议保留 |
| `takeover_generation` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `last_seq` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `has_started` | **技术新增**：无旧字段；按本表设计依据新增 | 确认目标定位并实际播放才置 true；重复 start 不重复计数，加载失败不计播放 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `last_received_at` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `ended_at` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `end_reason` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
playback_sessions_check: CHECK (((ended_at IS NULL) = (end_reason IS NULL)));
playback_sessions_check1: CHECK (((start_mode = 'resume'::text) OR (start_position_ms = 0)));
playback_sessions_end_reason_check: CHECK ((end_reason = ANY (ARRAY['ended'::text, 'closed'::text, 'taken_over'::text, 'expired'::text])));
playback_sessions_last_seq_check: CHECK ((last_seq >= 0));
playback_sessions_start_mode_check: CHECK ((start_mode = ANY (ARRAY['fresh'::text, 'resume'::text, 'restart'::text])));
playback_sessions_start_position_ms_check: CHECK ((start_position_ms >= 0));
playback_sessions_takeover_generation_check: CHECK ((takeover_generation > 0));
playback_sessions_device_id_profile_id_fkey: FOREIGN KEY (device_id, profile_id) REFERENCES video_x.devices(id, profile_id);
playback_sessions_edition_id_media_id_fkey: FOREIGN KEY (edition_id, media_id) REFERENCES video_x.editions(id, media_id);
playback_sessions_media_id_fkey: FOREIGN KEY (media_id) REFERENCES video_x.media_items(id);
playback_sessions_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
playback_sessions_start_part_id_edition_id_fkey: FOREIGN KEY (start_part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id);
playback_sessions_pkey: PRIMARY KEY (id);
playback_sessions_id_edition_id_key: UNIQUE (id, edition_id);
playback_sessions_id_profile_id_edition_id_key: UNIQUE (id, profile_id, edition_id);
playback_sessions_profile_id_media_id_takeover_generation_key: UNIQUE (profile_id, media_id, takeover_generation);

-- 含主键、唯一约束的支撑索引
CREATE INDEX playback_history_idx ON video_x.playback_sessions USING btree (profile_id, created_at DESC, id) WHERE has_started
CREATE UNIQUE INDEX playback_sessions_id_edition_id_key ON video_x.playback_sessions USING btree (id, edition_id)
CREATE UNIQUE INDEX playback_sessions_id_profile_id_edition_id_key ON video_x.playback_sessions USING btree (id, profile_id, edition_id)
CREATE UNIQUE INDEX playback_sessions_pkey ON video_x.playback_sessions USING btree (id)
CREATE UNIQUE INDEX playback_sessions_profile_id_media_id_takeover_generation_key ON video_x.playback_sessions USING btree (profile_id, media_id, takeover_generation)
```

</details>

<a id="playback_events"></a>
## playback_events · 播放事件与去重

本表依据：用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="playback_events-session_id"></a>`session_id` | `uuid` | 否 | PK/FK | — | 所属会话 |
| <a id="playback_events-seq"></a>`seq` | `bigint` | 否 | PK | — | 客户端会话内递增序号，允许跳号但拒绝回退覆盖 |
| <a id="playback_events-event_id"></a>`event_id` | `uuid` | 否 | — | — | 客户端稳定生成的事件去重 ID |
| <a id="playback_events-edition_id"></a>`edition_id` | `uuid` | 否 | FK | — | 类型归属校验列，不允许跳到另一版本 |
| <a id="playback_events-part_id"></a>`part_id` | `uuid` | 否 | FK | — | 当前版本的实际文件段 |
| <a id="playback_events-position_ms"></a>`position_ms` | `bigint` | 否 | — | — | 段内毫秒位置；主动 seek 后退合法 |
| <a id="playback_events-kind"></a>`kind` | `text` | 否 | — | — | 事件种类 |
| <a id="playback_events-client_occurred_at"></a>`client_occurred_at` | `timestamptz` | 是 | — | — | 客户端时间，仅供诊断，不用来决定跨设备先后 |
| <a id="playback_events-applied_to_resume"></a>`applied_to_resume` | `boolean` | 否 | — | `false` | 是否实际更新当前断点；旧代数补发可记历史但不覆盖 |
| <a id="playback_events-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `session_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `seq` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `event_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `edition_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `part_id` | **技术新增**：无旧字段；按本表设计依据新增 | 精确绑定新系统实际播放的集/版本/文件段；组本身不建立断点 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `position_ms` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `kind` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `client_occurred_at` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `applied_to_resume` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
playback_events_kind_check: CHECK ((kind = ANY (ARRAY['start'::text, 'progress'::text, 'pause'::text, 'seek'::text, 'ended'::text])));
playback_events_position_ms_check: CHECK ((position_ms >= 0));
playback_events_seq_check: CHECK ((seq > 0));
playback_events_part_id_edition_id_fkey: FOREIGN KEY (part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id);
playback_events_session_id_edition_id_fkey: FOREIGN KEY (session_id, edition_id) REFERENCES video_x.playback_sessions(id, edition_id);
playback_events_pkey: PRIMARY KEY (session_id, seq);
playback_events_event_id_key: UNIQUE (event_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX playback_events_event_id_key ON video_x.playback_events USING btree (event_id)
CREATE UNIQUE INDEX playback_events_pkey ON video_x.playback_events USING btree (session_id, seq)
CREATE INDEX playback_events_retention_idx ON video_x.playback_events USING btree (created_at)
```

</details>

<a id="playback_progress"></a>
## playback_progress · 每个版本的最新断点

本表依据：用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放。建议：**建议保留**；个别字段以以下逐项标记为准。

| 字段 | 类型 | 可空 | 键 | 默认值 | 含义 |
| --- | --- | --- | --- | --- | --- |
| <a id="playback_progress-profile_id"></a>`profile_id` | `uuid` | 否 | PK/FK | — | 个人资料 |
| <a id="playback_progress-edition_id"></a>`edition_id` | `uuid` | 否 | PK/FK | — | 具体版本，不按电影百分比互相覆盖 |
| <a id="playback_progress-session_id"></a>`session_id` | `uuid` | 否 | FK | — | 产生当前断点的会话 |
| <a id="playback_progress-last_seq"></a>`last_seq` | `bigint` | 否 | FK | — | 当前断点对应的已持久化事件序号 |
| <a id="playback_progress-part_id"></a>`part_id` | `uuid` | 否 | FK | — | 版本内的有序文件段 |
| <a id="playback_progress-position_ms"></a>`position_ms` | `bigint` | 否 | — | — | 文件段内毫秒位置 |
| <a id="playback_progress-completed_at"></a>`completed_at` | `timestamptz` | 是 | — | — | 最后一个文件段自然结束时写入；有效重新起播/seek 时清空；不等于手动已看 |
| <a id="playback_progress-received_at"></a>`received_at` | `timestamptz` | 否 | — | `now()` | 服务器接受当前断点的时间 |
| <a id="playback_progress-created_at"></a>`created_at` | `timestamptz` | 否 | — | `now()` | 服务端创建时间，UTC 时间点 |

### 字段来源与使用规则

| 字段 | 来源类别 / 旧字段 | 使用场景（计划） | 写入者；迁移或初始化方式 | 首版建议 |
| --- | --- | --- | --- | --- |
| `profile_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `edition_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `session_id` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `last_seq` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `part_id` | **技术新增**：无旧字段；按本表设计依据新增 | 精确绑定新系统实际播放的集/版本/文件段；组本身不建立断点 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `position_ms` | **方案新增**：无旧字段；按本表设计依据新增 | 段内实际毫秒位置；定位确认前不更新，接受用户主动后退，不用百分比恢复 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `completed_at` | **方案新增**：无旧字段；按本表设计依据新增 | 真实播放完最后一段时写入，继续观看排除完成项；不自动改变手动 watched_at | 播放开始用例/客户端事件接收/进度投影；新进度默认 NULL；自然结束写服务端时间，有效重新起播或 seek 后清空 | 建议保留 |
| `received_at` | **技术新增**：无旧字段；按本表设计依据新增 | 继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |
| `created_at` | **技术新增**：无旧字段；按本表设计依据新增 | 记录创建/修改时间；用于维护详情、同步和稳定排序 | 播放开始用例/客户端事件接收/进度投影；初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点 | 建议保留 |

<details>
<summary>数据库约束与索引</summary>

```sql
playback_progress_last_seq_check: CHECK ((last_seq > 0));
playback_progress_position_ms_check: CHECK ((position_ms >= 0));
playback_progress_edition_id_fkey: FOREIGN KEY (edition_id) REFERENCES video_x.editions(id);
playback_progress_part_id_edition_id_fkey: FOREIGN KEY (part_id, edition_id) REFERENCES video_x.edition_parts(id, edition_id);
playback_progress_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES video_x.profiles(id);
playback_progress_session_id_last_seq_fkey: FOREIGN KEY (session_id, last_seq) REFERENCES video_x.playback_events(session_id, seq);
playback_progress_session_id_profile_id_edition_id_fkey: FOREIGN KEY (session_id, profile_id, edition_id) REFERENCES video_x.playback_sessions(id, profile_id, edition_id);
playback_progress_pkey: PRIMARY KEY (profile_id, edition_id);

-- 含主键、唯一约束的支撑索引
CREATE UNIQUE INDEX playback_progress_pkey ON video_x.playback_progress USING btree (profile_id, edition_id)
```

</details>
