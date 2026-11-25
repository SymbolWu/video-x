# video-x

个人影视资料库：观看 Web、管理 Web、Android 与模块化服务端共用真实 API。

M2 进行中，本地扫描、草稿编辑、人工发布以及 Web 和 Android 的真实播放与跨端毫秒续播已贯通。M0/M1 本地版本已交付，三端真实资料切片已运行；本机 Docker 构建、启动与重启验收已通过。能力及边界见 [阶段记录](docs/implementation/status.md)，完整目标见 [产品需求](docs/planning/product-requirements.md)。现有开发样例与用户旧库独立。

## 开发约定

从[贡献指南](CONTRIBUTING.md)开始。目录与依赖遵循[代码规范](docs/standards/code.md)，页面设计和验收遵循[界面与交互规范](docs/standards/interface.md)。仓库代理入口为 [AGENTS.md](AGENTS.md)。

## 本地启动

本机已经初始化，重复启动只需 `pnpm db:local`、`pnpm dev`，另开终端运行 `pnpm dev:worker`。以下完整步骤用于首次安装。

Node 24、pnpm 9、PostgreSQL 16；Android 使用 JDK 17 和 SDK 36。

```sh
pnpm install --frozen-lockfile
pnpm db:local
pnpm db:migrate
pnpm account:create
pnpm demo:seed
pnpm dev
# 另一个终端：pnpm dev:worker
```

`db:local` 只管理本项目 `.runtime` 下的 PostgreSQL，端口 54339，生成权限受限的 `.env`；不会访问旧库。`account:create` 从标准输入设置单账号；`demo:seed` 仅用于开发，明确插入虚构资料，没有视频文件。已有配置不会被覆盖。

观看端 http://127.0.0.1:5180，管理端 http://127.0.0.1:5181，API http://127.0.0.1:5120。结束时 `pnpm db:stop` 仅停止本项目数据库。

## M2 录入和播放试用

先运行 `pnpm db:migrate`，用 `node tooling/media-sample.mjs` 准备项目专属的 22 秒测试片，启动开发服务与 worker。在管理端「系统状态」选择测试下载目录，回到「录入工作台」打开文件树并勾选测试片。设置整理目标，补齐完整发行日期、保存并核对，再手动发布。本地开发使用 PATH 中的 ffprobe，容器镜像内置该工具，无需向后端配置可执行文件路径。

发布后，在观看 Web 或 Android 打开该片详情并播放。暂停或退出后，另一端的详情会显示「继续播放」和断点时间。Android 模拟器连接开发 API 使用 `http://10.0.2.2:5120/`。目前已实测 MP4/H.264/AAC 的双向续播。

部署到真实媒体盘时选定一个专用根目录，首次放置一个仅含 UUID 的 `.video-x-root` 文件（已有标识须保留）。原生运行用 `VIDEO_X_MEDIA_ROOT` 指定根目录。容器运行把 `VIDEO_X_MEDIA_HOST_DIR` 指向这个目录，在原 Compose 命令上增加 `-f compose.yaml -f compose.media.yaml`；API 和 worker 使用同一只读挂载。界面不接受任意磁盘路径。

## 容器试用

本机 Docker 已运行：观看端 <http://localhost:8180/>，管理端 <http://localhost:8180/manage/>。这是独立空片库，尚未导入影片；账号保存在 `.runtime/container-access.json`（600 权限）。5180/5181 仍使用带虚构样例的开发库，两套数据独立。启动命令与恢复边界见 [运行说明](docs/implementation/operations.md)。

## 验证

```sh
pnpm contracts:generate
pnpm typecheck
pnpm test
pnpm test:ui
pnpm build
pnpm contracts:check
pnpm android:build
```

浏览器回归使用本地构建和内置测试资料，覆盖管理端与窄屏观看端。可使用已安装的 Chrome，或先执行 `pnpm exec playwright install chromium`。

本机已创建的开发账号位于 `.runtime/dev-access.json`（600 权限）；仅用于新开发库。全新空开发库可用 `pnpm dev:bootstrap` 生成随机账号及样例。

[运行与容器说明](docs/implementation/operations.md) · [工程决定](docs/implementation/architecture.md) · [数据库启用清单](docs/implementation/schema-scope.md)。没有运行原型 localStorage 作为正式数据源。
