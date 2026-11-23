-- video-x PostgreSQL 16+ review draft v0.5 (2026-11-17)
-- 58 张候选表含后置能力；逐字段依据见 field-guide.md / field-provenance.json。
-- 在全新数据库或独立 schema 中验证；不是旧库升级脚本。
-- 本文件创建 video_x schema，绝不 DROP/ALTER 旧业务表。
BEGIN;
CREATE SCHEMA video_x;
SET LOCAL search_path = video_x, public;

-- 身份 / 登录账号
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username = lower(btrim(username)) AND length(username) BETWEEN 1 AND 80),
  password_hash text NOT NULL,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE accounts IS '登录账号';
COMMENT ON COLUMN accounts.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN accounts.username IS '规范化登录名；首版初始化一个个人账号；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN accounts.password_hash IS '仅保存带算法参数的密码哈希；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN accounts.disabled_at IS '停用账号时间；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN accounts.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN accounts.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN accounts.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 身份 / 个人资料
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE profiles IS '个人资料';
COMMENT ON COLUMN profiles.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN profiles.account_id IS '所属账号；首版一个账号一个 profile；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN profiles.display_name IS '页面显示名称；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN profiles.preferences IS '有版本契约的播放偏好，不存关系或认证凭据；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN profiles.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN profiles.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN profiles.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 身份 / 已登记客户端
CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  installation_id uuid NOT NULL,
  client_kind text NOT NULL CHECK (client_kind IN ('web','android')),
  display_name text NOT NULL,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (profile_id, installation_id),
  UNIQUE (id, profile_id)
);
COMMENT ON TABLE devices IS '已登记客户端';
COMMENT ON COLUMN devices.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN devices.profile_id IS '设备所属个人资料；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN devices.installation_id IS '客户端生成并持久化的安装标识，不是硬件指纹；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：客户端首次安装/站点存储初始化生成 UUID 并持久化；不采集硬件指纹；首版建议：建议保留';
COMMENT ON COLUMN devices.client_kind IS '客户端类型；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN devices.display_name IS '例如 Chrome / 我的 Android；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN devices.last_seen_at IS '服务端最后活动时间；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN devices.revoked_at IS '撤销设备后拒绝建立新会话；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN devices.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN devices.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN devices.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 身份 / 登录会话
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id),
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now() ,
  CHECK (expires_at > created_at)
);
COMMENT ON TABLE auth_sessions IS '登录会话';
COMMENT ON COLUMN auth_sessions.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.device_id IS '关联设备，再由设备取得 profile 和账号；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.token_hash IS '随机会话令牌的 SHA-256 摘要；不存原令牌；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：对新生成的随机会话令牌保存摘要，正文只在建立会话时交付客户端；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.expires_at IS '服务端到期时间；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.revoked_at IS '主动登出或撤销时间；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.last_used_at IS '最后使用时间；来源类别：方案新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN auth_sessions.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认首版通用单账号结构；一个默认 profile，设备/会话仅支撑 Web/Android，不实现多账号管理或公网账户体系）；应用：单账号初始化、登录会话、Web/Android 设备识别及个人状态归属；不提供注册、邀请、切换账号或角色权限管理；写入：初始化/认证服务/客户端登记用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX auth_sessions_device_idx ON auth_sessions (device_id);

-- 文件 / 逻辑媒体库
CREATE TABLE libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE libraries IS '逻辑媒体库';
COMMENT ON COLUMN libraries.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：默认片库、扫描范围与作品归属；关联和路由使用此 ID；写入：部署初始化/媒体库设置；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN libraries.name IS '逻辑片库名，首版建立一个默认媒体库；来源类别：方案新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：默认片库、扫描范围与作品归属；写入：部署初始化/媒体库设置；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN libraries.description IS '说明；来源类别：方案新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：默认片库、扫描范围与作品归属；写入：部署初始化/媒体库设置；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN libraries.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：技术新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：归档过滤与恢复，不表示删除磁盘视频；写入：部署初始化/媒体库设置；迁移/初始化：默认 NULL；明确归档操作写服务端时间；首版建议：建议保留';
COMMENT ON COLUMN libraries.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：部署初始化/媒体库设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN libraries.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：部署初始化/媒体库设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN libraries.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（作品与磁盘目录分开；旧库无逻辑库实体）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：部署初始化/媒体库设置；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 文件 / 媒体根目录
CREATE TABLE storage_roots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  name text NOT NULL,
  mount_path text NOT NULL CHECK (left(mount_path,1) = '/'),
  expected_marker uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','online','offline','identity_mismatch')),
  last_checked_at timestamptz,
  last_complete_scan_at timestamptz,
  scan_enabled boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (library_id, mount_path)
);
COMMENT ON TABLE storage_roots IS '媒体根目录';
COMMENT ON COLUMN storage_roots.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：管理端媒体根设置、扫描前检查、文件离线提示；关联和路由使用此 ID；写入：媒体根设置/扫描 worker；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.library_id IS '一个库允许挂载多个磁盘根目录；来源类别：方案新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：管理端媒体根设置、扫描前检查、文件离线提示；写入：媒体根设置/扫描 worker；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.name IS '用户可读名称；来源类别：方案新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：管理端媒体根设置、扫描前检查、文件离线提示；写入：媒体根设置/扫描 worker；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.mount_path IS 'worker 内部受控挂载路径；宿主映射由 Compose 配置管理；来源类别：拆分重组；来源：movie.file_path；应用：管理端媒体根设置、扫描前检查、文件离线提示；写入：媒体根设置/扫描 worker；迁移/初始化：以受控配置确定根路径和挂载映射，不自动信任旧路径前缀；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.expected_marker IS '根目录标识文件中应读取到的 UUID；用于识别空挂载和错盘；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失；写入：媒体根设置/扫描 worker；迁移/初始化：登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.status IS '根目录可用性，与单文件缺失分开；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失；写入：媒体根设置/扫描 worker；迁移/初始化：登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.last_checked_at IS '最近核验根标识的时间；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失；写入：媒体根设置/扫描 worker；迁移/初始化：登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.last_complete_scan_at IS '最近一次完整且成功扫描时间；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失；写入：媒体根设置/扫描 worker；迁移/初始化：登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.scan_enabled IS '是否参与扫描；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：扫描前确认挂载的是正确磁盘；错误根不能把整库标记丢失；写入：媒体根设置/扫描 worker；迁移/初始化：登记/扫描时生成或核验根标识；首次状态 unknown，成功完整扫描后更新时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：归档过滤与恢复，不表示删除磁盘视频；写入：媒体根设置/扫描 worker；迁移/初始化：默认 NULL；明确归档操作写服务端时间；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：媒体根设置/扫描 worker；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：媒体根设置/扫描 worker；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN storage_roots.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（旧 movie.file_path 依赖本机路径；新增稳定根目录与挂载校验）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：媒体根设置/扫描 worker；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX storage_roots_library_idx ON storage_roots (library_id);

