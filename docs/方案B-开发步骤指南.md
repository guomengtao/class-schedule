# 方案B 开发步骤指南

## 总览：分为 4 个阶段，共 10 步

```
阶段一：基础层（1-2天）      步骤1-2    store.js 新增解锁状态方法
阶段二：组件层（1天）         步骤3      解锁弹窗组件
阶段三：拦截层（1-2天）       步骤4-6    schedule-manager / settings / homepage-settings
阶段四：支付层（1-2周）       步骤7-10   支付对接 + 备份功能 + 激活码
```

---

## 阶段一：基础层（store.js）

### 步骤 1：新增解锁状态读写方法

**文件**：`src/data/store.js`

**改动量**：约 30 行

**为什么从这里开始**：后续所有拦截点都要调用这两个方法，是整个高级解锁系统的基石。

**在 `module.exports` 对象末尾新增**：

```javascript
// 检查是否已解锁高级功能
isPremiumUnlocked: function(callback) {
  storage.get({
    key: "premium_unlocked",
    success: function(data) {
      callback(data === "true")
    },
    fail: function() {
      callback(false)
    }
  })
},

// 设置解锁状态
setPremiumUnlocked: function(callback) {
  storage.set({
    key: "premium_unlocked",
    value: "true",
    success: function() { if (callback) callback(true) },
    fail: function() { if (callback) callback(false) }
  })
}
```

**验证**：无需 UI，后续步骤写拦截点时自然验证。

---

### 步骤 2：新增主题白名单方法

**文件**：`src/data/store.js`

**改动量**：约 15 行

**为什么**：主题切换拦截需要知道哪些主题是免费的。目前在 `THEMES` 对象中 `blue` 是默认主题，但需要显式标记免费主题列表。

**在 `module.exports` 对象中新增**：

```javascript
// 免费主题白名单
FREE_THEMES: ["blue"],

// 检查指定主题是否免费
isFreeTheme: function(themeKey) {
  return themeKey === "blue" || themeKey === "auto"
}
```

**验证**：无需单独验证。

---

## 阶段二：组件层（解锁弹窗）

### 步骤 3：创建 unlock-dialog 通用弹窗组件

**新建文件**：`src/components/unlock-dialog.ux`

**改动量**：约 120 行

**为什么独立成组件**：三个拦截点（多课表、首页设置、主题切换）复用同一个弹窗，避免重复代码。

**设计要点**：
- 接收 `feature` 参数区分触发场景（schedule / homepage / theme / backup）
- 接收 `benefits` 数组展示卖点列表
- 接收 `primaryImage` 指定预览图
- 接收 `cancelText` 自定义取消按钮文案
- 接收 `onSuccess` 解锁成功回调
- 接收 `onPayFail` 支付失败回调

**组件结构**：

```
<template>
  <div class="overlay" style="background-color: rgba(0,0,0,0.6)">
    <div class="dialog" style="background-color: {{ theme.card }}">
      <!-- 标题：根据 feature 动态显示 -->
      <text class="title" style="color: {{ theme.accent }}">{{ title }}</text>

      <!-- 卖点列表 -->
      <div for="{{ benefits }}" class="benefit-item">
        <text class="benefit-text" style="color: {{ theme.text }}">✓ {{ $item }}</text>
      </div>

      <!-- 按钮 -->
      <input type="button" value="立即解锁 (1元)" onclick="doUnlock"
             style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      <input type="button" value="{{ cancelText }}" onclick="doCancel"
             style="background-color: {{ theme.btnSecondary }}; color: {{ theme.btnSecondaryText }}" />
    </div>
  </div>
</template>
```

**验证**：在实验室页面添加一个按钮，手动触发弹窗查看效果。

---

## 阶段三：拦截层（三个页面）

### 拦截优先级排序

| 优先级 | 拦截点 | 用户触达频率 | 开发难度 | 文件 |
|--------|--------|-------------|----------|------|
| 1 高 | 多课表新增 | 低（多数人只用一个课表） | 低 | schedule-manager.ux |
| 2 中 | 主题切换 | 中（探索设置会碰到） | 低 | settings.ux |
| 3 低 | 首页设置 | 中低 | 中 | settings.ux 入口 |

---

### 步骤 4：拦截多课表新增（最简单，先做）

**文件**：`src/pages/schedule-manager/schedule-manager.ux`

**改动量**：约 15 行

**为什么先做这个**：代码改动最小，只需在 `addSchedule()` 方法开头加一个判断。

