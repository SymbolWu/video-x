# 列表筛选与排序规格 · V0.6 · 2026-11-17

本规格是三端共用的查询规则；数据库候选结构为 v0.5。本轮在旧 Web、Android 代码及三端原型基础上补齐。静态原型演示真实筛选与重排，但正式 API、SQL、分页和 Android 原生实现尚未接入。

## 1 旧能力与本轮取舍

| 依据 | 已有能力 | video-x 处理 |
| --- | --- | --- |
| `packages/shared/src/constants/movie.ts`、`apps/frontend/src/pages/movie/list/index.tsx` | 入库/发行日期、大小、次数、评分；收藏夹加入时间；分类、中文标记、分辨率及高级筛选 | 保留有明确业务口径的查询；大小用字节，时长用毫秒；补名称、升降序、空值和稳定次序 |
| Android `ui/browse/BrowseFilterOptions.kt`、`BrowseViewModelsCommon.kt` | 影片创建/发布日期/收藏夹加入时间；演员和系列创建时间/作品数；全部支持 ASC/DESC；演员性别/收藏 | 新原型不得比旧端退化；三端使用同一字段白名单 |
| `apps/backend/src/service/movie/movie-query.service.ts` | 文件大小字符串 CAST；单主键排序没有稳定次序；清理用途的评分/次数/待审筛选 | 不沿用格式化文本排序；移除用户已取消的清理标记。播放次数筛选与双向排序保留；旧历史基数与实际起播的新会话分别计数，口径见数据库补充设计 |
| V0.4 原型 | 影片只有少量固定方向；演员/系列未排序，关联列表多使用数组顺序 | V0.6 共用 `list-controls.js`；浏览顺序与整理顺序分别处理 |

这里的“影片”表示列表中的作品条目；版本与文件不作为重复的影片卡片。父子组与实际分集的计数不能互相累加成文件数。正式片库默认展示顶层作品，显式选择分集形态时查询 episode；演员、系列、收藏夹详情展示真实直接关联的作品，各按 media_id 去重。分集选择器固定按 episode_number，切换倒序只改变展示，不能改集号。当前样本主要为单片，父子范围与分页仍需真实数据验收。

## 2 各类列表的默认值

| 页面 | 默认排序 | 可切换 | 筛选范围 |
| --- | --- | --- | --- |
| Web/移动片库影片、管理媒体库 | 入库时间降序 | 影片通用排序 | 影片通用条件 |
| 演员详情参演作品（三端） | 发行时间降序 | 影片通用排序 | 当前演员为固定范围，叠加作品条件 |
| 分类详情（三端） | 影片入库降序；演员/系列作品数降序 | 对应实体排序 | 分类固定，包含子分类 |
| 系列成员、收藏夹内影片（三端） | 保存的成员顺序升序 | 通用排序 + 成员顺序 + 加入时间 | 当前关系固定，叠加作品条件 |
| 喜欢的影片、喜欢的演员 | 喜欢时间降序 | 对应实体排序 | 当前 profile 的喜欢集合 |
| 演员列表 | 作品数量降序 | 常用名、创建时间、作品数、喜欢时间 | 分类、名称/详细名称、性别、喜欢、有无作品 |
| 系列列表 | 作品数量降序 | 名称、创建时间、作品数 | 分类、名称/简介、有无作品 |
| 收藏夹列表 | 名称升序 | 名称、创建时间、作品数 | 名称/说明、有无作品 |
| 搜索 | 分类结果各自使用实体默认值 | 切到影片/演员/系列后完整筛选排序 | 搜索词与所选实体范围 |
| 观看历史 | 最近播放降序 | 影片通用排序 | 有新系统观看记录的作品；历史事件展开后保持时间线 |
| 首页书架、详情“其他影片”、播放器下一部 | 由书架/关系用途固定 | 进入完整列表再筛选排序 | 不在每个推荐小书架堆控件 |
| 分集选择器、关联选择弹窗、导入候选 | 集号 / 当前选中优先 / 匹配流程顺序 | 专用排序，不能套用普通片库全部字段 | 分集、候选与文件分别计数 |

管理端系列/收藏夹默认浏览成员，可切换“整理成员顺序”。整理时显示全部有效成员、按保存顺序升序，暂停浏览筛选与排序；完成整理后回到原查询。分页资料的重排须通过带 revision 的完整成员接口，不能用当前筛选页覆盖全部顺序。

## 3 影片条件与数据库依据