-- 文件 / 实际文件
CREATE TABLE media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_id uuid NOT NULL REFERENCES storage_roots(id),
  relative_path text NOT NULL CHECK (relative_path <> '' AND octet_length(relative_path) <= 2048 AND relative_path !~ '(^/|(^|/)\.\.(/|$))' AND relative_path !~ E'\\\\'),
  file_kind text NOT NULL CHECK (file_kind IN ('video','subtitle','sidecar')),
  content_revision bigint NOT NULL DEFAULT 1 CHECK (content_revision > 0),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  mtime_ns bigint NOT NULL CHECK (mtime_ns >= 0),
  fingerprint_algorithm text,
  fingerprint text,
  availability text NOT NULL DEFAULT 'present' CHECK (availability IN ('present','missing')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  missing_since timestamptz,
  probe_status text NOT NULL DEFAULT 'pending' CHECK (probe_status IN ('not_required','pending','running','succeeded','failed')),
  probed_content_revision bigint CHECK (probed_content_revision > 0),
  probed_at timestamptz,
  probe_version text,
  probe_error_code text,
  container_format text,
  duration_ms bigint CHECK (duration_ms >= 0),
  bitrate_bps bigint CHECK (bitrate_bps >= 0),
  probe_result jsonb CHECK (probe_result IS NULL OR jsonb_typeof(probe_result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (probe_status <> 'succeeded' OR (probed_content_revision IS NOT NULL AND probed_content_revision = content_revision)),
  UNIQUE (root_id, relative_path),
  CHECK ((fingerprint IS NULL) = (fingerprint_algorithm IS NULL)),
  CHECK ((availability='missing') = (missing_since IS NOT NULL))
);
COMMENT ON TABLE media_files IS '实际文件';
COMMENT ON COLUMN media_files.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：文件管理、导入复核、播放器可用性与媒体信息；关联和路由使用此 ID；写入：扫描器/ffprobe worker；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN media_files.root_id IS '文件所在受控根目录；来源类别：拆分重组；来源：movie.file_path；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：识别并登记媒体根，再映射文件的根 UUID；首版建议：建议保留';
COMMENT ON COLUMN media_files.relative_path IS '使用 / 的相对路径，首版最多 2048 字节；超长路径报异常而非截断；应用仍须检查符号链接边界；来源类别：拆分重组；来源：movie.file_path、movie.file_name；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：识别受控根目录后保留相对路径；文件名可从末段派生，冲突记录报告；首版建议：建议保留';
COMMENT ON COLUMN media_files.file_kind IS '主视频、外挂字幕、NFO 等旁车文件；来源类别：方案新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：首版已支持的主视频记 video；subtitle/sidecar 枚举是候选，不代表首版实现 NFO；首版建议：建议保留';
COMMENT ON COLUMN media_files.content_revision IS '文件内容代数；stat 变化时用例递增并重置探测状态；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.size_bytes IS '精确字节数，API 以十进制字符串传输；来源类别：转换沿用；来源：movie.file_size；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：旧展示字符串有舍入；精确字节数以重新 stat 为准，文件离线进入待处理，不伪造精确值；首版建议：建议保留';
COMMENT ON COLUMN media_files.mtime_ns IS '修改时间的 Unix 纳秒整数，避免时间点精度不足；来源类别：技术新增；来源：无旧字段（旧 LocalService 读取 stat.mtime 并混写 movie.updated_at；新列来自文件系统）；应用：扫描比对文件变化与探测过期判定；写入：扫描器/ffprobe worker；迁移/初始化：重新 stat 获取；离线时不把旧 updated_at 冒认为精确纳秒值；首版建议：建议保留';
COMMENT ON COLUMN media_files.fingerprint_algorithm IS '如 sampled-sha256-v1；版本属于算法名；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：只生成重复候选，不凭抽样指纹自动合并或删除文件；写入：扫描器/ffprobe worker；迁移/初始化：按明确版本算法计算，未计算为 NULL；首版建议：待裁剪';
COMMENT ON COLUMN media_files.fingerprint IS '重复候选指纹；不全局唯一，不证明内容完全相同；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：只生成重复候选，不凭抽样指纹自动合并或删除文件；写入：扫描器/ffprobe worker；迁移/初始化：按明确版本算法计算，未计算为 NULL；首版建议：待裁剪';
COMMENT ON COLUMN media_files.availability IS '仅在根在线且完成核验后才标 missing；有效可用性还需联查根状态；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：区分文件缺失和整盘离线；管理端展示异常并避免误清空库；写入：扫描器/ffprobe worker；迁移/初始化：扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing；首版建议：建议保留';
COMMENT ON COLUMN media_files.first_seen_at IS '初次发现时间；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：区分文件缺失和整盘离线；管理端展示异常并避免误清空库；写入：扫描器/ffprobe worker；迁移/初始化：扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing；首版建议：建议保留';
COMMENT ON COLUMN media_files.last_seen_at IS '最近一次扫描发现时间；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：区分文件缺失和整盘离线；管理端展示异常并避免误清空库；写入：扫描器/ffprobe worker；迁移/初始化：扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing；首版建议：建议保留';
COMMENT ON COLUMN media_files.missing_since IS '文件确认缺失的起始时间；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：区分文件缺失和整盘离线；管理端展示异常并避免误清空库；写入：扫描器/ffprobe worker；迁移/初始化：扫描器按真实发现/确认记录时间；只有正确根在线且扫描完成后才确认 missing；首版建议：建议保留';
COMMENT ON COLUMN media_files.probe_status IS '探测状态，不与在线状态混合；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.probed_content_revision IS '本次成功探测对应的内容代数；旧 worker 结果必须按代数 CAS 丢弃；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.probed_at IS '最近成功探测时间；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.probe_version IS 'ffprobe 与标准化器版本；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.probe_error_code IS '结构化错误码；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.container_format IS '探测得到的真实容器格式；来源类别：转换沿用；来源：movie.file_format；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：旧值是扩展名；真实容器格式重新 ffprobe，不能承诺两者完全一致；首版建议：建议保留';
COMMENT ON COLUMN media_files.duration_ms IS '探测得到的真实时长，未知为 NULL；来源类别：转换沿用；来源：movie.duration；应用：文件管理、导入复核、播放器可用性与媒体信息；写入：扫描器/ffprobe worker；迁移/初始化：旧 HH:mm:ss 转毫秒仅精确到秒；重新探测可得到更准确事实；首版建议：建议保留';
COMMENT ON COLUMN media_files.bitrate_bps IS '真实总码率；来源类别：探测新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：媒体信息详情；没有首版读取需求时保留在原始探测结果即可；写入：扫描器/ffprobe worker；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_files.probe_result IS '原始结构化 ffprobe 输出，不保存任意命令文本；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：导入探测状态、错误诊断；丢弃文件已变化后的旧探测结果；写入：扫描器/ffprobe worker；迁移/初始化：新文件 content_revision=1；成功探测时记录对应代数、工具版本和结果，失败记录错误；首版建议：建议保留';
COMMENT ON COLUMN media_files.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描器/ffprobe worker；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_files.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描器/ffprobe worker；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_files.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（拆出旧 movie 的文件事实；补充扫描与探测状态）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：扫描器/ffprobe worker；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX media_files_fingerprint_idx ON media_files (fingerprint_algorithm, fingerprint) WHERE fingerprint IS NOT NULL;

-- 文件 / 文件内轨道
CREATE TABLE media_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  stream_index integer NOT NULL CHECK (stream_index >= 0),
  kind text NOT NULL CHECK (kind IN ('video','audio','subtitle','attachment','data')),
  codec text,
  language text,
  title text,
  is_default boolean NOT NULL DEFAULT false,
  is_forced boolean NOT NULL DEFAULT false,
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  frame_rate_num integer CHECK (frame_rate_num > 0),
  frame_rate_den integer CHECK (frame_rate_den > 0),
  channels smallint CHECK (channels > 0),
  channel_layout text,
  sample_rate_hz integer CHECK (sample_rate_hz > 0),
  color_transfer text,
  bit_depth smallint CHECK (bit_depth > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (file_id, stream_index),
  CHECK ((frame_rate_num IS NULL) = (frame_rate_den IS NULL))
);
COMMENT ON TABLE media_streams IS '文件内轨道';
COMMENT ON COLUMN media_streams.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；关联和路由使用此 ID；写入：ffprobe 标准化器；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN media_streams.file_id IS '轨道依附文件探测结果，重探测可事务替换；来源类别：方案新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_streams.stream_index IS 'ffprobe 轨道索引；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.kind IS '轨道类别；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.codec IS '真实编码名；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.language IS '规范语言标签；未知 NULL；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.title IS '轨道名称；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.is_default IS '容器默认轨道标志；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.is_forced IS '强制字幕标志；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.width IS '视频宽度；来源类别：拆分重组；来源：movie.resolution；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：解析旧宽×高字符串，最终由 ffprobe 视频轨道核验；首版建议：建议保留';
COMMENT ON COLUMN media_streams.height IS '视频高度；来源类别：拆分重组；来源：movie.resolution；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：解析旧宽×高字符串，最终由 ffprobe 视频轨道核验；首版建议：建议保留';
COMMENT ON COLUMN media_streams.frame_rate_num IS '帧率分子；来源类别：探测新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_streams.frame_rate_den IS '帧率分母，保留 24000/1001 之类有理数；来源类别：探测新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_streams.channels IS '音频声道数；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.channel_layout IS '如 5.1；来源类别：探测新增；来源：无旧字段（现有 ffprobe 能产生轨道事实，旧数据库未单独保存）；应用：作品媒体信息、播放轨道选择；高级音视频字段按播放器实际需求保留；写入：ffprobe 标准化器；迁移/初始化：成功探测后按实际轨道写入；未知语言等保留 NULL，不以文件名猜测；首版建议：建议保留';
COMMENT ON COLUMN media_streams.sample_rate_hz IS '音频采样率；来源类别：探测新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_streams.color_transfer IS '如 smpte2084；不直接硬编码 HDR 标签；来源类别：探测新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_streams.bit_depth IS '位深；来源类别：探测新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：媒体信息详情或播放器实际能力判断；没有读取需求时仅保留在 probe_result；写入：ffprobe 标准化器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN media_streams.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有 LocalService 已调用 ffprobe；原来只保存分辨率，轨道信息为新增持久化）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：ffprobe 标准化器；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';

-- 资料 / 托管图片资源
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  sha256 bytea NOT NULL CHECK (octet_length(sha256)=32),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','ready','failed')),
  unreferenced_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE assets IS '托管图片资源';
COMMENT ON COLUMN assets.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：作品海报、演员头像、系列/收藏夹封面；关联和路由使用此 ID；写入：图片导入/下载/上传服务；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN assets.storage_key IS '受控资源目录内的键，不是任意外部 URL；来源类别：拆分重组；来源：movie.cover_image_path、actor.profile_image_path；应用：作品海报、演员头像、系列/收藏夹封面；写入：图片导入/下载/上传服务；迁移/初始化：验证并复制到受控资源目录后生成键，不直接使用任意旧绝对路径；首版建议：建议保留';
COMMENT ON COLUMN assets.sha256 IS '内容校验摘要；允许不同处理版本使用相同摘要；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.mime_type IS '经过校验的图片 MIME；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.size_bytes IS '资源精确字节数；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.width IS '像素宽度；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.height IS '像素高度；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.state IS '写入资源存储的状态；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.unreferenced_since IS '无引用宽限期起点；GC 还须重新检查所有引用；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：图片可用性、尺寸展示、引用完整性与资源回收；不是影片待清理功能；写入：图片导入/下载/上传服务；迁移/初始化：由实际图片校验/托管记录得到；缺失图片进入异常，不能伪造摘要或像素值；首版建议：建议保留';
COMMENT ON COLUMN assets.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：图片导入/下载/上传服务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN assets.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：图片导入/下载/上传服务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN assets.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（movie.cover_image_path、actor.profile_image_path 的资源托管与完整性）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：图片导入/下载/上传服务；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX assets_checksum_idx ON assets (sha256);

-- 资料 / 主分类树
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{0,63}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  parent_id uuid REFERENCES categories(id),
  description text,
  position integer NOT NULL CHECK (position > 0),
  is_visible boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (parent_id IS DISTINCT FROM id),
  CHECK (NOT is_system OR (code='unsorted' AND parent_id IS NULL AND archived_at IS NULL))
);
COMMENT ON TABLE categories IS '主分类树';
COMMENT ON COLUMN categories.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：category.id；应用：观看端分类范围与管理端分类迁移、排序；关联和路由使用此 ID；写入：分类维护用例/初始化；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN categories.code IS '全局稳定编码，创建后由用例禁止修改；来源类别：沿用；来源：category.category_code；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN categories.name IS '分类展示名；来源类别：沿用；来源：category.cat_name；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN categories.parent_id IS '父分类；NULL 表示根层；来源类别：转换沿用；来源：category.parent_category_code；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：先按旧分类编码定位，再改为新父分类 UUID；检查缺失父节点和环；首版建议：建议保留';
COMMENT ON COLUMN categories.description IS '分类说明；来源类别：方案新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN categories.position IS '同级正整数顺序；来源类别：方案新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：管理端同级分类排序；观看端按此顺序展示；写入：分类维护用例/初始化；迁移/初始化：按迁移报告确认的稳定旧顺序初始化，再允许人工调整；首版建议：建议保留';
COMMENT ON COLUMN categories.is_visible IS '导航可见性；父隐藏时分支也不在范围选择器出现；来源类别：沿用；来源：category.is_visible；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN categories.is_system IS '唯一系统未分类，禁止归档和改变身份；来源类别：方案新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN categories.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：category.is_deleted；应用：观看端分类范围与管理端分类迁移、排序；写入：分类维护用例/初始化；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN categories.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：category.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：分类维护用例/初始化；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN categories.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：category.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：分类维护用例/初始化；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN categories.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：分类维护用例/初始化；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX categories_parent_order_idx ON categories (parent_id, position, id) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX categories_system_uq ON categories (is_system) WHERE is_system;

-- 资料 / 分类树结构版本
CREATE TABLE catalog_revisions (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE catalog_revisions IS '分类树结构版本';
COMMENT ON COLUMN catalog_revisions.singleton IS '仅允许 true 一行，分类结构变更先锁该行；来源类别：技术新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：分类移动、迁移、排序时锁定树的基线；写入：分类维护用例/初始化；迁移/初始化：初始化写 true，revision 从 1 开始；首版建议：建议保留';
COMMENT ON COLUMN catalog_revisions.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：分类维护用例/初始化；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN catalog_revisions.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：分类维护用例/初始化；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN catalog_revisions.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（category 原有分类树；补充产品已规划的分类整理和并发保护）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：分类维护用例/初始化；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 资料 / 作品与剧集资料
CREATE TABLE media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  kind text NOT NULL CHECK (kind IN ('movie','group','show','season','episode','video')),
  parent_id uuid,
  parent_kind text,
  season_number smallint CHECK (season_number >= 0),
  episode_number integer CHECK (episode_number >= 0),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 1000),
  original_title text,
  sort_title text,
  summary text,
  release_year smallint CHECK (release_year BETWEEN 1800 AND 2500),
  release_date date,
  release_precision text NOT NULL DEFAULT 'unknown' CHECK (release_precision IN ('unknown','year','day')),
  declared_runtime_ms bigint CHECK (declared_runtime_ms >= 0),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  published_at timestamptz,
  notes text,
  cover_layout text NOT NULL DEFAULT 'landscape' CHECK (cover_layout IN ('landscape','portrait')),
  supports_chinese boolean,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (id, kind),
  UNIQUE (id, kind, library_id),
  FOREIGN KEY (parent_id, parent_kind, library_id) REFERENCES media_items (id, kind, library_id) DEFERRABLE INITIALLY IMMEDIATE,
  CHECK ((kind IN ('movie','group','show','video') AND parent_id IS NULL AND parent_kind IS NULL AND season_number IS NULL AND episode_number IS NULL) OR (kind='season' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind='show' AND season_number IS NOT NULL AND episode_number IS NULL) OR (kind='episode' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind IN ('group','show','season') AND episode_number IS NOT NULL AND season_number IS NULL)),
  CHECK ((release_precision='unknown' AND release_year IS NULL AND release_date IS NULL) OR (release_precision='year' AND release_year IS NOT NULL AND release_date IS NULL) OR (release_precision='day' AND release_year IS NOT NULL AND release_date IS NOT NULL AND extract(year FROM release_date)=release_year)),
  UNIQUE (parent_id, season_number) DEFERRABLE INITIALLY IMMEDIATE,
  UNIQUE (parent_id, episode_number) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE media_items IS '作品与剧集资料';
COMMENT ON COLUMN media_items.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：movie.id；应用：片库、作品详情、筛选与检索；关联和路由使用此 ID；写入：人工资料维护/接受来源/导入发布；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN media_items.library_id IS '作品只属于一个逻辑库；人物、系列、分类是全局资料；来源类别：方案新增；来源：无旧字段（movie 资料部分；将文件、个人状态和资料分开）；应用：默认逻辑库归属和文件同库校验；写入：人工资料维护/接受来源/导入发布；迁移/初始化：首版旧作品统一映射到明确创建的默认库；首版建议：建议保留';
COMMENT ON COLUMN media_items.kind IS '电影、通用分集作品组、剧、可选季、集、独立视频；上下部/Part1/Part2 使用 group→episode；来源类别：方案新增；来源：无旧字段（用户确认上下部/Part1/Part2 均按集管理；需要不强制季的通用组织）；应用：通用 group→episode；未来 show→episode 或 show→season→episode；组/剧/季不直接绑定播放版本；写入：人工资料维护/接受来源/导入发布；迁移/初始化：14 组旧父项→group，已有子项→episode；普通单文件按内容使用 movie/video。未来剧可直接带集，也可带季；首版建议：建议保留';
COMMENT ON COLUMN media_items.parent_id IS '集可以直接归作品组或剧，也可归可选季；季归剧，不强制设置季；来源类别：拆分重组；来源：movie.parent_movie_code；应用：作品组详情的选集和下一集；父记录原有文件路径另登记盘点，不自动当作新增集或丢弃；写入：人工资料维护/接受来源/导入发布；迁移/初始化：用户已确认 14 组为上下部/Part 等有序分集：父记录→group，子记录→episode；通过旧父编码建立 parent_id，不造季；首版建议：建议保留';
COMMENT ON COLUMN media_items.parent_kind IS '受控父类型判别，用于同库复合外键；group/show/season 均可直接包含集；来源类别：技术新增；来源：无旧字段（有序分集的父子类型及同库引用保护）；应用：复合外键约束父类型和媒体库；避免把分集挂到错误主体；写入：人工资料维护/接受来源/导入发布；迁移/初始化：从实际父记录 kind 写入 group/show/season，不由客户端随意指定；首版建议：建议保留';
COMMENT ON COLUMN media_items.season_number IS '仅季使用，0 可表示特别篇季；来源类别：待定扩展；来源：无旧字段（现有分集没有季，首版不要求；以后确有季时可扩展）；应用：未来可选季编号；集可以直接挂组/剧，不强制补一季；写入：人工资料维护/接受来源/导入发布；迁移/初始化：当前 group→episode 不生成季号；只有真实 season 行才填写季号；首版建议：后置';
COMMENT ON COLUMN media_items.episode_number IS '仅集使用，0 可表示特别集；来源类别：转换沿用；来源：movie.episode_order；应用：作品组选集顺序、下一集和续播定位；写入：人工资料维护/接受来源/导入发布；迁移/初始化：沿用子记录顺序，缺失/重复单独报告；第 1/2/3 集不转成版本内文件段；首版建议：建议保留';
COMMENT ON COLUMN media_items.title IS '观看端标题；来源类别：沿用；来源：movie.display_name；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN media_items.original_title IS '原始语言标题；来源类别：待定扩展；来源：无旧字段（旧实体没有独立原名、排序名或来源宣称时长；本次未证实来源会提供）；应用：未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测；写入：人工资料维护/接受来源/导入发布；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN media_items.sort_title IS '可选排序标题，不作为身份；来源类别：待定扩展；来源：无旧字段（旧实体没有独立原名、排序名或来源宣称时长；本次未证实来源会提供）；应用：未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测；写入：人工资料维护/接受来源/导入发布；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN media_items.summary IS '作品简介；来源类别：沿用；来源：movie.movie_desc；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN media_items.release_year IS '仅知年份也可保存；来源类别：拆分重组；来源：movie.release_date；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日；首版建议：建议保留';
COMMENT ON COLUMN media_items.release_date IS '有完整月日时才保存；来源类别：拆分重组；来源：movie.release_date；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日；首版建议：建议保留';
COMMENT ON COLUMN media_items.release_precision IS '不以 1 月 1 日填补未知月日；来源类别：拆分重组；来源：movie.release_date；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：先解析日期字符串的真实精度；无法确定月日时不补 1 月 1 日；首版建议：建议保留';
COMMENT ON COLUMN media_items.declared_runtime_ms IS '来源宣称时长，和文件探测时长分别保存；来源类别：待定扩展；来源：无旧字段（旧实体没有独立原名、排序名或来源宣称时长；本次未证实来源会提供）；应用：未来多语言资料、特殊排序或来源资料对比；首版显示 title，时长读取本地探测；写入：人工资料维护/接受来源/导入发布；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN media_items.primary_category_id IS '主分类；默认用种子中的未分类 ID；来源类别：转换沿用；来源：movie.category_code；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：通过旧 category_code→新分类 ID 映射；无分类时进入明确的未分类；首版建议：建议保留';
COMMENT ON COLUMN media_items.published_at IS 'NULL 为管理草稿；发布成功才出现在观看端；来源类别：方案新增；来源：无旧字段（movie 资料部分；将文件、个人状态和资料分开）；应用：只有发布成功的资料进入观看端；导入半成品留在草稿；写入：人工资料维护/接受来源/导入发布；迁移/初始化：成功迁入的作品写迁移发布时间并注明来源；不伪造旧发布时间；首版建议：建议保留';
COMMENT ON COLUMN media_items.notes IS '人工备注；来源刷新不覆盖；来源类别：沿用；来源：movie.remark；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN media_items.cover_layout IS '封面展示方向，旧 cover_layout=1→landscape，2→portrait；不等同图片用途或像素尺寸；来源类别：转换沿用；来源：movie.cover_layout；应用：Web/Android 作品卡片和详情封面的横竖展示；写入：人工资料维护/接受来源/导入发布；迁移/初始化：1→landscape；2→portrait；其他值报迁移异常，不按图片宽高覆盖人工偏好；首版建议：建议保留';
COMMENT ON COLUMN media_items.supports_chinese IS '资料层的中文支持标记；旧 1/0 保留为 true/false，新资料未知 NULL；不等同本地字幕检测结果；来源类别：转换沿用；来源：movie.supports_chinese；应用：中文支持筛选与资料标记；播放器真实字幕仍读取文件轨道；写入：人工资料维护/接受来源/导入发布；迁移/初始化：1→true，0→false；新资料未知 NULL；保留为资料标记，不宣称本地检测成功；首版建议：建议保留';
COMMENT ON COLUMN media_items.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：movie.is_deleted；应用：片库、作品详情、筛选与检索；写入：人工资料维护/接受来源/导入发布；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN media_items.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：movie.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工资料维护/接受来源/导入发布；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_items.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：movie.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工资料维护/接受来源/导入发布；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_items.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（movie 资料部分；将文件、个人状态和资料分开）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人工资料维护/接受来源/导入发布；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX media_items_browse_idx ON media_items (library_id, primary_category_id, published_at DESC, id) WHERE published_at IS NOT NULL AND archived_at IS NULL;
CREATE INDEX media_items_parent_idx ON media_items (parent_id);

-- 资料 / 作品发行编号
CREATE TABLE media_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  scheme text NOT NULL,
  value text NOT NULL CHECK (length(btrim(value)) > 0),
  normalized_value text NOT NULL CHECK (length(normalized_value) > 0),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, scheme, normalized_value)
);
COMMENT ON TABLE media_identifiers IS '作品发行编号';
COMMENT ON COLUMN media_identifiers.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；关联和路由使用此 ID；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.media_id IS '所属作品；来源类别：方案新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.scheme IS '编号命名空间，如 catalog-number / imdb；采用白名单契约；来源类别：方案新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.value IS '展示值；来源类别：方案新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.normalized_value IS '按 scheme 规范化后的值；来源类别：方案新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.is_primary IS '当前 scheme 的主要展示编号；来源类别：方案新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：编号展示、搜索与候选匹配；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_identifiers.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie.serial_number；编号与平台内部 ID 分开）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：导入匹配/来源解析/人工编号维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE UNIQUE INDEX media_identifier_primary_uq ON media_identifiers (media_id, scheme) WHERE is_primary;
CREATE INDEX media_identifier_lookup_idx ON media_identifiers (scheme, normalized_value);

