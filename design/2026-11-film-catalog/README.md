# video—x · 片库设计 v3

2026.11 · 基于 feat/film-catalog 现有实现

> 这一版从代码重新出设计，不再沿用旧设计目录里的交互结构。没有宋体，没有常驻右侧表单，没有手动新建。

## 先看哪里

在仓库根目录运行：

    python3 -m http.server 8099 --bind 127.0.0.1 --directory design/2026-11-film-catalog

- 设计总览：http://127.0.0.1:8099/
- 观看端：http://127.0.0.1:8099/web.html
- 管理端：http://127.0.0.1:8099/admin.html
- 移动端：http://127.0.0.1:8099/mobile.html

管理端每个模块可直接打开，例如：

- 录入工作台：/admin.html?view=intake
- 录入核对抽屉：/admin.html?view=intake&drawer=d1
- 影片资料库：/admin.html?view=media
- 演员：/admin.html?view=people
- 演员详情：/admin.html?view=person&record=1190668
- 系列：/admin.html?view=franchises
- 分类：/admin.html?view=categories
- 标签：/admin.html?view=tags
- 片商：/admin.html?view=organizations
- 收藏夹：/admin.html?view=collections
- 后台任务：/admin.html?view=jobs
- 系统状态：/admin.html?view=settings
- 演员资料补全：/admin.html?view=enrich
- 归档：/admin.html?view=archive
- 影片编辑：/admin.html?view=editor
- 版本与文件：/admin.html?view=editor&tab=版本与文件

移动端用 **?screen=** 指定画面：discover、library、collections、profile、detail、filters、player。

可直接照抄的尺寸、组件结构和正式数据替换方式见 [IMPLEMENTATION.md](IMPLEMENTATION.md)。

## 本次针对反馈的修正

| 反馈 | 这一版怎么改 |
| --- | --- |
| 不喜欢宋体 | 字体系统里移除 Songti / STSong；标题使用 Avenir Next + PingFang SC，字段和文件使用 SF Mono。大标题改为 650 字重、负字距，不再靠宋体制造“高级感”。 |
| 移动端收藏 / 我的不是一级页面 | 收藏和我的都改成真正的 **m-view**：有页头、有返回位置、有固定底部 Tab。删除原来的浮层实现，不再出现“没有导航的页面”。 |
| 管理端录入 Header 太高 | 页头只保留标题、单行说明和主操作；统计条统一 50px。录入与影片资料库使用同一条 count-bar，不再一个巨大、一个很小。 |
| 录入左右分栏影响总览 | 队列表格改为 **全宽**；核对、发布等操作进入右侧抽屉，抽屉关闭后列表仍是完整总览。 |
| 手动新建不存在 | 删除手动新建。录入主操作改为当前实现的 **从下载目录选择文件**；没有选择下载目录时才是设置下载目录。 |
| 信息密度不足 | 观看端片库 7 列（一屏约 14 部），移动端影片 3 列；管理端表格行高 66–72px，首屏 7 条草稿。 |
| 每个模块都要有设计 | 管理端 13 个路由视图全部可打开：录入、影片、演员、系列、分类、标签、片商、收藏夹、任务、系统、演员补全、归档、影片编辑；另有演员、系列详情页与录入抽屉。 |

## 设计方向

**观看端 · Cinema**

- 深墨底 + 黄铜强调；无宋体。
- 首页 480px 左右的横幅，继续观看和类型索引在首屏下方开始出现。
- 片库 7 列；卡片只保留片名、年份、分类、评分和格式角标。
- 收藏、我的都是带顶部导航的一级页面。
- 详情页首屏是剧照 + 海报 + 播放；评分、喜欢、已看、收藏夹在首屏可达。

**管理端 · Archive**

- 日光纸底 + 牛血红；无宋体，标题为无衬线工具型字号。
- 固定 228px 侧栏、52px 顶栏、50px 统计条。
- 列表全宽；操作使用右侧抽屉、弹窗或独立页面，不再常驻占宽。
- 录入：全宽队列 + 批量操作条 + 核对抽屉 + 独立编辑页。
- 影片：列表 / 海报 / 横图三种视图；筛选与排序在工具栏内。
- 演员、系列：列表 + 详情页 + 编辑抽屉；系列封面使用 1–3 张作品横切蒙太奇。
- 分类：三列 StudioCard 网格（沿用现有实现），不做统计表；标签、片商：紧凑卡片网格；收藏夹：紧凑卡片 + 三图横切封面。
- 任务、系统、演员补全、归档：各自的运行与维护页面。

**移动端 · Pocket**

- 390 × 844；底部四项固定：发现、片库、收藏、我的。
- 收藏与我的都有页头和底部 Tab，属于一级页面。
- 分类按钮 44px 高、间隔 6px，横向滚动。
- 影片 3 列；系列与收藏夹 2 列卡片。
- 详情页有返回、喜欢、播放、版本、评分和已看；不出现重复底栏。
- 筛选用 88% 高的底部抽屉。

## 代码映射

