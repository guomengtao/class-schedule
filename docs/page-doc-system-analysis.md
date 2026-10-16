# 页面文档化管理方案分析

> 目标：为项目每个页面建立结构化 MD 文档，跟踪需求、进度、质量、测试与最新截图，并集成 MkDocs Material 浏览。

---

## 1. 页面盘点

### 1.1 扫一遍 `src/pages/` 目录，全量 72 个页面

| 分类 | 页面数 | 页面列表 |
|------|:--:|------|
| **核心功能页** | 8 | index(首页)、add-course(添加课程)、detail(编辑课程)、schedule-manager(课表管理)、course-manager(课程管理)、week-view(周视图)、backup-restore(备份恢复)、activation(激活) |
| **入口/辅助页** | 4 | welcome(欢迎页)、donate(打赏)、feedback(反馈)、message-inbox(消息) |
| **设置子页** | 3 | settings(设置)、homepage-settings(首页设置)、settings/lab(实验室)、settings/phone-remote(手机远程) |
| **功能页** | 6 | statistics(统计)、qrcode-generator(二维码生成)、schedule-qrcode(课表二维码)、template-picker(模板选择)、pinned-pages(固定页)、countdown-manage(倒计时) |
| **Schedule Panel 变体** | 8 | schedule-panel、panel-colorful、panel-countdown、panel-dual-mode、panel-progress、panel-remaining、panel-simple、panel-subject-color |
| **实验室/工具页** | 4 | lab-add-course、lab-edit-course、vibration-lab、tools |
| **输入法** | 1 | chinese-input |
| **设备/数据** | 4 | device-id、device-info、reset-data、workday-info |
| **其他** | 4 | custom-content-edit、loading-lab、width-detect、channel-info |
| **Watch Face 系列** | 17 | watch-face、wf-animated、wf-background、wf-class、wf-colorful、wf-evpointer、wf-flip、wf-font、wf-functional、wf-gold、wf-gradient、wf-landscape、wf-list、wf-metal、wf-pickdate、wf-random、wf-vibrate |
| **测试/Demo 页** | 13 | anim-test、capacity-demo、capsule-hide-test、date-picker-demo、header-demo1/2、media-test、rect-c1~c7、rect-diag、test-area、time-picker-demo |
| **V2 变体（可能已废弃）** | 3 | add-course-v2、course-manager-v2、vibration-lab-v2 |

### 1.2 分级策略（不要全量铺开）

| 级别 | 定义 | 页面数 | 建议 |
|------|------|:--:|------|
| **L1 - 核心** | 用户面核心功能，高频迭代 | 15 | 必须做 |
| **L2 - 功能** | 独立功能，迭代频率中等 | 12 | 建议做 |
| **L3 - Watch Face** | 表盘变体，同质化严重 | 17 | 聚合为 1 份 watch-face 总文档 |
| **L4 - 测试/Demo** | 仅开发调试用，不面用户 | 13 | 不单独建文档 |
| **L5 - V2 废弃** | 旧版本，可能已不维护 | 3 | 不建 |

**精简后实际需建档的页面：L1(15 个) + L2(12 个) + L3 聚合(1 个) = 28 个文档**

---

## 2. 单页面文档模板设计

每份页面文档统一使用以下 6 段式结构。这是**最核心的设计决策**——结构统一了，维护和检索才有意义。

### 2.1 模板骨架