-- 文件 / 播放版本
CREATE TABLE editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL,
  media_kind text NOT NULL CHECK (media_kind IN ('movie','episode','video')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  cut text,
  language text,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  FOREIGN KEY (media_id, media_kind) REFERENCES media_items (id, kind),
  UNIQUE (id, media_id)
);
COMMENT ON TABLE editions IS '播放版本';
COMMENT ON COLUMN editions.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；关联和路由使用此 ID；写入：导入复核/版本维护/发布事务；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN editions.media_id IS '所属可播放作品；来源类别：拆分重组；来源：movie.id；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；写入：导入复核/版本维护/发布事务；迁移/初始化：旧普通作品或子集各建默认版本；group 容器不建版本、不假造可播放文件；首版建议：建议保留';
COMMENT ON COLUMN editions.media_kind IS '类型判别列；组、剧与季无法通过复合外键创建播放版本；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：确保版本归可播放条目，防止作品组、剧或季误绑定直接播放；写入：导入复核/版本维护/发布事务；迁移/初始化：从所属 movie/episode/video 复制判别值；group/show/season 为不可播放容器；首版建议：建议保留';
COMMENT ON COLUMN editions.name IS '如 4K 原声版 / 导演剪辑版；来源类别：方案新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：播放器和作品详情选择可播放版本；写入：导入复核/版本维护/发布事务；迁移/初始化：旧单文件作品使用“默认版本”；不自动生成导演剪辑/语言版本事实；首版建议：建议保留';
COMMENT ON COLUMN editions.cut IS '如 theatrical / director，允许来源扩展；来源类别：待定扩展；来源：无旧字段（旧实体无剪辑版本/语言版本身份；实际轨道语言另有探测事实）；应用：未来多个实际版本的选择；没有真实样例前不强迫用户填写；写入：导入复核/版本维护/发布事务；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN editions.language IS '主要音轨语言标签；具体轨道仍在 media_streams；来源类别：待定扩展；来源：无旧字段（旧实体无剪辑版本/语言版本身份；实际轨道语言另有探测事实）；应用：未来多个实际版本的选择；没有真实样例前不强迫用户填写；写入：导入复核/版本维护/发布事务；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN editions.is_default IS '同一作品最多一个有效默认版本；来源类别：方案新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；写入：导入复核/版本维护/发布事务；迁移/初始化：旧单版本标 true；多版本由复核选择，数据库保证至多一个有效默认；首版建议：建议保留';
COMMENT ON COLUMN editions.notes IS '版本备注；来源类别：方案新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；写入：导入复核/版本维护/发布事务；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN editions.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：归档过滤与恢复，不表示删除磁盘视频；写入：导入复核/版本维护/发布事务；迁移/初始化：默认 NULL；明确归档操作写服务端时间；首版建议：建议保留';
COMMENT ON COLUMN editions.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：导入复核/版本维护/发布事务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN editions.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：导入复核/版本维护/发布事务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN editions.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：导入复核/版本维护/发布事务；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE UNIQUE INDEX edition_default_uq ON editions (media_id) WHERE is_default AND archived_at IS NULL;
CREATE INDEX editions_media_idx ON editions (media_id);

-- 文件 / 版本内有序文件段
CREATE TABLE edition_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES editions(id),
  part_no integer NOT NULL CHECK (part_no > 0),
  file_id uuid NOT NULL REFERENCES media_files(id),
  bound_content_revision bigint NOT NULL CHECK (bound_content_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (edition_id, part_no) DEFERRABLE INITIALLY IMMEDIATE,
  UNIQUE (edition_id, file_id),
  UNIQUE (id, edition_id)
);
COMMENT ON TABLE edition_parts IS '版本内有序文件段';
COMMENT ON COLUMN edition_parts.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；关联和路由使用此 ID；写入：导入复核/版本维护/发布事务；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN edition_parts.edition_id IS '所属播放版本；来源类别：方案新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；写入：导入复核/版本维护/发布事务；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN edition_parts.part_no IS 'CD1/CD2 的顺序，不是分集序号；来源类别：方案新增；来源：无旧字段（有序分集与文件分段已区分；旧 episode_order 是集号，不直接迁为文件段序号）；应用：一个具体版本内的物理文件顺序；Part1/Part2 作为分集时各有自己的第 1 段；写入：导入复核/版本维护/发布事务；迁移/初始化：每个单文件版本的段序号为 1；只有确实属于同一集/作品的多个物理文件才维护多个段；首版建议：建议保留';
COMMENT ON COLUMN edition_parts.file_id IS '首版整文件引用，时长从 media_files 读取；来源类别：拆分重组；来源：movie.file_path；应用：作品详情播放选择、分段播放、断点坐标；上下部/Part 已确认为分集；同一集的多个物理文件才作为段；写入：导入复核/版本维护/发布事务；迁移/初始化：映射已登记实际文件的 UUID，普通影片为一个整文件段；首版建议：建议保留';
COMMENT ON COLUMN edition_parts.bound_content_revision IS '发布时确认的文件内容代数；与当前文件不符时停止续播并要求复核，不能直接套旧断点；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：文件被替换后阻止直接复用旧播放关系和断点；写入：导入复核/版本维护/发布事务；迁移/初始化：发布或人工重新绑定时写当前 file.content_revision；首版建议：建议保留';
COMMENT ON COLUMN edition_parts.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie 的实际播放文件和已有父子/分集组织；版本身份与资料身份分开）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：导入复核/版本维护/发布事务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX edition_parts_file_idx ON edition_parts (file_id);

-- 文件 / 版本外挂字幕
CREATE TABLE edition_subtitles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES editions(id),
  file_id uuid NOT NULL REFERENCES media_files(id),
  language text,
  label text,
  is_forced boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (edition_id, file_id)
);
COMMENT ON TABLE edition_subtitles IS '版本外挂字幕';
COMMENT ON COLUMN edition_subtitles.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；关联和路由使用此 ID；写入：未来字幕识别与人工绑定；迁移/初始化：服务端生成；不要求用户填写；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.edition_id IS '字幕属于具体版本，避免不同剪辑时间轴混用；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.file_id IS '外挂字幕文件；用例检查 file_kind=subtitle；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.language IS '字幕语言标签；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.label IS '字幕显示名；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.is_forced IS '是否为强制字幕；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.is_default IS '版本的默认外挂字幕；来源类别：方案新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：未来播放器字幕选择；首版不强制实现；写入：未来字幕识别与人工绑定；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN edition_subtitles.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（外挂字幕版本绑定尚无现有实体/业务数据依据）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来字幕识别与人工绑定；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
CREATE UNIQUE INDEX edition_subtitle_default_uq ON edition_subtitles (edition_id) WHERE is_default;

-- 资料 / 作品图片用途
CREATE TABLE media_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  purpose text NOT NULL CHECK (purpose IN ('poster','backdrop','still')),
  position integer NOT NULL CHECK (position > 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, asset_id, purpose),
  UNIQUE (media_id, purpose, position) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE media_images IS '作品图片用途';
COMMENT ON COLUMN media_images.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：作品卡片、详情海报；背景与剧照按来源能力开放；关联和路由使用此 ID；写入：图片维护/接受来源/发布事务；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN media_images.media_id IS '所属作品；来源类别：方案新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：作品卡片、详情海报；背景与剧照按来源能力开放；写入：图片维护/接受来源/发布事务；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_images.asset_id IS '受控图片资源；来源类别：拆分重组；来源：movie.cover_image_path；应用：作品卡片、详情海报；背景与剧照按来源能力开放；写入：图片维护/接受来源/发布事务；迁移/初始化：先完成图片托管再关联到作品；首版建议：建议保留';
COMMENT ON COLUMN media_images.purpose IS '海报、背景、剧照；来源类别：方案新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：作品卡片、详情海报；背景与剧照按来源能力开放；写入：图片维护/接受来源/发布事务；迁移/初始化：旧封面映射 poster；backdrop/still 仅来源实际提供时启用；首版建议：建议保留';
COMMENT ON COLUMN media_images.position IS '各用途内的顺序；首项为默认展示；来源类别：方案新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：作品卡片、详情海报；背景与剧照按来源能力开放；写入：图片维护/接受来源/发布事务；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_images.is_manual IS '人工保留标记，不被来源撤回时清除；来源类别：方案新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：人工保留的关联在来源刷新时继续存在；写入：图片维护/接受来源/发布事务；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：建议保留';
COMMENT ON COLUMN media_images.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie.cover_image_path；把图片身份和作品用途分开）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：图片维护/接受来源/发布事务；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX media_images_asset_idx ON media_images (asset_id);

-- 资料 / 人物资料
CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 300),
  detailed_name text,
  sort_name text,
  biography text,
  gender text NOT NULL DEFAULT 'unknown' CHECK (gender IN ('unknown','female','male','other')),
  birth_date date,
  portrait_asset_id uuid REFERENCES assets(id),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  merged_into_id uuid REFERENCES people(id),
  merged_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (merged_into_id IS DISTINCT FROM id),
  CHECK ((merged_into_id IS NULL) = (merged_at IS NULL))
);
COMMENT ON TABLE people IS '人物资料';
COMMENT ON COLUMN people.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：actor.id；应用：演员列表、演员详情、参演作品、姓名检索；关联和路由使用此 ID；写入：人物维护/人物补全/接受来源；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN people.full_name IS '人物常用名称，沿用 actor.full_name；不唯一，不作为合并依据；来源类别：沿用；来源：actor.full_name；应用：演员卡片主标题、作品演员区与常用名称检索；写入：人物维护/人物补全/接受来源；迁移/初始化：原文保留为常用名；新姓名不唯一，不能据此合并；首版建议：建议保留';
COMMENT ON COLUMN people.detailed_name IS '人物详细名称，沿用 actor.detailed_name 原文；用于副标题、详情和检索，不按别名拆分；来源类别：沿用；来源：actor.detailed_name；应用：演员详情和资料维护副名称；full_name 与 detailed_name 均参与检索；写入：人物维护/人物补全/接受来源；迁移/初始化：按原文迁移，不拆成 alias；未知 NULL；首版建议：建议保留';
COMMENT ON COLUMN people.sort_name IS '排序名称；来源类别：待定扩展；来源：无旧字段（本次旧实体与人物补全代码没有独立排序名/简介/生日数据；非用户确认必需）；应用：未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准；写入：人物维护/人物补全/接受来源；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN people.biography IS '人物简介；来源类别：待定扩展；来源：无旧字段（本次旧实体与人物补全代码没有独立排序名/简介/生日数据；非用户确认必需）；应用：未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准；写入：人物维护/人物补全/接受来源；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN people.gender IS '未知可用，来源值需显式映射；来源类别：转换沿用；来源：actor.gender；应用：演员列表、演员详情、参演作品、姓名检索；写入：人物维护/人物补全/接受来源；迁移/初始化：核对旧枚举含义后映射；无法确认则 unknown；首版建议：建议保留';
COMMENT ON COLUMN people.birth_date IS '来源确认的出生日期，未知 NULL；来源类别：待定扩展；来源：无旧字段（本次旧实体与人物补全代码没有独立排序名/简介/生日数据；非用户确认必需）；应用：未来有实际来源和详情阅读需求时启用；首版姓名信息以两个已确认字段为准；写入：人物维护/人物补全/接受来源；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN people.portrait_asset_id IS '人物头像；来源类别：拆分重组；来源：actor.profile_image_path；应用：演员列表、演员详情、参演作品、姓名检索；写入：人物维护/人物补全/接受来源；迁移/初始化：导入头像资源并映射 asset ID；缺失记录异常；首版建议：建议保留';
COMMENT ON COLUMN people.primary_category_id IS '人物资料主归属，不限制参演作品范围；来源类别：转换沿用；来源：actor.category；应用：演员列表、演员详情、参演作品、姓名检索；写入：人物维护/人物补全/接受来源；迁移/初始化：核对旧分类编码后映射；不限制参演影片的分类；首版建议：建议保留';
COMMENT ON COLUMN people.merged_into_id IS '合并目标；保留源记录实现旧链接解析；来源类别：方案新增；来源：无旧字段（actor 的资料身份；沿用 full_name / detailed_name，取消别名能力）；应用：管理端合并重复人物与旧链接跳转；合并不同姓名时由用户选保留全名和详细名，不自动生成别名；写入：人物维护/人物补全/接受来源；迁移/初始化：默认 NULL；仅明确合并成功后记录；首版建议：建议保留';
COMMENT ON COLUMN people.merged_at IS '合并完成时间；来源类别：方案新增；来源：无旧字段（actor 的资料身份；沿用 full_name / detailed_name，取消别名能力）；应用：管理端合并重复人物与旧链接跳转；合并不同姓名时由用户选保留全名和详细名，不自动生成别名；写入：人物维护/人物补全/接受来源；迁移/初始化：默认 NULL；仅明确合并成功后记录；首版建议：建议保留';
COMMENT ON COLUMN people.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：actor.is_deleted；应用：演员列表、演员详情、参演作品、姓名检索；写入：人物维护/人物补全/接受来源；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN people.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：actor.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人物维护/人物补全/接受来源；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN people.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：actor.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人物维护/人物补全/接受来源；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN people.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（actor 的资料身份；沿用 full_name / detailed_name，取消别名能力）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人物维护/人物补全/接受来源；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX people_category_idx ON people (primary_category_id, full_name, id) WHERE archived_at IS NULL AND merged_into_id IS NULL;
CREATE INDEX people_portrait_idx ON people (portrait_asset_id) WHERE portrait_asset_id IS NOT NULL;

-- 资料 / 作品演职员关系
CREATE TABLE credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  person_id uuid NOT NULL REFERENCES people(id),
  job text NOT NULL CHECK (job IN ('actor','director','writer','producer','other')),
  character_names text[] NOT NULL DEFAULT '{}'::text[],
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, person_id, job)
);
COMMENT ON TABLE credits IS '作品演职员关系';
COMMENT ON COLUMN credits.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：movie_actor.id；应用：演员下的影片、作品演员区与导演信息；关联和路由使用此 ID；写入：导入发布/演职员维护/人物合并；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN credits.media_id IS '参演或参与制作的作品；来源类别：拆分重组；来源：movie_actor.movie_id、movie.extra_info；应用：演员下的影片、作品演员区与导演信息；写入：导入发布/演职员维护/人物合并；迁移/初始化：演员关系按旧作品映射；导演从结构化 extra_info 解析；首版建议：建议保留';
COMMENT ON COLUMN credits.person_id IS '同一人可同时是演员和导演；来源类别：拆分重组；来源：movie_actor.actor_id、movie.extra_info；应用：演员下的影片、作品演员区与导演信息；写入：导入发布/演职员维护/人物合并；迁移/初始化：演员用旧 actor ID 映射；导演不按同名静默并入演员身份；首版建议：建议保留';
COMMENT ON COLUMN credits.job IS '演职员职责；演员列表筛选 actor；来源类别：拆分重组；来源：movie_actor、movie.extra_info.type；应用：演员下的影片、作品演员区与导演信息；写入：导入发布/演职员维护/人物合并；迁移/初始化：movie_actor→actor；directors/director→director；writer/producer 是后置枚举；首版建议：建议保留';
COMMENT ON COLUMN credits.character_names IS '同一人物同一职责可有多个角色名，避免重复计算参演作品；来源类别：待定扩展；来源：无旧字段（旧演职员关系和已检查抓取中没有角色名资料）；应用：未来适配器明确返回角色名时才启用；首版只展示参演关系和职责；写入：导入发布/演职员维护/人物合并；迁移/初始化：首版不填充、不要求前端录入；启用对应功能前再确定契约；首版建议：后置';
COMMENT ON COLUMN credits.position IS '当前作品内的展示顺序；同位以 ID 稳定排序；来源类别：方案新增；来源：无旧字段（movie_actor；extra_info 中的导演，人物与作品的职责关系）；应用：作品详情演员区与管理端演职员排序；写入：导入发布/演职员维护/人物合并；迁移/初始化：旧库无人工顺序：采用迁移报告确认的稳定顺序，来源提供或人工调整后写入；首版建议：建议保留';
COMMENT ON COLUMN credits.is_manual IS '人工保留的关系；来源类别：方案新增；来源：无旧字段（movie_actor；extra_info 中的导演，人物与作品的职责关系）；应用：人工保留的关联在来源刷新时继续存在；写入：导入发布/演职员维护/人物合并；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：建议保留';
COMMENT ON COLUMN credits.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：movie_actor.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：导入发布/演职员维护/人物合并；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX credits_person_media_idx ON credits (person_id, job, media_id);
CREATE INDEX credits_media_order_idx ON credits (media_id, position, id);

