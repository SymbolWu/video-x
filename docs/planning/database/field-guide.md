# 新字段从哪里来、在哪里用 · v0.4

> v0.5 新增的 5 个字段均是人工确认和多版本草稿需要的流程信息，具体来源、用途与界面见[产品承接修订](product-reconciliation.md)。

更新于 2026-11-17。本版为全部 **58 张候选表、568 个字段**登记了来源、作用、计划使用场景、写入者、迁移/初始化和首版建议。结构已在独立临时 PostgreSQL 验证；说明中的应用行为尚未实现，真实迁移尚未执行。

## 1 你对沿用与扩展的理解

是的，**现有大部分业务信息会继续使用**。变化主要是重新组织存放位置，以及补充新流程需要的状态。例如，旧 movie 一行同时放作品资料、文件信息、喜欢、评分和播放进度；新模型把这些分开，避免修改资料时顺带覆盖个人观看状态。

这不表示旧表和字段全部原样复制。旧路径会变成“媒体根 + 相对路径”；字符串大小改为字节数；旧 ID 转新内部 ID；某些值需重新探测才能准确得到。alias 与影片待清理则是你本次明确决定取消的首版能力。

### 本轮已落实的产品决定

| 内容 | v0.4 处理 | 对应行为 |
| --- | --- | --- |
| 演员常用名 | `people.full_name` ← `actor.full_name` | 演员卡片主标题、作品演员区、姓名搜索 |
| 演员详细名称 | `people.detailed_name` ← `actor.detailed_name` | 原文保留，用于详情副名称、资料维护和搜索；不拆成别名 |
| alias | 不设置新列，不设置 person_aliases 表 | 首版不做别名录入、别名搜索、合并时自动追加别名；旧备份保留，不自动塞进详细名称 |
| 个人评分 | `user_media_state.rating` ← `movie.user_rating` | 1～5 星整数，NULL=未评分；可设置、修改、取消，参与评分筛选和排序 |
| 影片待清理 | 不设置新字段/入口/任务 | 首版不迁移为活跃业务状态；今后确实需要时单独设计 |

## 2 字段字典怎么读

每张表有两部分。第一部分说明类型、可空、默认值和含义；第二部分按同名字段给出以下内容：

| 标注 | 含义 |
| --- | --- |
| 来源类别 / 旧字段 | 是否沿用旧业务；能直接追到 `旧表.旧字段`，无对应列时明确写“无旧字段” |
| 使用场景（计划） | 观看端、管理端、播放器或内部流程在哪里读取 |
| 写入者 | 人工编辑、来源适配器、扫描器、探测 worker、播放事件还是迁移程序写入 |
| 迁移或初始化方式 | 是复制、ID 映射、单位转换、重新探测、默认值，还是保留未知 |
| 首版建议 | 建议保留、待裁剪、后置。它与“来源类别”是两个维度 |

来源类别分为：**沿用、转换沿用、拆分重组、方案新增、技术新增、探测新增、待定扩展**。这些标签不是复用率统计：同一个旧字段可以拆成多个新字段，新 UUID、时间、关联 ID 也会增加技术字段数量。

“建议保留”是当前设计建议；“待裁剪”表示有问题要解决，但粒度或实现成本仍需收敛；“后置”表示候选 SQL 中暂有定义，首版不要求实现、填充或在页面展示。没有以“无旧字段”为由隐藏新增内容。

## 3 先看这些表

