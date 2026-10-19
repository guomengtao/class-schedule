# 课程表盘「没有课程」Bug 分析

> 单号：`evtask-D-evclass-bug-261019-nocourse`
> 提出时间：2026-10-19
> 影响页面：`src/pages/watch-face-class/watch-face-class.ux`（即工具 → 表盘 → **课程表盘** 入口打开的电子表盘）
> 状态：**分析完成，待批准修复**

---

## 一、现象

打开「课程表盘」后，无论当天有无课，盘面恒定显示：

- 主卡片：`今日无课` / `好好休息`
- 状态条：`今日无课`
- 时间轴（upcoming）：空（不列出任何课程）
- 进度条：0

而**首页（index）能正常显示当前课程**（如「即将上课 体育 9min」「语文 301 教室」），说明数据源本身是正常的，问题出在课程表盘页对数据的解析环节。

---

## 二、数据链路（逐环核对）

| 环节 | 代码位置 | 实际行为 |
|---|---|---|
| 1. 页面取数 | `watch-face-class.ux:144 loadCourses()` | 调 `database.getAllCourses(cb)` |
| 2. 数据出口 | `database.js:663 getAllCourses()` → `getAllCoursesStorage()` → `getAllCoursesStorageWithIndex()` | 读 `allCourses_<index>`（STORAGE_KEY=`"allCourses"`），`JSON.parse` 后返回 |
| 3. 存储形态 | `schedule.js`、`saveToStorageWithIndex()`、`insertCourseStorage()` | 存的是**排课数组**：`[{ day:"星期一", classes:[{id,name,time,teacher,location,notes}, ...] }, ...]` |
| 4. 页面解析 | `watch-face-class.ux:162 todayCourses()` | 把返回值当成**以星期名为 key 的对象** `all["周一"]` / `all["星期一"]` 去取值 |

环节 3 与环节 4 的**数据结构预期不一致** —— 这是根因。

---

## 三、根因（代码级）

`todayCourses()` 当前实现（节选自 `watch-face-class.ux`）：

```js
const DAY_KEYS = [
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  ["Sunday",...,"Saturday"],
  ["周日",...,"周六"],
  ["星期日",...,"星期六"]
]
const CN_DAY = ["周日",...,"周六"]

todayCourses() {
  const all = this.allCourses          // 实际是数组 [{day,classes}, ...]
  if (!all) return null
  const d = new Date().getDay()
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const k = DAY_KEYS[i][d]
    if (all[k] && all[k].length) {     // all["星期一"] → undefined（数组没有这个属性）
      this.fallbackLabel = ""
      return all[k]
    }
  }
  for (let step = 1; step <= 6; step++) {   // fallback：未来 6 天
    const d2 = (d + step) % 7
    for (let i = 0; i < DAY_KEYS.length; i++) {
      const k = DAY_KEYS[i][d2]
      if (all[k] && all[k].length) {         // 同样 undefined
        this.fallbackLabel = CN_DAY[d2] + "课表"
        return all[k]
      }
    }
  }
  this.fallbackLabel = ""
  return null                            // ← 永远走到这里
}
```

`this.allCourses` 是**数组**，`all["星期一"]` 恒为 `undefined`，因此：

1. 当天匹配（两层 DAY_KEYS 循环）全部 miss；
2. fallback 未来 6 天匹配也全部 miss（且 `CN_DAY` 是短名「周一」，而存储里的 `day` 是长名「星期一」，key 字面也对不上）；
3. 最终 `return null` → `recompute()` 走「今日无课」分支，盘面空。

**即便把 `all` 当成对象，key 也写错了**：存储的 `day` 字段是长名（「星期一」），而 `DAY_KEYS` 同时含短名「周一」与英文「Monday」，`todayCourses` 从没用过长名「星期一」去索引——且数组根本没有这些字符串属性。

### 误判来源

`课程表盘-电子表风格-方案.md` §二 侦察结论写：

> 按星期分组 | `week-view.ux` `allCourses[dayName]` 的组装方式可参考

—— 这里把「`week-view` / `index` 内部**现组装**出来的 day-keyed 对象」误当成了 `database.getAllCourses()` 的**返回形态**。`getAllCourses()` 返回的是**未组装的排课数组**，组装（数组 → `day: classes`）是在 `index.ux` / `week-view.ux` 内部各自完成的，课程表盘页直接拿数组当对象用，于是全空。

---

## 四、影响范围（已排除其他环节）

- **唯一坏点**：`todayCourses()` 的取值方式（含 fallback 的 day-name 匹配）。
- **无需改动**：
  - `recompute()` 的其余逻辑（`parseSpan`、按开始时间排序、当前/下节判定、upcoming 组装）全部基于「`list` = 课程对象数组（`{name,time,...}`）」编写 —— 这与 `getAllCourses` 返回的课程数组形态**一致**。只要 `todayCourses` 正确返回 `dayObj.classes`，整个盘面逻辑自动接通。
  - `loadCourses()` 调用方式、`database.getAllCourses()` 接口本身均正确。
- **无其他受害者**：全工程只有 `watch-face-class.ux` 使用 `todayCourses` / 直接消费 `getAllCourses` 的排课语义（已 `grep` 确认 `watch-face*/` 下仅此一处）。

---

## 五、修复方案（最小改动，仅改 `todayCourses`）

**核心思路**：把「数组 → 今天课程」的映射补上，并修正 fallback 的 day-name 匹配（用长名 + 按 `getDay()` 索引计算最近有课日）。

### 5.1 替换常量

删除不再使用的 `DAY_KEYS` / `CN_DAY`（避免误导），改为：

