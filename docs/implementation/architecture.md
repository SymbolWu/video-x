# 第一阶段工程决定

2026-11-18。实现采用 TypeScript 模块化服务端、React 双 Web 和原生 Kotlin/Compose。资料规则集中在服务端，三个客户端使用同一个 OpenAPI，数据库迁移以可审查 SQL 为准。

## 目录和职责

```text
apps/
  server/src/modules/identity    账号、设备、会话
  server/src/modules/catalog     作品、人物、系列、主分类
  server/src/modules/personal    喜欢、评分、已看、收藏夹
  server/src/platform            数据库、事务、队列、配置
  server/src/entrypoints         HTTP、worker、显式迁移和初始化
  server/migrations             唯一的正式数据库迁移目录
  web                           观看体验
  admin                         资料维护
  android                       原生客户端与加密会话
packages/
  contracts                     TypeBox 输入输出定义与 OpenAPI
  sdk-ts                        生成的 TS 类型与客户端
  sdk-kotlin                    生成的 Kotlin 模型与 Retrofit API
  design-tokens                 Web 主题变量
  ui                            Web 登录、弹窗和共用展示
```

M1 不为尚未实现的抓取、扫描、发布建立空的业务框架。M2 增加媒体/播放/草稿用例，M4 增加来源适配器；它们必须复用 catalog 的关系与发布规则，不能绕过人工确认。

## 契约与空值

TypeBox 同时作为 HTTP 校验和 OpenAPI 源。Body 禁止类型强制转换，避免 `null` 被字符串规则变成 `""`；query 参数允许字符串转换为数字。未提供字段表示不修改，显式 null 表示清空，空关系数组表示移除全部对应关系。

影片和演员/系列分别声明支持的 query schema；不向生成客户端发布不支持的排序字段。SQL 排序列来自固定映射，只允许升/降两个方向，用户值不能插入原始 SQL。

TS 使用 openapi-typescript/openapi-fetch。Kotlin 使用固定 OpenAPI Generator `7.27.0`，下载 jar 先核 SHA-256；构建直接引用生成目录。`contracts:check` 比较重生成前后的内容，CI 防止只修改一端。

Retrofit 查询枚举显式按 `@Json` 的 wire value 转换，避免 `CREATED_AT` 与服务端 `createdAt` 不一致。当前 Android 个人状态提交完整带 revision 快照并序列化 null，支持清除评分且不重置喜欢/已看；未来增加部分元数据编辑时必须实现“省略/清空”的独立请求表示，不能直接复用可空 DTO 的默认 null。

## 持久化与任务

PostgreSQL 16 使用 `video_x` 业务 schema，pg-boss 使用独立 `pgboss` schema。Drizzle 提供参数化 SQL 和有序迁移；不启用启动自动同步或 push。M1 从候选结构选取 15 表，其他字段由启用登记承接，后续只追加 migration。

资料更新校验 expectedRevision，由数据库触发器递增 revision。元数据与关系修改在同一事务；个人状态单独用例和版本。编辑表单冻结打开时的资料版本，后台重新查询不能把旧输入搭配新 revision 发出。

pg-boss 的事务 adapter 绑定当前 PostgreSQL client，使资料保存和 `catalog.changed` 入队一起提交或回滚。worker 是独立入口，当前处理器只消费并记录事件；这验证队列基础，不代表批次发布恢复已经完成。

## 依赖与验证依据

JS 精确版本在根 lockfile，Android 插件及依赖在 Gradle 文件。当前 Fastify `5.12.8`、Drizzle `0.45.4`、pg-boss `12.38.2`、React `19.3.1`、Vite `8.3.8`；Android 为 AGP `9.0.1`、Compose compiler `2.2.10`、Gradle `9.1.0`、JDK 17、SDK 36。

采用 Fastify 5 的完整 JSON Schema 请求校验；迁移使用 Drizzle SQL migration 路径；Kotlin 生成选择 Retrofit suspend 接口。依据：[Fastify 5 指南](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/)、[Drizzle migrations](https://orm.drizzle.team/docs/migrations)、[Kotlin generator](https://openapi-generator.tech/docs/generators/kotlin/)。

AGP 9 内置 Kotlin，外部生成源注册到 `android.sourceSets.main.kotlin`，不注册到 Java 源集。依据：[Android 内置 Kotlin 迁移说明](https://developer.android.com/build/migrate-to-built-in-kotlin)。本项目已通过该配置的实际编译和契约测试。

## Web 与 Android 的选择交互

Web 复用 `packages/ui` 的 Radix Select / Dialog，主题保留在 design-tokens；平台原语负责键盘、选中、弹层及焦点，避免各页面自行实现。表单保留标准 name / FormData 提交语义。参考 [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) 与 [Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)。

Android 使用 Compose Material 3 原生底部面板，分类和排序在本地草稿中调整，应用时只发起一次列表刷新；不复用 Web 下拉菜单。项目约定触摸选项至少 48dp，固定底部操作区、可滚动内容、系统返回取消和键盘收起都属于交互验收。参考 [Compose Bottom sheets](https://developer.android.com/develop/ui/compose/components/bottom-sheets)。未来的多选筛选与关系选择继续采用手机专用流程，不能直接把管理表单缩小搬进 Android。