| 你关心的内容 | 表和字典 | 来源与变化 |
| --- | --- | --- |
| 作品资料 | [media_items](tables-catalog.md#media_items) | 接旧 movie 的标题、简介、分类、日期、备注、封面方向和中文资料标记；个人状态与文件事实移走 |
| 演员维护、按演员找片 | [people / credits](tables-catalog.md#people) | actor 和 movie_actor；导演来自 extra_info；两个姓名字段独立保留 |
| 系列维护 | [franchises / franchise_items](tables-catalog.md#franchises) | 接旧 series、影片系列归属；成员顺序和封面是方案新增 |
| 分类与分组标签 | [categories](tables-catalog.md#categories)、[tags](tables-catalog.md#tags) | 保留旧分类树；标签承接 category、attr_value、is_visible，避免丢掉原分组能力 |
| 收藏夹 | [collections / collection_items](tables-personal.md#collections) | 原收藏夹和成员关系继续使用；说明、封面和手工顺序为方案新增 |
| 评分、喜欢 | [user_media_state](tables-personal.md#user_media_state)、[user_person_state](tables-personal.md#user_person_state) | 作品喜欢/评分与人物喜欢分别承接；加入收藏夹不会自动喜欢或评分 |
| 文件与播放 | [media_files](tables-library.md#media_files)、[editions / edition_parts](tables-library.md#editions)、[playback_progress](tables-personal.md#playback_progress) | 文件从旧 movie 拆出；分清资料、实际文件与断点坐标 |
| 抓取来源 | [来源字典](tables-metadata.md) | JavDB、Havtw 的适配边界和来源身份；快照、锁定、差异是新流程所需方案 |
| 导入与恢复 | [导入任务字典](tables-operations.md) | 接旧任务能力，增加草稿、候选、业务检查点和发布结果 |
| 旧编码追溯 | [legacy_mappings](tables-operations.md#legacy_mappings) | 明确区分旧主键、业务编码、来源 ID 与影片发行编号；补齐标签目标 |

## 4 六个例子看清新规则

### 作品标题仍是你的资料

`movie.display_name → media_items.title`。来源是旧字段，作用仍是展示与搜索作品。资料维护或用户接受抓取结果时更新，评分和断点不会跟着改。旧值为空时进入迁移异常，不能为了满足 NOT NULL 随意丢弃影片。

### 常用名与详细名是两个独立事实

`actor.full_name → people.full_name`；`actor.detailed_name → people.detailed_name`。演员卡片显示常用名，详情在有值时展示详细名称，搜索匹配两者。合并人物时分别选择保留这两个字段；不自动把旧名字追加为 alias，也不按标点猜测详细名里的别名列表。

### 个人评分没有因历史空值而取消

`movie.user_rating → user_media_state.rating`。当前沿用旧 1～5 星整数刻度，支持改分和清空；NULL 表示未评分，0 不作为未评分哨兵值。评分按作品保存，一个作品的不同文件版本共享评分。喜欢、已看、收藏夹、播放次数都不会自动修改评分。首版不增加评分历史表，也不依赖网站评分表；接口草案见[工作流规格](../workflows-api.md)。

### 标签分组不是 genre

`tag.category → tags.primary_category_id`，`tag.attr_value → tags.attribute_group`，`tag.is_visible → tags.is_visible`。例如两个分类/属性组中出现相同显示名称，仍可以是两个独立标签。新选择器隐藏的标签保留原有影片关联。独立 genres 域是后置候选，不会在迁移时按名称擅自拆分或合并旧标签。

### 中文资料标记不冒充文件检测

`movie.supports_chinese → media_items.supports_chinese` 用于资料层筛选和标记，旧 1/0 转 true/false，新资料未知可为 NULL。它既可能来自旧抓取，也可能来自人工确认；当前文件到底有哪些音轨/字幕，由 `media_streams` 表达。资料宣称支持中文，不保证每个文件版本都有已验证的中文字幕。

### content_revision 没有旧字段，但有明确用途

扫描器检测文件 size/mtime 变化时递增 `media_files.content_revision`。探测任务携带启动时的代数；提交时已变化则不能覆盖新文件事实。`edition_parts.bound_content_revision` 保存发布确认时的代数，避免文件被替换后直接复用旧断点。这些是内部技术状态，用户不需要在录入表单里填写。

## 5 已确认的范围与后置项

详细决定与三个旧数据来源见[已确认范围与旧数据来源](confirmed-scope.md)。

- 2026-11-17 确认作品/演员各属一个分类，喜剧/动作等可直接作分类筛选；所有入库由人工确认、手动发布。MP4/MKV 按实际容器/编码与客户端能力原生播放，转码/remux 后置，详见[范围说明](confirmed-scope.md)。
- 身份采用通用单账号设计：一个默认 profile，设备/会话支撑 Web/Android；首版不做注册、多账号/多资料切换或公网账户管理。
- 14 组父子资料已确认为上下部/Part 等有序分集。使用 group→episode；未来 show 可以直接带集，也可以按真实资料增加 season，不强制生成季。
- 生日、人物简介、角色名、独立 genre、网站评分、NFO 和外挂字幕版本绑定等明确后置，首版不要求录入或有数据。
- 旧 task、actor_profile_task 的全部记录、运行状态、进度、错误和 result_url 指向的结果 JSON 均不迁移；新系统从新任务开始记录。正式影片/人物资料仍照常迁移。
- 旧 watch_progress 和 last_play_position_ms 全部不迁；新播放表初始为空，续播入口 NULL。从真实定位和起播建立位置，规则与验收见[观看进度设计](../playback.md)。旧播放次数/最近时间仅作历史汇总，不能推导续播。
- 此前“百分比断点”指 watch_progress，准确名称是旧观看进度；file_size 是入库前已格式化的字符串；“喜欢时间未知”指旧库只有喜欢状态、没有记录喜欢日期。它们不代表额外的新功能，具体代码依据与保留规则见上述说明。

## 6 本版产物及检查

- [五组字段字典入口](README.md)：568/568 个新字段均有结构和业务说明。
- [旧字段去向](legacy-field-mapping.md)：103/103 个旧持久字段均有处置；其中主动取消 alias / 待清理，明确排除全部旧任务。
- [机器可读字段依据](field-provenance.json)：同一份来源说明生成字段字典、SQL 中文注释与交互查询，避免三份手抄结果漂移。
- [结构定义](model-spec.json)和 [生成工具](tools/generate_schema.py)：候选 DDL 可重新生成；该文件是设计定义，不是已接入 ORM 的正式 migration。
- 临时 PostgreSQL 16.14 执行成功：58 表、568 字段、127 外键、79 项约束检查通过；新增检查覆盖双名称、无别名表、无待清理字段、评分空值和范围、标签分组与隐藏、旧标签编码追溯等。未接触现有业务数据库。

候选表数量不是首版目标。后续按“能保留哪些旧业务、能闭环哪些新流程”决定真正落下的字段与表。
