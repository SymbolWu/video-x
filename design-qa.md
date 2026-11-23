# video-x 三端设计验收

2026 年 11 月 19 日，在当前 Mac 上逐页对照了已确认的影院封面版设计与运行中的客户端。对照册收录 46 个页面或操作状态，其中 38 个有同状态的设计稿，两张图并排展示。其余 8 个保留单张运行截图，记录排序结果、播放、分集和资料维护等实际操作。[打开对照册](docs/implementation/evidence/three-clients/index.html)

| 客户端 | 对照范围 | 运行截图 / 有同状态设计稿 |
| --- | --- | --- |
| Android 原生 | 片库、筛选、排序、影片详情、演员、系列、发现、收藏、我的，以及应用条件后的列表与播放器 | 12 / 9 |
| Web 观看端 | 顶部导航、片库、筛选、详情、演员、系列、发现、收藏、我的，以及横图、演员作品、分集选择与播放器 | 12 / 8 |
| 管理端 | 录入工作台、组建分集、影片、演员、系列、分类、收藏夹、标签、片商、资料补全、来源差异、资料来源、任务、归档、系统状态，以及草稿编辑和发布 | 22 / 21 |

## 2026-11-20 · 下载箱整理与系统状态

在[文件整理交互稿](design/2026-11-redesign/preview/storage-intake.html)中跨两层目录选择两部示例影片，向已有 49 个视频的示例目录再安排两个会被阻止。换到有余量的目录后，核对面板逐一显示源位置和目标位置，显式点击后完成模拟发布。[发布预览](docs/implementation/evidence/three-clients/storage-move-prototype.jpg)

