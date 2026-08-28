# 设备信息页面 - 开发方案

## 概述

在设置页面增加"设备信息"入口，点击进入设备信息页面。该页面调用 Xiaomi Vela JS `@system.device` API，展示设备的品牌、型号、系统版本、屏幕参数、存储空间等完整信息。

---

## 页面结构

```
settings (设置)
├── 新增: "设备信息"行 → 跳转至 device-info 页面
│
device-info (设备信息) ← 新建页面
├── header: 返回按钮 + 标题
├── section: 设备基本信息 (品牌/制造商/型号/代号)
├── section: 系统信息 (操作系统/版本/平台版本/API Level)
├── section: 屏幕信息 (宽/高/密度/形状)
├── section: 设备标识 (设备ID/序列号)
├── section: 存储信息 (总空间/可用空间)
└── section: 地区与语言 (语言/地区/设备类型)
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/settings/settings.ux` | 修改 | 添加"设备信息"入口行 |
| `src/pages/device-info/device-info.ux` | **新建** | 设备信息页面（单文件组件） |
| `src/manifest.json` | 修改 | 注册 device-info 页面路由 + 添加权限 |

---

## API 参考

### 导入模块

```javascript
import device from '@system.device'
// 或
const device = require('@system.device')
```

### device.getInfo(OBJECT) — 获取设备信息

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| success | Function | 否 | 成功回调 |
| fail | Function | 否 | 失败回调 |
| complete | Function | 否 | 执行结束后的回调 |

**success 返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| brand | string | 设备品牌 |
| manufacturer | string | 设备生产商 |
| model | string | 设备型号 |
| product | string | 设备代号 |
| osType | string | 操作系统名称 |
| osVersionName | string | 操作系统版本名称 |
| osVersionCode | number | 操作系统版本号 |
| platformVersionName | string | 运行平台版本名称 |
| platformVersionCode | number | 运行平台版本号 |
| language | string | 系统语言 |
| region | string | 系统地区 |
| APILevel (2+) | number | 框架 API 版本 |
| screenWidth | number | 屏幕宽 |
| screenHeight | number | 屏幕高 |
| screenDensity (3+) | number | 屏幕密度（DPR = 设备 PPI / 160） |
| screenShape | string | 屏幕形状：rect / circle / pill-shaped(3+) |
| deviceType (2+) | string | 设备类型：watch / band / smartspeaker |

### device.getDeviceId(OBJECT) — 获取设备唯一标识

**权限要求：** `hapjs.permission.DEVICE_INFO`

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| success | Function | 否 | 成功回调 |
| fail | Function | 否 | 失败回调 |
| complete | Function | 否 | 执行结束后的回调 |

**success 返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| deviceId | string | 设备唯一标识 |

### device.getSerial(OBJECT) — 获取设备序列号

**权限要求：** `hapjs.permission.DEVICE_INFO`

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| success | Function | 否 | 成功回调 |
| fail | Function | 否 | 失败回调 |
| complete | Function | 否 | 执行结束后的回调 |

**success 返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| serial | string | 设备序列号 |

### device.getTotalStorage(OBJECT) — 获取存储空间总大小

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| success | Function | 否 | 成功回调 |
| fail | Function | 否 | 失败回调 |
| complete | Function | 否 | 执行结束后的回调 |

**success 返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| totalStorage | number | 存储空间总大小，单位 Byte |

### device.getAvailableStorage(OBJECT) — 获取存储空间可用大小

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| success | Function | 否 | 成功回调 |
| fail | Function | 否 | 失败回调 |
| complete | Function | 否 | 执行结束后的回调 |

**success 返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| availableStorage | number | 存储空间可用大小，单位 Byte |

---

## 实施步骤

### 步骤 1：注册路由 & 添加权限

**文件**: [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json)

1. 在 `router.pages` 中添加：

```json
"pages/device-info": {
  "component": "device-info"
}
```

2. 在 `permissions` 中添加设备信息权限（用于 `getDeviceId` 和 `getSerial`）：

```json
{
  "permissions": [
    { "name": "hapjs.permission.DEVICE_INFO" }
  ]
}
```

> **注意**：`system.device` 已在 `features` 中声明，无需重复添加。

### 步骤 2：在设置页添加入口

**文件**: [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux)