```markdown
# 页面名称

> 一句话描述页面用途。一行即可。

| 属性 | 值 |
|------|-----|
| **源文件** | `src/pages/xxx/xxx.ux` |
| **版本** | 1.0 |
| **最后更新** | 2026-10-16 |
| **状态** | 🟢 稳定 / 🟡 开发中 / 🟠 待重构 / 🔴 有问题 |

---

## 需求

- [x] 需求1：简要描述
- [x] 需求2：简要描述
- [ ] 需求3：简要描述（待实现）

---

## 进度与质量

### 当前版本

| 项目 | 内容 |
|------|------|
| 最近改动 | 描述最近做了什么 |
| 已知问题 | 无 / 列出链接 |

### 历史版本

| 日期 | 版本 | 改动摘要 |
|------|------|----------|
| 2026-10-16 | 1.0 | 初始化文档 |

---

## 测试验证

### 设备兼容

| 设备 | 状态 | 备注 |
|------|:--:|------|
| 手环 9 (160px) | ✅ | - |
| 手环 10 (200px) | ✅ | - |
| Watch 6 (400px) | ✅ | - |
| 圆形表盘 | - | 不适用 |

### 检查清单

- [ ] 胶囊屏文字不截断
- [ ] 底部安全区适配正确
- [ ] 暗色模式显示正常
- [ ] 所有按钮可点击、热区正常
- [ ] 非法输入/空数据有兜底

---

## 截图

> 截图命名：`YYYY-MM-DD_设备_描述.png`

| 日期 | 设备 | 截图 |
|------|------|------|
| 2026-10-16 | 手环 9 | ![](../screenshots/pages/index/2026-10-16_band9_home.png) |

---

## 相关文档

- [相关分析文档1](../xxx.md)
- [相关 Bug 分析](../xxx.md)
```

### 2.2 模板亮点

1. **属性表**：一眼看清源文件路径、当前状态（用颜色 emoji 区分）
2. **需求 checkbox**：可打勾，GitHub / VS Code 原生渲染
3. **进度表**：历史版本链，不丢上下文
4. **设备兼容矩阵**：适配手环/方屏/圆屏的速查表
5. **截图区**：统一命名规范，日期+设备+描述
6. **相关文档链接**：打通到已有分析文档

---

## 3. 目录结构设计

```
docs/pages/                         ← 新目录，与现有分析文档隔离
├── index.md                        ← 页面文档总览（自动汇总所有页面的状态表）
├── core/                           ← L1 核心页
│   ├── index.md                    ← 首页（课程表主页）
│   ├── add-course.md
│   ├── detail.md                   ← 编辑课程
│   ├── schedule-manager.md
│   ├── course-manager.md
│   ├── week-view.md
│   ├── backup-restore.md
│   └── activation.md
├── entry/                          ← 入口/辅助
│   ├── welcome.md
│   ├── donate.md
│   ├── feedback.md
│   └── message-inbox.md
├── settings/                       ← 设置相关
│   ├── settings.md
│   ├── homepage-settings.md
│   └── lab.md
├── features/                       ← L2 功能页
│   ├── statistics.md
│   ├── qrcode-generator.md
│   ├── schedule-qrcode.md
│   ├── template-picker.md
│   ├── pinned-pages.md
│   ├── countdown-manage.md
│   └── custom-content-edit.md
├── panels/                         ← Schedule Panel 变体（可聚合）
│   └── schedule-panels.md          ← 一份文档覆盖 8 个变体
├── lab/                            ← 实验室工具
│   ├── lab-add-course.md
│   ├── lab-edit-course.md
│   ├── vibration-lab.md
│   └── tools.md
├── device/                         ← 设备/数据
│   ├── device-info.md
│   ├── reset-data.md
│   └── workday-info.md
├── watch-face/                     ← 表盘聚合
│   └── index.md                    ← 17 个表盘变体汇总
├── input/
│   └── chinese-input.md
└── screenshots/                    ← 截图统一存放
    ├── index/
    │   └── 2026-10-16_band9_home.png
    ├── add-course/
    └── ...
```

---

## 4. 与 MkDocs Material 集成

### 4.1 导航配置

在 `mkdocs.yml` 的 `nav` 中增加一个新 section：