| 设计界面 | 现有实现 |
| --- | --- |
| 观看端发现 | apps/web/src/features/discover/DiscoverPage.tsx |
| 观看端片库 | Experience.tsx、LibraryToolbar、LibraryTabs、BrowseFilters、FilmCard |
| 观看端详情 | features/film/FilmDetail.tsx |
| 观看端播放 | features/playback/Playback.tsx、ScreeningRoom |
| 观看端收藏 / 我的 | CollectionShelf、CollectionDialogs、ProfilePage |
| 管理端外壳 | apps/admin/src/app/AdminShell.tsx、AdminRoute.ts |
| 录入 | features/intake/Intake.tsx、QueueTable、ReviewCard、ReviewPublishDialog、EpisodeGroupDialog |
| 影片资料库 | features/catalog/CatalogPage.tsx、CatalogTable、FilmCards |
| 演员 / 系列 | RecordCatalog、EntityEditor、RecordDetail |
| 分类 | CatalogPage categories、分类显示开关 |
| 标签 / 片商 | features/dictionaries/Dictionary.tsx |
| 收藏夹 | features/collections/CollectionsPage.tsx |
| 后台任务 | features/operations/JobsPage.tsx |
| 系统状态 | features/operations/SystemStatus.tsx |
| 演员资料补全 / 归档 | CatalogTools.tsx |
| 影片编辑 | PublishedWorkspace、FilmWorkspace、CommonFields、PublishedFiles |
| 移动端 | LibraryApp.kt、FilmDetail.kt、LibraryFilters.kt、PlaybackScreen.kt |


## 高保真交互

这一版不是静态截图。页面内维护一份内存状态，刷新后恢复初始数据：

- **管理端录入**：阶段与状态筛选、搜索、勾选、批量条启用条件、设置整理目标、创建分集容器、批量分类、抓取所选、批量核对、发布所选。核对、保存草稿、确认、发布都会更新列表与统计；核对通过右侧抽屉完成。
- **管理端资料**：新增与编辑演员、系列、分类、标签、片商、收藏夹；分类显示开关；演员/系列详情页；演员照片、导演、系列、标签、片商的增删；封面与横图选择；影片编辑表单保存；草稿独立编辑页；来源对照与归档详情。
- **观看端**：分类/筛选/排序、搜索、演员/系列范围、收藏夹创建与成员页、详情喜欢/评分/已看、收藏夹选择、播放版本、我的页统计与已看筛选。播放器使用 assets/preview.mp4 的 22 秒样片，支持播放/暂停、进度、前后 10 秒、静音、全屏与版本切换。
- **移动端**：发现/片库/收藏/我的一级页面与底部 Tab；影片 3 列、系列 2 列；44px 分类按钮；筛选抽屉；演员/系列范围；收藏夹成员页与新建收藏夹；详情喜欢/评分/已看、版本底部面板、收藏夹选择；播放器使用同一样片。
- **所有浮层**：抽屉/弹层/模态具备关闭按钮、遮罩关闭与 Esc 关闭；关闭后回到触发位置。

外部副作用（真实登录、上传、来源抓取、数据库写入、真实视频解码）仍是本地模拟。样片只用于验证播放器布局与控件。

## 与“旧设计”的关系

本目录没有引用 **design/2026-11-redesign** 或 **design/three-client-prototype** 的页面结构。旧目录保留为设计演进记录；本目录的字段、状态和操作来自当前分支的 **apps/** 代码。

## 文件

    design/2026-11-film-catalog/
    ├── index.html                 设计总览与模块入口
    ├── web.html                   观看端
    ├── admin.html                 管理端
    ├── mobile.html                移动端
    ├── tokens.json                设计 token
    ├── styles/
    │   ├── tokens.css
    │   ├── base.css
    │   ├── web.css
    │   ├── admin.css
    │   ├── mobile.css
    │   └── hub.css
    ├── scripts/
    │   ├── data.js                影片、演员、系列演示数据
    │   ├── admin-data.js          由现有模块字段派生的草稿、任务、字典数据
    │   ├── admin.js               13 个管理视图与抽屉
    │   ├── web.js
    │   ├── mobile.js
    │   └── icons.js
    ├── assets/                    影片、影人、场景、来源清单
    ├── screenshots/               35 张实现截图
    └── tools/capture.sh           截图脚本

## 数据与边界

- 不启动数据库、不写入媒体盘；所有内容为静态演示。
- 39 部影片、100 位演员、7 个系列来自现有演示目录；草稿、任务、卷容量为界面演示值。
- 录入抽屉中的“确认核对 / 手动发布”只做演示反馈，不调用 API。
- 系统状态中的卷容量、Worker 心跳、数据库版本是只读展示样例。
- 管理端的演员、系列、分类、标签、片商、收藏夹、任务、系统、补全、归档均有独立视图；演员与系列另有详情页。
- 未覆盖真实上传、来源抓取、发布事务、Android 原生返回栈和真实解码。

## 截图

- 观看端 6 张：discover / library / detail / player / collections / profile。
- 管理端 19 张：intake、intake-drawer、media、media-cards、people、person、franchises、franchise、categories、tags、organizations、collections、jobs、settings、enrich、archive、editor、editor-versions、draft-editor。
- 移动端 9 张：board、discover、library、series、collections、profile、detail、filters、player。
- 总览 1 张。

生成方式见 **tools/capture.sh**。