**改造前**（原始代码）：
```javascript
addSchedule() {
  var name = "课程表" + (this.list.length + 1)
  // ... 直接新增
}
```

**改造后**：
```javascript
addSchedule() {
  var self = this
  store.isPremiumUnlocked(function(unlocked) {
    if (unlocked) {
      self.doAddSchedule()
    } else {
      // 第一套免费，只有已有 >= 1 套时拦截
      if (self.list.length >= 1) {
        self.showUnlockDialog({
          feature: "schedule",
          benefits: ["多课表管理", "数据备份与恢复", "首页自定义", "10套主题"],
          primaryImage: "",
          cancelText: "继续使用标准版"
        })
      } else {
        self.doAddSchedule()
      }
    }
  })
},

doAddSchedule() {
  var name = "课程表" + (this.list.length + 1)
  // ... 原始新增逻辑
}
```

**验证**：
- 免费用户，只有1套课表 → 点击新增 → 弹窗拦截
- 已解锁用户 → 点击新增 → 正常新增
- 免费用户，还没有课表 → 点击新增 → 正常新增第一套

---

### 步骤 5：拦截主题切换

**文件**：`src/pages/settings/settings.ux`

**改动量**：约 10 行

**为什么第二做**：只改 `selectTheme()` 方法开头，改动极小。

**改造前**：
```javascript
selectTheme(themeKey) {
  var self = this
  this.currentThemeKey = themeKey
  store.setTheme(themeKey, function() {
    store.getTheme(function(t) {
      self.theme = t
    })
  })
}
```

**改造后**：
```javascript
selectTheme(themeKey) {
  var self = this

  if (store.isFreeTheme(themeKey)) {
    this.applyTheme(themeKey)
    return
  }

  store.isPremiumUnlocked(function(unlocked) {
    if (unlocked) {
      self.applyTheme(themeKey)
    } else {
      self.showUnlockDialog({
        feature: "theme",
        benefits: ["多课表管理", "数据备份与恢复", "首页自定义", "10套主题"],
        primaryImage: "",
        cancelText: "继续使用标准版"
      })
    }
  })
},

applyTheme(themeKey) {
  var self = this
  this.currentThemeKey = themeKey
  store.setTheme(themeKey, function() {
    store.getTheme(function(t) {
      self.theme = t
    })
  })
}
```

**验证**：
- 免费用户点击深空蓝 → 正常切换（免费主题）
- 免费用户点击跟随系统 → 正常切换（免费）
- 免费用户点击翡翠绿 → 弹窗拦截
- 已解锁用户点击任意主题 → 正常切换

---

### 步骤 6：拦截首页设置入口

**文件**：`src/pages/settings/settings.ux`

**改动量**：约 10 行

**为什么第三做**：拦截的是页面入口（`openHomepageSettings`），不是页面内功能。

**改造前**：
```javascript
openHomepageSettings() {
  router.push({ uri: "/pages/homepage-settings" })
}
```

**改造后**：
```javascript
openHomepageSettings() {
  var self = this
  store.isPremiumUnlocked(function(unlocked) {
    if (unlocked) {
      router.push({ uri: "/pages/homepage-settings" })
    } else {
      self.showUnlockDialog({
        feature: "homepage",
        benefits: ["多课表管理", "数据备份与恢复", "首页自定义", "10套主题"],
        primaryImage: "",
        cancelText: "继续使用标准版"
      })
    }
  })
}
```

**注意**：如果后续想改为"允许进入但开关禁用"模式，只需改成在 `homepage-settings.ux` 的 `onInit` 里拦截，而不是在入口处拦截。但入口拦截更简单，先做这个。

**验证**：
- 免费用户点击首页设置 → 弹窗拦截
- 已解锁用户点击首页设置 → 正常进入

---

### 步骤 6.5（可选）：数据备份功能拦截

**文件**：`src/pages/settings/settings.ux`（在设置页添加备份入口）

**说明**：如果后续实现了数据备份功能，在备份入口处同样拦截：

```javascript
openBackup() {
  var self = this
  store.isPremiumUnlocked(function(unlocked) {
    if (unlocked) {
      router.push({ uri: "/pages/backup" })
    } else {
      self.showUnlockDialog({
        feature: "backup",
        benefits: ["多课表管理", "数据备份与恢复", "首页自定义", "10套主题"],
        primaryImage: "",
        cancelText: "继续使用标准版"
      })
    }
  })
}
```

---

## 阶段四：支付层 + 备份功能

### 步骤 7：激活码输入与校验

**文件**：新建 `src/pages/redeem/redeem.ux`

