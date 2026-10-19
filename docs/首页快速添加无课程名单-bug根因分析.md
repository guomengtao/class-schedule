# 首页「快速添加」无课程名单 —— Bug 根因分析

> 结论先行：这是一个「不同页面读取同一数据源时，**兜底策略不一致**」导致的缺陷。
> 快速添加缺少默认课程的回退逻辑，而课程管理页有，所以「课程管理有数据、快速添加却是空的」。

---

## 一、现象

- 首页「快速添加」展开后，课程名单为空，仅显示「暂无课程，点击添加」。
- 进入「课程管理」页面，课程名单却是满的（自带默认课程）。

## 二、涉及的数据源

两个页面读的是**同一个存储 key**，只是处理空数据的方式不同：

| 页面 | 读取 Key | 空/读取失败时的行为 |
|---|---|---|
| 首页「快速添加」 | `course_preset_list` | **直接置空 `[]`，无兜底** ❌ |
| 课程管理 `course-manager` | `course_preset_list` | 回退到 `defaultCourses` 12 门默认课 ✅ |

`course_preset_list` 定义见 [storage-tables.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/data/storage-tables.js)（课程预设列表，快速添加用）。

---

## 三、根因分析

### 根因 1：快速添加缺少「默认课程」兜底

首页快速添加模块 [quick-add.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/pages/index/modules/quick-add.js) 的 `loadPreset()`：

```js
loadPreset: function() {
  var self = instance
  var storage = require("@system.storage")
  storage.get({
    key: "course_preset_list",
    success: function(data) {
      try {
        var list = JSON.parse(data)                    // data 可能为空串/无效
        var names = []
        for (...) names.push(list[i].name || list[i])
        self.quickAdd.courseNames = names             // 空 → 永远空
      } catch (e) {
        self.quickAdd.courseNames = []                // 解析失败 → 空，无兜底
      }
    },
    fail: function() {
      self.quickAdd.courseNames = []                  // key 不存在 → 空，无兜底
    }
  })
}
```

三种路径（key 不存在 / data 为空串 / data 为 `"[]"`）**全部落到空数组，没有任何回退到 `defaultCourses` 的分支**。

### 根因 2：`course_preset_list` 从未在安装时初始化

[quick-add.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/pages/index/modules/quick-add.js) 读的 `course_preset_list`，在 [database.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/data/database.js) 中只有两处会写入：

- `resetCoursePresets()` —— 用户手动「恢复默认课程」时才写默认 12 门
- `resetToEmpty()` —— 用户「清空重置」时写成空数组 `"[]"`

正常首次启动的 `database.init()`（[database.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/data/database.js)）**并不会写入该 key**。

> 也就是说：新装用户 or 重置过的用户，本地根本没有 `course_preset_list` 这个 key，快速添加从出生起就是空。

### 对照：课程管理为何「有数据」

[course-manager.ux](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/pages/course-manager/course-manager.ux) 的 `loadCourses()`：

```js
storage.get({ key: COURSE_KEY,            // COURSE_KEY = "course_preset_list"
  success: function(data) {
    if (数据有效) { courseList = sortByTime(list) }
    else         { courseList = sortByTime(defaultCourses.slice()) }  // ← 兜底
  },
  fail: function() {
    self.courseList = self.sortByTime(defaultCourses.slice())          // ← 兜底
  }
})
```

它对「空 / 无效 / fail」全部回退到内置 `defaultCourses`（语数英物化政音体美历地生 12 门），所以课程管理永远「看起来有数据」。

**同一把钥匙、两套行为** —— 首页因此和课程管理表现不一致。

---

## 四、影响范围

- 任何「从未写过 `course_preset_list`」或「重置清空过」的用户，首页快速添加均空白。
- 快速添加原本的价值（一键把常用课加到当天）对老用户/重置用户失效。

---

## 五、修复建议（任选其一，推荐 A+B）

### 方案 A（推荐，最贴近用户语义）：快速添加改为「从已保存课程兜底」
让 `loadPreset()` 在 `course_preset_list` 空时，**回退到用 `database.getAllCourses()` 的去重课程名**生成名单。这样「快速添加」展示的才是用户真正在课程表里建的课，和「课程管理=实际课程表」语义一致。

### 方案 B（最小改动）：与 course-manager 对齐，空时回退内置默认课
在 `loadPreset()` 的 `fail` / 空数组 / 解析失败三处，`courseNames` 改为取内置 `defaultCourses.map(d => d.name)`，与课程管理表现完全一致。

### 方案 C（治本）：首次安装时初始化默认预设
在 `database.init()` 中，若 `course_preset_list` 不存在则写入 `defaultCoursePreset`，保证所有页面读取一致。属长期根治，可与 A/B 叠加。

---

## 六、验收标准

1. 新装 / 重置后的用户，首页「快速添加」展开能显示课程名单。
2. 课程管理数据与快速添加准入门名单保持一致（不再出现「一个有数据、一个全空」）。
3. 已存在 `course_preset_list` 不冲突/不覆盖旧数据（幂等）。
4. 手动添加后名单即时刷新（`addCourse` 后已调用 `loadPreset()` 的逻辑保持不变）。

---

*分析日期：2026-10-17 · 归属：首页快速添加模块 · 状态：待修复*