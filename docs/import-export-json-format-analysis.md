# EV 课程表 JSON 格式分析 —— 供同步器对接参考

## 概述

本文档分析 EV 课程表项目的实际数据格式，并与同事开发的同步插件的 JSON 格式进行对比，指出差异并提供正确的格式规范。

---

## 一、EV 课程表项目内的两种数据格式

项目中存在**两种不同形态**的课程数据：

| 格式类型 | 所在位置 | 状态 |
|---------|---------|------|
| **格式 A：当前活跃存储格式** | [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) | **实际使用中** |
| **格式 B：文档化规范格式** | [data-keys.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/data-keys.json) 和 [storage-tables.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/storage-tables.js) | **规划中 / 尚未落地** |

---

## 二、格式 A：当前活跃存储格式（实际使用）

### 2.1 存储位置

数据存储在 `@system.storage`，键名为 `allCourses_N`（N 为课程表索引 0-9）。

### 2.2 数据结构

```json
[
  {
    "day": "星期一",
    "classes": [
      {
        "id": "1",
        "name": "数学",
        "time": "08:00 - 08:45",
        "teacher": "王老师",
        "location": "301教室",
        "notes": "第五章：三角函数"
      },
      {
        "id": "2",
        "name": "英语",
        "time": "08:55 - 09:40",
        "teacher": "李老师",
        "location": "205教室",
        "notes": "口语练习"
      }
    ]
  },
  {
    "day": "星期二",
    "classes": [
      {
        "id": "9",
        "name": "语文",
        "time": "08:00 - 08:45",
        "teacher": "周老师",
        "location": "205教室",
        "notes": "语法练习"
      }
    ]
  }
]
```

### 2.3 字段说明

| 层级 | 字段 | 类型 | 必填 | 说明 |
|------|------|------|:--:|------|
| 根 | `(数组)` | `array` | ✅ | 每个元素代表一天 |
| 天 | `day` | `string` | ✅ | 中文星期名称，7 种：`"星期一"` `"星期二"` `"星期三"` `"星期四"` `"星期五"` `"星期六"` `"星期日"` |
| 天 | `classes` | `array` | ✅ | 当天课程列表 |
| 课 | `id` | `string` | ✅ | 唯一标识，数字字符串，如 `"1"` |
| 课 | `name` | `string` | ✅ | 课程名称，如 `"数学"` |
| 课 | `time` | `string` | ✅ | **合一的**时间段字符串，格式 `"HH:MM - HH:MM"`，如 `"08:00 - 08:45"` |
| 课 | `teacher` | `string` | ❌ | 授课教师，如 `"王老师"` |
| 课 | `location` | `string` | ❌ | 上课地点，如 `"301教室"` |
| 课 | `notes` | `string` | ❌ | 备注信息，如 `"第五章"` |

> **注意**：`time` 是**合并字段**，将开始和结束时间合在一个字符串里，用 ` - `（空格-空格）分隔。数据库在检测时间冲突（[database.js `parseTimeRange`](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L492-L506)）时会在代码层面拆解这个字符串。

### 2.4 课程表名称的存储

课程表名称**不存储在课程数据中**，而是单独存储在以下两个键：

| 存储键 | 格式 | 说明 |
|--------|------|------|
| `scheduleNames` | `["课程表1", "课程表2", ...]` | 所有课程表名称的数组，索引与 `allCourses_N` 一一对应 |
| `currentScheduleIndex` | `0` | 当前选中的课程表索引 |

---

## 三、格式 B：文档化规范格式（规划中）

### 3.1 来源

此格式定义于 [data-keys.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/data-keys.json) 和 [storage-tables.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/storage-tables.js)。

### 3.2 数据结构

```json
{
  "scheduleName": "课程表名称",
  "courses": [
    {
      "id": "1",
      "name": "数学",
      "teacher": "王老师",
      "location": "301教室",
      "day": 1,
      "startTime": "08:00",
      "endTime": "08:45",
      "weeks": [1, 2, 3, 4, 5, 6, 7, 8],
      "color": "#F44336",
      "notes": "第五章"
    }
  ],
  "createdAt": "2025-09-01T08:00:00.000Z",
  "updatedAt": "2025-09-01T08:00:00.000Z"
}
```

### 3.3 当前状态

