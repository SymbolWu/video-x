# 开发与容器运行

2026-11-18：用户已安装 Docker，本机已完成 Compose 镜像构建、独立数据库迁移、启动、内置 FFprobe、账号登录与整栈重启验收。原来的本地开发服务也保留运行。Mac 登录后自动恢复、媒体盘挂载检查、备份恢复和升级回滚属于 M5，还没有安装登录项或替换旧服务。

## 本地隔离

`tooling/local-db.mjs` 只管理本项目 `.runtime/postgres`，监听回环地址 54339。它生成随机 SCRAM 密码和 600 权限配置，遇到已有 `.env` 不覆盖。API、观看端、管理端分别使用 5120、5180、5181，与旧端口独立。端口被占用会报错。

`pnpm db:migrate` 是显式命令，持有 advisory lock，应用 `apps/server/migrations`，然后初始化 pg-boss schema。HTTP/worker 启动不会自动修改业务表。集成测试要求 `_test` 后缀配置并创建临时随机库；测试结束只删除该临时库。

`pnpm dev:bootstrap` 仅接受 `NODE_ENV=development` 和 `_dev` 数据库，初始化虚构样例；它不是普通影片发布入口。已有开发凭据和账号不覆盖。

## 容器验收步骤

在具备 Docker Compose 的环境中，先复制 `.env.compose.example` 为 `.env.compose`，使用 URL 安全的随机密码填入 `VIDEO_X_DB_PASSWORD`，例如 `openssl rand -hex 32` 的结果。该文件已忽略；不要把本地开发数据库的 `.env` 作为 Compose 配置。

```sh
docker compose --env-file .env.compose build
docker compose --env-file .env.compose up -d db
docker compose --env-file .env.compose run --rm migrate
docker compose --env-file .env.compose up -d --wait
docker compose --env-file .env.compose exec api node dist/entrypoints/account.js
docker compose --env-file .env.compose exec worker ffprobe -version
curl --fail http://localhost:8180/api/health/ready
```

观看端为 `http://localhost:8180/`，管理端为 `/manage/`。网关只绑定 Mac 回环地址，数据库不发布宿主端口；暂不设置公网入口。API Cookie 写请求核对 Origin。未来启用 HTTPS 时同步调整允许来源与 Secure Cookie；不能直接将当前本地 HTTP 配置当作公网配置。

`migrate` 放在工具 profile 中，由明确命令执行。API readiness 同时检查业务表及队列 schema，worker 等待 API readiness。worker 处理资料变更和媒体扫描。FFprobe 随服务镜像交付。API 与 worker 需挂载同一个媒体根，使用 compose.media.yaml 的只读配置即可。M2 已在独立 Compose 栈实际探测样片并通过网关起播。M5 发布时再记录不可变镜像 digest 和依赖清单。

Compose 使用 PostgreSQL `16.14-alpine`、Node `24.13.0-bookworm-slim`、nginx `1.28.0-alpine`；已核实官方标签包含 ARM64。`restart: unless-stopped` 负责容器恢复，宿主容器引擎登录启动仍需 M5 的 Mac 流程，因此这份配置本身不代表电脑重启恢复已经完成。

停止开发容器用 `docker compose --env-file .env.compose down`，保留数据库卷。只有 CI 的一次性测试栈会执行 `down -v`。不要将该删除卷命令用于个人资料库。

## 本机已验证的容器结果

Docker Engine 29.9.3（ARM64）、Compose 5.7.0；API 与数据库健康检查通过，worker 与 gateway 运行。`ffprobe -version` 返回 5.1.9-0+deb12u1。观看端、管理端及各自 JS/CSS 返回 200；登录、当前资料、空影片列表、分类和退出登录通过。重启四个服务后账号仍可登录，持久卷保留。迁移重复执行通过。

本机账号凭据只保存在 `.runtime/container-access.json`，`.env.compose` 使用独立随机数据库密码，两者权限 600，均不入 Git。容器库没有复制开发样例或旧数据；它目前是可登录的空片库。旧开发账号只用于 5180/5181，容器账号用于 8180。浏览器同时试用时，开发版使用 `127.0.0.1`，容器版使用 `localhost`，让两套实例的会话 Cookie 分别保存在不同主机名下。

此处验证的是容器进程重启。Docker 登录启动、Mac 重启、真实媒体挂载和备份恢复仍按 M5 验收。

## 持续集成

`.github/workflows/ci.yml` 有三类任务：

