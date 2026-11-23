# 现有持久字段 → v0.4 候选模型 · 映射审查

更新于 2026-11-16。按用户决定取消 alias / 待清理，保留双名称与评分；14 组父子确认为分集、旧任务与旧观看进度不迁；已补齐编码、标签、封面和中文标记。覆盖当前 11 个实体的 **103 个持久字段**；历史证据取自文件名日期为 2026-09-29 的 SQL 备份，并非运行库即时状态。[复核结论与处理原则](evidence-review.md)。

“已有对应”只说明新模型有承接位置，尚未执行迁移；“语义/转换待核对”表示不能机械复制；“缺口”表示新 DDL 尚无完整表达。所有“待修订/归档策略”都还不是已经实现的迁移逻辑。

非 NULL/非空计数包含 0 和 false，不能据此认定该功能被使用；实际正值与枚举分布见复核报告。UUID、关联 ID 和来源身份需要映射，不直接复制数值。

## actor

实体：[actor.entity.ts](../../../../home-media/packages/entities/src/actor.entity.ts)；历史备份 2,413 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | people.id + legacy_mappings | 生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值 | 2413/2413 非 NULL；2413 非空 |
| `actor_code` | 已有对应，待迁移验证 | legacy_mappings.key_name + legacy_id + 对应目标外键 | v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用 | 2413/2413 非 NULL；2413 非空 |
| `full_name` | 已有对应，待迁移验证 | people.full_name | 保留常用名，与详细名共同参与检索 | 2413/2413 非 NULL；2413 非空 |
| `gender` | 已有对应，待迁移验证 | people.gender | 先确认旧数值枚举含义，再转新枚举，不凭数字猜测 | 2413/2413 非 NULL；2413 非空 |
| `profile_image_path` | 已有对应，待迁移验证 | assets + people.portrait_asset_id | 验证并迁移头像文件 | 1520/2413 非 NULL；1520 非空 |
| `detailed_name` | 已有对应，待迁移验证 | people.detailed_name | v0.4 补齐；原文保留，不拆成别名 | 2257/2413 非 NULL；2257 非空 |
| `alias` | 主动取消（首版） | 不设新列/表 | 用户 2026-11-13 明确首版取消；保留原备份，不自动写入 detailed_name | 2/2413 非 NULL；1 非空 |
| `category` | 已有对应，待迁移验证 | people.primary_category_id | 核对旧值是否都能对应分类编码 | 2413/2413 非 NULL；2413 非空 |
| `is_collected` | 已有对应，待迁移验证 | user_person_state.is_favorite | 保留演员喜欢；旧 NULL 的归一规则须明确 | 259/2413 非 NULL；259 非空 |
| `is_deleted` | 语义/转换待核对 | people.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 2413/2413 非 NULL；2413 非空 |
| `created_at` | 语义/转换待核对 | people.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 2413/2413 非 NULL；2413 非空 |
| `updated_at` | 语义/转换待核对 | people.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 2413/2413 非 NULL；2413 非空 |

## actor_profile_task

实体：[actor-profile-task.entity.ts](../../../../home-media/packages/entities/src/actor-profile-task.entity.ts)；历史备份 1 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |
| `status` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |
| `progress` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |
| `result_url` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |
| `error` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 0/1 非 NULL；0 非空 |
| `created_at` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |
| `updated_at` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 1/1 非 NULL；1 非空 |

## category

实体：[category.entity.ts](../../../../home-media/packages/entities/src/category.entity.ts)；历史备份 7 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | categories.id + legacy_mappings | 生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值 | 7/7 非 NULL；7 非空 |
| `category_code` | 已有对应，待迁移验证 | categories.code | 保留稳定分类编码 | 7/7 非 NULL；7 非空 |
| `cat_name` | 已有对应，待迁移验证 | categories.name | 空值与重命名规则需检查 | 7/7 非 NULL；7 非空 |
| `parent_category_code` | 已有对应，待迁移验证 | categories.parent_id | 以编码映射父 ID；检查环和缺失父节点 | 2/7 非 NULL；2 非空 |
| `is_visible` | 已有对应，待迁移验证 | categories.is_visible | 隐藏与归档分开；首版新导航需保持此语义 | 7/7 非 NULL；7 非空 |
| `is_deleted` | 语义/转换待核对 | categories.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 7/7 非 NULL；7 非空 |
| `created_at` | 语义/转换待核对 | categories.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 7/7 非 NULL；7 非空 |
| `updated_at` | 语义/转换待核对 | categories.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 7/7 非 NULL；7 非空 |

## collections