[实际系统状态页](http://localhost:5280/manage/#settings)显示两块外置盘的卷容量、独立验收媒体根的标识、素材容量与权限、Worker 心跳、数据库和 FFmpeg 工具版本、恢复及访问配置。Mac 宿主登录恢复标为待验证。容器内呈现其可观察的媒体挂载空间，宿主独立盘列表来自 Mac 的只读查询。此次使用例子演练文件移动，真实资源盘仅查询目录及容量。[实际页面](docs/implementation/evidence/three-clients/admin-resource-volumes.jpg)

## 手动草稿与 JavDB 实机验收

在独立验收库新建「在线资料验收 · 手动草稿」，仅填写片名和编号。后台按编号取得 8 项资料，队列列出缺少的导演、简介和中文支持，同时显示 8 张来源剧照链接。随后在同一条草稿绑定一秒 MP4，人工只采用发行日期。队列保留手工片名，显示完整日期和待核对状态。样例留在工作台供继续检查。[查看运行截图](docs/implementation/evidence/three-clients/admin-ingest-javdb.jpg)

## 录入工作台复验

上一次对录入工作台的通过判断过早。相同桌面视口下，原实现的表头比稿件低 35 px，首行高 131 px。缺项挤在核对状态列，分类需要打开编辑弹窗，片名也没有进入原稿的分区编辑页。[修正前截图](docs/implementation/evidence/three-clients/previous-admin-intake.jpg)

本次以 `design/2026-11-redesign/preview/admin.html` 及其 `studio` 样式表作为基准，正式路由直接加载相同的表格、编辑器和管理端样式。以下数值取自同一浏览器标签的 DOM，视口为 1440 × 900 CSS px，完整截图保留了浏览器实际导出的像素尺寸。

| 核对位置 | 确认稿 | 上一实现 | 本次实现 |
| --- | ---: | ---: | ---: |
| 队列表头距视口顶部 | 426 px | 461 px | 426 px |
| 表头高度 | 46 px | 47 px | 46 px |
| 首行高度 | 98 px | 131 px | 98 px |
| 作品列宽度 | 274 px | 240 px | 274 px |

八列左边界、标题字级、海报裁切、分类控件、缺项与状态标签分别对照了完整截图和同一草稿的局部截图。海报来自队列，资料、缺项和计数随验收库变化。1024 × 768 视口下，宽表在队列内部横向滚动。[整页对照](docs/implementation/evidence/three-clients/index.html#admin-intake) · [同片对照](docs/implementation/evidence/three-clients/index.html#admin-queue-match)

- **行内核对**。将「海岸手记 · 上篇」从纪录片改为剧情，刷新后验证，再改回纪录片。原位展开同一条记录，核对实际简介、文件名和技术资料。[行内预览](docs/implementation/evidence/three-clients/index.html#admin-inline)
- **完整编辑**。独立编辑页包含七个分区。编号用于检索，日期保留未知、年份或完整日期三种精度，导演和演员按职务写入。回归测试覆盖分集发布后保存导演与完整日期、检索编号，以及分集容器不复制子集编号。[编辑页对照](docs/implementation/evidence/three-clients/index.html#admin-edit)
- **选择分集**。勾选上下篇，在建组弹窗更改集序并取消，再打开核对清单，验证原顺序仍在。已建组的草稿支持收起、整组选中和调整集序，修改后须重新确认。后端测试验证过期版本会被拒绝。[分集弹窗](docs/implementation/evidence/three-clients/index.html#admin-group) · [批量核对](docs/implementation/evidence/three-clients/index.html#admin-batch-review)
- **扫描与发布**。扫描入口先显示已挂载目录。实测将验收库的《星际穿越》人工确认并打开发布清单，在提交前取消，保留为可试用的已确认草稿。未全部核对的容器仍无法发布。[扫描确认](docs/implementation/evidence/three-clients/index.html#admin-scan) · [发布预览](docs/implementation/evidence/three-clients/index.html#admin-publish)

此前一轮验收使用单个已挂载目录。当时手动新建须先指定 MP4 或 MKV 文件。当时未实现无文件草稿及在线来源候选；运行版展示真实 FFprobe 状态。作品编号新表的迁移仅应用于隔离验收库和自动化测试库。

## 实际交互

- **手机片库和筛选**。进入片库即显示分类和三列海报。筛选从底部展开，底部固定重置和查看结果。首轮 39 部样片中，选择「已喜欢」后剩 7 部，重置恢复 39 部。后来手动发布了一个分集作品，按名称升序复测时共 40 部，列表显示「名称 ↑」。[筛选对照](docs/implementation/evidence/three-clients/index.html#android-filters) · [升序结果](docs/implementation/evidence/three-clients/index.html#android-ascending)
- **详情和续播**。从 Web 播放 22 秒测试片，在第 8 秒退出。Android 详情随即显示「继续播放 · 0:08」，点击后从记录位置起播。回到 Web 后读取到 Android 更新的 0:12。模拟器保留系统返回和原生播放器，详情的收藏、评分和续播读取同一账户的数据。[Android 详情](docs/implementation/evidence/three-clients/index.html#android-detail) · [Web 播放](docs/implementation/evidence/three-clients/index.html#web-playback)
- **录入、核对和发布**。工作台行内标示封面、年份、演员、分类和简介的完整性。可展开预览、编辑、批量核对。勾选多条分集草稿后，可设置容器标题、起始集号和顺序。验证了未全部核对时阻止整组发布，核对完成并手动发布后，观看端可打开已发布作品并选择分集。验收库另留「海岸手记」上下篇两条草稿供复试。[行内预览](docs/implementation/evidence/three-clients/index.html#admin-inline) · [分集容器](docs/implementation/evidence/three-clients/index.html#admin-group) · [分集选择](docs/implementation/evidence/three-clients/index.html#web-episodes)

## 对照方法与差异

桌面两端使用 1440 × 900 浏览器视口。Android 使用 390 × 844 dp 模拟器，按系统栏内的 390 × 796 内容区与原稿对照，另附带系统栏的原始尺寸截图。针对首轮发现的偏差调整了筛选选项的行宽、喜欢与评分图标的选中状态、系列封面、后台录入表格的复选框列，以及系列、分类、收藏夹的布局。中文系统字体、系统栏与浏览器滚动条在不同平台有细微差异。数据条数、影片时长、缺项、任务状态和观看进度均按验收库显示。

早期三端验收使用隔离验收库、示例海报与短测试片，当时后台资料来源限于本地探测。真实片源在物理手机上的兼容性、现用容器库的迁移与重启均不在本轮实测结果内。

## 构建与回归

`pnpm check` 通过，含类型检查、生产构建、契约检查和 21 项测试。Android 调试 APK 构建及 4 项单元测试通过。运行对照使用构建后的 Web 资源和安装到模拟器的原生 APK。[Android 设计稿](design/2026-11-redesign/preview/mobile.html?art=cinema) · [Web 设计稿](design/2026-11-redesign/preview/web.html?art=cinema) · [管理端设计稿](design/2026-11-redesign/preview/admin.html#ingest)

final result: passed
