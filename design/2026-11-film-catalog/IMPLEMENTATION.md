# 实现对照 / Implementation notes

这份说明只记录从原型迁到正式三端时需要照抄的结构和数值。原型文件本身是可运行的 HTML/CSS/JS，状态在页面内存中维护。

## 1. 设计 token

见 [tokens.json](tokens.json) 与 [styles/tokens.css](styles/tokens.css)。迁移时先落到 packages/design-tokens/tokens.css。

关键值：

| 用途 | 值 |
| --- | --- |
| 观看端底色 | #0A0A0B |
| 观看端文字 | #F1EFEA |
| 观看端强调 | #C7A25C |
| 管理端纸色 | #F3F1EC |
| 管理端文字 | #1D1C19 |
| 管理端强调 | #8D3B31 |
| 管理端侧栏 | 228px |
| 管理端顶栏 | 52px |
| 管理端页头 | 标题 26px / 说明 10.5px |
| 管理端统计条 | 50px |
| 管理端表格行 | 66–72px |
| 观看端页头 | 60px |
| 观看端片库 | 7 列，20px 间隔 |
| 移动端分类按钮 | 44px 高 |
| 移动端底部导航 | 62px |
| 移动端筛选抽屉 | 88% 高 |

字体：Avenir Next + PingFang SC；等宽用 SF Mono；没有 Songti / STSong。

## 2. 管理端页面头 + 统计条

结构：

    <header class="admin-page-head">
      <div class="page-head-copy">
        <h1>录入工作台</h1>
      </div>
      <div class="page-actions">
        <button class="btn-dark">从下载目录选择文件</button>
      </div>
    </header>
    <div class="count-bar">…</div>

- 页头只保留标题和主操作；不要恢复 46px 展示型标题，也不要在标题下写解释性段落。
- 录入与影片资料库共用同一个 count-bar 组件；不要一个用大卡片、一个用行内文字。
- 统计条右端可放“最近扫描 / 下载目录”等只读辅助信息。

## 3. 管理端全宽队列 + 抽屉

- 列表占满内容宽度；不要在主内容里常驻右侧表单。
- 行内点击打开右侧抽屉（540px，遮罩 + Esc + 关闭按钮）。
- 抽屉内部顺序：状态 / 标题 / 来源、可编辑字段、资料核对、文件事实、底部操作。
- 底部操作至少包括：保存草稿、完整编辑、确认核对或手动发布。
- 批量操作条固定在列表底部（batch-bar），按钮的禁用条件来自当前选择：
  - 发布：所有选中项已核对且无阻断；
  - 核对：选中项尚未全部核对；
  - 分集容器：至少 2 项且没有已分组项。

迁移到 React 时对应：

- apps/admin/src/features/intake/Intake.tsx
- QueueTable.tsx
- ReviewPublishDialog.tsx
- EpisodeGroupDialog.tsx

抽屉可复用 packages/ui/src/dialog/Modal.tsx，但桌面端建议使用右侧抽屉而不是居中弹窗。

## 4. 观看端片库

    .view-library
      .page-head                 # 片库 / 39 部 / 100 位 / 07 系列
      .entity-tabs               # 影片 / 演员 / 系列
      .library-toolbar           # 分类文字索引 + 数量 + 排序 + 筛选
      .poster-grid.poster-grid-library
        .poster-card × N

- 7 列；卡片 2:3；0 圆角；标题 13px；元信息 7.5px。
- 分类用文字索引而不是胶囊。
- 系列与收藏夹封面：沿用现有 RecordGrid / StudioCard 的三图横切蒙太奇；1 部影片用单图，2 部用两切，3 部及以上取前三张。不要改成一叠卡片或四宫格。
- 页面滚动后保留原筛选、页码、滚动位置；原型已实现列表内返回，正式实现要接路由恢复。

对应：

- apps/web/src/app/Experience.tsx
- features/library/LibraryToolbar.tsx
- LibraryTabs.tsx
- LibraryResults.tsx
- FilmCard.tsx

## 5. 观看端详情

- 详情是独立页面（或全屏 dialog），不保留全局顶部导航；顶部使用 50px 吸顶毛玻璃“返回 / 影片详情”面包屑，覆盖在剧照上，不占独立黑条。
- 首屏：剧照、海报、宋体已移除后的无衬线标题、元信息、播放主按钮、从头播放文本、播放版本 select。
- 播放版本是紧凑 select，不做第二个等宽按钮。
- 喜欢 / 收藏夹 / 已看 / 评分放在剧照下方的个人条；不做右上角浮动工具条。
- 剧照点击打开灯箱，不跳路由：大图、左右箭头、底部缩略图、Esc / 遮罩关闭。

## 6. 观看端 / 移动端播放器

- 原型实际使用 assets/preview.mp4（22 秒样片）。
- 控件：播放/暂停、进度、前后 10 秒、静音、版本、全屏。
- 进度条为 input[type=range]；轨道 2px；滑块 8px。
- 移动端使用同一套控件，版本按钮打开底部版本面板。

正式实现：

- Web：features/playback/Playback.tsx / ScreeningRoom
- Android：ui/playback/PlaybackScreen.kt

正式播放器仍应接现有 API 的 playback plan/session，不要照搬样片 URL。

## 7. 移动端一级页面

收藏与我的结构：

    <section class="m-view" data-m-view="collections">
      <div class="m-scroll">
        <header class="m-lib-head">…</header>
        <div data-m-collections-body>…</div>
      </div>
      <nav class="m-nav">发现 / 片库 / 收藏 / 我的</nav>
    </section>

- 一级页面必须有页头和固定底部 Tab；不要用覆盖整页、没有导航的浮层。
- 分类按钮 44px 高；影片 3 列；系列与收藏夹 2 列。
- 收藏夹成员页是第二层：页头显示返回，底部 Tab 仍保留。
- 详情页由返回栈接管，隐藏底部 Tab；不要出现双底栏。

对应：

- apps/android/.../LibraryApp.kt
- LibraryBrowseControls.kt
- LibraryCards.kt
- FilmDetail.kt

## 8. 原型状态与正式数据的边界

原型在 scripts/admin-data.js、scripts/data.js 与 web.js/mobile.js 的 state 中维护演示状态。正式实现应替换为：

- 列表：分页查询、排序、筛选参数；
- 个人状态：PATCH /api/media/{id}/state；
- 收藏夹：/api/collections/{id}/items；
- 录入：/api/imports 的 review / publish / groups / lookup；
- 播放：POST /api/playback/plans + /sessions；
- 文件与来源：StoragePicker、SourceReview。

不要把 localStorage 当作正式数据源；原型只在当前页面内存中保留修改。