实体：[collections.entity.ts](../../../../home-media/packages/entities/src/collections.entity.ts)；历史备份 23 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | collections.id + legacy_mappings | 生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值 | 23/23 非 NULL；23 非空 |
| `coll_code` | 已有对应，待迁移验证 | legacy_mappings.key_name + legacy_id + 对应目标外键 | v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用 | 23/23 非 NULL；23 非空 |
| `coll_name` | 已有对应，待迁移验证 | collections.name | 旧名称无唯一约束，迁移前检查新规范化唯一规则冲突 | 23/23 非 NULL；23 非空 |
| `is_deleted` | 语义/转换待核对 | collections.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 23/23 非 NULL；23 非空 |
| `created_at` | 语义/转换待核对 | collections.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 23/23 非 NULL；23 非空 |
| `updated_at` | 语义/转换待核对 | collections.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 23/23 非 NULL；23 非空 |

## collections_movie

实体：[collections_movie.entity.ts](../../../../home-media/packages/entities/src/collections_movie.entity.ts)；历史备份 612 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 语义/转换待核对 | collection_items.id（新 ID）+ 旧行归档 | 现有 legacy_mappings 不包含此类目标；是否迁移历史任务/关系主键需按实际引用确认 | 612/612 非 NULL；612 非空 |
| `collection_id` | 已有对应，待迁移验证 | collection_items.collection_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 612/612 非 NULL；612 非空 |
| `movie_id` | 已有对应，待迁移验证 | collection_items.media_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 612/612 非 NULL；612 非空 |
| `created_at` | 语义/转换待核对 | collection_items.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 612/612 非 NULL；612 非空 |
| `updated_at` | 语义/转换待核对 | collection_items.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 612/612 非 NULL；612 非空 |

## movie

实体：[movie.entity.ts](../../../../home-media/packages/entities/src/movie.entity.ts)；历史备份 3,645 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | media_items.id + legacy_mappings | 生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值 | 3645/3645 非 NULL；3645 非空 |
| `movie_code` | 已有对应，待迁移验证 | legacy_mappings.key_name + legacy_id + 对应目标外键 | v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用 | 3645/3645 非 NULL；3645 非空 |
| `display_name` | 已有对应，待迁移验证 | media_items.title | 旧值允许空，新必填约束须检查当前数据 | 3645/3645 非 NULL；3645 非空 |
| `parent_movie_code` | 已有对应，待迁移验证 | media_items.parent_id | 用户已确认均为上下部/Part 分集；旧父项→group，已有子项→episode，不强制季 | 39/3645 非 NULL；39 非空 |
| `episode_order` | 已有对应，待迁移验证 | media_items.episode_number | 沿用集顺序，不映射为同一版本内的文件段 | 39/3645 非 NULL；39 非空 |
| `category_code` | 已有对应，待迁移验证 | media_items.primary_category_id | 按 category_code→新 category ID 映射 | 3645/3645 非 NULL；3645 非空 |
| `series_code` | 语义/转换待核对 | franchise_items + 来源/旧编码映射 | 与 series_id 同时存在；须核对一致性并保留编码身份 | 2198/3645 非 NULL；2198 非空 |
| `series_id` | 已有对应，待迁移验证 | franchise_items.franchise_id | 旧单系列关系可以迁入；多系列和人工排序属于新增选择 | 2198/3645 非 NULL；2198 非空 |
| `release_date` | 语义/转换待核对 | media_items.release_date / release_year / release_precision | 字符串先验证格式与精度，不补造未知月日 | 3633/3645 非 NULL；3633 非空 |
| `is_favorite` | 已有对应，待迁移验证 | user_media_state.is_favorite | 不等于收藏夹成员 | 3645/3645 非 NULL；3645 非空 |
| `user_rating` | 已有对应，待迁移验证 | user_media_state.rating | 用户明确保留；1～5 星整数，NULL=未评分；可设置、修改和取消 | 0/3645 非 NULL；0 非空 |
| `play_count` | 语义/转换待核对 | user_media_state.legacy_play_count | 须定义旧基数与新播放会话计数的合并规则 | 3645/3645 非 NULL；3645 非空 |
| `last_played_at` | 已有对应，待迁移验证 | user_media_state.last_played_at | 保留原时间及其未知值 | 153/3645 非 NULL；153 非空 |
| `watch_progress` | 不迁移（旧进度） | 不进入新播放状态 | 用户 2026-11-16 确认观看进度重新建立；不换算、不生成新会话或断点，旧库备份保留原始值 | 3645/3645 非 NULL；3645 非空 |
| `last_play_position_ms` | 不迁移（旧进度） | 不进入新播放状态 | 用户 2026-11-16 确认观看进度重新建立；不换算、不生成新会话或断点，旧库备份保留原始值 | 此备份无该列；依据当前实体与读写逻辑 |
| `marked_for_review` | 主动取消（首版） | 不设新业务状态 | 用户 2026-11-13 明确首版取消影片待清理；不生成清理入口或任务 | 3645/3645 非 NULL；3645 非空 |
| `file_name` | 语义/转换待核对 | media_files.relative_path 的末段 | 通常可派生；若与旧 file_name 不同，记录冲突并保留原值 | 3644/3645 非 NULL；3643 非空 |
| `file_path` | 语义/转换待核对 | storage_roots + media_files.relative_path | 校验根目录归属、挂载映射和文件实际存在性 | 3644/3645 非 NULL；3643 非空 |
| `file_format` | 语义/转换待核对 | media_files.container_format / probe_result | 旧值是文件扩展名，新容器格式语义须由探测确认 | 3644/3645 非 NULL；3644 非空 |
| `file_size` | 语义/转换待核对 | media_files.size_bytes | 旧值是已舍入的展示字符串，精确字节数须重读文件 | 3644/3645 非 NULL；3644 非空 |
| `resolution` | 语义/转换待核对 | media_streams.width / height | 解析旧字符串；实际轨道信息需重新探测 | 3644/3645 非 NULL；3644 非空 |
| `serial_number` | 已有对应，待迁移验证 | media_identifiers.value | 标记编号体系；不能等同 movie_code 或来源页面 ID | 3645/3645 非 NULL；3644 非空 |
| `movie_desc` | 已有对应，待迁移验证 | media_items.summary | 保留原文 | 1927/3645 非 NULL；1508 非空 |
| `cover_image_path` | 语义/转换待核对 | assets.storage_key + media_images.asset_id | 需迁入受控资源并验证文件，不把旧路径当新资源键 | 3634/3645 非 NULL；3634 非空 |
| `cover_layout` | 已有对应，待迁移验证 | media_items.cover_layout | v0.4 补齐；1→landscape，2→portrait，保留展示偏好 | 3645/3645 非 NULL；3645 非空 |
| `duration` | 语义/转换待核对 | media_files.duration_ms | 旧 HH:mm:ss 精度只有秒；重新探测时记录新事实 | 3644/3645 非 NULL；3644 非空 |
| `supports_chinese` | 已有对应，待迁移验证 | media_items.supports_chinese | v0.4 补齐；旧 1/0→true/false，属于资料标记，不保证本地字幕轨道 | 3645/3645 非 NULL；3645 非空 |
| `extra_info` | 语义/转换待核对 | credits（导演）+ organizations / media_organizations（片商）+ 原始迁移归档 | 同时识别 directors/makers 与 director/studio；不能丢失原文、类型和 code | 3303/3645 非 NULL；3303 非空 |
| `remark` | 已有对应，待迁移验证 | media_items.notes | 保留人工备注 | 1/3645 非 NULL；1 非空 |
| `is_deleted` | 语义/转换待核对 | media_items.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 3645/3645 非 NULL；3645 非空 |
| `created_at` | 语义/转换待核对 | media_items.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 3645/3645 非 NULL；3645 非空 |
| `updated_at` | 语义/转换待核对 | media_items.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 3645/3645 非 NULL；3645 非空 |