-- 资料 / 作品系列
CREATE TABLE franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
  description text,
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  cover_asset_id uuid REFERENCES assets(id),
  cover_media_id uuid REFERENCES media_items(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (num_nonnulls(cover_asset_id, cover_media_id) <= 1)
);
COMMENT ON TABLE franchises IS '作品系列';
COMMENT ON COLUMN franchises.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：series.id；应用：系列详情、系列下影片、管理端系列整理；关联和路由使用此 ID；写入：系列资料/成员维护/导入发布；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN franchises.name IS '如海岸来信；不等同 show/season；来源类别：沿用；来源：series.series_name；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN franchises.description IS '系列简介；来源类别：方案新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN franchises.primary_category_id IS '主分类；来源类别：转换沿用；来源：series.category；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：校验旧分类编码并映射为 ID；首版建议：建议保留';
COMMENT ON COLUMN franchises.cover_asset_id IS '手工封面资源；来源类别：方案新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：系列详情封面；手工图与借用成员海报二选一；写入：系列资料/成员维护/导入发布；迁移/初始化：旧无此值时 NULL，按产品约定回退到成员海报，不复制或编造旧封面；首版建议：建议保留';
COMMENT ON COLUMN franchises.cover_media_id IS '借用成员作品海报；用例校验该作品属于本系列；来源类别：方案新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：系列详情封面；手工图与借用成员海报二选一；写入：系列资料/成员维护/导入发布；迁移/初始化：旧无此值时 NULL，按产品约定回退到成员海报，不复制或编造旧封面；首版建议：建议保留';
COMMENT ON COLUMN franchises.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：series.is_deleted；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN franchises.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：series.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：系列资料/成员维护/导入发布；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN franchises.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：series.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：系列资料/成员维护/导入发布；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN franchises.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：系列资料/成员维护/导入发布；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX franchises_category_idx ON franchises (primary_category_id, name, id) WHERE archived_at IS NULL;

-- 资料 / 系列有序作品
CREATE TABLE franchise_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES franchises(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  position integer NOT NULL CHECK (position > 0),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (franchise_id, media_id),
  UNIQUE (franchise_id, position) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE franchise_items IS '系列有序作品';
COMMENT ON COLUMN franchise_items.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：系列详情、系列下影片、管理端系列整理；关联和路由使用此 ID；写入：系列资料/成员维护/导入发布；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN franchise_items.franchise_id IS '所属系列；来源类别：拆分重组；来源：movie.series_id、movie.series_code；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：验证两旧字段一致后映射 series→franchises；冲突进入迁移报告；首版建议：建议保留';
COMMENT ON COLUMN franchise_items.media_id IS '系列成员作品；可跨分类和逻辑库；来源类别：拆分重组；来源：movie.id；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：映射有系列归属的旧作品；多系列归属是新增能力；首版建议：建议保留';
COMMENT ON COLUMN franchise_items.position IS '保存的系列顺序；来源类别：方案新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：系列详情、系列下影片、管理端系列整理；写入：系列资料/成员维护/导入发布；迁移/初始化：旧库无人工系列顺序，按明确迁移排序规则初始化并报告，之后允许人工整理；首版建议：建议保留';
COMMENT ON COLUMN franchise_items.is_manual IS '人工保留的成员；来源类别：方案新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：人工保留的关联在来源刷新时继续存在；写入：系列资料/成员维护/导入发布；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：建议保留';
COMMENT ON COLUMN franchise_items.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（series、movie.series_id / series_code；增加成员维护与顺序）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：系列资料/成员维护/导入发布；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX franchise_items_media_idx ON franchise_items (media_id);

-- 资料 / 规范影片类型
CREATE TABLE genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  normalized_name text NOT NULL UNIQUE CHECK (length(normalized_name)>0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE genres IS '规范影片类型';
COMMENT ON COLUMN genres.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID；写入：未来来源词汇映射/类型维护；迁移/初始化：服务端生成；不要求用户填写；首版建议：后置';
COMMENT ON COLUMN genres.name IS '显示名称；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN genres.normalized_name IS '应用按统一规则规范化名称，归档后仍保留身份；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN genres.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：归档过滤与恢复，不表示删除磁盘视频；写入：未来来源词汇映射/类型维护；迁移/初始化：默认 NULL；明确归档操作写服务端时间；首版建议：后置';
COMMENT ON COLUMN genres.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
COMMENT ON COLUMN genres.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
COMMENT ON COLUMN genres.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：未来来源词汇映射/类型维护；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：后置';

-- 资料 / 用户与来源标签
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  normalized_name text NOT NULL CHECK (length(normalized_name)>0),
  primary_category_id uuid NOT NULL REFERENCES categories(id),
  attribute_group text NOT NULL DEFAULT 'other' CHECK (length(btrim(attribute_group)) > 0),
  is_visible boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (primary_category_id, attribute_group, normalized_name)
);
COMMENT ON TABLE tags IS '用户与来源标签';
COMMENT ON COLUMN tags.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：tag.id；应用：作品筛选、资料标签选择器与分组维护；关联和路由使用此 ID；写入：标签维护/导入发布/接受来源；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN tags.name IS '显示名称；来源类别：沿用；来源：tag.tag_name；应用：作品筛选、资料标签选择器与分组维护；写入：标签维护/导入发布/接受来源；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN tags.normalized_name IS '规范化名称，仅在同一分类与属性组内用于重名校验；不按全库同名静默合并；来源类别：转换沿用；来源：tag.tag_name；应用：作品筛选、资料标签选择器与分组维护；写入：标签维护/导入发布/接受来源；迁移/初始化：用于匹配的规范化派生值，不修改原显示名；不同分类/属性组的同名标签不合并；首版建议：建议保留';
COMMENT ON COLUMN tags.primary_category_id IS '标签所属分类，沿用 tag.category 的分类编码映射；来源类别：转换沿用；来源：tag.category；应用：标签维护与标签选择器按分类显示；写入：标签维护/导入发布/接受来源；迁移/初始化：旧分类编码→新分类 ID；首版建议：建议保留';
COMMENT ON COLUMN tags.attribute_group IS '标签属性分组，沿用 tag.attr_value；如 theme/role/clothing，首版沿用既有分组码；来源类别：沿用；来源：tag.attr_value；应用：按主题、角色、服装等属性分组维护和选择标签；写入：标签维护/导入发布/接受来源；迁移/初始化：沿用现有分组码，不自动拆为类型、机构或角色实体；首版建议：建议保留';
COMMENT ON COLUMN tags.is_visible IS '标签选择器与导航中的显示开关，沿用 tag.is_visible；隐藏不归档、不删除已有作品关联；来源类别：转换沿用；来源：tag.is_visible；应用：新选择时隐藏该标签；既有作品详情仍可展示已关联标签，不等同归档；写入：标签维护/导入发布/接受来源；迁移/初始化：1→true，0→false；隐藏保留已有关系；首版建议：建议保留';
COMMENT ON COLUMN tags.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：tag.is_deleted；应用：作品筛选、资料标签选择器与分组维护；写入：标签维护/导入发布/接受来源；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN tags.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：tag.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：标签维护/导入发布/接受来源；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN tags.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：tag.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：标签维护/导入发布/接受来源；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN tags.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（tag、movie_tag，保留分类归属、属性组和可见性）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：标签维护/导入发布/接受来源；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX tags_group_idx ON tags (primary_category_id, attribute_group, name, id) WHERE archived_at IS NULL;

-- 资料 / 作品类型关联
CREATE TABLE media_genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  genre_id uuid NOT NULL REFERENCES genres(id),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, genre_id)
);
COMMENT ON TABLE media_genres IS '作品类型关联';
COMMENT ON COLUMN media_genres.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID；写入：未来来源词汇映射/类型维护；迁移/初始化：服务端生成；不要求用户填写；首版建议：后置';
COMMENT ON COLUMN media_genres.media_id IS '所属作品；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN media_genres.genre_id IS '类型或标签；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN media_genres.is_manual IS '人工保留的关系，不被来源刷新覆盖；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：人工保留的关联在来源刷新时继续存在；写入：未来来源词汇映射/类型维护；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：后置';
COMMENT ON COLUMN media_genres.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
CREATE INDEX media_genres_reverse_idx ON media_genres (genre_id, media_id);

-- 资料 / 作品标签关联
CREATE TABLE media_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  tag_id uuid NOT NULL REFERENCES tags(id),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, tag_id)
);
COMMENT ON TABLE media_tags IS '作品标签关联';
COMMENT ON COLUMN media_tags.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：movie_tag.id；应用：作品筛选、资料标签选择器与分组维护；关联和路由使用此 ID；写入：标签维护/导入发布/接受来源；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN media_tags.media_id IS '所属作品；来源类别：转换沿用；来源：movie_tag.movie_id；应用：作品筛选、资料标签选择器与分组维护；写入：标签维护/导入发布/接受来源；迁移/初始化：通过旧 movie ID 映射为新作品 UUID；首版建议：建议保留';
COMMENT ON COLUMN media_tags.tag_id IS '类型或标签；来源类别：转换沿用；来源：movie_tag.tag_id；应用：作品筛选、资料标签选择器与分组维护；写入：标签维护/导入发布/接受来源；迁移/初始化：通过旧 tag ID 映射为新标签 UUID；不按同名乱合并；首版建议：建议保留';
COMMENT ON COLUMN media_tags.is_manual IS '人工保留的关系，不被来源刷新覆盖；来源类别：方案新增；来源：无旧字段（tag、movie_tag，保留分类归属、属性组和可见性）；应用：人工保留的关联在来源刷新时继续存在；写入：标签维护/导入发布/接受来源；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：建议保留';
COMMENT ON COLUMN media_tags.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：movie_tag.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：标签维护/导入发布/接受来源；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX media_tags_reverse_idx ON media_tags (tag_id, media_id);

-- 资料 / 片商与发行机构
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
  description text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE organizations IS '片商与发行机构';
COMMENT ON COLUMN organizations.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：作品资料中的片商，不增加独立机构管理产品模块；关联和路由使用此 ID；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN organizations.name IS '机构名称，不按名字自动合并；来源类别：拆分重组；来源：movie.extra_info.name；应用：作品资料中的片商，不增加独立机构管理产品模块；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：只取 makers/studio 片商项，保留类型与 code 的原始迁移归档；首版建议：建议保留';
COMMENT ON COLUMN organizations.description IS '机构说明；来源类别：方案新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：作品资料中的片商，不增加独立机构管理产品模块；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN organizations.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：归档过滤与恢复，不表示删除磁盘视频；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：默认 NULL；明确归档操作写服务端时间；首版建议：建议保留';
COMMENT ON COLUMN organizations.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN organizations.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN organizations.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 资料 / 作品机构关系
CREATE TABLE media_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  role text NOT NULL CHECK (role IN ('studio','publisher','label')),
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, organization_id, role)
);
COMMENT ON TABLE media_organizations IS '作品机构关系';
COMMENT ON COLUMN media_organizations.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：作品资料中的片商，不增加独立机构管理产品模块；关联和路由使用此 ID；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN media_organizations.media_id IS '所属作品；来源类别：拆分重组；来源：movie.id；应用：作品资料中的片商，不增加独立机构管理产品模块；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：关联存在片商资料的作品；首版建议：建议保留';
COMMENT ON COLUMN media_organizations.organization_id IS '片商或发行机构；来源类别：拆分重组；来源：movie.extra_info.code、movie.extra_info.name；应用：作品资料中的片商，不增加独立机构管理产品模块；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：依据来源身份复用机构，不能仅按名字静默合并；首版建议：建议保留';
COMMENT ON COLUMN media_organizations.role IS '制作片商、发行、品牌；来源类别：转换沿用；来源：movie.extra_info.type；应用：作品资料中的片商，不增加独立机构管理产品模块；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：makers/studio→studio；publisher/label 作为后置枚举；首版建议：建议保留';
COMMENT ON COLUMN media_organizations.is_manual IS '人工保留标记；来源类别：方案新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：人工保留的关联在来源刷新时继续存在；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：明确的人工新增/保留动作写 true；旧关系来源无法确定时采用保守保护并记录迁移策略；首版建议：建议保留';
COMMENT ON COLUMN media_organizations.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（movie.extra_info 的 makers/studio 片商信息）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：两代 extra_info 迁移/来源解析/人工复核；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX media_org_reverse_idx ON media_organizations (organization_id, media_id);

-- 个人 / 私人收藏夹
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  normalized_name text NOT NULL CHECK (length(normalized_name)>0),
  description text,
  cover_asset_id uuid REFERENCES assets(id),
  cover_media_id uuid REFERENCES media_items(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (num_nonnulls(cover_asset_id, cover_media_id) <= 1)
);
COMMENT ON TABLE collections IS '私人收藏夹';
COMMENT ON COLUMN collections.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：collections.id；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；关联和路由使用此 ID；写入：个人收藏夹用例；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN collections.profile_id IS '所属个人资料；API 从会话取得；来源类别：方案新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：全部旧收藏夹归默认单账号的默认 profile；不建立多资料切换入口；首版建议：建议保留';
COMMENT ON COLUMN collections.name IS '收藏夹显示名；来源类别：沿用；来源：collections.coll_name；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：保留业务含义；类型/ID 转换须由迁移程序验证；首版建议：建议保留';
COMMENT ON COLUMN collections.normalized_name IS '规范化名称，用于 profile 内重名判断；来源类别：转换沿用；来源：collections.coll_name；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：规范化派生，用于重名检查；若新约束冲突报报告，不静默删夹；首版建议：建议保留';
COMMENT ON COLUMN collections.description IS '收藏夹说明；来源类别：方案新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN collections.cover_asset_id IS '手工封面；来源类别：方案新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：收藏页与收藏夹详情封面；借用封面作品必须为本夹成员；写入：个人收藏夹用例；迁移/初始化：旧无自定义封面，默认 NULL 并按首个成员回退；首版建议：建议保留';
COMMENT ON COLUMN collections.cover_media_id IS '借用本夹成员作品封面；来源类别：方案新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：收藏页与收藏夹详情封面；借用封面作品必须为本夹成员；写入：个人收藏夹用例；迁移/初始化：旧无自定义封面，默认 NULL 并按首个成员回退；首版建议：建议保留';
COMMENT ON COLUMN collections.archived_at IS '归档时间；NULL 表示未归档，保留原记录及关系；来源类别：转换沿用；来源：collections.is_deleted；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：未删除→NULL；旧删除行若归档，以迁移记录时间表达当前归档状态，迁移报告注明历史删除时间未知；首版建议：建议保留';
COMMENT ON COLUMN collections.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：collections.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：个人收藏夹用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN collections.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：collections.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：个人收藏夹用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN collections.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：个人收藏夹用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE UNIQUE INDEX collection_active_name_uq ON collections (profile_id, normalized_name) WHERE archived_at IS NULL;