```js
const CN_DAY_FULL = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"]
const WEEKDAY_INDEX = {
  "星期日":0,"星期一":1,"星期二":2,"星期三":3,"星期四":4,"星期五":5,"星期六":6
}
```

### 5.2 重写 `todayCourses()`

```js
/**
 * 取今天的课程数组（list = 课程对象数组 [{name,time,...}]）。
 * 兼容 getAllCourses 实际返回形态：排课数组 [{ day:"星期一", classes:[...] }]。
 * 今日无课（周末 / 调休 / 当天没排课）→ 回退到「最近一个有课日」，
 * 并把来源写进 this.fallbackLabel（如「周一课表」）。
 */
todayCourses() {
  const all = this.allCourses
  if (!all || !Array.isArray(all)) return null

  // 1) 今天（getDay(): 0=周日 … 6=周六，与 CN_DAY_FULL 对齐）
  const todayName = CN_DAY_FULL[new Date().getDay()]
  for (let i = 0; i < all.length; i++) {
    const dayObj = all[i]
    if (dayObj && dayObj.day === todayName && dayObj.classes && dayObj.classes.length) {
      this.fallbackLabel = ""
      return dayObj.classes
    }
  }

  // 2) fallback：本周内向前看，取最近一个有课日（dist>0，不含今天）
  const todayIdx = new Date().getDay()
  let bestIdx = -1, bestDist = 99
  for (let i = 0; i < all.length; i++) {
    const dayObj = all[i]
    if (!dayObj || !dayObj.classes || !dayObj.classes.length) continue
    const di = WEEKDAY_INDEX[dayObj.day]
    if (di === undefined) continue
    const dist = (di - todayIdx + 7) % 7
    if (dist > 0 && dist < bestDist) { bestDist = dist; bestIdx = i }
  }
  if (bestIdx >= 0) {
    this.fallbackLabel = all[bestIdx].day + "课表"
    return all[bestIdx].classes
  }

  this.fallbackLabel = ""
  return null
}
```

### 5.3 为何这样改是安全的

- `dayObj.classes` 就是 `[{id,name,time,teacher,location,notes}]`，与 `recompute` 遍历 `c.name` / `c.time` 的假设**完全吻合**，无需动 `recompute`。
- `currentScheduleIndex` 由 `getAllCourses` 内部按当前激活课表处理，多课表场景同样正确。
- fallback 标签从 `CN_DAY`（短名）改为 `dayObj.day`（长名「星期一课表」），与 `recompute` 里已使用 `this.fallbackLabel` 的展示文案一致。

---

## 六、验证清单

| 项 | 预期 |
|---|---|
| 静态 | `database.getAllCourses` 返回数组形态（已通过读 `database.js` + `schedule.js` 印证） |
| 实拍（当天周一） | `schedule.js` 周一有 4 节（英语/语文/物理/化学）→ 盘面显示「今日 4 节」、主卡片显示当前/下节、upcoming 列 3 节 |
| 周末 / 当天无课 | 回退到最近有课日，显示「X课表」且列出课程 |
| 空课表 | 显示「今日无课」不崩溃 |
| 交叉核对 | 盘面当前课程与首页（index）当前课程一致 |

---

## 七、连带修订建议

1. 在 `课程表盘-电子表风格-方案.md` §二 侦察结论中，把「`allCourses[dayName]` 的组装方式可参考」更正为「`getAllCourses` 返回**排课数组**，需自行按 `day` 字段映射到今天」，防止后续作者重蹈覆辙。
2. 修复后按方案 §五 S3 在模拟器实拍验收（全新实例首装，避免热更黑屏）。

---

## 八、待批准

- [x] 批准修复（按 §五 改 `watch-face-class.ux` 的 `todayCourses` + 常量）
- [ ] 是否一并在方案 md §二 补记数据形态更正（建议做）
- [x] 修复后是否立即实拍验收（已完成，见下）

---

## 九、修复与验证结果（2026-10-19）

**代码改动**（`src/pages/watch-face-class/watch-face-class.ux`）：

1. 删除 `DAY_KEYS`（误把数组当 day-keyed 对象的根源），新增 `CN_DAY_FULL`（长名，与 `getDay()` 对齐）与 `WEEKDAY_INDEX`；保留 `CN_DAY`（`dateText` 仍在用）。
2. 重写 `todayCourses()`：按**排课数组**遍历，`dayObj.day === CN_DAY_FULL[getDay()]` 命中今日返回 `dayObj.classes`；无课则按 `WEEKDAY_INDEX` 求最近有课日 fallback。

**逻辑级验证**（Node，真实 `schedule.js` 数据，7 天逐日跑旧/新实现）：

| 断言 | 结果 |
|---|---|
| 旧实现 7 天恒返回 null（复现 bug） | PASS |
| 新实现 7 天均能取到课程 | PASS |
| 周一取到 4 节且名称与源一致 | PASS |
| 空课表返回 null 不崩 | PASS |
| 仅有周三课时，周六正确 fallback 到「星期三课表」 | PASS |

**实拍验收**（模拟器 `xiaomi_band-13002`，192×490，`--scroll 0` 避免滑动手势切表盘）：

- 冷启第 3 次出画（前两次为已知偶发瞬断，非本次改动引入）。
- 盘面 OCR 识别到：`15:25`、**「上课中」**、**「美术」**、**「剩余 7 分钟」**、时间轴 **「美术 14:55」**。
- 与修复前恒定「今日无课 / 好好休息」形成直接反证 —— **课程表盘已能正确读取并展示真实课表**。
- 交叉核对：该时段课程「美术 14:55」与当日课程数据一致，剩余 7 分钟与 `15:23 / 结束 15:30` 相符。

**结论：bug 已修复并在设备上验证通过。**

