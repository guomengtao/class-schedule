# 应用安装后显示 6MB 体积分析报告

## 问题

安装后手环提示应用大小为 **6MB**，但 RPK 包只有 **1MB**，为什么差距这么大？

---

## 根本原因

RPK 是 **ZIP 压缩包**，安装时在设备上**解压**。设备报告的是**解压后的总大小**。

| 形态 | 大小 |
|:---|:---|
| RPK 文件（压缩） | **1,042,329 字节 ≈ 1.0MB** |
| 解压后（130 个文件） | **5,722,765 字节 ≈ 5.7MB** |
| 设备显示 | **约 6MB**（四舍五入） |

```
RPK 1MB (压缩) → 安装解压 → 5.7MB 文件 → 设备显示 6MB
```

---

## RPK 内部构成

### 总览

| 类别 | 大小 | 占比 |
|:---|:---|:---|
| JS 文件 | 5.4M | 95% |
| 图片 | 224K | 4% |
| 其他 | ~100K | 1% |
| **合计** | **5.7M** | **100%** |

### 各页面 JS 文件大小排名

| 排名 | 文件 | 大小 | 占比 | 说明 |
|:---:|:---|:---|:---:|:---|
| 1 | `chinese-input/chinese-input.js` | 1.32M | 23% | 唯一含 InputMethod 词库 |
| 2 | `index/index.js` | 371K | 6.5% | 首页 |
| 3 | `detail/detail.js` | 335K | 5.9% | 课程详情 |
| 4 | `add-course/add-course.js` | 318K | 5.6% | 添加课程 |
| 5 | `schedule-manager/schedule-manager.js` | 239K | 4.2% | 课程表管理 |
| 6 | `week-view/week-view.js` | 228K | 4.0% | 课程总览 |
| 7 | `statistics/statistics.js` | 227K | 4.0% | 统计 |
| 8 | `settings/settings.js` | 184K | 3.2% | 设置 |
| 9 | `app.js` | 163K | 2.9% | 公共入口 |
| 10 | `demo-reminder/demo-reminder.js` | 144K | 2.5% | Demo 页 |
| 11 | `demo-swipe-delete/demo-swipe-delete.js` | 127K | 2.2% | Demo 页 |
| 12 | `course-manager/course-manager.js` | 126K | 2.2% | 课程管理 |
| 13-28 | 其他 16 个 Demo 页面 | ~1.9M | 33% | 各类 Demo |
| | **以上合计** | **~5.7M** | **100%** | |

### 按功能分类汇总

| 分类 | 页面数 | 大小 | 占比 |
|:---|:---:|:---|:---:|
| **中文输入页面** | 1 | 1.32M | 23% |
| **核心业务页面** | 6 | 1.82M | 32% |
| **Demo 页面** | 20 | 2.24M | 39% |
| **公共 & 组件** | — | 0.33M | 6% |
| **合计** | 27 | 5.71M | 100% |

---

## 重点分析

### 1. 中文输入页面 (chinese-input) — 1.32M

这是唯一引用 `InputMethod` 组件的页面，包含词库文件（dic_words.js 等），体积最大。

**现状**：已完成统一输入页面重构，5 个业务页面不再各自打包 InputMethod。

**优化空间**：词库文件已经精简到最小，进一步优化空间有限。可考虑：
- 词库按需加载（当前已用动态 import）
- 精简词库中不常用的词汇

### 2. Demo 页面 — 2.24M（39%）

20 个 Demo 页面合计占 2.24M，是最大的体积来源。

| Demo 页面 | 大小 |
|:---|:---|
| demo-reminder | 144K |
| demo-swipe-delete | 127K |
| demo-star | 124K |
| demo-lang | 123K |
| demo-furniture | 123K |
| demo-color | 123K |
| demo-movie | 121K |
| demo-fruit | 120K |
| demo-animal | 119K |
| demo-city | 118K |
| demo-phone | 116K |
| demo-sport | 116K |
| demo-car | 116K |
| demo-book | 116K |
| demo-music | 108K |
| test-reminder | 108K |
| demo-list | 84K |
| + 其他 demo | ~120K |

**优化建议**：Demo 页面仅用于开发测试，生产环境应删除，可节省 **2.2M**。

### 3. 核心业务页面 — 1.82M（32%）

6 个核心页面（index, detail, add-course, schedule-manager, week-view, statistics, settings, course-manager）合计 1.82M。

**注意**：这些页面已不再直接引用 InputMethod，体积已优化到合理范围（53K-371K）。

---

## 体积优化历史

| 阶段 | RPK 大小 | 说明 |
|:---|:---|:---|
| 最初 | 2.1M | 6 个页面各自打包 InputMethod 词库 |
| 动态 import 词库 | 855K | 词库改为异步加载，不再重复打包到每个页面 |
| 统一输入页面 | 1.0M | 只有 chinese-input 引用 InputMethod，其他页面跳转 |
| **当前** | **1.0M (RPK) / 5.7M (解压)** | 5.7M 解压后，设备显示 6MB |

---

## 优化建议

### 短期（推荐）

**删除 Demo 页面**，可节省约 2.2M：

```
删除前: 5.7M → 设备显示 6MB
删除后: 3.5M → 设备显示约 3.5MB
```

需要删除的文件：
- `src/pages/demo-*/` 所有目录（约 20 个）
- `src/pages/test-reminder/`
- `manifest.json` 中对应的页面注册

### 中期

- 删除 `InputMethod` 中未使用的全键盘图片资源
- 精简 `store.js` 中不必要的代码

### 长期

- 考虑使用更轻量的输入法方案
- 精简词库，只保留常用词汇

---

## 结论

| 指标 | 值 |
|:---|:---|
| RPK 压缩包 | 1.0M |
| 安装后解压大小 | 5.7M |
| 设备显示 | 约 6MB |
| 最大体积来源 | Demo 页面 (2.2M, 39%) |
| 第二大来源 | 中文输入页面 (1.3M, 23%) |
| 核心业务页面 | 1.8M (32%) |
| 最快优化方式 | 删除 Demo 页面，立即减少 2.2M |