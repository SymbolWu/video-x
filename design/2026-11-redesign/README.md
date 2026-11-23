# video-x · 浏览体验重设计 · 2026-11-18

这是一轮手机优先的交互设计预览，用于评审布局、内容密度和控件风格。它不替代产品需求文档、完整的列表查询规格或数据库设计，也不表示 Android 原生界面已经落地。

- [手机交互预览](https://designs.magicpath.ai/v1/sparkling-coast-6474)
- [Web 交互预览](https://designs.magicpath.ai/v1/clearly-rock-7975)
- [MagicPath 设计项目](https://www.magicpath.ai/files/473808857974583296)
- `preview/index.html` 是本地入口，`src/` 是可编辑的 React/TypeScript 源码，`assets/` 是演示图片，`screenshots/` 是实际浏览器截图。

## 本轮设计取向

手机片库去掉宣传语和重复的大标题，以短标题、影片/演员/系列视图、主分类和紧凑工具栏组成顶部。本地片库默认展示竖版海报，390px 宽时采用三列；点「横图」可切到两列电影剧照。

手机使用底部筛选面板、分组选项和固定的应用按钮，排序有独立入口和升降序。筛选先编辑草稿，应用后影响列表；关闭取消本次修改。喜欢与已看独立，可以组合筛选。未评分使用空值，排序固定放在末尾。

详情以封面、播放、收藏夹、个人评分和已看为主，下面接简介、演员、所属系列。演员和系列是浏览影片的入口；返回恢复前一视图和条件。本地 Web 观看端使用横向导航（发现、片库、收藏），右侧提供搜索和个人资料入口。收藏夹从「收藏」进入。影片海报网格随浏览器宽度自动排列。MagicPath 云端链接保留此前的侧栏版本。

## 已演示与保留的范围

已实现的演示交互：影片/演员/系列切换、分类、当前实体搜索、常用筛选、常用排序及升降序、影片详情、演员/系列关联作品、喜欢、1～5 星及取消评分、手动已看、加入/移出一个样例收藏夹、发现页和个人页入口。播放按钮明确提示未连接媒体文件。

这不是全功能替换版。完整能力仍按 [列表查询规格](../../docs/planning/list-query-spec.md) 和 [产品需求](../../docs/planning/product-requirements.md) 实施，特别保留：

- 高级筛选：年份/日期/评分上下限、未知值、播放次数、入库天数、中文标记、作品形态、标签/片商、分辨率、时长、体积和文件状态。
- 高级排序：播放次数、大小、时长、最近播放、喜欢时间，以及系列/收藏夹的保存顺序和成员加入时间；详情范围的专用默认排序。
- 演员性别、喜欢、有无作品；系列有无作品；收藏夹搜索排序和完整维护。
- 分集/作品组、版本/文件、资料编辑、分集组装、批量复核、来源抓取结果列表与人工发布。

以上尚未在这份视觉稿中全部绘制或模拟，不能据此缩减需求。当前关联作品页的演示默认排序仍为添加时间，正式实现应遵循查询规格中的演员发行时间、系列/收藏夹成员顺序等约定。演示数据只有一个系列关联，正式关系仍通过 `franchise_items` 支持多系列。

## 可见信息与数据库来源

本地原型使用公开影片与演员资料。主分类是本次样例编排，添加时间与个人状态为演示值。以下是正式应用的字段依据。

| 界面内容 | 规划表/字段或派生关系 | 启用阶段 |
| --- | --- | --- |
| 片名、简介、发行年份、添加顺序 | `media_items.title/summary/release_year/created_at` | M1 |
| 作品分类 | `media_items.primary_category_id → categories`，单主分类 | M1 |
| 演员姓名、详细名称、独立分类 | `people.full_name/detailed_name/primary_category_id`；无 alias。详细名称当前用于搜索，完整资料页后续补齐 | M1 |
| 演员作品与数量 | `credits.person_id/media_id/job`，已发布直接关联作品去重计数 | M1 |
| 系列名称、简介、独立分类 | `franchises.name/description/primary_category_id` | M1 |
| 系列作品及数量 | `franchise_items`，不是在作品表新增单一系列字段 | M1 |
| 喜欢、个人 1～5 星、已看 | `user_media_state.is_favorite/rating/watched_at`，彼此独立 | M1 |
| 收藏夹和成员数量 | `collections` + `collection_items` | M1 |
| 时长角标 | 默认 `editions → edition_parts → media_files.duration_ms` 聚合；本次样例时长来自公开影片资料 | M2 |
| 继续播放 38:20 | `playback_progress.position_ms`，对应版本/文件段；此处固定样例，没有实际播放器 | M2 |
| 影片封面 | `media_images → assets`，用途及布局遵循资料模型；样例使用对应影片海报和剧照 | M3 |
| 演员头像、系列/收藏夹封面 | `people.portrait_asset_id`、`franchises/collections.cover_asset_id/cover_media_id → assets` | 图片托管 M3 |
| W 头像、个人页名称 | `profiles.display_name` 的展示示例；字母头像是前端派生 | M1 |

完整阶段范围见 [schema-scope.md](../../docs/implementation/schema-scope.md)。没有为视觉稿增加数据库字段，也没有修改现有应用数据。

## 运行与修改

在项目根目录运行：

```sh
python3 -m http.server 8092 --bind 127.0.0.1 --directory design/2026-11-redesign/preview
```

然后访问 `http://127.0.0.1:8092/`。不需要安装新依赖。

修改 `src/components/generated/Experience.tsx` 或 `experience.css` 后，可在项目根目录重新构建：

```sh
NODE_PATH="$PWD/packages/ui/node_modules" pnpm exec esbuild design/2026-11-redesign/src/main.tsx --bundle --loader:.jpg=file --asset-names=cinema/[name]-[hash] --outdir=design/2026-11-redesign/preview --minify --define:process.env.NODE_ENV='"production"'
```

`Experience` 共享交互和设计变量；`desktop` 参数切换端布局。演示状态只在当前页面内存中，刷新会重置。图片已包含在本地，Google Fonts 中文补充字体需要网络；Mac/Android 上有系统中文字体回退。正式 Android 应使用原生 Compose 布局、ModalBottomSheet 和系统返回栈，不能直接把这个 HTML 包进 WebView 交付。

## 验证记录

- 两份 MagicPath 构建成功；共享 TypeScript 严格检查通过；本地生产 bundle 构建成功。
- 浏览器检查 390×844 手机布局：首屏、详情、筛选面板。验证取消草稿不改变结果、喜欢且未看组合、演员→作品→返回、系列作品关联、评分及已看状态更新。
- Web 布局与排序的浏览器检查、截图见 `screenshots/`。
- 这是界面验收，不代表正式 API、数据库分页、Android 触控/返回手势或真实播放验收。

## 图片与字体

当前本地样例为 39 部真实影片、100 位演职员、7 个系列。中文海报（有可用版本时）、剧照、演员肖像与基础资料来自 TMDB 中文影片页面，图片文件、资料页及原图地址见 [cinema-sources.json](cinema-sources.json)。每部片选取部分主演；系列作品数只统计本样本中收录的影片。本地资料仅作界面评审。上轮的风景图记录保存在 asset-sources.json。

中文补充字体为 [Google Fonts Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)，样式内使用针对本稿文字的字体子集。Latin/中文首选平台系统字体。

## 管理端设计

[管理端本地入口](preview/admin.html#ingest)复用旧管理原型的批次、完整编辑和资料维护逻辑。桌面左侧按工作区、资料维护和来源运行分组。片库与待录入队列拆开，公开影片图像与观看端共用。8 部影片作为采集草稿，另外 31 部初始化为正式影片；另有两条私人影像示例可组合成分集。本地模拟的抓取、文件、确认和发布状态保存在管理端专属浏览器存储中。

列表直接显示演员、分类、年份、获取结果、常用资料缺项和核对状态。点击「分集线索」按文件名提示或已有分集关系筛选，人工决定是否编组，勾选后建容器、排序，再人工确认与发布。浏览器展示从 `import_items.draft`、版本文件、`draft_revision/reviewed_revision` 派生的状态；人工发布后对应 `media_items.parent_id/episode_number`、演员和系列等关系。详见[录入交互规则](../../docs/planning/ingest-interaction-v07.md)。本地静态页面的可编辑代码在 `preview/studio/`，电影数据由已有的 cinemaCatalog.ts 打包；两个端的业务状态各自演示。