-- 个人 / 收藏夹有序成员
CREATE TABLE collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  position integer NOT NULL CHECK (position > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (collection_id, media_id),
  UNIQUE (collection_id, position) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE collection_items IS '收藏夹有序成员';
COMMENT ON COLUMN collection_items.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：拆分重组；来源：collections_movie.id；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；关联和路由使用此 ID；写入：个人收藏夹用例；迁移/初始化：生成 UUID，并按迁移策略保留旧 ID 到新 ID 的映射；不按同名自动合并；首版建议：建议保留';
COMMENT ON COLUMN collection_items.collection_id IS '所属收藏夹；来源类别：转换沿用；来源：collections_movie.collection_id；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：通过旧收藏夹 ID 映射；首版建议：建议保留';
COMMENT ON COLUMN collection_items.media_id IS '作品，可跨逻辑库和分类；来源类别：转换沿用；来源：collections_movie.movie_id；应用：观看端收藏夹浏览、作品加入多个收藏夹、整理模式；写入：个人收藏夹用例；迁移/初始化：通过旧作品 ID 映射；保持一个作品加入多个收藏夹；首版建议：建议保留';
COMMENT ON COLUMN collection_items.position IS '收藏夹自定义顺序；展示排序不改写本字段；来源类别：方案新增；来源：无旧字段（collections、collections_movie；增加整理顺序和封面方案）；应用：收藏夹“整理”模式拖动顺序，浏览临时排序不改此值；写入：个人收藏夹用例；迁移/初始化：旧无显式顺序，按旧关系创建时间/ID 的确定规则初始化；这是新顺序，不冒称旧人工排序；首版建议：建议保留';
COMMENT ON COLUMN collection_items.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：collections_movie.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：个人收藏夹用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX collection_items_media_idx ON collection_items (media_id, collection_id);

-- 个人 / 个人作品状态
CREATE TABLE user_media_state (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  media_id uuid NOT NULL REFERENCES media_items(id),
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  watched_at timestamptz,
  last_played_at timestamptz,
  resume_edition_id uuid,
  takeover_generation bigint NOT NULL DEFAULT 0 CHECK (takeover_generation >= 0),
  memberships_revision bigint NOT NULL DEFAULT 1 CHECK (memberships_revision > 0),
  legacy_play_count bigint NOT NULL DEFAULT 0 CHECK (legacy_play_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  PRIMARY KEY (profile_id, media_id),
  FOREIGN KEY (resume_edition_id, media_id) REFERENCES editions (id, media_id) DEFERRABLE INITIALLY IMMEDIATE,
  CHECK (is_favorite OR favorited_at IS NULL)
);
COMMENT ON TABLE user_media_state IS '个人作品状态';
COMMENT ON COLUMN user_media_state.profile_id IS '当前个人资料；来源类别：方案新增；来源：无旧字段（movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开）；应用：喜欢、评分筛选、继续观看、作品的收藏夹选择；写入：个人状态/评分/播放用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.media_id IS '作品身份，与播放版本独立；来源类别：拆分重组；来源：movie.id；应用：喜欢、评分筛选、继续观看、作品的收藏夹选择；写入：个人状态/评分/播放用例；迁移/初始化：个人状态关联到作品，而非文件；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.is_favorite IS '喜欢影片，不表示加入某个收藏夹；来源类别：转换沿用；来源：movie.is_favorite；应用：喜欢、评分筛选、继续观看、作品的收藏夹选择；写入：个人状态/评分/播放用例；迁移/初始化：1→true，0/明确空语义→false；不自动加入收藏夹；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.favorited_at IS '最近喜欢时间；旧库无时间时保留 NULL，新喜欢动作写服务端时间；取消喜欢置 NULL；来源类别：方案新增；来源：无旧字段（movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开）；应用：最近喜欢排序；旧时间未知排在已知时间之后；写入：个人状态/评分/播放用例；迁移/初始化：新喜欢动作写服务端时间；旧库没有喜欢时间，允许 true+NULL，取消后清空；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.rating IS '个人 1～5 星整数；NULL 表示未评分；来源类别：转换沿用；来源：movie.user_rating；应用：作品详情点选 1～5 星、取消评分、评分筛选与排序；与喜欢和网站评分独立；写入：个人评分用例：设置 1～5 或清空为 NULL；迁移/初始化：合法 1～5 整数原值迁入；NULL 保持未评分；0 或越界值报异常；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.watched_at IS '最近标记已看时间；NULL 表示未标记；来源类别：方案新增；来源：无旧字段（旧 watch_progress 可达 100，但没有独立已看时间）；应用：“已看”筛选和人工标记；改变已看不强制修改断点；写入：个人状态/评分/播放用例；迁移/初始化：默认 NULL；只由新的个人标记动作写入，不根据旧百分比或新播放结束自动补造；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.last_played_at IS '最近有效播放时间，服务端记录；来源类别：沿用；来源：movie.last_played_at；应用：最近播放时间；可保留旧历史汇总，但续播必须同时有新系统有效未完成 progress，不能仅凭该时间推断断点；写入：个人状态/评分/播放用例；迁移/初始化：保留已知旧时间；未知为 NULL；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.resume_edition_id IS '作品当前接续版本；来源类别：技术新增；来源：无旧字段（用户确认不迁移旧进度；续播入口仅由新真实播放建立）；应用：联合新 progress 的有效坐标与未完成状态展示续播；不以旧最近播放时间生成卡片；写入：个人状态/评分/播放用例；迁移/初始化：迁移初始化 NULL；实际定位并起播成功后更新到该集/作品版本；group 始终不填写；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.takeover_generation IS '作品级播放接管代数，新会话原子递增；来源类别：技术新增；来源：无旧字段（movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开）；应用：分别保护跨设备播放接管和多收藏夹选择，防止旧请求覆盖新选择；写入：个人状态/评分/播放用例；迁移/初始化：旧无此值：接管代数 0，收藏夹成员版本 1，由服务端用例更新；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.memberships_revision IS '该作品多收藏夹成员选择的并发版本；来源类别：技术新增；来源：无旧字段（movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开）；应用：分别保护跨设备播放接管和多收藏夹选择，防止旧请求覆盖新选择；写入：个人状态/评分/播放用例；迁移/初始化：旧无此值：接管代数 0，收藏夹成员版本 1，由服务端用例更新；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.legacy_play_count IS '旧库迁入的不可重建播放次数；新次数来自已开始会话；来源类别：拆分重组；来源：movie.play_count；应用：保留历史累计基数；与新 has_started 会话计数共同用于播放次数筛选/排序，不是完播次数；写入：个人状态/评分/播放用例；迁移/初始化：保留旧累计基数；新播放次数从实际已开始会话计算，不伪造历史事件；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：movie.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：个人状态/评分/播放用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：movie.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：个人状态/评分/播放用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN user_media_state.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（movie 的喜欢、评分、播放次数和接续入口；与作品公共资料分开）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：个人状态/评分/播放用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX user_media_favorites_idx ON user_media_state (profile_id, favorited_at DESC NULLS LAST, media_id) WHERE is_favorite;
CREATE INDEX user_media_continue_idx ON user_media_state (profile_id, last_played_at DESC, media_id) WHERE resume_edition_id IS NOT NULL;

-- 个人 / 个人喜欢人物
CREATE TABLE user_person_state (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  person_id uuid NOT NULL REFERENCES people(id),
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  PRIMARY KEY (profile_id, person_id),
  CHECK (is_favorite OR favorited_at IS NULL)
);
COMMENT ON TABLE user_person_state IS '个人喜欢人物';
COMMENT ON COLUMN user_person_state.profile_id IS '所属个人资料；来源类别：方案新增；来源：无旧字段（actor.is_collected；人物喜欢独立于参演关系）；应用：收藏页人物视图与演员详情喜欢按钮；写入：人物喜欢用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.person_id IS '人物身份；合并时迁移到有效目标；来源类别：转换沿用；来源：actor.id；应用：收藏页人物视图与演员详情喜欢按钮；写入：人物喜欢用例；迁移/初始化：通过旧演员 ID 映射到人物身份；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.is_favorite IS '喜欢该人物；来源类别：转换沿用；来源：actor.is_collected；应用：收藏页人物视图与演员详情喜欢按钮；写入：人物喜欢用例；迁移/初始化：1→true；旧 NULL/0 按现有未收藏语义归为 false；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.favorited_at IS '最近喜欢时间；旧库无时间时保留 NULL，新喜欢动作写服务端时间；取消喜欢置 NULL；来源类别：方案新增；来源：无旧字段（actor.is_collected；人物喜欢独立于参演关系）；应用：最近喜欢排序；旧时间未知排在已知时间之后；写入：人物喜欢用例；迁移/初始化：新喜欢动作写服务端时间；旧库没有喜欢时间，允许 true+NULL，取消后清空；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.created_at IS '服务端创建时间，UTC 时间点；来源类别：转换沿用；来源：actor.created_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人物喜欢用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.updated_at IS '服务端最后更新时间；来源类别：转换沿用；来源：actor.updated_at；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人物喜欢用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN user_person_state.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（actor.is_collected；人物喜欢独立于参演关系）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人物喜欢用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX user_person_favorites_idx ON user_person_state (profile_id, favorited_at DESC NULLS LAST, person_id) WHERE is_favorite;

-- 播放 / 一次播放会话
CREATE TABLE playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  device_id uuid NOT NULL,
  media_id uuid NOT NULL REFERENCES media_items(id),
  edition_id uuid NOT NULL,
  start_mode text NOT NULL CHECK (start_mode IN ('fresh','resume','restart')),
  start_part_id uuid NOT NULL,
  start_position_ms bigint NOT NULL CHECK (start_position_ms >= 0),
  takeover_generation bigint NOT NULL CHECK (takeover_generation > 0),
  last_seq bigint NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
  has_started boolean NOT NULL DEFAULT false,
  last_received_at timestamptz,
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('ended','closed','taken_over','expired')),
  created_at timestamptz NOT NULL DEFAULT now() ,
  FOREIGN KEY (device_id, profile_id) REFERENCES devices (id, profile_id),
  FOREIGN KEY (edition_id, media_id) REFERENCES editions (id, media_id),
  UNIQUE (id, profile_id, edition_id),
  UNIQUE (id, edition_id),
  UNIQUE (profile_id, media_id, takeover_generation),
  CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
  FOREIGN KEY (start_part_id, edition_id) REFERENCES edition_parts (id, edition_id),
  CHECK (start_mode='resume' OR start_position_ms=0)
);
COMMENT ON TABLE playback_sessions IS '一次播放会话';
COMMENT ON COLUMN playback_sessions.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；关联和路由使用此 ID；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.profile_id IS '当前个人资料；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.device_id IS '发起设备，复合外键保证设备归属；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.media_id IS '可播放作品；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.edition_id IS '实际版本，复合外键保证属于该作品；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.start_mode IS '本次起播模式；新播、续播、明确从头，固定于会话创建事务；来源类别：方案新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：区分首次播放、继续播放和明确从头；重试使用同一会话固定意图；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：创建会话事务按用户意图及有效进度确定 fresh/resume/restart；首次不写 progress；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.start_part_id IS '固定起播文件段，必须属于本会话版本；加载失败不覆盖原断点；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：客户端真正加载的起播文件段；复合外键确保属于本会话版本；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：事务重查最新有效目标后保存；不是从旧 file_path 补造会话；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.start_position_ms IS '固定起播目标毫秒；定位确认前禁止上报默认零位置；来源类别：方案新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：播放器就绪后必须定位到该毫秒位置，再确认实际起播；避免默认 0 覆盖断点；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：resume 取新系统已确认断点；fresh/restart 为 0。旧百分比和旧毫秒均不导入；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.takeover_generation IS '创建会话时分配的接管代数；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.last_seq IS '本会话已处理的最大递增序号，保留到会话清理；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.has_started IS '确认真实定位并实际播放后才置 true；创建会话与加载失败不计播放；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：确认目标定位并实际播放才置 true；重复 start 不重复计数，加载失败不计播放；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.last_received_at IS '服务端最近接收事件时间；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.ended_at IS '会话结束时间；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.end_reason IS '结束原因；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_sessions.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
CREATE INDEX playback_history_idx ON playback_sessions (profile_id, created_at DESC, id) WHERE has_started;

-- 播放 / 播放事件与去重
CREATE TABLE playback_events (
  session_id uuid NOT NULL,
  seq bigint NOT NULL CHECK (seq > 0),
  event_id uuid NOT NULL UNIQUE,
  edition_id uuid NOT NULL,
  part_id uuid NOT NULL,
  position_ms bigint NOT NULL CHECK (position_ms >= 0),
  kind text NOT NULL CHECK (kind IN ('start','progress','pause','seek','ended')),
  client_occurred_at timestamptz,
  applied_to_resume boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, edition_id) REFERENCES playback_sessions (id, edition_id),
  FOREIGN KEY (part_id, edition_id) REFERENCES edition_parts (id, edition_id)
);
COMMENT ON TABLE playback_events IS '播放事件与去重';
COMMENT ON COLUMN playback_events.session_id IS '所属会话；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.seq IS '客户端会话内递增序号，允许跳号但拒绝回退覆盖；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.event_id IS '客户端稳定生成的事件去重 ID；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.edition_id IS '类型归属校验列，不允许跳到另一版本；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.part_id IS '当前版本的实际文件段；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：精确绑定新系统实际播放的集/版本/文件段；组本身不建立断点；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.position_ms IS '段内毫秒位置；主动 seek 后退合法；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.kind IS '事件种类；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.client_occurred_at IS '客户端时间，仅供诊断，不用来决定跨设备先后；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.applied_to_resume IS '是否实际更新当前断点；旧代数补发可记历史但不覆盖；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_events.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
CREATE INDEX playback_events_retention_idx ON playback_events (created_at);

-- 播放 / 每个版本的最新断点
CREATE TABLE playback_progress (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  edition_id uuid NOT NULL REFERENCES editions(id),
  session_id uuid NOT NULL,
  last_seq bigint NOT NULL CHECK (last_seq > 0),
  part_id uuid NOT NULL,
  position_ms bigint NOT NULL CHECK (position_ms >= 0),
  completed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (profile_id, edition_id),
  FOREIGN KEY (session_id, profile_id, edition_id) REFERENCES playback_sessions (id, profile_id, edition_id),
  FOREIGN KEY (session_id, last_seq) REFERENCES playback_events (session_id, seq),
  FOREIGN KEY (part_id, edition_id) REFERENCES edition_parts (id, edition_id)
);
COMMENT ON TABLE playback_progress IS '每个版本的最新断点';
COMMENT ON COLUMN playback_progress.profile_id IS '个人资料；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.edition_id IS '具体版本，不按电影百分比互相覆盖；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.session_id IS '产生当前断点的会话；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.last_seq IS '当前断点对应的已持久化事件序号；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.part_id IS '版本内的有序文件段；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：精确绑定新系统实际播放的集/版本/文件段；组本身不建立断点；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.position_ms IS '文件段内毫秒位置；来源类别：方案新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：段内实际毫秒位置；定位确认前不更新，接受用户主动后退，不用百分比恢复；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.completed_at IS '最后一个文件段自然结束时写入；有效重新起播/seek 时清空；不等于手动已看；来源类别：方案新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：真实播放完最后一段时写入，继续观看排除完成项；不自动改变手动 watched_at；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：新进度默认 NULL；自然结束写服务端时间，有效重新起播或 seek 后清空；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.received_at IS '服务器接受当前断点的时间；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：继续观看、播放断点、防止旧设备补发覆盖；事件明细保留策略仍需收敛；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';
COMMENT ON COLUMN playback_progress.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户确认观看进度重新设计；旧 watch_progress / last_play_position_ms 全部不迁；新状态仅来自真实定位与播放）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：播放开始用例/客户端事件接收/进度投影；迁移/初始化：初始化为空；只由新会话/真实播放器事件建立，不补造旧播放事件或断点；首版建议：建议保留';

-- 来源 / 资料来源注册
CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{0,63}$'),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('remote','local')),
  adapter_version text NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE providers IS '资料来源注册';
