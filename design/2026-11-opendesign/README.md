# OpenDesign 观看端设计归档

2026-11-27，基于 `feat/open-design-test` 的独立高保真 HTML 原型。

从仓库根目录启动，不需要安装原型依赖：

```sh
node design/2026-11-opendesign/scripts/preview.mjs
```

打开终端打印的地址。默认端口为 `4178`，占用时可加 `--port 4179`；`--port 0` 自动选择空闲端口。入口为：

- 片库：`http://127.0.0.1:4178/index.html?tab=films`
- 系列目录：`http://127.0.0.1:4178/index.html?tab=series`
- 长页滚动：`http://127.0.0.1:4178/series.html?id=bond`
- 演员作品：`http://127.0.0.1:4178/actor.html?name=丽贝卡·弗格森`
- 影片详情：`http://127.0.0.1:4178/detail.html?id=dune2`

按 Ctrl+C 停止服务。原型通过 JavaScript 模块读取本地 JSON，需要 HTTP 服务；直接双击 HTML 的 `file://` 方式不能完成同样的交互。

## 内容

| 路径 | 内容 |
| --- | --- |
| [prototype/](prototype/) | 当前完整 HTML、CSS、JavaScript、Logo、海报、样本与 OpenDesign 设计记录；四种页面可互相下钻和返回 |
| [docs/installation.md](docs/installation.md) | OpenDesign 桌面版、Codex 插件和本地 MCP 的安装、验证及费用边界 |
| [docs/design-decisions.md](docs/design-decisions.md) | 当前有效的视觉与交互决定 |
| [docs/validation.md](docs/validation.md) | 本次实际浏览器验收范围与结果 |
| [docs/asset-sources.md](docs/asset-sources.md) | 海报、Logo、用户参考图和文档来源 |
| [docs/history.md](docs/history.md) | 设计演进与早期工程快照索引 |
| [references/](references/) | 用户提供的叠放参考、Logo 生成探索及简报 |
| [evidence/](evidence/) | 当前滚动截图、封面截图，以及历史对照 |
| [history/](history/) | 早期原型工程的压缩快照；当前评审以 `prototype/` 为准 |
| [asset-manifest.json](asset-manifest.json) | 归档文件的相对路径、大小与 SHA-256 |

当前样本为 **45 部影片、6 位演员、7 个系列**。新增「007」系列包含 25 部不同作品，便于查看桌面和手机的长页滚动。版本、个人喜欢与已看状态用于交互评审；没有连接真实媒体盘或服务端。新增影片未关联播放文件，进入详情会显示不可播放状态。

## 继续迭代

这份目录已经包含运行资源，浏览和编辑无需 OpenDesign 在线服务。当前 OpenDesign 项目名为「video-x · 观看端精修 · 演员与系列」，项目 ID 为 `video-x-watch-refinement-20261127`；它的本机预览端口随应用会话变化，不作为归档入口。

后续在本目录修改 `prototype/`，检查实际页面，再将相同文件同步到 OpenDesign 项目。通过 MCP 读取 `get_project` 返回的真实预览地址；`write_file` 按项目内相对路径写文本，二进制资源使用 `encoding: base64`。迁移到另一台机器时，可以创建空项目，再写入整个 `prototype/`，不要复制原机器的 socket、端口、登录凭据或数据库。

主色来自仓库 [tokens.css](../../packages/design-tokens/tokens.css) 的 `--accent`，当前为 `#ff6f91`。原型的 `theme-tokens.css` 是本次提取快照；以后修改正式令牌时需同步更新该快照。

正式应用代码在 `apps/` 与 `packages/`；本目录用于设计交付。产品规则见 [产品文档](../../docs/planning/product.md)，三端基线见 [上一版设计](../2026-11-film-catalog/README.md)。