- application：隔离 PostgreSQL、显式迁移、类型检查、19 项服务端与数据库测试、Web/API 构建、双 SDK 契约检查。
- android：JDK 17、SDK 36、构建开发 APK 和 JVM 契约测试。
- images：构建 Compose，显式迁移，启动并探活，确认 worker 内 FFprobe 和管理静态资源可访问。

流水线没有部署权限、没有生产密钥，也不会连接旧库。CI 数据库密码仅用于一次性容器。当前没有 Git 远端，所以以上流水线尚未实际在 GitHub 运行；发布和回滚流程按 M5 实施。

## 录入与 JavDB 资料来源

更新已有环境时先运行 `pnpm db:migrate`，再启动 API 和 `pnpm dev:worker`。Compose 的 migrate 服务和 worker 采用同一份迁移与队列定义。手动草稿可先填片名或编号保存，绑定时填写媒体根目录内的 MP4/MKV 相对路径。系统会探测真实文件，保留该草稿的资料和 ID。

抓取仅需要 worker 向来源站点和图片站点发起出站 HTTPS 请求。默认来源是 JavDB。可通过 worker 的 `VIDEO_X_JAVDB_BASE_URL` 指定来源 HTTPS 站点。`VIDEO_X_JAVDB_COOKIE` 可选，仅随同源页面请求发送。额外的封面域名可列入 `VIDEO_X_JAVDB_IMAGE_HOSTS`，用逗号分隔。请求失败或站点要求验证时，工作台显示原因，可人工重试。

每个来源实现 `MetadataProvider.lookup` 并注册在 `apps/server/src/modules/sources/providers.ts`。编号唯一精确匹配时读取详情，模糊匹配由使用者选择。候选和采用记录落在 `import_lookups`。演员、导演、系列、片商及标签先按名字保存在草稿，发布事务中才解析关联。发布前可在编辑器移除。来源标签保留在标签字段，作品主分类由使用者选择。

## Download 整理工作台

API 与 Worker 读取相同的 `VIDEO_X_STORAGE_LAYOUT`。以下配置在媒体根下使用既有的 Download 和 Library 两个目录。保留根目录现有的 `.video-x-root` UUID。API 浏览目录和读取影片，Worker 在人工核对并点击移动发布后才操作文件。

```json
{"inbox":"Download","targets":[{"key":"library","label":"测试资料库","dir":"Library","limit":50}]}
```

`dir` 是登记根内允许浏览的相对目录。每个分类目录均可单独登记为目标。第二块卷可在目标中提供 `root`，指向 API 与 Worker 都能访问、带独立 UUID 标识的挂载路径。挂载丢失、卷标识改变、文件重名或超出目录上限会阻断整理。每个目标可用 `limit: 0` 关闭数量上限。

本机测试服务可以直接使用目录路径。Compose 在默认只读模式上叠加 `compose.organizer.yaml`，还需 `compose.media.yaml`。在环境文件设置上述 JSON 以及现有的 `VIDEO_X_MEDIA_HOST_DIR`、`VIDEO_X_INBOX_HOST_DIR` 和 `VIDEO_X_LIBRARY_HOST_DIR`。后两项分别指向同一媒体根下的 Download 和 Library，使 API 只读视图和 Worker 的子挂载指向相同文件。跨盘部署用相同容器路径为 API 和 Worker 增加目标根挂载，API 使用只读挂载。额外目标的写权限按实际目录授予。修改环境后同时更新两个进程，先执行数据库迁移再启动新版服务。

移动任务恢复依靠 PostgreSQL 日志和目标盘的任务临时文件。Worker 重启会重新领取未完成任务。界面显示阻断原因时，处理目录、磁盘或文件冲突再点「重试整理」。新文件独占创建，临时文件只有通过身份校验后才会续写。若最终文件身份未知，系统保留文件并提示处理。

### 在管理端设置下载目录

在「系统状态 → 媒体存储 → 选择下载目录」展开已登记的媒体卷，选中接收新片的文件夹后保存。工作台使用这个目录名作为唯一的录入入口。文件树只读取已展开的层级，筛选覆盖当前已加载和展开的分支。勾选 MP4 或 MKV 后加入队列，再选择目标分类和子目录，人工核对并发布。

迁移 0009 把选择保存到带 UUID 标识的存储根，之前从下载目录录入的稿件保留整理要求。切换目录会使旧选择窗口失效。配置中的 `targets` 是可写归档范围，`pickerOnly: true` 关闭整盘扫描并将文件录入限制在已选下载目录。`readRoots` 可登记以往媒体根，以便已发布作品继续播放。API 与 Worker 使用相同的根配置。