在设置页 `<script>` 的 `openNicknameEdit()` 方法附近添加跳转方法：

```javascript
openDeviceInfo() {
  router.push({ uri: "/pages/device-info" })
}
```

在模板中昵称区域下方添加入口行（参考昵称行的样式）：

```html
<div class="nickname-section" onclick="openDeviceInfo" style="background-color: {{ theme.card }}">
  <text class="nickname-label" style="color: {{ theme.text }}">设备信息</text>
  <div class="nickname-value-row">
    <text class="nickname-placeholder" style="color: {{ theme.textMuted }}">查看详情</text>
    <text class="nickname-arrow" style="color: {{ theme.textMuted }}">›</text>
  </div>
</div>
```

### 步骤 3：创建设备信息页面

**文件**: [device-info.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/device-info/device-info.ux)（新建）

> **注意**：本项目使用单文件 `.ux` 组件（template + script + style 合并在一个文件中）。

#### 3.1 页面模板结构

```html
<template>
  <div class="device-info-page" style="background-color: {{ theme.bg }}">
    <div class="back-header">
      <input class="back-btn" type="button" value="◀ 返回" onclick="goBack"
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="header-title" style="color: {{ theme.text }}">设备信息</text>
    </div>

    <div class="content-scroll">
      <!-- 加载状态 -->
      <div class="loading-section" if="{{ loading }}" style="background-color: {{ theme.card }}">
        <text class="loading-text" style="color: {{ theme.textMuted }}">正在获取设备信息...</text>
      </div>

      <!-- 设备基本信息 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">设备基本信息</text>
        <div class="info-row" for="{{ basicInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">系统信息</text>
        <div class="info-row" for="{{ systemInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 屏幕信息 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">屏幕信息</text>
        <div class="info-row" for="{{ screenInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 设备标识 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">设备标识</text>
        <div class="info-row" for="{{ deviceIdInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 存储信息 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">存储信息</text>
        <div class="info-row" for="{{ storageInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 地区与语言 -->
      <div class="info-section" if="{{ !loading }}" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">地区与语言</text>
        <div class="info-row" for="{{ localeInfo }}">
          <text class="info-label" style="color: {{ theme.textSecondary }}">{{ $item.label }}</text>
          <text class="info-value" style="color: {{ theme.text }}">{{ $item.value || '未知' }}</text>
        </div>
      </div>

      <!-- 错误提示 -->
      <div class="error-section" if="{{ errorMsg }}" style="background-color: {{ theme.card }}">
        <text class="error-text" style="color: #e74c3c">{{ errorMsg }}</text>
        <input class="retry-btn" type="button" value="重试" onclick="fetchDeviceInfo"
               style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      </div>
    </div>
  </div>
</template>
```

#### 3.2 脚本逻辑