不同条件相互 AND；首版每个关联条件单选，作品本身仍可有多个演员/标签/系列。分类只允许一个，包含后代；查询多个标签的 ANY/ALL 模式后续再引入。

| 条件 | 表/字段或关系 | 规则 |
| --- | --- | --- |
| 搜索 | media_items.title；media_identifiers.value；people.full_name/detailed_name + credits.job | 片名、编号、演员、导演；不引入 alias 或 sort_title |
| 分类 | media_items.primary_category_id → categories.parent_id | 全部或一个子树，隐藏仅影响导航，不把已有链接查成不存在 |
| 手动已看 | user_media_state.watched_at | 全部/已标记/未标记；不由播放百分比推导 |
| 喜欢 | user_media_state.is_favorite | 与收藏夹成员、已看、评分独立 |
| 我的评分 | user_media_state.rating | 全部/仅未评分/1～5 星上下限；分数区间可选择包含未评分，NULL 不当 0 星 |
| 发行年份 | media_items.release_year/date/precision | 指定年、未知年或包含端点的年份区间；指定年与区间互斥；不强制用户补日期 |
| 播放次数 | user_media_state.legacy_play_count + playback_sessions.has_started | 非负整数上下限；0 表示未发生有效起播；暂停/心跳不增次数 |
| 入库日期与天数 | media_items.created_at | 起止日期或至少 N 天；保留旧实际时间来源，不以迁移时刻替代 |
| 完整发行日期 | media_items.release_date/precision | 只包含 day 精度；与年份区间互斥，不补造月日 |
| 中文资料标记 | media_items.supports_chinese | 支持/不支持/未知；不是字幕探测结果 |
| 作品形态 | media_items.kind | 电影/作品组/剧/分集/视频；与喜剧/动作等分类不同 |
| 演员、系列、收藏夹 | credits、franchise_items、collection_items | EXISTS 条件，不 JOIN 后重复作品；固定详情范围不能被清除筛选解除 |
| 标签、片商 | media_tags、media_organizations | 按稳定 ID 查；隐藏标签不出现在新选项中，已有关系保留 |
| 分辨率 | 默认 editions → edition_parts → media_streams.width/height | 对默认版本各段主视频轨道取最低 height：≥2160、1080～2159、720～1079、540～719（576p 档）、360～539（480p 档）、低于360、未知。不再匹配字符串正则；不表示保证设备可播 |
| 时长区间 | media_files.duration_ms + edition_parts | 默认版本各段求和，界面分钟，API 毫秒；有未知段则整版未知 |
| 文件体积区间 | media_files.size_bytes + edition_parts | 默认版本各段求和，界面 GiB，API 字节整数；有未知段则整版未知 |
| 文件状态 | storage_roots.status + media_files.availability/probe_status | 在线/有缺失/未知/容器不适用；正式实现还须结合根离线和过期探测，原型只覆盖样本段状态 |

大小/时长/分辨率采用**默认版本**，不随设备当前播放偏好切换。多段取总时长/总体积，分辨率取各段最低值。组/剧/季无版本，不把所有子集时长冒充单片时长；返回 NULL/不适用。根离线时可保留上次已确认文件事实并标注“上次探测”；不能声称本次检测成功。全部版本的磁盘占用另属运维统计。

范围下限大于上限、非法数值、错误枚举须在提交前提示；后端仍独立校验。正常的无结果展示当前条件、清除入口和空态，不当作接口失败。时长/大小未知不参与数值区间；筛选失败不丢草稿。

## 4 排序字段与升降序

| 对象 | 字段 | 映射 | 升序 / 降序 |
| --- | --- | --- | --- |
| 影片 | 入库时间 new | media_items.created_at | 早→晚 / 晚→早；旧创建时间迁移保留，不以新库导入时间替代 |
| 影片 | 发行时间 year | release_year、release_date、release_precision | 早→晚 / 晚→早；同年先精度分组，年精度条目固定放完整日期后；不填造 1 月 1 日 |
| 影片 | 名称 title | media_items.title | 自然名称正序 / 逆序 |
| 影片 | 个人评分 rating | user_media_state.rating | 低→高 / 高→低 |
| 影片 | 播放次数 playCount | 历史累计 + 当前 profile 的实际起播会话数 | 少→多 / 多→少；0 是已知值 |
| 影片 | duration / size | 上节默认版本聚合 | 短→长、小→大 / 相反 |
| 影片 | 最近播放 lastPlayed | user_media_state.last_played_at | 早→晚 / 晚→早；原型用新模拟播放时间 |
| 影片/演员 | 喜欢时间 favoriteAt | user_media_state/user_person_state.favorited_at | 早→晚 / 晚→早；旧未知时间固定末尾，不补造 |
| 演员/系列/收藏夹 | name / new | full_name 或 name；created_at | 名称正逆 / 创建早晚 |
| 演员/系列/收藏夹 | 作品数量 count | 对有效且已发布直接关联作品 COUNT DISTINCT media_id | 少→多 / 多→少；0 是已知数量，不是 NULL |
| 系列/收藏夹成员 | position | franchise_items/collection_items.position | 原顺序 / 反向浏览；不写回位置 |
| 系列/收藏夹成员 | added | 对应关系 created_at | 早加入 / 晚加入；与作品创建时间不同 |

