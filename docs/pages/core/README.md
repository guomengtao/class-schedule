# Ev课程表 · 核心页面手册

本目录收录应用 15 个核心页面的设计说明，每个页面一篇：职责、界面结构、核心方法、数据字段、注意事项。

方法名与字段名均取自 `src/pages/<页面>/<页面>.ux` 实际代码（2026-10-16 抽取），可直接按名搜索定位源码。

| 页面 | 文档 | 一句话职责 |
|---|---|---|
| 启动欢迎页 | [welcome.md](welcome.md) | 启动分流：进课表 / 课表盘 / 设置 / 退出 |
| 首页（课程表主页） | [index.md](index.md) | 当日课程渲染 + 首页显示偏好 |
| 添加课程 | [add-course.md](add-course.md) | 新建课程，带时间步进与冲突检测 |
| 编辑课程 | [detail.md](detail.md) | 单条课程编辑、删除与撤销 |
| 周课表（总课表） | [week-view.md](week-view.md) | 整周网格视图、当前课高亮 |
| 课程管理 | [course-manager.md](course-manager.md) | 课程列表批量维护 |
| 课程表管理 | [schedule-manager.md](schedule-manager.md) | 多课表新建/复制/切换 |
| 设置 | [settings.md](settings.md) | 主题、字号、昵称、退出 |
| 首页设置 | [homepage-settings.md](homepage-settings.md) | 首页模块显隐与自定义内容 |
| 高级版激活 | [activation.md](activation.md) | 设备 ID + 激活码核验 |
| 数据备份 | [backup-restore.md](backup-restore.md) | 备份快照与恢复 |
| 课程统计 | [statistics.md](statistics.md) | 分布聚合与科目排行 |
| 打赏支持 | [donate.md](donate.md) | 赞助渠道与二维码 |
| 反馈 | [feedback.md](feedback.md) | 反馈链接与群号复制 |
| 留言板 | [message-inbox.md](message-inbox.md) | 消息收发与快捷短语 |

## 通用约束

- 目标设备是**手环（Vela 快应用）**：屏幕小、内存紧、无后台常驻，页面必须轻初始化、及时销毁定时器
- 屏幕形态有**方屏与胶囊屏**两种，布局与字号需分别验证（多数页面有 `isCapsule` 分支）
- 输入依赖系统输入法回调，回调丢失会表现为「点了没反应」
- 危险操作（清空、删除、恢复）一律二次确认，删除优先给撤销窗口

## 新增 / 改动栏目怎么加文档（2026-10-23 起强制）

> 正式要求：总纲 **§3.22** ｜ 项目落地细则：`.trae/rules/project_rules.md` **§17**

1. **文件名 = 路由最后一段原样照抄**，放在本目录，不建子目录、不加前后缀、不用中文名：
   `pages/settings` → `settings.md`；`pages/settings/phone-remote` → `phone-remote.md`；`pages/watch-face-gold` → `watch-face-gold.md`。
2. **先写文档再改代码**（新建栏目开工第一件事就建这篇；改栏目在同一次 commit 里更新）。
3. 每篇首行 `# 页面名`，紧跟一行 `> 路由：pages/xxx ｜ 源码：src/pages/xxx/xxx.ux` —— EvEmuPreview 靠它做匹配。
4. 本目录**一页一篇、只放稳定说明**；需求书、方案、测试报告属于过程文档，放 `docs/` 根或分类子目录，不要堆到这里。
5. 验收：打开 **EvEmuPreview** → 左侧点该栏目 → 详情页「📄 开发文档」能读到正文 / 大纲 / 表格，即算达标（左侧实心 `▤`）；
   只有父级文档继承（半透明 `▤`）**不算达标**。
6. 上面的表格请顺手补一行（页面 / 文档 / 一句话职责），它是本目录的人读索引。

