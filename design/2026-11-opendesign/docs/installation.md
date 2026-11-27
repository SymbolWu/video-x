# OpenDesign 安装与 Codex 协作

核对日期：2026-11-27。本机已验证 OpenDesign **0.27.2**、Codex 插件 **0.5.3** 和名为 `open-design` 的 stdio MCP。这里记录安装方法，没有打包安装器或个人配置。

## 1. 安装桌面应用

从 [官方下载页](https://open-design.ai/download/) 选择对应架构的 macOS DMG，或 Windows 安装包。macOS 将应用放进「应用程序」，首次打开完成系统确认。官方页面核对时的版本为 0.27.2。[版本发布记录](https://github.com/nexu-io/open-design/releases)可用于后续核对。

已有本机应用时可直接继续使用，无需为浏览本归档重装。HTML 预览只需要仓库使用的 Node.js 24。

## 2. 注册本地 MCP

打开 OpenDesign 的 **Settings → MCP server → Codex**，按该面板的客户端配置或安装入口注册。面板提供本机正确的绝对路径；macOS 的 `/usr/bin/od` 是系统命令，不一定是 OpenDesign CLI。[官方安装说明](https://github.com/nexu-io/open-design/blob/main/README.md)

如果已经确认当前 `od` 属于 OpenDesign，也可使用官方命令：

```sh
od mcp install codex
```

检查注册结果：

```sh
codex mcp get open-design --json
```

应看到启用的 `open-design` 和 `stdio` 传输。不要手工套用本项目运行时的临时 HTTP 端口。

## 3. 安装 Codex 插件

官方插件的安装命令如下，本机已核对 CLI 支持这些参数；不需要重复覆盖已有安装：

```sh
codex plugin marketplace add nexu-io/open-design-agent-plugins --ref main --json
codex plugin add open-design@open-design --json
codex plugin list --json
```

插件与本地 MCP 是两部分，装完插件仍要完成第 2 步。安装后新建 Codex 会话，再使用 `@open-design`。需要云端生成时，按插件发起的 OpenDesign 登录流程完成授权。[官方 Codex 安装文档](https://github.com/nexu-io/open-design-agent-plugins/blob/main/docs/INSTALL_CODEX.md)

## 4. 选择生成方式与费用

本归档的浏览、HTML 编辑与本地预览不需要购买 OpenDesign。官方区分三种生成方式：本地代理使用已有代理订阅或额度；BYOK 由所选模型提供商计费；Cloud 使用 OpenDesign 账户与托管模型额度。生成前在应用或插件中核对当前方式和额度。[官方方式与费用说明](https://open-design.ai/#pricing)

Codex 插件的默认 Cloud 工作流可能要求登录；它与桌面中的本地代理方式不同。修改已有 HTML 文件不等于发起一次云端生成。[插件架构说明](https://github.com/nexu-io/open-design-agent-plugins/blob/main/README.md)

## 5. 本项目的协作约定

OpenDesign 保存可编辑原型，Codex 读取 HTML、样式、样本和设计说明，进行增量修改并实测。每轮更新后把完整运行文件同步到本归档，保留来源和验收截图。当前项目 ID 及独立启动命令见 [README](../README.md)。

本机连通性是本次验证结果；另一台机器的安装路径和运行端口应由当地应用生成。不要将个人密钥、Vela 登录数据或完整 Codex 配置放入仓库。
