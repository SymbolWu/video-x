# home-media 迁入的本机片库

两套部署均由 Docker Compose 管理，网关仅监听本机回环地址。日常打开下表的固定入口。浏览器按主机保存登录 Cookie，测试用 localhost，生产用 127.0.0.1，两套页面可以同时登录。

| | 测试 | 生产 |
| --- | --- | --- |
| 来源 MySQL | `home_media_dev` | `home_media` |
| Compose 项目 | `video-x-test` | `video-x-production` |
| 观看端 | http://localhost:8280/ | http://127.0.0.1:8380/ |
| 管理端 | http://localhost:8280/manage/ | http://127.0.0.1:8380/manage/ |
| 安卓模拟器内的服务地址 | http://10.0.2.2:8280/ | http://10.0.2.2:8380/ |
| 本机配置目录 | `.runtime/environments/test/` | `.runtime/environments/production/` |

每套有自己的 PostgreSQL 数据卷、任务队列、图片仓库、录入目录和账号。登录名均为 `owner`，各自的密码存放在环境目录里的 `login.json`。测试库用来做界面和业务验收。自动化回归仍使用专用的临时数据库。

## 运行和备份

在 video-x 仓库根目录执行以下命令查看各自的容器。将 `ps` 换成 `up -d --wait` 可以启动该环境，换成 `stop` 可以停止该环境并保留数据卷。

```sh
.runtime/environments/test/compose ps
.runtime/environments/production/compose ps
```

两个旧媒体盘须挂载到原卷名。8T 的标识文件在迁移时登记，12T 沿用原标识。test 和生产都在「系统状态 → 媒体存储」从两块登记的媒体盘选择下载目录。API 对实盘使用只读挂载，开放给 API 的路径包括登记的归档目录和下载候选目录。两套环境各有独立的录入工作区。

| 媒体盘 | test Worker 可写范围 | 生产 Worker 可写范围 |
| --- | --- | --- |
| `WD_12T_DISK` | 整卷目录 | 整卷目录 |
| `WD_8T_DISK` | 整卷目录 | 整卷目录 |

两套环境分别以只读方式将两个卷的 `.video-x-root` 绑定到 Worker。从实盘下载目录整理入库时，Worker 校验复制后的内容并保留下载源。

每套环境的 API 和 Worker 共用本环境的 `VIDEO_X_STORAGE_LAYOUT.targets` 归档目录清单。test 的实盘归档目录为两块盘各自的「日本」和「欧美」。生产 12T 的归档目录为「三级」「动漫」「国产 AV」「日本」「欧美」「国产」「上古av」「欧美系列」，8T 的归档目录为「国产 AV」「日本」「欧美」「国产」「欧美系列」。Worker 的整卷写权限与应用的入库目标登记各自生效。替换文件时，应用根据旧文件当前绑定的媒体盘和父目录锁定入库位置。

调整挂载后以运行中容器的挂载表为准。文件操作在 test 用独立样片验证实际路径和源文件摘要。生产发布核对目录树、替换入口、已有文件的只读状态及目录库记录摘要。原配置备份保存在各环境的 `backup/` 下。

系统状态区分录入工作区、图片仓库和已登记影片盘。盘标识通过容器内的 `.video-x-root` 核对。Docker Compose 通过 `VIDEO_X_HOST_STORAGE_SNAPSHOT` 指向只读挂载的宿主机容量快照，UUID 匹配且采样不超过三分钟时才显示容量。缺少有效读数时，挂载状态仍独立显示。本机登录启动项 `com.video-x.storage-status` 每分钟运行一次采集器。注册时用 `tooling/macos-storage-snapshot.mjs` 将盘根 UUID 标识与 macOS 卷 UUID 对照登记。后续采集只查询对应 macOS 卷的容量。采样文件位于 `~/Library/Application Support/video-x/storage-status/storage.json`。两套环境共用这些宿主机读数。

每套环境的 `migration/<快照摘要>/` 下保存以下文件。

- `snapshot.json` 是业务表的一致性只读快照。源库、快照时间和 SHA-256 在 `report.json`。
- `issues.json` 按旧记录 ID 列出缺文件、无效日期、重复标签和分集顺序等处理结果。`live-check.json` 记录从运行中容器和网关核验的结果。
- `before.dump` 为导入前的数据库备份，`reconciled.dump` 为最终迁移备份。恢复演练在独立 PostgreSQL 16 实例执行，结果在 `restore-check.json`。数据库备份引用的图片字节在本环境 `art/`，其 SHA-256 清单可从 `art-inventory.json` 取得。

迁移完成后的编辑需要另行备份。在该环境的目录执行 `./compose exec -T db pg_dump -U video_x -d video_x -Fc > 新备份.dump`，使用新的文件名，并一起备份本环境的图片、配置、账号文件和录入目录。恢复时先在单独的 PostgreSQL 16 实例建立 `video_x` 角色及空数据库，用 `pg_restore --exit-on-error` 将备份导入该空库。配套复制图片和录入文件，核对影片数、图片摘要、盘标识和播放计划后再切换入口。两个源库和旧系统继续独立运行。

## 迁移口径

原影片、容器和分集逐条保留。影片和分集在确认文件身份、实际大小、修改时间、容器和视频轨道后绑定版本。父容器保留原有的分集关系。每份资料的原分类、简介、封面、剧照、演职员、系列、片商、标签、收藏和个人评分按来源关联迁入。缺失的原始文件及不能确认的容器留在异常清单。

同分类、同标签属性、规范化名称相同的旧标签合为一项，原标签编码分别保留，影片关联取并集。经产品确认，两条旧标签的可见性有分歧时，合并后的标签可见。来源已有的播放次数和最后播放时间保留，新的续播位置从 video-x 的实际播放建立。旧任务队列沿用此前确认的排除规则。

无效的历史发行日期保留原文供追溯，业务资料中的日期留空。旧系列编码失效而系列外键仍有效的，按有效外键迁移。测试库两个旧分集缺少序号，沿用旧端发行日期、创建时间的排序确定顺序，结果写入异常清单。