## movie_actor

实体：[movie_actor.entity.ts](../../../../home-media/packages/entities/src/movie_actor.entity.ts)；历史备份 7,961 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 语义/转换待核对 | credits.id（新 ID）+ 旧行归档 | 现有 legacy_mappings 不包含此类目标；是否迁移历史任务/关系主键需按实际引用确认 | 7961/7961 非 NULL；7961 非空 |
| `movie_id` | 已有对应，待迁移验证 | credits.media_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 7961/7961 非 NULL；7961 非空 |
| `actor_id` | 已有对应，待迁移验证 | credits.person_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 7961/7961 非 NULL；7961 非空 |
| `created_at` | 语义/转换待核对 | credits.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 7961/7961 非 NULL；7961 非空 |
| `updated_at` | 语义/转换待核对 | credits.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 7961/7961 非 NULL；7961 非空 |

## movie_tag

实体：[movie_tag.entity.ts](../../../../home-media/packages/entities/src/movie_tag.entity.ts)；历史备份 22,971 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 语义/转换待核对 | media_tags.id（新 ID）+ 旧行归档 | 现有 legacy_mappings 不包含此类目标；是否迁移历史任务/关系主键需按实际引用确认 | 22971/22971 非 NULL；22971 非空 |
| `movie_id` | 已有对应，待迁移验证 | media_tags.media_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 22971/22971 非 NULL；22971 非空 |
| `tag_id` | 已有对应，待迁移验证 | media_tags.tag_id | 通过旧实体到新 UUID 映射；仅 movie_actor 对应职责 job=actor | 22971/22971 非 NULL；22971 非空 |
| `created_at` | 语义/转换待核对 | media_tags.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 22971/22971 非 NULL；22971 非空 |
| `updated_at` | 语义/转换待核对 | media_tags.created_at / 旧行归档 | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 22971/22971 非 NULL；22971 非空 |