```yaml
nav:
  - 首页: index.md
  # ...原有分类...
  - 📄 页面文档:
    - 页面总览: pages/index.md
    - 核心功能:
      - 首页(课程表): pages/core/index.md
      - 添加课程: pages/core/add-course.md
      - 编辑课程: pages/core/detail.md
      - 课表管理: pages/core/schedule-manager.md
      - 课程管理: pages/core/course-manager.md
      - 周视图: pages/core/week-view.md
      - 备份恢复: pages/core/backup-restore.md
      - 激活: pages/core/activation.md
    - 入口辅助:
      - 欢迎页: pages/entry/welcome.md
      - 打赏页: pages/entry/donate.md
      - 反馈: pages/entry/feedback.md
      - 消息: pages/entry/message-inbox.md
    - 设置: ...
    - 功能: ...
    - Schedule Panel: ...
    - 实验室: ...
    - 设备/数据: ...
    - 表盘: ...
    - 输入法: ...
```

### 4.2 页面总览页（自动汇总）

`docs/pages/index.md` 可以做一个汇总表，列出所有页面文档的状态、版本、源文件路径、截图日期，一目了然。后续甚至可以用脚本自动生成此表。

### 4.3 MkDocs 浏览体验

- **侧边栏导航**：按分类层级展开，快速跳转任意页面
- **全文搜索**：搜索需求关键词 / Bug 描述 / 页面名称即时定位
- **截图浏览**：Markdown 原生 `![](path)` 渲染，MkDocs Material 支持图片灯箱（lightbox）点击放大
- **暗色模式**：截图在暗色终端上看也一样清晰

---

## 5. 可行性评估

### 5.1 难度

| 维度 | 评估 | 说明 |
|------|:--:|------|
| 技术难度 | ⭐ 极低 | 纯 Markdown，零代码 |
| 模板设计 | ⭐ 极低 | 本文已给出模板，照搬即可 |
| MkDocs 集成 | ⭐ 极低 | 在 `mkdocs.yml` 加 nav 条目就行 |
| 维护成本 | ⭐⭐ | 需人工更新进度和截图 |
| 截图采集 | ⭐⭐⭐ | 需要模拟器截图，已有 `emulator-eye.js` 可自动化 |

**总体难度：极低。本质上就是写 Markdown 文件 + 截图。**

### 5.2 风险与对策

| 风险 | 对策 |
|------|------|
| 文档过时（写了不更新） | 模板轻量、字段少，每次改动顺手勾一下 checkbox，不强求实时 |
| 截图维护累 | `emulator-eye.js` 已有截图能力，可批量采集；不用每次都贴 |
| 页面太多覆盖不全 | 分级策略（L1-L5），先做 15 个核心页 |
| 与现有分析文档重复 | 页面文档侧重"当前状态"（活文档），分析文档侧重"历史讨论/根因"（死文档），互补不冲突 |

---

## 6. 实施建议

### 6.1 分 3 批推进

| 批次 | 内容 | 预计耗时 |
|------|------|:--:|
| **第 1 批** | 建目录结构 + 模板 + 页面总览 + L1 核心 15 页 | 1-2 小时 |
| **第 2 批** | L2 功能 12 页 + Watch Face 聚合 | 1 小时 |
| **第 3 批** | 截图采集 + mkdocs.yml 集成 + 最终浏览 | 1 小时 |

### 6.2 推荐先做试点

选 **1-2 个核心页**先按模板走一遍，验证模板好用再批量铺开。建议以 `index`（首页）为试点——最复杂、改动最频繁、最能检验模板设计。

### 6.3 截图自动化思路

已有 `scripts/emulator-eye.js`，可以在页面文档里放一个启动截图回调，跑一次自动截图+上传。不需要手动截图。

---

## 7. 总结

| 问题 | 答案 |
|------|------|
| 合适吗？ | **非常合适**。项目已 200+ 分析文档但缺"页面维度"的当前状态跟踪，这正是补缺口 |
| 难度大吗？ | **极低**，纯 Markdown，现有 MkDocs 直接可用 |
| 多少页面？ | 72 个目录，分级后实际建档 **28 个文档** |
| 与现有分析文档重复吗？ | **不重复**。分析文档=历史讨论/根因，页面文档=当前状态/进度/质量 |
| 推荐行动 | **先试点 1 个核心页**（index），模板验证通过再批量铺开 |