⚠️ **此格式目前仅为文档定义，未实际落地到 `database.js` 的存储逻辑中。** 实际读写仍使用格式 A。

---

## 四、同事同步插件的 JSON 格式

同事方案中的 Demo JSON：

```json
{
  "scheduleName": "2026 春季学期",
  "courses": [
    {
      "name": "高等数学",
      "teacher": "张教授",
      "location": "A楼101教室",
      "day": 1,
      "startTime": "08:00",
      "endTime": "09:40",
      "weeks": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      "weekType": "all",
      "color": "#F44336",
      "credit": 3.0,
      "remark": "这是可选备注"
    }
  ]
}
```

---

## 五、格式差异对比分析

### 5.1 整体结构对比

| 对比维度 | 当前实际格式 (A) | 文档/规划格式 (B) | 同事方案格式 |
|---------|:---:|:---:|:---:|
| 顶层结构 | `[{day, classes[]}]` 按天分组数组 | `{scheduleName, courses[], createdAt, updatedAt}` 对象 | `{scheduleName, courses[]}` 对象 |
| scheduleName | 不存在（另存于 scheduleNames） | ✅ 内联 | ✅ 内联 |
| createdAt/updatedAt | 无 | ✅ 有 | 无 |

### 5.2 课程字段对比

| 字段 | 实际格式 (A) | 规划格式 (B) | 同事格式 | 差异分析 |
|------|:---:|:---:|:---:|------|
| `id` | ✅ `string` | ✅ `string` | ❌ **没有** | 同事格式缺少 `id`，而我们的存储依赖 `id` 做 CRUD |
| `name` | ✅ | ✅ | ✅ | 一致 |
| `teacher` | ✅ | ✅ | ✅ | 一致 |
| `location` | ✅ | ✅ | ✅ | 一致 |
| `day` | ✅ `string` 如 `"星期一"` | ✅ `number` 1-7 | ✅ `number` 1-7 | 实际格式用中文名，规划及同事用数字 |
| `time` | ✅ `"HH:MM - HH:MM"` | ❌ 拆分为 startTime/endTime | ❌ 拆分为 startTime/endTime | **核心差异**：实际格式是**合一的**，规划/同事是**拆开的** |
| `startTime` | ❌ | ✅ `"HH:MM"` | ✅ `"HH:MM"` | 实际格式中合并在 `time` 内 |
| `endTime` | ❌ | ✅ `"HH:MM"` | ✅ `"HH:MM"` | 实际格式中合并在 `time` 内 |
| `weeks` | ❌ 无 | ✅ `number[]` | ✅ `number[]` | 实际格式无此字段 |
| `weekType` | ❌ 无 | ❌ 无 | ✅ `"all"/"odd"/"even"` | 两者均无此字段 |
| `color` | ❌ 无 | ✅ `"#RRGGBB"` | ✅ `"#RRGGBB"` | 实际格式无此字段 |
| `credit` | ❌ 无 | ❌ 无 | ✅ `number` | 两者均无此字段 |
| `notes` | ✅ | ✅ | ❌ 用的是 `remark` | 字段名不同：`notes` vs `remark` |

### 5.3 差异汇总

| # | 差异项 | 影响 |
|---|--------|------|
| 1 | **顶层结构不同** | 我们的格式是 `[{day, classes[]}]`（按天分组），同事是 `{scheduleName, courses[]}`（平铺）。数据结构完全不同。 |
| 2 | **`id` 缺失** | 同事格式没有 `id` 字段。我们的数据库依赖 `id` 来定位和更新/删除课程。 |
| 3 | **时间字段拆分方式** | 我们使用合并的 `time: "08:00 - 08:45"`，同事使用拆分的 `startTime` + `endTime`。 |
| 4 | **`day` 表示方式** | 我们实际使用中文字符串 `"星期一"`，同事使用数字 `1`。 |
| 5 | **`weekType` 多余** | 同事有 `weekType`（all/odd/even），我们的系统完全没有这个概念。 |
| 6 | **`weeks` 多余/缺失** | 同事有 `weeks` 数组，我们的实际格式不存储周次信息（所有课程默认每周都有）。 |
| 7 | **`color` 多余** | 同事有 `color` 字段，我们的实际存储不包含课程级别颜色。 |
| 8 | **`credit` 多余** | 同事有 `credit` 字段，我们完全没有学分概念。 |
| 9 | **`remark` vs `notes`** | 同事用 `remark`，我们用 `notes`。字段名不同。 |

