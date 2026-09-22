# 假期提醒功能首页缺失分析

## 结论：代码没有丢失，运行时存储中没有对应的假期数据

通过日志分析和代码追踪，假期提醒的代码逻辑完整无误。问题出在**存储层**：`holiday_data` 中没有 `2026-09-25` 的假期记录，导致 `isHoliday` 始终为 `false`，卡片不渲染。

---

## 1. 日志证据

用户操作日志中，每一次 `refreshClasses` 的结果都一样：

```
[refreshClasses] dateStr=2026-09-25, calling reloadHolidayState
[refreshClasses] reloadHolidayState callback, overrideWeekDay=-1
[refreshClasses] after callback, isHoliday=false isWorkday=false holidayReminderOn=true
```

- `overrideWeekDay = -1`：表示 `reloadHolidayState` 未在 `holiday_data` 中找到匹配记录（既不是假期也不是调休）
- `isHoliday = false`：确认没有 holiday 类型的记录
- `holidayReminderOn = true`：开关是开的（正确）

---

## 2. 日期格式一致性验证 ✅

已确认**存储和读取的日期格式一致**，不存在格式不匹配问题：

| 位置 | 代码 | 对 2026年9月25日 的结果 |
|------|------|------------------------|
| **保存** `workday-info.ux` L123-125 | `y + "-" + pad(m) + "-" + pad(d)` | `"2026-09-25"` |
| **读取** `class-list.js` L96 | `getFullYear() + "-" + ("0"+m : m) + "-" + (..)` | `"2026-09-25"` |
| **读取** `day-nav.js` L19-20 | `pad()` 函数（同款零填充） | `"2026-09-25"` |
| **读取** `index.ux` L622 | 三元零填充 | `"2026-09-25"` |

两边都做了零填充（`pad(9)` = `"09"`），格式完全一致。

---

## 3. 数据流完整追踪

```
用户设置假期（workday-info.ux）
  saveEntry()
    → dateToKey(2026, 9, 25) = "2026-09-25"
    → storage.get("holiday_data")     读取已有数据
    → holidayData["2026-09-25"] = { type:"holiday", name:"国庆节", greeting:"..." }
    → storage.set("holiday_data")     写回
    → loadData()                       重新加载列表
    → toast "已保存"                   成功提示

返回首页（index.ux）
  onShow() → resumeRefresh()
    → loadScheduleData(idx)
      → refreshClasses()  (class-list.js)
        → reloadHolidayState("2026-09-25", callback)  (holiday.js)
          → store.getCurrentScheduleIndex()
            → store.getHolidayReminderEnabled(idx)    读开关状态
              → storage.get("holiday_data")            读假期数据
                → holidayData["2026-09-25"] → 查找到 → type==="holiday"
                  → isHoliday=true ✅
                  → callback(-2)
                    → currentClasses = []
                    → $forceUpdate() → 卡片渲染！
```

整个链路逻辑完整，没有断点。

---

## 4. 可能的原因分析

### 原因 A：保存时 storage.get 失败了 ⚠️ 最可疑

`saveEntry` 中 `storage.get` 的 `fail` 回调有一个**严重问题**：

```javascript
fail: function() {
    var holidayData = {}          // ← 创建全新空对象！
    holidayData[dateKey] = {      // ← 只包含当前这一条
        type: "holiday", ...
    }
    storage.set({                 // ← 写入，覆盖所有已有数据
        key: "holiday_data",
        value: JSON.stringify(holidayData),
        ...
    })
}
```

如果 `storage.get("holiday_data")` 读取失败（例如 key 不存在、权限问题），会走到 `fail` 回调，此时：
1. 创建一个**全新的空对象**
2. 只放入当前要保存的这一条记录
3. 写入 storage，**覆盖掉之前所有的假期记录**

这会导致：如果你之前保存过多条假期/调休，某次保存时 storage.get 失败，所有旧数据**全部丢失**，只剩下最后保存的那一条。

**验证方法**：去「节假日与调休」页面，看看列表里是否只有一条记录（而你记得应该有多条）。

### 原因 B：保存后以为成功了但实际失败了

`storage.set` 也有 `fail` 回调（显示 toast "保存失败"），但如果你没有注意到失败提示，可能以为保存成功了。

### 原因 C：日期选错了

可能不小心选了其他日期。去「节假日与调休」页面确认一下列表。

### 原因 D：应用存储被系统清理

部分手机系统会自动清理不常用 app 的存储空间，导致 `holiday_data` 被清空。

---

## 5. 调试日志已添加

已在 `src/pages/index/modules/holiday.js` 的 `reloadHolidayState` 中添加调试日志，下次运行时会输出：

```
[holiday] storage.get holiday_data raw: {...} looking for dateStr: 2026-09-25
[holiday] parsed holidayData keys: [...], dateEntry: {...}
```

这样可以直观看到：
- storage 中 `holiday_data` 的原始内容
- 有哪些日期键
- 当前查找的 `dateStr` 是否存在、值是什么

---

## 6. 建议操作步骤

1. **先去「节假日与调休」页面检查**：看看列表中是否有 2026年9月25日的假期记录
2. **如果没有，重新添加**：注意保存后观察是否弹出"已保存"提示
3. **回到首页查看**：切换日期到 9月25日，观察调试日志输出
4. **如果日志显示 `holidayData keys` 中没有 `2026-09-25`**：说明保存确实失败了，可以在 `saveEntry` 中加更多日志排查

---

## 7. 相关文件

| 文件 | 行号 | 作用 |
|------|------|------|
| `src/pages/index/index.ux` | L100-L103 | 首页假期祝福卡片模板 |
| `src/pages/index/index.ux` | L606-L657 | `initAllModules()` 初始化流程 |
| `src/pages/index/modules/holiday.js` | L1-L72 | 假期状态管理（含新增调试日志） |
| `src/pages/index/modules/class-list.js` | L88-L117 | `refreshClasses()` 回首页刷新 |
| `src/pages/index/modules/day-nav.js` | L47-L64 | `persistDateToHoliday()` 日期切换 |
| `src/pages/workday-info/workday-info.ux` | L119-125 | `pad()` / `dateToKey()` 日期格式化 |
| `src/pages/workday-info/workday-info.ux` | L289-353 | `saveEntry()` 保存逻辑（含 fail 回调问题） |
| `src/data/store.js` | L936-L955 | `get/setHolidayReminderEnabled` 开关存储 |
| `src/pages/schedule-manager/schedule-manager.ux` | L50-L58 | 课表管理器中的开关 UI |

---

## 8. 总结

> **代码逻辑没有问题，也没有因为"没保存"而丢失代码。**
>
> 问题出在**存储数据**：`holiday_data` 中没有 2026-09-25 的假期条目。
>
> 最可能的根因是 `workday-info.ux` 的 `saveEntry` 函数中，`storage.get` 的 `fail` 回调会**覆盖全部已有数据**（只保留当前一条），导致之前添加的假期记录丢失。