```javascript
<script>
import router from "@system.router"
const device = require("@system.device")
const store = require("../../data/store.js")

export default {
  data: {
    theme: {},
    loading: true,
    errorMsg: "",
    basicInfo: [],
    systemInfo: [],
    screenInfo: [],
    deviceIdInfo: [],
    storageInfo: [],
    localeInfo: []
  },

  onInit() {
    this.theme = store.getTheme()
    this.fetchDeviceInfo()
  },

  fetchDeviceInfo() {
    this.loading = true
    this.errorMsg = ""

    device.getInfo({
      success: (ret) => {
        this.basicInfo = [
          { label: "品牌", value: ret.brand },
          { label: "制造商", value: ret.manufacturer },
          { label: "型号", value: ret.model },
          { label: "代号", value: ret.product }
        ]
        this.systemInfo = [
          { label: "操作系统", value: ret.osType },
          { label: "系统版本", value: ret.osVersionName },
          { label: "系统版本号", value: ret.osVersionCode },
          { label: "平台版本", value: ret.platformVersionName },
          { label: "平台版本号", value: ret.platformVersionCode },
          { label: "API Level", value: ret.APILevel }
        ]
        this.screenInfo = [
          { label: "屏幕宽度", value: ret.screenWidth ? ret.screenWidth + "px" : "" },
          { label: "屏幕高度", value: ret.screenHeight ? ret.screenHeight + "px" : "" },
          { label: "屏幕密度", value: ret.screenDensity },
          { label: "屏幕形状", value: this.screenShapeMap[ret.screenShape] || ret.screenShape }
        ]
        this.localeInfo = [
          { label: "系统语言", value: ret.language },
          { label: "系统地区", value: ret.region },
          { label: "设备类型", value: this.deviceTypeMap[ret.deviceType] || ret.deviceType }
        ]
        this.loading = false
      },
      fail: (data, code) => {
        this.errorMsg = "获取设备信息失败，错误码：" + code
        this.loading = false
      }
    })

    device.getDeviceId({
      success: (data) => {
        this.deviceIdInfo = [
          { label: "设备ID", value: data.deviceId }
        ]
      },
      fail: (data, code) => {
        this.deviceIdInfo = [
          { label: "设备ID", value: "获取失败(" + code + ")" }
        ]
      }
    })

    device.getSerial({
      success: (data) => {
        this.deviceIdInfo.push({ label: "序列号", value: data.serial })
      },
      fail: (data, code) => {
        this.deviceIdInfo.push({ label: "序列号", value: "获取失败(" + code + ")" })
      }
    })

    device.getTotalStorage({
      success: (data) => {
        this.storageInfo = [
          { label: "总存储空间", value: this.formatStorage(data.totalStorage) }
        ]
      },
      fail: () => {
        this.storageInfo = [
          { label: "总存储空间", value: "获取失败" }
        ]
      }
    })

    device.getAvailableStorage({
      success: (data) => {
        this.storageInfo.push({ label: "可用存储空间", value: this.formatStorage(data.availableStorage) })
      },
      fail: () => {
        this.storageInfo.push({ label: "可用存储空间", value: "获取失败" })
      }
    })
  },

  formatStorage(bytes) {
    if (bytes == null) return "未知"
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB"
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB"
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB"
    return bytes + " B"
  },

  screenShapeMap: {
    "rect": "方形屏",
    "circle": "圆形屏",
    "pill-shaped": "胶囊形屏"
  },

  deviceTypeMap: {
    "watch": "手表",
    "band": "手环",
    "smartspeaker": "智能音箱"
  },

  goBack() {
    router.back()
  }
}
</script>
```

#### 3.3 样式

```css
<style>
.device-info-page {
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.back-header {
  width: 100%;
  padding: 12px 16px;
  flex-direction: row;
  align-items: center;
}

.back-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 24px;
  border: none;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  margin-right: 40px;
}

.content-scroll {
  flex: 1;
  padding: 0 16px 16px;
  overflow-y: scroll;
}

.info-section {
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 10px;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

.info-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-label {
  font-size: 22px;
  flex: 0 0 auto;
}

.info-value {
  font-size: 22px;
  flex: 1;
  text-align: right;
  margin-left: 12px;
}

.loading-section {
  margin-bottom: 12px;
  padding: 40px 16px;
  border-radius: 10px;
  align-items: center;
}

.loading-text {
  font-size: 24px;
}

.error-section {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 10px;
  align-items: center;
}

.error-text {
  font-size: 22px;
  text-align: center;
  margin-bottom: 12px;
}

.retry-btn {
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 22px;
  border: none;
}
</style>
```

---

## 数据流

```
settings.ux                     device-info.ux
    │                                 │
    ├─ 点击"设备信息" ─────────────────►│
    │                                 │
    │                           onInit() → store.getTheme()
    │                                 │
    │                           fetchDeviceInfo()
    │                                 │
    │                      ┌──────────┼──────────┬──────────────┬──────────────┐
    │                      │          │          │              │              │
    │                  getInfo()  getDeviceId() getSerial() getTotalStorage() getAvailableStorage()
    │                      │          │          │              │              │
    │                      ▼          ▼          ▼              ▼              ▼
    │                  basicInfo  deviceIdInfo  deviceIdInfo  storageInfo    storageInfo
    │                  systemInfo              (追加 serial)  (追加 available)
    │                  screenInfo
    │                  localeInfo
    │                      │
    │                      ▼
    │                  loading = false → 渲染数据
```

---

## 开发量预估

| 维度 | 评估 |
|------|------|
| 新建文件 | 1 个 (`device-info.ux`) |
| 修改文件 | 2 个 (`settings.ux`, `manifest.json`) |
| 代码量 | 约 230 行 |
| 实现难度 | ⭐⭐☆☆☆ |
| 第三方依赖 | 无（仅 Xiaomi Vela 系统 API） |