所有排序都提供升降序；改字段采用合理初始方向（名称/成员顺序升序，其余降序），方向可以随即切换。排序含义在控件中可见。NULL/空名称始终最后，不因倒序跑到前面；同值用稳定 ID 升序作最终比较，未知日期不造日期。名称按服务端明确配置的中文自然排序规则，客户端展示 API 顺序；原型 `Intl.Collator('zh-Hans', numeric:true)` 仅近似演示，正式数据库 collation 与多语言样例在 M1 验证。

发行精度比较的服务端约定为 year（所选方向）、同年 precisionKnown（完整日期优先，固定）、日期（所选方向）、id ASC。年份完全未知固定最后；年精度条目之间按 ID。同年只知年份与具体日期的次序不表示已知其真实发行先后。

PostgreSQL 降序默认 NULL 在前，必须显式指定 `NULLS LAST`；稳定分页需唯一排序次序。依据：[ORDER BY](https://www.postgresql.org/docs/current/queries-order.html)、[LIMIT/OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)。

## 5 查询、缓存和索引

正式契约示例：`GET /api/v1/media?categoryId=...&sort=release&direction=asc&page=1&pageSize=24`。上面的原型短 key 不直接充当外部 API；OpenAPI 要发布按实体区分的字段枚举及错误码。接口返回 items、total、page、pageSize、effectiveQuery；分页前完成全部筛选和排序，total 使用同样范围。排序表达式从服务端白名单选择，值走参数绑定，禁止将输入直接拼入 ORDER BY。

同一次请求的 count/items 以相同读快照或等价单语句查询获得。page 最大由 total 决定，pageSize 建议 24、48、最多100；条件或排序改变回到第1页，返回详情恢复 URL、页码和滚动。Offset 分页在两次请求之间发生新入库时可能移动条目，首版刷新提示和按 ID 去重，不声称具备跨请求快照隔离。

影片/演员/系列切换仅保留分类和搜索词，丢弃其他实体不支持的条件及排序；独立默认值避免“按个人影片评分排演员”。原型 URL 支持排序、方向、筛选；返回上下文可恢复。跨次打开记住每种列表的偏好是客户端本地设置，首版不新增数据库排序偏好表。跨设备同步查询偏好不在本轮实现。

索引先覆盖实际高频查询：有效作品的分类+created_at+id、release_year/date+id，credits(person_id,job,media_id)、系列/收藏夹父ID+position、个人状态profile+rating/favorited_at等。聚合数量/默认版本大小先用查询投影，不增加冗余实体列。用现有量级和放大样本 EXPLAIN ANALYZE，再决定额外索引或派生缓存；不为每种筛选组合建复合索引。

## 6 原型覆盖与正式验收

三端片库/媒体库、演员列表及详情、系列列表、分类下列表、喜欢列表、收藏夹列表/成员、系列成员、按类型搜索、观看历史使用共享规则。首页书架和选集/导入候选使用专用顺序。管理关系编辑通过明确的整理模式维护保存的顺序。

自动检查覆盖升降序、同值ID、空值、不同实体排序、筛选范围、默认版本聚合、未知喜欢时间、上下限校验、清除筛选保留排序、收藏夹浏览不改成员、整理恢复全集，以及三端入口。正式实现还须验证：两个连续分页无重复遗漏、中文/日文/数字名称、根离线/探测过期、多段混合轨道、父子聚合、并发入库和多端缓存刷新。原型无服务端分页，不将数组重排当成 SQL 验收。

日期筛选按服务器配置时区（当前 Asia/Shanghai）解释全天边界，API 转成明确 UTC 区间；原型样本只演示日期比较。旧累计与新会话的去重、作品组统计见[数据库承接](database/product-reconciliation.md)。
