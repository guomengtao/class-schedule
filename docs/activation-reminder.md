# 到期激活提醒方案

## 一、未激活方案

### 1. 用户状态定义

用户首次安装手环App后，处于"未激活"状态，系统自动开始7天免费试用。

```
┌─────────────────────────────────────────────────────┐
│                   未激活状态                         │
├─────────────────────────────────────────────────────┤
│  状态标识：not_activated                            │
│  免费试用天数：7天（可配置）                         │
│  计时起点：首次安装时间（installTime）               │
│  当前剩余：实时计算（installTime + 7天 - 现在）     │
└─────────────────────────────────────────────────────┘
```

### 2. 数据存储结构

```javascript
{
  deviceId: 'Aa36',              // 设备唯一ID
  installTime: 1700000000000,    // 首次安装时间戳（计时起点）
  isActivated: false,            // 未激活
  isPermanent: false,
  expireAt: null,                // 尚未设置到期时间
  trialDays: 7,                  // 默认免费天数（从config读取）
}
```

### 3. 首页显示提示

手环首页顶部固定显示免费试用剩余天数，让用户随时了解状态。

| 剩余天数 | 首页显示文案 | 视觉风格 |
| :--- | :--- | :--- |
| 7~2天 | `🔓 免费试用中，剩余 X 天` | 正常字体，灰色/绿色 |
| 1天 | `⚠️ 免费试用即将到期，剩余 1 天` | **橙色/黄色高亮** |
| 0天（到期当天） | `⏰ 今日最后一天免费试用` | **橙色高亮** |
| 已过期 | `🔒 试用已结束，请激活 →` | **红色高亮**，点击跳转激活页面 |

### 4. 7天免费试用判断逻辑

```javascript
function checkTrialStatus() {
  var data = loadUserData()
  if (data.isActivated) return null  // 已激活，不处理试用

  var now = Date.now()
  var elapsedMs = now - data.installTime
  var elapsedDays = elapsedMs / (24 * 60 * 60 * 1000)
  var trialDays = AUTH_CONFIG.DEFAULT_FREE_DAYS  // 从配置读取，默认7

  var remainingDays = Math.ceil(trialDays - elapsedDays)

  if (remainingDays > 0) {
    return {
      status: 'trial_active',
      remainingDays: remainingDays,
      isExpired: false,
      message: '免费试用中，剩余 ' + remainingDays + ' 天'
    }
  } else {
    return {
      status: 'trial_expired',
      remainingDays: 0,
      isExpired: true,
      message: '试用已结束，请激活'
    }
  }
}
```

### 5. 过期后处理

免费试用到期后，App进入 **"未激活锁定模式"**：

| 功能 | 未激活（试用期） | 试用已过期 |
| :--- | :--- | :--- |
| 查看已有课程 | ✅ 完全可用 | ✅ 只读（可查看） |
| 新增/修改课程 | ✅ 完全可用 | ❌ 不可用 |
| 导出数据 | ✅ 完全可用 | ✅ 完全可用 |
| 进入设置 | ✅ 完全可用 | ✅ 完全可用 |
| 点击"激活"按钮 | 进入激活页面 | 进入激活页面 |

---

## 二、快要到期方案

### 1. 用户状态定义

用户已激活付费授权，但授权时间即将结束，处于"即将到期"状态。

```
┌─────────────────────────────────────────────────────┐
│                 快要到期状态                          │
├─────────────────────────────────────────────────────┤
│  状态标识：expiring_soon                            │
│  触发条件：剩余天数 ≤ 3天                           │
│  预警级别：                                        │
│    ● 剩余3天 → 轻度提醒                            │
│    ● 剩余1天 → 中度提醒（颜色变化）                 │
│    ● 剩余0天 → 紧急提醒（到期当天）                 │
└─────────────────────────────────────────────────────┘
```

### 2. 数据存储结构

```javascript
{
  deviceId: 'Aa36',
  isActivated: true,             // 已激活
  isPermanent: false,            // 非永久
  expireAt: 1735689600000,       // 授权到期时间戳
  activatedAt: 1700000000000,    // 激活时间
  lastRemindedAt: null,          // 上次提醒时间（防重复提醒）
}
```

### 3. 首页显示提示

| 剩余天数 | 首页显示文案 | 视觉风格 |
| :--- | :--- | :--- |
| >3天 | `✅ 已激活，剩余 X 天` | 正常字体，灰色/绿色 |
| 3天 | `🔔 授权剩余 3 天，请及时续费` | 蓝色/灰色 |
| 2天 | `🔔 授权剩余 2 天，建议续费` | 黄色 |
| 1天 | `⚠️ 授权即将到期，剩余 1 天` | **橙色高亮** |
| 0天（到期当天） | `⏰ 今日授权到期` | **橙色高亮** |
| 已过期 | `🔒 授权已过期，请续费 →` | **红色高亮** |