**改动量**：约 150 行

**为什么先做激活码**：支付 SDK 接入可能耗时较长，激活码方案可以立刻上线收费。

**页面功能**：
- 6位激活码输入框
- 本地校验（简单哈希比对）
- 校验成功 → 调用 `store.setPremiumUnlocked()`
- 校验失败 → 提示"激活码无效"

**同时需要**：
- 一个简单的服务端脚本生成激活码
- 微信小程序/H5 页面展示商品（1元购买激活码）

---

### 步骤 8：小米支付 SDK 接入

**文件**：在 `unlock-dialog.ux` 的 `doUnlock()` 方法中对接

**改动量**：约 50 行

**说明**：
- 支付成功 → `store.setPremiumUnlocked()` → 执行 `onSuccess` 回调
- 支付失败/取消 → 弹出激活码兜底弹窗 → 执行 `onPayFail` 回调

**兜底弹窗**（在 `unlock-dialog.ux` 中实现）：
```
支付遇到问题？
[ 获取激活码 ]  → 跳转微信小程序
[ 稍后再说 ]    → 关闭弹窗
```

---

### 步骤 9：数据备份与恢复功能

**文件**：新建 `src/pages/backup/backup.ux`（或集成到 schedule-manager）

**改动量**：约 200 行

**功能**：
- 导出当前课程表为 JSON 文件
- 从 JSON 文件导入课程表
- 初期用本地存储，后续升级为云端

**为什么放在支付之后**：这个功能需要先有拦截点（步骤 6.5），但功能实现本身不依赖支付，可以并行开发。

---

### 步骤 10：关于页面 + 预览

**文件**：`src/pages/about/about.ux`（或新建）

**改动量**：约 80 行

**内容**：
- 高级功能预览区域（首页自定义置顶，主题缩略图在最后）
- 解锁按钮
- 版本号、联系信息

---

## 文件改动清单总览

| 文件 | 改动类型 | 改动量 | 阶段 | 步骤 |
|------|---------|--------|------|------|
| `src/data/store.js` | 修改 | +45 行 | 一 | 1-2 |
| `src/components/unlock-dialog.ux` | **新建** | ~120 行 | 二 | 3 |
| `src/pages/schedule-manager/schedule-manager.ux` | 修改 | +15 行 | 三 | 4 |
| `src/pages/settings/settings.ux` | 修改 | +25 行 | 三 | 5-6 |
| `src/pages/redeem/redeem.ux` | **新建** | ~150 行 | 四 | 7 |
| `src/pages/backup/backup.ux` | **新建** | ~200 行 | 四 | 9 |
| `src/pages/about/about.ux` | 修改/新建 | ~80 行 | 四 | 10 |
| `src/manifest.json` | 修改 | +3 项路由 | 三/四 | 3/7/9 |

**总改动量**：约 635 行，其中新建文件约 550 行，修改现有文件约 85 行。

---

## 推荐开发顺序（最快可上线路径）

如果想最快上线收费，按以下顺序：

```
步骤1 → 步骤2 → 步骤3 → 步骤4 → 步骤5 → 步骤6 → 步骤7
                                                      ↓
                                              立即可上线收费
                                              （激活码方案）
                                                      ↓
                                        步骤8（支付SDK）→ 步骤9 → 步骤10
```

**第 1-3 天**：步骤 1-3（store 方法 + 弹窗组件）
**第 4-5 天**：步骤 4-6（三个拦截点）
**第 6-7 天**：步骤 7（激活码 + 小程序页面）
**此时已可上线收费** ✅

**第 8-14 天**：步骤 8-10（支付 SDK + 备份 + 关于页面）

---

## 关键注意事项

### 1. 不要改太多文件
所有改动集中在 5 个现有文件 + 3 个新文件，不碰核心课表逻辑（index.ux、add-class.ux 等），零风险。

### 2. 弹窗组件如何挂载到全局
在 `app.ux` 中注册 `unlock-dialog` 组件，所有页面通过 `this.$app.showUnlockDialog()` 调用，避免每个页面都 import 组件。

### 3. 已解锁用户零影响
所有拦截都在 `isPremiumUnlocked` 返回 `false` 时才触发，已解锁用户走原有逻辑，不受任何影响。

### 4. 不要拦截课程编辑
核心卖点（手环本机编辑课程）永远免费，不拦截 `add-class.ux`、`edit-class.ux` 等编辑页面。

### 5. 不要拦截课程数量
第一套课表无课程数量限制，不拦截 `insertCourse` 等数据库方法。