COMMENT ON COLUMN providers.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：管理端来源开关、凭据引用和外网抓取诊断；关联和路由使用此 ID；写入：启动注册/来源设置；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN providers.code IS '稳定适配器 ID，如 javdb / nfo；来源类别：方案新增；来源：无旧字段（现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：适配器启动注册 code、名称、版本、能力；只有实现的能力才声明；首版建议：建议保留';
COMMENT ON COLUMN providers.name IS '用户可读来源名称；来源类别：方案新增；来源：无旧字段（现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：适配器启动注册 code、名称、版本、能力；只有实现的能力才声明；首版建议：建议保留';
COMMENT ON COLUMN providers.kind IS '在线来源或本地旁车解析器；来源类别：方案新增；来源：无旧字段（现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：已有两个来源登记 remote；local/NFO 为后置能力，不登记未实现来源；首版建议：建议保留';
COMMENT ON COLUMN providers.adapter_version IS '已安装适配器版本；来源类别：方案新增；来源：无旧字段（现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：适配器启动注册 code、名称、版本、能力；只有实现的能力才声明；首版建议：建议保留';
COMMENT ON COLUMN providers.capabilities IS '已安装适配器声明的能力快照，代码注册表仍为执行依据；来源类别：方案新增；来源：无旧字段（现有 JavService 与 HavtwService 已有不同抓取能力；用户明确插件式扩展）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：适配器启动注册 code、名称、版本、能力；只有实现的能力才声明；首版建议：建议保留';
COMMENT ON COLUMN providers.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：启动注册/来源设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN providers.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：启动注册/来源设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN providers.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：启动注册/来源设置；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 来源运行配置
CREATE TABLE provider_configs (
  provider_id uuid PRIMARY KEY REFERENCES providers(id),
  enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings)='object'),
  credential_ref text,
  outbound_policy jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(outbound_policy)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE provider_configs IS '来源运行配置';
COMMENT ON COLUMN provider_configs.provider_id IS '首版每个来源一份运行配置；来源类别：方案新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.enabled IS '是否启用来源；来源类别：方案新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：管理端来源开关、凭据引用和外网抓取诊断；写入：启动注册/来源设置；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.settings IS '按适配器 schema 校验的非敏感配置，不放 Cookie；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：来源设置、抓取登录和外网出站诊断，不为观看端开放凭据；写入：启动注册/来源设置；迁移/初始化：从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.credential_ref IS '凭据存储引用，不是凭据正文；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：来源设置、抓取登录和外网出站诊断，不为观看端开放凭据；写入：启动注册/来源设置；迁移/初始化：从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.outbound_policy IS '受控代理引用、域名规则、并发和超时；平台代码设上限；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：来源设置、抓取登录和外网出站诊断，不为观看端开放凭据；写入：启动注册/来源设置；迁移/初始化：从受控配置初始化；凭据只存引用，出站代理策略由部署设置，不能把 Cookie 填普通设置；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：启动注册/来源设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：启动注册/来源设置；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN provider_configs.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（现有 JavService / HavtwService；用户明确要求可扩展抓取来源）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：启动注册/来源设置；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 尚未或已经入库的来源身份
CREATE TABLE source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  entity_kind text NOT NULL CHECK (entity_kind IN ('media','person','franchise')),
  external_id text NOT NULL CHECK (length(btrim(external_id)) > 0),
  source_url text,
  local_file_id uuid REFERENCES media_files(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (provider_id, entity_kind, external_id),
  UNIQUE (id, entity_kind)
);
COMMENT ON TABLE source_records IS '尚未或已经入库的来源身份';
COMMENT ON COLUMN source_records.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；关联和路由使用此 ID；写入：来源适配器/候选匹配/人工接受；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN source_records.provider_id IS '来源命名空间；来源类别：方案新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN source_records.entity_kind IS '同站作品 ID 和人物 ID 不共享身份空间；来源类别：方案新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN source_records.external_id IS '来源内部稳定 ID；NFO 使用受控 sidecar file UUID 字符串；来源类别：拆分重组；来源：actor.actor_code、series.series_code、movie.extra_info.code；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：仅当确认是来源页面身份才映射；作品来源 ID 从实际抓取页提取，不能把 movie_code 当作 JavDB ID；首版建议：建议保留';
COMMENT ON COLUMN source_records.source_url IS '用于审阅的规范来源 URL，禁止包含凭据；来源类别：方案新增；来源：无旧字段（当前抓取使用页面地址，但核心实体未统一保存来源 URL）；应用：管理端跳转来源与抓取诊断；写入：来源适配器/候选匹配/人工接受；迁移/初始化：适配器写入实际来源详情页 URL；不伪造地址；首版建议：建议保留';
COMMENT ON COLUMN source_records.local_file_id IS '仅本地来源使用，指向 NFO 等受控旁车文件；来源类别：待定扩展；来源：无旧字段（NFO/sidecar 尚未确认）；应用：未来本地来源的身份绑定；首版远程来源保持 NULL；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_records.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN source_records.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN source_records.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：来源适配器/候选匹配/人工接受；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 来源作品映射
CREATE TABLE provider_media (
  source_record_id uuid PRIMARY KEY,
  entity_kind text NOT NULL DEFAULT 'media' CHECK (entity_kind='media'),
  media_id uuid NOT NULL REFERENCES media_items(id),
  created_at timestamptz NOT NULL DEFAULT now() ,
  FOREIGN KEY (source_record_id, entity_kind) REFERENCES source_records (id, entity_kind),
  UNIQUE (source_record_id, media_id)
);
COMMENT ON TABLE provider_media IS '来源作品映射';
COMMENT ON COLUMN provider_media.source_record_id IS '每个来源身份至多映射一个平台实体；来源类别：方案新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN provider_media.entity_kind IS '固定类型判别，防止把人物来源误连到作品；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：固定判别列，防止把人物来源链接到作品或系列；写入：来源适配器/候选匹配/人工接受；迁移/初始化：按表固定写 media/person/franchise，不能由用户自由选；首版建议：建议保留';
COMMENT ON COLUMN provider_media.media_id IS '平台实体，允许多个来源身份指向同一实体；来源类别：拆分重组；来源：movie.id；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体；首版建议：建议保留';
COMMENT ON COLUMN provider_media.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX provider_media_target_idx ON provider_media (media_id);

-- 来源 / 来源人物映射
CREATE TABLE provider_people (
  source_record_id uuid PRIMARY KEY,
  entity_kind text NOT NULL DEFAULT 'person' CHECK (entity_kind='person'),
  person_id uuid NOT NULL REFERENCES people(id),
  created_at timestamptz NOT NULL DEFAULT now() ,
  FOREIGN KEY (source_record_id, entity_kind) REFERENCES source_records (id, entity_kind),
  UNIQUE (source_record_id, person_id)
);
COMMENT ON TABLE provider_people IS '来源人物映射';
COMMENT ON COLUMN provider_people.source_record_id IS '每个来源身份至多映射一个平台实体；来源类别：方案新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN provider_people.entity_kind IS '固定类型判别，防止把人物来源误连到作品；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：固定判别列，防止把人物来源链接到作品或系列；写入：来源适配器/候选匹配/人工接受；迁移/初始化：按表固定写 media/person/franchise，不能由用户自由选；首版建议：建议保留';
COMMENT ON COLUMN provider_people.person_id IS '平台实体，允许多个来源身份指向同一实体；来源类别：拆分重组；来源：actor.id；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体；首版建议：建议保留';
COMMENT ON COLUMN provider_people.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX provider_people_target_idx ON provider_people (person_id);

-- 来源 / 来源系列映射
CREATE TABLE provider_franchises (
  source_record_id uuid PRIMARY KEY,
  entity_kind text NOT NULL DEFAULT 'franchise' CHECK (entity_kind='franchise'),
  franchise_id uuid NOT NULL REFERENCES franchises(id),
  created_at timestamptz NOT NULL DEFAULT now() ,
  FOREIGN KEY (source_record_id, entity_kind) REFERENCES source_records (id, entity_kind),
  UNIQUE (source_record_id, franchise_id)
);
COMMENT ON TABLE provider_franchises IS '来源系列映射';
COMMENT ON COLUMN provider_franchises.source_record_id IS '每个来源身份至多映射一个平台实体；来源类别：方案新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN provider_franchises.entity_kind IS '固定类型判别，防止把人物来源误连到作品；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：固定判别列，防止把人物来源链接到作品或系列；写入：来源适配器/候选匹配/人工接受；迁移/初始化：按表固定写 media/person/franchise，不能由用户自由选；首版建议：建议保留';
COMMENT ON COLUMN provider_franchises.franchise_id IS '平台实体，允许多个来源身份指向同一实体；来源类别：拆分重组；来源：series.id；应用：录入候选、再次刷新定位、人物与系列的来源追溯；写入：来源适配器/候选匹配/人工接受；迁移/初始化：来源身份确认后映射到已存在的本地资料；不同来源允许指向同一实体；首版建议：建议保留';
COMMENT ON COLUMN provider_franchises.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（抓取已有作品/人物/系列来源身份；新增稳定映射防止多来源 ID 碰撞）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器/候选匹配/人工接受；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX provider_franchises_target_idx ON provider_franchises (franchise_id);

-- 来源 / 不可变来源快照
CREATE TABLE metadata_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES source_records(id),
  adapter_version text NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version > 0),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  content_sha256 bytea NOT NULL CHECK (octet_length(content_sha256)=32),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (id, source_record_id)
);
COMMENT ON TABLE metadata_snapshots IS '不可变来源快照';
COMMENT ON COLUMN metadata_snapshots.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；关联和路由使用此 ID；写入：来源适配器；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.source_record_id IS '可在发布实体之前存在，支持导入候选；来源类别：方案新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；写入：来源适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.adapter_version IS '本次解析代码版本；来源类别：方案新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；写入：来源适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.schema_version IS '标准化提案的版本；来源类别：方案新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；写入：来源适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.fetched_at IS '抓取或读取时间；来源类别：方案新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；写入：来源适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.content_sha256 IS '标准化内容摘要；来源类别：方案新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：导入预览、来源刷新差异、失败排查；保留策略待确定；写入：来源适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.payload IS '结构化来源结果，保留未知字段；不保存 Cookie 或授权页正文；来源类别：方案新增；来源：无旧字段（可扩展来源的新抓取结果快照；旧任务 JSON 全部不迁）；应用：新导入候选预览和来源刷新差异，不存 Cookie/授权页面或旧任务快照；写入：来源适配器；迁移/初始化：仅新抓取成功后保存规范化 payload；旧影片 extra_info 仍按资料迁移，不读取旧任务结果 JSON；首版建议：建议保留';
COMMENT ON COLUMN metadata_snapshots.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（旧任务结果承载抓取资料；新增不可变结构化快照）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源适配器；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
CREATE INDEX metadata_snapshot_latest_idx ON metadata_snapshots (source_record_id, fetched_at DESC, id);

-- 来源 / 网站评分
CREATE TABLE metadata_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id),
  source_record_id uuid NOT NULL REFERENCES source_records(id),
  snapshot_id uuid NOT NULL,
  rating_kind text NOT NULL DEFAULT 'audience',
  value numeric(8,3) NOT NULL CHECK (value >= 0),
  scale_max numeric(8,3) NOT NULL CHECK (scale_max > 0),
  vote_count bigint CHECK (vote_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (media_id, source_record_id, rating_kind),
  CHECK (value <= scale_max),
  FOREIGN KEY (snapshot_id, source_record_id) REFERENCES metadata_snapshots (id, source_record_id),
  FOREIGN KEY (source_record_id, media_id) REFERENCES provider_media (source_record_id, media_id)
);
COMMENT ON TABLE metadata_ratings IS '网站评分';
COMMENT ON COLUMN metadata_ratings.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；关联和路由使用此 ID；写入：未来支持评分的适配器；迁移/初始化：服务端生成；不要求用户填写；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.media_id IS '评分对应作品；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.source_record_id IS '来源作品身份，用例检查已映射到当前作品；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.snapshot_id IS '提供评分的来源快照；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.rating_kind IS '例如 audience / critic；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.value IS '来源原始评分；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.scale_max IS '来源满分，例如 10 或 100；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.vote_count IS '投票数，未知 NULL；来源类别：方案新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：未来网站评分展示；首版个人评分不依赖本表；写入：未来支持评分的适配器；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN metadata_ratings.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有持久字段与已检查抓取代码未提供网站评分/票数；不等同个人评分）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来支持评分的适配器；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';

-- 来源 / 作品字段来源与锁定
CREATE TABLE media_field_state (
  media_id uuid NOT NULL REFERENCES media_items(id),
  field_key text NOT NULL CHECK (field_key IN ('title','original_title','summary','release','declared_runtime_ms','primary_category_id','cover_layout','supports_chinese','credits','genres','tags','franchises','organizations','images')),
  override_value jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  accepted_snapshot_id uuid REFERENCES metadata_snapshots(id),
  edited_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  PRIMARY KEY (media_id, field_key),
  CHECK (override_value IS NULL OR is_locked)
);
COMMENT ON TABLE media_field_state IS '作品字段来源与锁定';
COMMENT ON COLUMN media_field_state.media_id IS '对应有效实体；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪；写入：人工字段维护/接受来源差异；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.field_key IS '契约白名单；复合字段如 release 一次提交；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.override_value IS 'SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.is_locked IS '逐字段或整组关联锁定；集合锁定后来源不改变当前成员；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.accepted_snapshot_id IS '最近被接受并实际生效的来源；人工字段可为 NULL；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.edited_by IS '人工编辑或接受来源的账号；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN media_field_state.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人工字段维护/接受来源差异；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 人物字段来源与锁定
CREATE TABLE person_field_state (
  person_id uuid NOT NULL REFERENCES people(id),
  field_key text NOT NULL CHECK (field_key IN ('full_name','detailed_name','biography','gender','birth_date','portrait_asset_id','primary_category_id')),
  override_value jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  accepted_snapshot_id uuid REFERENCES metadata_snapshots(id),
  edited_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  PRIMARY KEY (person_id, field_key),
  CHECK (override_value IS NULL OR is_locked)
);
COMMENT ON TABLE person_field_state IS '人物字段来源与锁定';
COMMENT ON COLUMN person_field_state.person_id IS '对应有效实体；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪；写入：人工字段维护/接受来源差异；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.field_key IS '契约白名单；复合字段如 release 一次提交；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：只接受 full_name/detailed_name 等白名单；无 aliases。生日/简介等后置字段首版 API 不开放；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.override_value IS 'SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.is_locked IS '逐字段或整组关联锁定；集合锁定后来源不改变当前成员；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.accepted_snapshot_id IS '最近被接受并实际生效的来源；人工字段可为 NULL；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.edited_by IS '人工编辑或接受来源的账号；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN person_field_state.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人工字段维护/接受来源差异；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 系列字段来源与锁定
CREATE TABLE franchise_field_state (
  franchise_id uuid NOT NULL REFERENCES franchises(id),
  field_key text NOT NULL CHECK (field_key IN ('name','description','primary_category_id','cover','items')),
  override_value jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  accepted_snapshot_id uuid REFERENCES metadata_snapshots(id),
  edited_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  PRIMARY KEY (franchise_id, field_key),
  CHECK (override_value IS NULL OR is_locked)
);
COMMENT ON TABLE franchise_field_state IS '系列字段来源与锁定';
COMMENT ON COLUMN franchise_field_state.franchise_id IS '对应有效实体；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：资料维护的人工锁定、字段来源与刷新预览；拆成三表仍可按成本裁剪；写入：人工字段维护/接受来源差异；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.field_key IS '契约白名单；复合字段如 release 一次提交；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.override_value IS 'SQL NULL=无人工覆盖，JSON null=显式清空；集合字段不存成员副本；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.is_locked IS '逐字段或整组关联锁定；集合锁定后来源不改变当前成员；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.accepted_snapshot_id IS '最近被接受并实际生效的来源；人工字段可为 NULL；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.edited_by IS '人工编辑或接受来源的账号；来源类别：方案新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：管理端逐字段维护、锁定和来源差异；实体字段仍保存正式有效值；写入：人工字段维护/接受来源差异；迁移/初始化：新人工编辑/接受来源结果时写入；旧值没有来源依据就保守保留并标记迁移策略，不假称有来源快照；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：人工字段维护/接受来源差异；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN franchise_field_state.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（管理端人工维护与来源刷新共存；旧库没有字段锁定表）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：人工字段维护/接受来源差异；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 来源 / 关联关系的来源依据
CREATE TABLE relationship_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES source_records(id),
  snapshot_id uuid NOT NULL,
  credit_id uuid REFERENCES credits(id) ON DELETE CASCADE,
  genre_link_id uuid REFERENCES media_genres(id) ON DELETE CASCADE,
  tag_link_id uuid REFERENCES media_tags(id) ON DELETE CASCADE,
  franchise_item_id uuid REFERENCES franchise_items(id) ON DELETE CASCADE,
  organization_link_id uuid REFERENCES media_organizations(id) ON DELETE CASCADE,
  image_link_id uuid REFERENCES media_images(id) ON DELETE CASCADE,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes)='object'),
  created_at timestamptz NOT NULL DEFAULT now() ,
  CHECK (num_nonnulls(credit_id, genre_link_id, tag_link_id, franchise_item_id, organization_link_id, image_link_id) = 1),
  FOREIGN KEY (snapshot_id, source_record_id) REFERENCES metadata_snapshots (id, source_record_id)
);
COMMENT ON TABLE relationship_sources IS '关联关系的来源依据';
COMMENT ON COLUMN relationship_sources.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；关联和路由使用此 ID；写入：接受来源关系差异/人工关系维护；迁移/初始化：服务端生成；不要求用户填写；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.source_record_id IS '声明该关系的来源主体，来源刷新只能撤回自己的声明；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.snapshot_id IS '最近支持这条关系的来源快照；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.credit_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.genre_link_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：待定扩展；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：随独立 genre 域后置；首版不得产生此类关系依据；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN relationship_sources.tag_link_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.franchise_item_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.organization_link_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.image_link_id IS '目标关系，六个显式外键中恰好一个非空；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.attributes IS '来源自己的角色名等属性；合并有效关系时保留依据；来源类别：方案新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：刷新关系差异与管理详情；首版可评审是否需要全部关系粒度；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：待裁剪';
COMMENT ON COLUMN relationship_sources.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（多来源关系刷新不能误删人工关系；关系级追溯是设计新增）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：接受来源关系差异/人工关系维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：待裁剪';
CREATE UNIQUE INDEX relation_source_credit_id_uq ON relationship_sources (source_record_id, credit_id) WHERE credit_id IS NOT NULL;
CREATE UNIQUE INDEX relation_source_genre_link_id_uq ON relationship_sources (source_record_id, genre_link_id) WHERE genre_link_id IS NOT NULL;
CREATE UNIQUE INDEX relation_source_tag_link_id_uq ON relationship_sources (source_record_id, tag_link_id) WHERE tag_link_id IS NOT NULL;
CREATE UNIQUE INDEX relation_source_franchise_item_id_uq ON relationship_sources (source_record_id, franchise_item_id) WHERE franchise_item_id IS NOT NULL;
CREATE UNIQUE INDEX relation_source_organization_link_id_uq ON relationship_sources (source_record_id, organization_link_id) WHERE organization_link_id IS NOT NULL;
CREATE UNIQUE INDEX relation_source_image_link_id_uq ON relationship_sources (source_record_id, image_link_id) WHERE image_link_id IS NOT NULL;

