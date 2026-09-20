# 总课表栏目缓存方案分析

## 一、问题现状

总课表页面加载缓慢，每次进入都需要等待较长时间。用户感知明显，体验不佳。

## 二、当前数据流

```
onInit / onShow
  → loadData()
    → getAllCoursesWithIndex(index)
      → database.js 内存缓存命中? → callback (快)
      → database.js 内存缓存未命中 → storage.get() (慢，设备 I/O)
    → renderScheduleData(allCourses)
      → detectCurrentCourse()     循环解析时间
      → buildTimeSlots()          嵌套循环构建网格
      → guessSubjectKey()         每格调用一次科目颜色判断
      → $forceUpdate()            渲染大表格
```

## 三、现有缓存机制

database.js 已有**内存缓存**（[database.js:9-10](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L9-L10)）：

| 缓存层 | 范围 | 失效条件 |
|--------|------|----------|
| `_cache[index]` | 当前 session 全课程数据 | 增/删/改课程后 `invalidateCache()` |
| `_cacheDirty[index]` | 脏标记 | 同缓存一起失效 |

**关键点**：首次进入总课表时，`_cache` 为空，必须走 `storage.get()` 的 I/O 读盘，这是**慢的根本原因**。

`onShow()` 再次进入时如果 `_cache` 仍然有效则命中缓存（快），但如果期间有任何编辑操作，缓存已 `invalidateCache()` 清除，仍要走读盘。

## 四、性能瓶颈拆解

### 4.1 存储 I/O（主瓶颈）

手环/手表上的 `@system.storage` 基于文件系统，读盘操作是同步阻塞或异步耗时的。全量课程数据以 JSON 字符串存储，数据量越大解析越慢。

### 4.2 构建时间槽（次瓶颈）

[buildTimeSlots()](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L614-L686) 的复杂度：

```
O(dayCount × courseCount × cellCount) ≈ 7 × 8 × 7 = ~392 次内层循环
```

每次进入都重新执行，即使数据完全没变。

### 4.3 渲染开销

总课表渲染 7 天 × N 个时间槽的完整网格，每个单元格含条件样式、颜色计算、文字截断等，DOM 节点数量大。

### 4.4 重复调用

`onShow()` → `loadTemplateAndReload()` → `loadData()` 每次回到页面都重新走完整流程，即使数据未变更。

## 五、缓存方案评估

### 方案 A：week-view 内缓存已构建的 timeSlots（推荐）

```
week-view 私有变量:
  _cachedTimeSlots = null
  _cachedDataHash = ""      // JSON.stringify(allCourses) 的哈希/快照
  _cachedWeekend = null
  _cachedTemplate = null

loadData():
  计算当前数据快照 hash
  if (hash === _cachedDataHash && template未变 && weekend未变):
    this.timeSlots = _cachedTimeSlots
    this.isLoading = false
    return  // 跳过所有计算和渲染
  else:
    正常走 buildTimeSlots() 流程
    更新缓存
```

| 维度 | 评估 |
|------|------|
| 效果 | onShow 不切模板/不改数据时，O(n²) 计算直接跳过 |
| 风险 | 低。数据驱动失效，逻辑简单 |
| 内存 | +几十KB（timeSlots 对象） |
| 实现难度 | 低，约 20 行代码 |

### 方案 B：session 级别持久化缓存

将构建好的 timeSlots 存入 storage，下次打开直接读取。

| 维度 | 评估 |
|------|------|
| 效果 | 连首次进入都快 |
| 风险 | **高**。stale data 风险大，需要完善的失效/版本机制 |
| 实现难度 | 中高 |

### 方案 C：数据预加载

在首页 onInit 时预加载总课表所需数据到 `_cache`。

| 维度 | 评估 |
|------|------|
| 效果 | 首次进入总课表无 I/O 等待 |
| 风险 | 中。增加首页启动耗时 |
| 实现难度 | 低 |

## 六、结论与建议

### 6.1 是否引入缓存？

**合理且必要**。总课表的计算逻辑（`buildTimeSlots`）是纯函数，输入不变则输出不变，天然适合缓存。

### 6.2 推荐实施顺序

1. **P0 — 计算缓存**（方案 A）：week-view 内缓存 `timeSlots` 构建结果，数据未变时不重新计算。改动小、风险低、收益大。

2. **P1 — 数据预加载**（方案 C）：首页 onInit 时静默触发一次 `getAllCoursesWithIndex` 填充 `_cache`，总课表进入时直接命中缓存。

3. **P2 — 日志精简**：虽然 `DEBUG = false`，但 `log()` 函数调用和 `JSON.stringify` 参数求值仍然执行。改为惰性求值或完全移除生产环境日志。

### 6.3 更新及时性保障

现有机制已足够：任何增/删/改课程操作都通过 `invalidateCache()` 使缓存失效，week-view 缓存基于数据快照 hash 检测变更，确保编辑后自动刷新。

### 6.4 不推荐的做法

- **在 storage 中缓存构建结果**：增加 I/O 反而变慢，且 stale data 难以追踪。
- **使用 `$forceUpdate` 在数据未变时**：浪费渲染开销。
- **增加超时 fallback**：当前 1500ms fallback 掩盖了真实性能问题，应通过缓存解决根本原因后移除。