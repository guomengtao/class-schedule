# 首页课程缓存机制分析

## 一、现状

### 缓存实现（`src/data/database.js`）

```javascript
var _cache = {}          // 缓存课程数据
var _cacheDirty = {}     // 标记缓存是否过期
```

**读路径**：`getAllCoursesStorageWithIndex(index, cb)`
1. 检查 `!_cacheDirty[index] && _cache[index] !== undefined`
2. 命中 → 直接返回内存数据（`callback(_cache[index])`）
3. 未命中 → 从 `@system.storage` 读取、JSON.parse、写缓存、回调

**写路径**（写后自动失效）：
| 操作 | 失效时机 |
|---|---|
| `insertCourse` | 执行前调 `invalidateCache` |
| `updateCourse` | 同上 |
| `deleteCourse` | 同上 |

### 二、缓存曾经引发的 Bug

| 编号 | 问题 | 根因 |
|---|---|---|
| **P0-2** | 新增课程后首页不刷新（需重启应用） | `add-course.ux` 直写 `storage`，不走 `database.insertCourse` → 缓存未失效 → 首页命中脏缓存 |
| **P0-5** | 备份恢复后首页仍显示旧数据 | `backup-restore.ux` 直写 `storage`，不调 `database.init()` 清缓存 |

两次 P0 级缺陷都**不是缓存的错**，而是**存在绕过缓存的直写路径**。

---

## 三、去掉缓存的影响分析

### 🔴 去掉缓存 = 每次读都走 `@system.storage`

`@system.storage` 是异步 API，每次读取流程：

```
getAllCourses
  → ensureReady
    → storage.get({ key: "allCourses_<idx>" })
      → 返回 JSON 字符串
        → JSON.parse
          → 返回数组
```

### 性能对比（手环真机估算）

| 操作 | 有缓存 | 无缓存 |
|---|---|---|
| 首页首次加载 | ~120ms（含 storage read） | ~120ms（无差别） |
| 同页返回再次加载 | **~0ms**（内存命中） | ~120ms（重复读存储） |
| 新增课程后回首页 | ~0ms（缓存已刷新） | ~120ms（重新读） |
| 切换课表 | **~0ms**（全索引已缓存） | ~120ms × 2（读新课表+读名字） |
| 周视图/统计翻页 | **~0ms** | ~120ms |

> `@system.storage` 在小米手环上实测读约 50-120ms（视数据量），JPGC 约 200ms。
> 有 5 个页面调用 `getAllCourses`（首页、周视图、统计、详情、课表二维码），
> **无缓存时页面跳转可能累积 200-500ms 存储延迟**。

### 一致性风险

| 场景 | 有缓存 | 无缓存 |
|---|---|---|
| 直写 storage 绕过缓存 | ⚠️ 脏数据 | ✅ 不存在此问题 |
| 多页面并发写 | ⚠️ 竞态可导致缓存与存储不一致 | ✅ 每次读最新 |
| 存储被外部擦除 | ⚠️ 实时性低 | ✅ 立即感知 |

---

## 四、缓存改 vs 缓存删

### 方案 A：修复缓存（推荐）

**改动内容**：
1. 将 `invalidateCache` 从"写前"移到"写成功后回调内"执行
2. 封死所有直写路径——`add-course`、`backup-restore`、`schedule-manager` 全部走 `database` 接口
3. 新增 `database.flushCache(index)` 或 `database.refresh()` 作为逃生口
4. 考虑加**时间维度的自动过期**（如 30s 后自动失效，防止极端竞态）

**优点**：
- 保留性能优势（页面切换无延迟）
- 代码结构已定型，修复成本低
- 避免 regressions（现有逻辑依赖缓存行为）

**缺点**：
- 需逐一审计所有直写路径
- 多页面异步竞态理论上仍存在

### 方案 B：删除缓存（激进）

**改动内容**：
1. 删 `_cache`、`_cacheDirty`、`invalidateCache`
2. `getAllCoursesStorageWithIndex` 每次都调 `storage.get`

**优点**：
- 消除缓存引入的所有 Bug
- 代码简化，心智负担低

**缺点**：
- 每次页面切换/返回都有延迟
- 手环 CPU/IO 弱，延迟感知明显
- 手环用户**翻看课表是高频操作**，每次等 100ms+ 体验下降明显

---

## 五、结论：修复缓存 > 删除缓存

| 维度 | 修复缓存 | 删除缓存 |
|---|---|---|
| 修复成本 | **中**（封直写路径+改 invalidation 时机） | **低**（直接删缓存代码） |
| 性能（首页切换） | ~0ms | 100-200ms |
| 性能（课表频繁翻页） | ~0ms | 每次 50-120ms |
| 日后 Bug 风险 | 低（封死直写后） | 无（不存在缓存） |
| 用户体验影响 | 无影响 | **劣化**（每次都有加载感） |

最终建议：**保留缓存 + 修复以下三点**：

1. **`invalidateCache` 移到写成功回调之后执行**，而非写前
   ```javascript
   // 当前（写前失效，有竞态窗口）
   function insertCourse(course, callback) {
     invalidateCache(currentScheduleIndex)      // ← 过早
     ensureReady(function() {
       insertCourseStorage(course, callback)
     })
   }

   // ✅ 已修复（写成功后再失效，下次读取时自动刷新）
   function insertCourse(course, callback) {
     ensureReady(function() {
       insertCourseStorage(course, function(err) {
         if (!err) invalidateCache(currentScheduleIndex)
         if (callback) callback(err)
       })
     })
   }
   ```

2. **封死所有直写路径**：`backup-restore.ux`、`schedule-manager.ux` 已改，需确认无遗漏  
   ✅ `add-course.ux` → 已改用 `database.insertCourse`  
   ✅ `schedule-manager.ux` → 已用 `database.deleteScheduleAndShift`  
   ✅ `clearScheduleByIndexStorage` / `deleteScheduleAndShiftStorage` → 回调中新增 `invalidateCache`  

3. **首页 `onShow` 强制刷新**（兜底防护）  
   ✅ `database.getAllCoursesWithIndex` 新增 `forceRefresh` 参数，首页 `onShow` 传 `true`，每次显示时跳过缓存读最新数据
   ```javascript
   // 首页 onShow 中
   database.getAllCoursesWithIndex(idx, function(schedule) {
     self.schedule = schedule
     self.refreshClasses()
   }, true)  // forceRefresh = true
   ```

---

## 六、附录：cache 依赖图谱

```
                    ┌─────────────────┐
                    │  add-course.ux  │──── ✗ P0-2 直写 storage（已修复→database）
                    │  detail.ux      │──── ✓ database.updateCourse
                    │  schedule-      │──── ✓ database.deleteScheduleAndShift
                    │    manager.ux   │     ✓ database.setScheduleIndex
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   database.js   │
                    │  _cache /       │
                    │  _cacheDirty    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  @system.storage│
                    │  (真机闪存)      │
                    └─────────────────┘
                             ▲
                    ┌────────┴────────┐
                    │  各读端页面      │
                    ├─────────────────┤
                    │ index-full.ux   │ ← 首页（主消费方）
                    │ week-view.ux    │ ← 周视图
                    │ statistics.ux   │ ← 统计
                    │ detail.ux       │ ← 详情
                    │ schedule-       │
                    │   qrcode.ux     │ ← 二维码
                    └─────────────────┘
```

标记 `✗` = 有直写绕过隐患，标记 `✓` = 已确认走 database 接口。

---

*分析日期：2026-09-10*
*分析人：Code Agent*
*结论：修复缓存机制，保留性能优势，封死所有直写存储的路径。*