### 4. 到期提醒逻辑

在剩余 3 天、1 天、到期当天时分别触发提醒：

```javascript
function checkExpiringStatus() {
  var data = loadUserData()
  if (!data.isActivated || data.isPermanent) return null

  var now = Date.now()
  var remainingMs = data.expireAt - now
  var remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))

  var REMIND_DAYS = [3, 1, 0]

  if (REMIND_DAYS.indexOf(remainingDays) !== -1) {
    var todayKey = Math.floor(now / (24 * 60 * 60 * 1000))
    var lastRemindKey = data.lastRemindedAt
      ? Math.floor(data.lastRemindedAt / (24 * 60 * 60 * 1000))
      : 0
    if (todayKey !== lastRemindKey) {
      triggerRemind(remainingDays)
      data.lastRemindedAt = now
      saveUserData(data)
    }
  }

  if (remainingDays <= 3 && remainingDays > 0) {
    return { status: 'expiring_soon', remainingDays: remainingDays }
  } else if (remainingDays <= 0) {
    return { status: 'expired', remainingDays: 0 }
  }

  return { status: 'active', remainingDays: remainingDays }
}
```

### 5. 提醒方式

| 剩余天数 | 提醒方式 | 触发时机 |
| :--- | :--- | :--- |
| **3天** | 打开App时提示 Toast | 每天第一次打开App时触发 |
| **1天** | 打开App时提示 Toast + 状态栏高亮 | 每天第一次打开App时触发 |
| **0天（到期当天）** | 打开App时提示 Toast + 状态栏高亮 + 震动 | 每天第一次打开App时触发 |

### 6. 过期后处理

| 功能 | 已过期（只读模式） |
| :--- | :--- |
| 查看已有课程 | ✅ 只读（可查看） |
| 新增/修改课程 | ❌ 不可用 |
| 导出数据 | ✅ 完全可用 |
| 点击"续费激活" | 跳转授权页面 |

---

## 三、两种状态对比

| 对比维度 | 未激活（试用期） | 快要到期（付费授权） |
| :--- | :--- | :--- |
| **触发条件** | 首次安装 | 授权剩余 ≤ 3天 |
| **核心提示** | `剩余 X 天试用` | `剩余 X 天到期` |
| **操作建议** | 购买激活 | 续费激活 |
| **过期后** | 锁定，只读 | 锁定，只读 |
| **用户数据** | 保留 | 保留 |
| **过期后提示** | `试用已结束，请激活` | `授权已过期，请续费` |

---

## 四、UI 状态优先级

手环首页顶部同时可能存在多种状态，按以下优先级展示：

```
优先级 1：已过期（最高优先级）
     ├── 试用已过期 → 红色 "🔒 试用已结束，请激活 →"
     └── 授权已过期 → 红色 "🔒 授权已过期，请续费 →"

优先级 2：即将到期（中优先级）
     ├── 授权剩余1天 → 橙色 "⚠️ 授权即将到期，剩余 1 天"
     ├── 授权剩余2-3天 → 黄色 "🔔 授权剩余 X 天，请及时续费"
     └── 免费试用最后1天 → 橙色 "⚠️ 免费试用即将到期"

优先级 3：正常状态（低优先级）
     ├── 授权有效，剩余 >3天 → 绿色 "✅ 已激活，剩余 X 天"
     ├── 免费试用中，剩余 >1天 → 灰色 "🔓 免费试用中，剩余 X 天"
     └── 永久授权 → 绿色 "✅ 已永久激活"

优先级 4：无任何状态 → 不显示（或显示简洁模式）
```

---

## 五、总结

| 场景 | 判断条件 | 首页文案 | 操作入口 |
| :--- | :--- | :--- | :--- |
| **未激活·试用期** | `isActivated=false` 且剩余>0天 | `🔓 免费试用中，剩余 X 天` | 点击→授权页面 |
| **未激活·即将到期** | `isActivated=false` 且剩余≤1天 | `⚠️ 免费试用即将到期` | 点击→授权页面 |
| **未激活·已过期** | `isActivated=false` 且剩余≤0天 | `🔒 试用已结束，请激活 →` | 点击→授权页面 |
| **已激活·即将到期** | `isActivated=true` 且剩余≤3天 | `⚠️ 授权剩余 X 天` | 点击→续费页面 |
| **已激活·已过期** | `isActivated=true` 且剩余≤0天 | `🔒 授权已过期，请续费 →` | 点击→续费页面 |

**核心原则：首页顶部始终显示授权状态，颜色随剩余天数变化（绿→黄→橙→红），用户点击状态条可直接跳转授权/续费页面。**