-- 来源 / 来源类型与标签归一
CREATE TABLE source_value_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  source_field text NOT NULL CHECK (source_field IN ('genre','tag')),
  source_value text NOT NULL CHECK (length(source_value)>0),
  genre_id uuid REFERENCES genres(id),
  tag_id uuid REFERENCES tags(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (provider_id, source_field, source_value),
  CHECK ((source_field='genre' AND genre_id IS NOT NULL AND tag_id IS NULL) OR (source_field='tag' AND tag_id IS NOT NULL AND genre_id IS NULL))
);
COMMENT ON TABLE source_value_mappings IS '来源类型与标签归一';
COMMENT ON COLUMN source_value_mappings.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；关联和路由使用此 ID；写入：未来来源词汇映射/类型维护；迁移/初始化：服务端生成；不要求用户填写；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.provider_id IS '来源命名空间；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.source_field IS '来源词汇类别；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.source_value IS '经约定规范化的来源原词；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.genre_id IS '规范类型目标；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.tag_id IS '规范标签目标；来源类别：方案新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：未来类型筛选；首版不自动将旧标签拆成 genre；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：未来来源词汇映射/类型维护；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：后置';
COMMENT ON COLUMN source_value_mappings.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（独立 genre 域尚未确认；旧标签须先按原有分类/属性组承接）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：未来来源词汇映射/类型维护；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：后置';

-- 来源 / 待接受的资料差异
CREATE TABLE metadata_change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES metadata_snapshots(id),
  media_id uuid REFERENCES media_items(id),
  person_id uuid REFERENCES people(id),
  franchise_id uuid REFERENCES franchises(id),
  base_revision bigint NOT NULL CHECK (base_revision > 0),
  patch jsonb NOT NULL CHECK (jsonb_typeof(patch)='object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected','superseded')),
  decided_by uuid REFERENCES accounts(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  CHECK (num_nonnulls(media_id, person_id, franchise_id)=1),
  CHECK ((status IN ('pending','superseded') AND decided_at IS NULL) OR (status IN ('applied','rejected') AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
);
COMMENT ON TABLE metadata_change_sets IS '待接受的资料差异';
COMMENT ON COLUMN metadata_change_sets.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；关联和路由使用此 ID；写入：来源刷新比较器/人工接受用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.snapshot_id IS '来源快照；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.media_id IS '目标作品；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.person_id IS '目标人物；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.franchise_id IS '目标系列；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.base_revision IS '生成差异时的聚合版本，接受前重新比较；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.patch IS '白名单字段与关联变更提案；这是暂存命令，不是有效资料关系；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：资料刷新差异：显示旧值、来源值与将接受的变更；接受后同事务改正式字段；写入：来源刷新比较器/人工接受用例；迁移/初始化：比较器基于实际快照生成白名单补丁，不把任意 JSON 当成可执行命令；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.status IS '差异处理状态；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.decided_by IS '接受或拒绝账号；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.decided_at IS '决定时间；来源类别：方案新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：管理端差异预览与确认，避免抓取直接覆盖人工资料；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：来源刷新比较器/人工接受用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN metadata_change_sets.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（用户要求改进录入/资料维护；先预览再接受来源结果）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：来源刷新比较器/人工接受用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX metadata_changes_pending_idx ON metadata_change_sets (created_at, id) WHERE status='pending';

-- 导入 / 导入批次
CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES libraries(id),
  root_id uuid REFERENCES storage_roots(id),
  created_by uuid NOT NULL REFERENCES accounts(id),
  mode text NOT NULL CHECK (mode IN ('scan','selected_files','manual','legacy')),
  is_paused boolean NOT NULL DEFAULT false,
  cancel_requested_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE import_batches IS '导入批次';
COMMENT ON COLUMN import_batches.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN import_batches.library_id IS '本批次目标媒体库；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.root_id IS '扫描指定根；人工选择多个根内文件时可为空；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.created_by IS '发起账号；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.mode IS '扫描、选文件、手动资料草稿、迁移；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.is_paused IS '暂停领取新项；不抹掉已完成阶段；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.cancel_requested_at IS '用户请求取消的时间；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.finished_at IS '所有项完成或终止的时间；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_batches.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN import_batches.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN import_batches.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：扫描/匹配/复核/发布用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';

-- 导入 / 服务端导入草稿与发布结果
CREATE TABLE import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id),
  item_key text NOT NULL,
  stage text NOT NULL DEFAULT 'discovered' CHECK (stage IN ('discovered','probed','matched','ready','published')),
  execution_status text NOT NULL DEFAULT 'queued' CHECK (execution_status IN ('queued','running','waiting_user','retry_wait','failed','cancelled','completed')),
  selected_candidate_id uuid,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft)='object'),
  draft_schema_version integer NOT NULL DEFAULT 2 CHECK (draft_schema_version > 0),
  draft_revision bigint NOT NULL DEFAULT 1 CHECK (draft_revision > 0),
  reviewed_revision bigint CHECK (reviewed_revision > 0),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES accounts(id),
  publish_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  published_media_id uuid REFERENCES media_items(id),
  published_edition_id uuid,
  published_at timestamptz,
  error_code text,
  error_details jsonb CHECK (error_details IS NULL OR jsonb_typeof(error_details)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (batch_id, item_key),
  FOREIGN KEY (published_edition_id, published_media_id) REFERENCES editions (id, media_id),
  CHECK ((stage='published' AND published_media_id IS NOT NULL AND published_at IS NOT NULL AND execution_status='completed') OR (stage<>'published' AND published_media_id IS NULL AND published_edition_id IS NULL AND published_at IS NULL)),
  CHECK ((reviewed_revision IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL) OR (reviewed_revision IS NOT NULL AND reviewed_revision = draft_revision AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)),
  CHECK (stage <> 'published' OR reviewed_revision IS NOT NULL)
);
COMMENT ON TABLE import_items IS '服务端导入草稿与发布结果';
COMMENT ON COLUMN import_items.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN import_items.batch_id IS '所属批次；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.item_key IS '批次内稳定幂等键，例如分组文件指纹，不随重试改变；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.stage IS '已持久化资料阶段，不与执行状态混用；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.execution_status IS '任务执行状态；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.selected_candidate_id IS '选中的来源候选，在候选表建立后补复合外键；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.draft IS '有版本 schema 的人工草稿，可表达创建作品 / 新版本 / 分段 / 真分集；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：导入工作台恢复标题、人物、分类、系列与标签的未发布选择；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按版本化草稿契约保存；未发布草稿不污染正式片库；首版建议：建议保留';
COMMENT ON COLUMN import_items.draft_schema_version IS '导入草稿格式版本；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：版本2定义完整资料、临时演职员/系列、图片、版本与字段选择；由服务端校验；写入：扫描/匹配/复核/发布用例；迁移/初始化：新草稿为2；旧应用任务和浏览器草稿不迁；首版建议：建议保留';
COMMENT ON COLUMN import_items.draft_revision IS '用户核对内容的版本；任务进度变动不改变，资料/候选/绑定变动递增；来源类别：技术新增；来源：无旧字段（用户要求全部人工确认和手动发布；旧草稿缺少可核验确认凭据）；应用：完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认；写入：草稿用例/人工确认命令/数据库约束；迁移/初始化：新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移；首版建议：建议保留';
COMMENT ON COLUMN import_items.reviewed_revision IS '人工确认对应的草稿版本；必须等于当前 draft_revision，否则重新核对；来源类别：技术新增；来源：无旧字段（用户要求全部人工确认和手动发布；旧草稿缺少可核验确认凭据）；应用：完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认；写入：草稿用例/人工确认命令/数据库约束；迁移/初始化：新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移；首版建议：建议保留';
COMMENT ON COLUMN import_items.reviewed_at IS '本次人工确认的服务端时间；草稿修改时清空；来源类别：技术新增；来源：无旧字段（用户要求全部人工确认和手动发布；旧草稿缺少可核验确认凭据）；应用：完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认；写入：草稿用例/人工确认命令/数据库约束；迁移/初始化：新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移；首版建议：建议保留';
COMMENT ON COLUMN import_items.reviewed_by IS '人工确认的账号；任务 worker 不能创建发布决定；来源类别：技术新增；来源：无旧字段（用户要求全部人工确认和手动发布；旧草稿缺少可核验确认凭据）；应用：完整编辑保存、人工确认、批量发布及冲突反馈；资料或文件绑定变化取消确认；写入：草稿用例/人工确认命令/数据库约束；迁移/初始化：新草稿版本从1开始；确认字段为空；旧任务与草稿不迁移；首版建议：建议保留';
COMMENT ON COLUMN import_items.publish_key IS '该项发布的稳定幂等身份，重试不得生成新 key；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：发布超时重试返回同一结果，避免重复建作品/版本；写入：扫描/匹配/复核/发布用例；迁移/初始化：导入项创建时生成稳定发布键；重试不换键；首版建议：建议保留';
COMMENT ON COLUMN import_items.published_media_id IS '成功发布的作品；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：任务发布结果链接和幂等返回；标记已完成项；写入：扫描/匹配/复核/发布用例；迁移/初始化：仅成功的发布事务同时填写；尚未发布保持 NULL；首版建议：建议保留';
COMMENT ON COLUMN import_items.published_edition_id IS '成功发布的版本；复合外键保证属于该作品；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：任务发布结果链接和幂等返回；标记已完成项；写入：扫描/匹配/复核/发布用例；迁移/初始化：仅成功的发布事务同时填写；尚未发布保持 NULL；首版建议：建议保留';
COMMENT ON COLUMN import_items.published_at IS '发布事务提交时间；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：任务发布结果链接和幂等返回；标记已完成项；写入：扫描/匹配/复核/发布用例；迁移/初始化：仅成功的发布事务同时填写；尚未发布保持 NULL；首版建议：建议保留';
COMMENT ON COLUMN import_items.error_code IS '最后错误码；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.error_details IS '脱敏错误详情，用户草稿独立保留；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_items.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN import_items.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';
COMMENT ON COLUMN import_items.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：扫描/匹配/复核/发布用例；迁移/初始化：从 1 开始，更新触发器递增；旧库无对应并发版本；首版建议：建议保留';
CREATE INDEX import_items_batch_idx ON import_items (batch_id, stage, execution_status, id);

-- 导入 / 导入项文件与候选段顺序
CREATE TABLE import_item_files (
  item_id uuid NOT NULL REFERENCES import_items(id),
  file_id uuid NOT NULL REFERENCES media_files(id),
  edition_key text NOT NULL DEFAULT 'default' CHECK (length(btrim(edition_key)) > 0),
  part_no integer NOT NULL CHECK (part_no > 0),
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (item_id, edition_key, file_id),
  UNIQUE (item_id, edition_key, part_no) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE import_item_files IS '导入项文件与候选段顺序';
COMMENT ON COLUMN import_item_files.item_id IS '一条草稿允许多个 CD 文件；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_item_files.file_id IS '已登记文件；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_item_files.edition_key IS '草稿版本临时键；同一导入作品可维护多个版本，每个版本独立排序文件段；来源类别：技术新增；来源：无旧字段（完整编辑器支持一个草稿中的多个播放版本；每个版本分别管理文件段）；应用：草稿版本与文件选择；发布时映射为正式 editions.id；写入：扫描/匹配/复核/发布用例；迁移/初始化：首个版本使用 default；新增版本使用草稿内唯一键；首版建议：建议保留';
COMMENT ON COLUMN import_item_files.part_no IS '准备发布的段顺序；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_item_files.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';

-- 导入 / 来源匹配候选
CREATE TABLE import_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES import_items(id),
  source_record_id uuid NOT NULL REFERENCES source_records(id),
  snapshot_id uuid,
  confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence)='object'),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (item_id, source_record_id),
  UNIQUE (id, item_id),
  FOREIGN KEY (snapshot_id, source_record_id) REFERENCES metadata_snapshots (id, source_record_id)
);
COMMENT ON TABLE import_candidates IS '来源匹配候选';
COMMENT ON COLUMN import_candidates.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；关联和路由使用此 ID；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.item_id IS '所属导入项；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.source_record_id IS '来源身份，尚未入库也可存在；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.snapshot_id IS '已读取详情的快照；仅搜索结果时为空；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.confidence IS '可选匹配置信值，不代替人工决定；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：候选排序和人工复核提示；启发式匹配分不宣称为真实概率；写入：扫描/匹配/复核/发布用例；迁移/初始化：匹配器按版本化规则计算；无规则时不假定高可信；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.evidence IS '编号、标题、年份等匹配依据；来源类别：方案新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：管理端导入工作台、批次状态、草稿恢复与发布结果；写入：扫描/匹配/复核/发布用例；迁移/初始化：服务端按真实扫描/匹配/复核阶段写入；新导入有数据才创建，不从旧作品伪造未发生的导入过程；首版建议：建议保留';
COMMENT ON COLUMN import_candidates.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（现有本地解析+抓取+录入流程；新增服务端草稿与候选复核）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：扫描/匹配/复核/发布用例；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';