## series

实体：[series.entity.ts](../../../../home-media/packages/entities/src/series.entity.ts)；历史备份 924 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | franchises.id + legacy_mappings | 生成新 UUID 并保留旧主键映射，不把新 UUID 宣称为旧值 | 924/924 非 NULL；924 非空 |
| `series_code` | 已有对应，待迁移验证 | legacy_mappings.key_name + legacy_id + 对应目标外键 | v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用 | 924/924 非 NULL；924 非空 |
| `series_name` | 已有对应，待迁移验证 | franchises.name | 保留系列身份，不按同名自动合并 | 924/924 非 NULL；924 非空 |
| `category` | 已有对应，待迁移验证 | franchises.primary_category_id | 核对旧分类值映射 | 924/924 非 NULL；924 非空 |
| `is_deleted` | 语义/转换待核对 | franchises.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 924/924 非 NULL；924 非空 |
| `created_at` | 语义/转换待核对 | franchises.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 924/924 非 NULL；924 非空 |
| `updated_at` | 语义/转换待核对 | franchises.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 924/924 非 NULL；924 非空 |

## tag

实体：[tag.entity.ts](../../../../home-media/packages/entities/src/tag.entity.ts)；历史备份 869 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 已有对应，待迁移验证 | tags.id + legacy_mappings.tag_id | v0.4 新增 tag 目标外键；保留旧标签 ID 与新 UUID 映射 | 869/869 非 NULL；869 非空 |
| `tag_code` | 已有对应，待迁移验证 | legacy_mappings.key_name + legacy_id + 对应目标外键 | v0.4 补齐：key_name 保存旧字段名，legacy_id 保存旧编码原文；不与发行编号混用 | 869/869 非 NULL；869 非空 |
| `tag_name` | 已有对应，待迁移验证 | tags.name | 不自动按同名合并不同分组、分类的标签 | 869/869 非 NULL；869 非空 |
| `attr_value` | 已有对应，待迁移验证 | tags.attribute_group | v0.4 补齐；保留属性分组、分类归属和隐藏语义；分类编码转换为 ID | 869/869 非 NULL；869 非空 |
| `category` | 已有对应，待迁移验证 | tags.primary_category_id | v0.4 补齐；保留属性分组、分类归属和隐藏语义；分类编码转换为 ID | 869/869 非 NULL；869 非空 |
| `is_visible` | 已有对应，待迁移验证 | tags.is_visible | v0.4 补齐；保留属性分组、分类归属和隐藏语义；分类编码转换为 ID | 869/869 非 NULL；869 非空 |
| `is_deleted` | 语义/转换待核对 | tags.archived_at | 仅有旧布尔状态，未知真实删除时间；不能把迁移时间称为历史删除时间 | 869/869 非 NULL；869 非空 |
| `created_at` | 语义/转换待核对 | tags.created_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 869/869 非 NULL；869 非空 |
| `updated_at` | 语义/转换待核对 | tags.updated_at | 保留原时间点；旧时区须确认。新关系表无 updated_at，不丢原始迁移导出；movie 时间还可能来自文件 birthtime/mtime | 869/869 非 NULL；869 非空 |

## task

实体：[task.entity.ts](../../../../home-media/packages/entities/src/task.entity.ts)；历史备份 125 行。

| 旧字段 | 审查状态 | 新模型承接位置 | 迁移限制 / 缺口 | 历史证据 |
| --- | --- | --- | --- | --- |
| `id` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 125/125 非 NULL；125 非空 |
| `status` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 125/125 非 NULL；125 非空 |
| `progress` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 125/125 非 NULL；125 非空 |
| `result_url` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 123/125 非 NULL；123 非空 |
| `error` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 2/125 非 NULL；2 非空 |
| `created_at` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 125/125 非 NULL；125 非空 |
| `updated_at` | 不迁移（旧任务） | 不进入新库 | 用户 2026-11-16 明确旧任务全不迁：不迁行、状态、百分比、错误、时间或结果 JSON；新系统保留任务能力 | 125/125 非 NULL；125 非空 |

## 覆盖检查

已列出 103/103 个实体持久字段：已有对应，待迁移验证 47 项；主动取消（首版） 2 项；语义/转换待核对 38 项；不迁移（旧任务） 14 项；不迁移（旧进度） 2 项。

103 个旧字段的处置与 568 个新字段的说明是两套方向不同的清单；一个旧字段可拆为多个新字段。新字段的来源、用途、写入和首版建议已逐项列在[阅读指南与字段字典](field-guide.md)，不代表真实迁移已通过。