---

## 六、结论

**同事的 JSON 格式与 EV 课程表的实际数据格式不一致**，存在以下核心问题需要同步器侧做适配转换：

1.  **结构转换**：平铺 `courses[]` → 按 `day` 分组的 `[{day, classes[]}]`
2.  **时间合并**：`startTime` + `endTime` → `"HH:MM - HH:MM"`
3.  **`day` 转换**：数字 `1-7` → `"星期一"` ~ `"星期日"`
4.  **字段映射**：`remark` → `notes`；丢弃 `weekType`、`weeks`、`color`、`credit`
5.  **生成 `id`**：为每门课程生成唯一 `id` 字符串

---

## 七、给同事的正确格式规范

如果同步器要**导出数据给 EV 课程表消费**，应使用**格式 A**（当前实际格式），完整实例如下：

### 7.1 导入/导出 JSON 正确格式

```json
[
  {
    "day": "星期一",
    "classes": [
      {
        "id": "1",
        "name": "高等数学",
        "time": "08:00 - 09:40",
        "teacher": "张教授",
        "location": "A楼101教室",
        "notes": ""
      },
      {
        "id": "2",
        "name": "大学英语",
        "time": "10:00 - 11:40",
        "teacher": "李教授",
        "location": "教学楼B205",
        "notes": ""
      }
    ]
  },
  {
    "day": "星期三",
    "classes": [
      {
        "id": "3",
        "name": "高等数学",
        "time": "08:00 - 09:40",
        "teacher": "张教授",
        "location": "A楼101教室",
        "notes": ""
      }
    ]
  }
]
```

### 7.2 字段规范表

| 层级 | 字段 | 类型 | 必填 | 约束 |
|------|------|------|:--:|------|
| 根 | *(数组)* | `array` | ✅ | 每个元素为一天的课程数据 |
| 天 | `day` | `string` | ✅ | 必须是以下之一：`"星期一"` `"星期二"` `"星期三"` `"星期四"` `"星期五"` `"星期六"` `"星期日"` |
| 天 | `classes` | `array` | ✅ | 该天所有课程，可为空数组 `[]` |
| 课 | `id` | `string` | ✅ | 唯一标识符，建议使用递增数字字符串，如 `"1"` `"2"` |
| 课 | `name` | `string` | ✅ | 课程名称，最长 50 字符 |
| 课 | `time` | `string` | ✅ | 格式 `"HH:MM - HH:MM"`，24 小时制，如 `"08:00 - 09:40"`，开始必须小于结束 |
| 课 | `teacher` | `string` | ❌ | 授课教师，可为空字符串 |
| 课 | `location` | `string` | ❌ | 上课地点，可为空字符串 |
| 课 | `notes` | `string` | ❌ | 备注，可为空字符串 |

### 7.3 同步器需做的字段转换映射

```
同事格式                    →  EV课程表实际格式
─────────────────────────────────────────────────
scheduleName                →  存入 scheduleNames 键（按索引对应）
courses[] (平铺)            →  按 day 分组为 [{day, classes[]}]
courses[].name              →  classes[].name
courses[].teacher           →  classes[].teacher
courses[].location          →  classes[].location
courses[].day (数字 1-7)     →  day: 映射为 "星期一"~"星期日"
courses[].startTime    ┐
courses[].endTime      ┘    →  time: "startTime - endTime" (合并)
courses[].remark             →  classes[].notes
courses[].weekType           →  丢弃（EV课程表无此概念）
courses[].weeks              →  丢弃（EV课程表无此概念，周次默认全覆盖）
courses[].color              →  丢弃（或存到预设库 course_preset_list）
courses[].credit             →  丢弃（EV课程表无此概念）
—                            →  classes[].id: 需生成唯一ID
```

---

## 八、相关源码文件索引

| 文件 | 作用 |
|------|------|
| [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) | 核心数据存取，格式 A 的实现 |
| [schedule.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/schedule.js) | 种子/默认课程数据，格式 A |
| [data-keys.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/data-keys.json) | 存储键文档，包含格式 B 定义 |
| [storage-tables.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/storage-tables.js) | 存储表结构定义，格式 B 定义 |
| [backup-restore.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/backup-restore/backup-restore.ux) | 备份/恢复功能，展示实际备份的存储键 |