-- 运行 / 业务任务与持久摘要
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('scan','probe','match','publish','metadata_refresh','person_enrich','asset_download','backup')),
  requested_by uuid REFERENCES accounts(id),
  batch_id uuid REFERENCES import_batches(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','waiting_user','failed','cancelled','completed')),
  cancel_requested_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0)
);
COMMENT ON TABLE tasks IS '业务任务与持久摘要';
COMMENT ON COLUMN tasks.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；关联和路由使用此 ID；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.kind IS '任务处理器类型；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心按导入、探测、刷新、人物补全等分组；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.requested_by IS '发起人，系统任务可为空；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.batch_id IS '可选批次上下文；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.status IS 'UI 展示的业务聚合状态；租约与重试调度由 pg-boss 拥有；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.cancel_requested_at IS '取消信号持久记录；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.finished_at IS '终态时间；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN tasks.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';

-- 运行 / 逐项检查点与结构化结果
CREATE TABLE task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  item_key text NOT NULL,
  import_item_id uuid REFERENCES import_items(id),
  file_id uuid REFERENCES media_files(id),
  media_id uuid REFERENCES media_items(id),
  person_id uuid REFERENCES people(id),
  root_id uuid REFERENCES storage_roots(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','waiting_user','retry_wait','failed','cancelled','completed')),
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(checkpoint)='object'),
  result jsonb CHECK (result IS NULL OR jsonb_typeof(result)='object'),
  error_code text,
  error_details jsonb CHECK (error_details IS NULL OR jsonb_typeof(error_details)='object'),
  queue_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0) ,
  UNIQUE (task_id, item_key),
  CHECK (num_nonnulls(import_item_id,file_id,media_id,person_id,root_id) <= 1)
);
COMMENT ON TABLE task_items IS '逐项检查点与结构化结果';
COMMENT ON COLUMN task_items.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；关联和路由使用此 ID；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.task_id IS '所属任务；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.item_key IS '任务内稳定对象键；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.import_item_id IS '目标导入项；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.file_id IS '目标文件；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.media_id IS '目标作品；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.person_id IS '目标人物；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.root_id IS '目标根目录；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.status IS '当前业务状态，不代替队列 claim/lease；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.checkpoint IS '已完成阶段与幂等外部操作标识，版本由处理器维护；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：仅用于新任务在重启后恢复已完成阶段；不是迁移旧任务百分比；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.result IS '结构化结果与资源引用，不把结果仅存进程内 Map；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.error_code IS '结构化失败类别；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.error_details IS '脱敏错误详情；来源类别：方案新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：任务中心、失败重试、Mac 登录恢复后继续执行；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.queue_job_id IS 'pg-boss 拥有的工作项标识，不跨 schema 建外键；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：定位队列执行记录；业务状态不依赖一个可过期的队列 ID；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.updated_at IS '服务端最后更新时间；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';
COMMENT ON COLUMN task_items.revision IS '聚合并发版本；更新触发器递增，写入用例校验 expectedRevision；来源类别：技术新增；来源：无旧字段（保留旧任务的功能职责，用户明确旧 task / actor_profile_task 行、进度、错误及结果文件全部不迁；新任务从切换后重新建立）；应用：编辑命令提交 expectedRevision；冲突时保留用户输入并重新比对；写入：任务创建用例/worker；迁移/初始化：不迁旧任务记录或结果；该字段仅由新系统真实任务运行生成，未发生的状态不补造；首版建议：建议保留';

-- 运行 / 事务后可靠投递
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  sent_at timestamptz,
  send_attempts integer NOT NULL DEFAULT 0 CHECK (send_attempts >= 0),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE outbox_events IS '事务后可靠投递';
COMMENT ON COLUMN outbox_events.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；关联和路由使用此 ID；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.event_type IS '例如 catalog.media-published.v1；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.aggregate_type IS '审计式聚合类型，不是业务关系外键；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.aggregate_id IS '事件发生时聚合 ID，允许日后归档和清理；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.dedupe_key IS '事件稳定身份，重复投递消费者仍须幂等；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.payload IS '脱敏消息载荷，禁止携带凭据；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.sent_at IS '已成功交给队列的时间；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.send_attempts IS 'outbox 投递计数，不承担业务任务重试租约；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.last_error_code IS '最近投递失败原因；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN outbox_events.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
CREATE INDEX outbox_pending_idx ON outbox_events (created_at, id) WHERE sent_at IS NULL;

-- 运行 / 命令幂等结果
CREATE TABLE idempotency_keys (
  account_id uuid NOT NULL REFERENCES accounts(id),
  scope text NOT NULL,
  key text NOT NULL CHECK (length(key) BETWEEN 1 AND 200),
  request_sha256 bytea NOT NULL CHECK (octet_length(request_sha256)=32),
  response_status smallint NOT NULL CHECK (response_status BETWEEN 200 AND 499),
  response_body jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now() ,
  PRIMARY KEY (account_id, scope, key),
  CHECK (expires_at > created_at)
);
COMMENT ON TABLE idempotency_keys IS '命令幂等结果';
COMMENT ON COLUMN idempotency_keys.account_id IS '命令调用账号；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.scope IS '命令种类与目标资源的规范化作用域；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.key IS '客户端 Idempotency-Key；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.request_sha256 IS '规范化请求摘要，同 key 不同请求拒绝；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.response_status IS '已提交结果的 HTTP 状态；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.response_body IS '脱敏响应；与业务写入同事务，只保留已完成结果；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.expires_at IS '可回收时间；业务唯一键仍永久保护已发布项；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：系统内部的防重与投递；按实际队列方案裁剪，不是产品业务表；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN idempotency_keys.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（网络重试、重复发布、事务提交后投递的可靠性；旧库没有相应字段）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：业务事务/事件派发器/幂等中间层；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';

-- 运行 / 追加写操作审计
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id uuid REFERENCES accounts(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  before_revision bigint CHECK (before_revision > 0),
  after_revision bigint CHECK (after_revision > 0),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(changes)='object'),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_log IS '追加写操作审计';
COMMENT ON COLUMN audit_log.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；关联和路由使用此 ID；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.actor_account_id IS '操作者，系统任务可为空；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.action IS '动作代码，如 person.merge / category.migrate；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.entity_type IS '当时的实体种类；历史定位，不是实时业务关系；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.entity_id IS '当时的稳定 ID，不因后续归档删除历史审计；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.before_revision IS '操作前版本；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.after_revision IS '操作后版本；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.changes IS '必要字段与关系影响，不存密码、Cookie 或未脱敏抓取正文；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.request_id IS '链路定位 ID；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：管理端操作记录与错误排查；范围和保留周期待评审；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
COMMENT ON COLUMN audit_log.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（人物合并、分类迁移与来源接受的追溯；旧库无审计日志）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：业务事务内审计记录；迁移/初始化：相应业务事务或中间层按真实发生的操作生成；不补造历史事件、请求或审计记录；首版建议：待裁剪';
CREATE INDEX audit_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);

-- 迁移 / 旧库到新库的稳定映射
CREATE TABLE legacy_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_table text NOT NULL,
  key_name text NOT NULL DEFAULT 'id',
  legacy_id text NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('media','edition','file','person','franchise','category','collection','tag')),
  media_id uuid REFERENCES media_items(id),
  edition_id uuid REFERENCES editions(id),
  file_id uuid REFERENCES media_files(id),
  person_id uuid REFERENCES people(id),
  franchise_id uuid REFERENCES franchises(id),
  category_id uuid REFERENCES categories(id),
  collection_id uuid REFERENCES collections(id),
  tag_id uuid REFERENCES tags(id),
  source_checksum bytea CHECK (octet_length(source_checksum)=32),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(notes)='object'),
  created_at timestamptz NOT NULL DEFAULT now() ,
  UNIQUE (source_system, source_table, key_name, legacy_id, target_kind),
  CHECK (num_nonnulls(media_id,edition_id,file_id,person_id,franchise_id,category_id,collection_id,tag_id)=1),
  CHECK ((target_kind='media' AND media_id IS NOT NULL) OR (target_kind='edition' AND edition_id IS NOT NULL) OR (target_kind='file' AND file_id IS NOT NULL) OR (target_kind='person' AND person_id IS NOT NULL) OR (target_kind='franchise' AND franchise_id IS NOT NULL) OR (target_kind='category' AND category_id IS NOT NULL) OR (target_kind='collection' AND collection_id IS NOT NULL) OR (target_kind='tag' AND tag_id IS NOT NULL))
);
COMMENT ON TABLE legacy_mappings IS '旧库到新库的稳定映射';
COMMENT ON COLUMN legacy_mappings.id IS '内部稳定主键；改名、迁移目录不会改变 ID；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；关联和路由使用此 ID；写入：迁移程序；迁移/初始化：服务端生成；不要求用户填写；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.source_system IS '旧数据库或迁移来源标识；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.source_table IS '旧表名；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.key_name IS '旧身份字段名，例如 id / movie_code / actor_code / tag_code；与旧值共同追溯；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.legacy_id IS '由 key_name 指定的旧身份原始文本；既可为旧主键，也可为旧业务编码，不丢 BIGINT 精度；来源类别：拆分重组；来源：movie.id、movie.movie_code、actor.id、actor.actor_code、series.id、series.series_code、category.id、category.category_code、tag.id、tag.tag_code、collections.id、collections.coll_code；应用：按旧表+旧字段+旧值找新 ID，保留旧代码检索和迁移可重复性；写入：迁移程序；迁移/初始化：按 key_name 保存主键或业务编码原始文本；同一旧身份可映射作品/版本/文件多个目标；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.target_kind IS '一个旧 movie 可分别映射作品、版本和文件三行；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：迁移程序以真实来源库/表/字段名/目标类型登记，不让用户日常填写；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.media_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：movie.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.edition_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：movie.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：仅旧普通可播放条目或子集映射新版本 UUID；group 容器不生成版本映射；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.file_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：movie.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.person_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：actor.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.franchise_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：series.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.category_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：category.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.collection_id IS '目标真实外键；八个目标外键恰好一个非空；来源类别：拆分重组；来源：collections.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.tag_id IS '目标标签外键，补齐旧 tag.id / tag_code 的追溯；来源类别：拆分重组；来源：tag.id；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：填入对应新实体 UUID；八个目标外键恰好一个非空；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.source_checksum IS '旧行规范导出的校验摘要；来源类别：方案新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.notes IS '不确定判定、生成顺序等迁移备注；来源类别：方案新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：迁移核对、旧链接定位、重复执行迁移时查已有结果；写入：迁移程序；迁移/初始化：新记录按字段默认值/可空规则创建；旧数据无此值时不补造历史事实；首版建议：建议保留';
COMMENT ON COLUMN legacy_mappings.created_at IS '服务端创建时间，UTC 时间点；来源类别：技术新增；来源：无旧字段（全部旧实体的旧主键和业务编码；迁移追溯而非用户日常填写）；应用：记录创建/修改时间；用于维护详情、同步和稳定排序；写入：迁移程序；迁移/初始化：新记录写服务端 UTC 时间；迁移时优先保留确实对应的旧时间点，先确认时区；首版建议：建议保留';

CREATE FUNCTION protect_category_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN RAISE EXCEPTION 'system category cannot be deleted' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code OR (OLD.is_system AND (NOT NEW.is_system OR NEW.archived_at IS NOT NULL OR NEW.parent_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'category identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER categories_identity BEFORE UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION protect_category_identity();
ALTER TABLE import_items ADD CONSTRAINT import_selected_candidate_fk FOREIGN KEY (selected_candidate_id, id) REFERENCES import_candidates (id, item_id) DEFERRABLE INITIALLY IMMEDIATE;
CREATE FUNCTION touch_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_touch BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER devices_touch BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER libraries_touch BEFORE UPDATE ON libraries FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER storage_roots_touch BEFORE UPDATE ON storage_roots FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER media_files_touch BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER assets_touch BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER categories_touch BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER catalog_revisions_touch BEFORE UPDATE ON catalog_revisions FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER media_items_touch BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER editions_touch BEFORE UPDATE ON editions FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER people_touch BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER franchises_touch BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER genres_touch BEFORE UPDATE ON genres FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER tags_touch BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER collections_touch BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER user_media_state_touch BEFORE UPDATE ON user_media_state FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER user_person_state_touch BEFORE UPDATE ON user_person_state FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER providers_touch BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER provider_configs_touch BEFORE UPDATE ON provider_configs FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER source_records_touch BEFORE UPDATE ON source_records FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER media_field_state_touch BEFORE UPDATE ON media_field_state FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER person_field_state_touch BEFORE UPDATE ON person_field_state FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER franchise_field_state_touch BEFORE UPDATE ON franchise_field_state FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER source_value_mappings_touch BEFORE UPDATE ON source_value_mappings FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER metadata_change_sets_touch BEFORE UPDATE ON metadata_change_sets FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER import_batches_touch BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER import_items_touch BEFORE UPDATE ON import_items FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE TRIGGER task_items_touch BEFORE UPDATE ON task_items FOR EACH ROW EXECUTE FUNCTION touch_revision();
CREATE FUNCTION protect_import_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_kind text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage = 'published' AND (NEW.stage <> 'published'
       OR NEW.published_media_id IS DISTINCT FROM OLD.published_media_id
       OR NEW.published_edition_id IS DISTINCT FROM OLD.published_edition_id
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.reviewed_revision IS DISTINCT FROM OLD.reviewed_revision
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by) THEN
      RAISE EXCEPTION 'published import receipt is immutable' USING ERRCODE='23514';
    END IF;
    IF NEW.draft IS DISTINCT FROM OLD.draft OR NEW.draft_schema_version IS DISTINCT FROM OLD.draft_schema_version
       OR NEW.selected_candidate_id IS DISTINCT FROM OLD.selected_candidate_id OR NEW.draft_revision IS DISTINCT FROM OLD.draft_revision THEN
      IF OLD.stage = 'published' THEN RAISE EXCEPTION 'published import draft is immutable' USING ERRCODE='23514'; END IF;
      NEW.draft_revision := OLD.draft_revision + 1;
      NEW.reviewed_revision := NULL; NEW.reviewed_at := NULL; NEW.reviewed_by := NULL;
      IF NEW.stage = 'ready' THEN NEW.stage := 'matched'; END IF;
    END IF;
  END IF;
  IF NEW.stage = 'published' THEN
    SELECT kind INTO target_kind FROM media_items WHERE id=NEW.published_media_id;
    IF target_kind IN ('group','show','season') AND NEW.published_edition_id IS NOT NULL THEN
      RAISE EXCEPTION 'container has no playback edition' USING ERRCODE='23514';
    ELSIF target_kind IN ('movie','episode','video') AND NEW.published_edition_id IS NULL THEN
      RAISE EXCEPTION 'playable publication requires an edition' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER import_review BEFORE INSERT OR UPDATE ON import_items FOR EACH ROW EXECUTE FUNCTION protect_import_review();
CREATE FUNCTION invalidate_import_file_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    key_id := OLD.item_id;
    UPDATE import_items SET draft_revision=draft_revision+1 WHERE id=key_id;
  END IF;
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id) THEN
    key_id := NEW.item_id;
    UPDATE import_items SET draft_revision=draft_revision+1 WHERE id=key_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER import_file_review AFTER INSERT OR UPDATE OR DELETE ON import_item_files FOR EACH ROW EXECUTE FUNCTION invalidate_import_file_review();
INSERT INTO categories (id,code,name,parent_id,position,is_system) VALUES ('00000000-0000-4000-8000-000000000001','unsorted','未分类',NULL,1,true);
INSERT INTO catalog_revisions (singleton) VALUES (true);
COMMIT;