---

## 九、数据库结构规范性分析 & 改造建议

### 9.1 当前格式（A）的规范性问题诊断

| # | 设计点 | 评级 | 分析 |
|---|--------|:--:|------|
| 1 | `day` 用中文字符串 | ⚠️ 不规范 | 不可国际化，但对终端用户直观，UI无需转换 |
| 2 | `time` 用合一字符串 | ⚠️ 不规范 | 不符合范式，但key-value存储无索引需求，拆解成本极低 |
| 3 | 顶层按天分组数组 | ⚠️ 有争议 | 非平铺，但匹配手表以天为维度的UI渲染模式 |
| 4 | 无 `weeks` 字段 | ⚠️ 功能缺失 | 无法表达大学课表周次场景 |
| 5 | 无 `weekType` 字段 | ✅ 可接受 | K12场景不多见 |
| 6 | 无 `color` 字段 | ✅ 可接受 | 非数据模型核心职责 |
| 7 | `scheduleName` 分离存储 | ⚠️ 不规范 | 数据不自包含，导出需额外携带 |
| 8 | `id` 为字符串类型的数字 | ⚠️ 小瑕疵 | QuickApp JSON对string友好 |

总体评价：格式A为手环课程表UI深度定制的务实结构，不规范处多为匹配UI渲染的有意取舍。

### 9.2 改造影响面量化

格式A → 格式B 波及范围：

| 层 | 文件数 | 关键依赖 |
|----|:---:|------|
| 数据存取层 | 2 | database.js(Core CRUD+冲突检测)、store.js |
| 首页渲染 | 5 | index.ux、class-list.js(time.split)、quick-add.js、status-bar.js、week-indicator.js |
| 课程编辑 | 5 | add-course.ux、add-course-v2.ux、lab-add-course.ux、lab-edit-course.ux、detail.ux |
| 周视图+统计 | 2 | week-view.ux、statistics.ux |
| 管理页 | 2 | schedule-manager.ux、course-manager.ux |
| 备份/二维码/种子 | 3 | backup-restore.ux、schedule-qrcode.ux、schedule.js |
| **合计** | **19个文件** | **约212处字段引用** |

### 9.3 方案对比

**方案一：改造核心存储（格式A → 格式B）**

- 工作量：**大**（重写database.js，改19个页面）
- 风险：**高**（数据迁移出错致课表丢失）
- 收益：数据结构更规范
- 测试成本：全量回归

**方案二：保持现状 + 同步器侧适配（推荐）**

- 工作量：**小**（同步器侧50-80行转换函数）
- 风险：**低**（EV课程表零改动）
- 收益：快速上线
- 测试成本：仅验证转换函数

**方案三：加内部转换层（格式A不动，对外暴露格式B）**

- 工作量：**中**（database.js增加export/import函数）
- 风险：**中低**（核心CRUD不变）
- 收益：对外规范化 + 留迁移出口

### 9.4 推荐：方案二 + 预留方案三

**立即采用方案二**（同步器侧适配），理由：

1. 19个文件、212+处引用深度依赖格式A，改造风险大于收益
2. 课程表是用户核心资产，数据迁移bug不可逆
3. 手环key-value存储不支持SQL migration
4. 格式A在手表场景高效：按天分组匹配UI，合一字符串减少碎片

**同时预留方案三**：database.js新增exportAsFlatJSON/importFromFlatJSON纯函数。

### 9.5 未来渐进改造路径

```
第1步：格式A不动，新字段以可选方式追加到class对象
       例：classes[].weeks不存在时默认行为不变（每周有课）
第2步：新增exportAsFlatJSON()/importFromFlatJSON()纯函数
第3步：各页面按需迁移新字段（不一次性全改）
第4步：所有页面不再依赖旧格式后，切换核心存储
```

零停机、零风险演进。

### 9.6 小结

| 问题 | 回答 |
|------|------|
| 数据库结构不规范？ | 部分字段不符合标准范式，但为手环UI场景的有意取舍 |
| 是否需要修改？ | **不建议现在改**。成本高、风险大、无用户感知收益 |
| 对接同步器怎么办？ | **同步器侧写转换适配层**。纯函数搞定，低风险高效率 |