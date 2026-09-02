# 钉首页功能实现方案分析

## 1. 问题现象

用户点击实验室页面的"钉首页"按钮后，返回首页，首页不显示已钉的页面链接。

## 2. 根因分析

### 2.1 存储模块加载时机问题

`pin-helper.js` 在模块顶层 `require("@system.storage")`：

```javascript
var storage = require("@system.storage")  // 模块加载时执行
```

在快应用环境中，`@system.storage` 在模块初始化阶段可能尚未就绪，导致 `storage` 变量为 `undefined`，后续 `storage.get()` / `storage.set()` 调用静默失败。

### 2.2 数据读写路径不一致

- **写入**：实验室页面通过 `pin-helper.js` 的 `pinPage()` 写入
- **读取**：首页 `index.ux` 的 `loadPinnedPages()` 直接调用 `require("@system.storage")` 读取

两条路径使用不同的 storage 实例，如果模块缓存导致实例不同，可能读到不同状态。

### 2.3 生命周期触发时机

首页在 `onShow` 中调用 `loadPinnedPages()`。在部分快应用运行时中，`router.back()` 返回时可能不触发 `onShow`。

## 3. 解决方案

### 3.1 统一存储访问层

所有存储读写统一通过 `pin-helper.js`，确保使用同一实例：

```
┌──────────────────────────────────────────────────┐
│                  pin-helper.js                     │
│  ┌────────────────────────────────────────────┐   │
│  │  getList(cb)    → storage.get("pinned_pages")  │
│  │  saveList(list) → storage.set("pinned_pages")  │
│  │  pinPage(name, uri)                           │
│  │  isPinned(uri, cb)                            │
│  └────────────────────────────────────────────┘   │
│         ↑ 读写                      ↑ 读写         │
│  ┌──────┴──────┐          ┌────────┴────────┐     │
│  │  实验室页面   │          │   首页 index.ux  │     │
│  │  pinToHome() │          │ loadPinnedPages │     │
│  └─────────────┘          └─────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 3.2 延迟加载 storage

将 `require("@system.storage")` 从模块顶层移到函数内部，确保每次调用时都获取最新实例：

```javascript
// 旧方式（模块顶层）
var storage = require("@system.storage")

// 新方式（函数内部）
function getList(callback) {
  var storage = require("@system.storage")
  storage.get({ key: KEY, ... })
}
```

### 3.3 首页布局：一行显示数量

钉页面链接使用 `flex-wrap: wrap` 自动换行布局。一行显示数量取决于：

| 屏幕宽度 | 每项宽度 | 间隔 | 每行约显示 |
|---------|---------|------|----------|
| 454px (标准手环) | ~80px | 6px | 4-5 个 |
| 390px (小屏) | ~80px | 6px | 3-4 个 |
| 480px (大屏) | ~80px | 6px | 5-6 个 |

CSS 关键样式：
```css
.pinned-row {
  flex: 1;
  flex-direction: row;
  flex-wrap: wrap;         /* 自动换行 */
}

.pinned-item {
  padding: 4px 12px;
  margin: 2px 6px 2px 0;
  border-radius: 8px;
  flex-shrink: 0;          /* 不压缩 */
}
```

每个链接宽度由内容（📌 + 页面名称）决定，自然换行。

## 4. 涉及文件清单

### 4.1 核心模块

| 文件 | 作用 |
|------|------|
| `src/data/pin-helper.js` | 共享工具模块，封装存储读写 |

### 4.2 首页

| 文件 | 修改内容 |
|------|---------|
| `src/pages/index/index.ux` | 模板：钉页面栏 + 水平换行布局；脚本：loadPinnedPages 改用 pin-helper |

### 4.3 实验室页面（已添加钉首页按钮）

| 页面 | 文件路径 | 钉首页名称 |
|------|---------|-----------|
| 功能实验室 | `src/pages/test-area/test-area.ux` | 功能实验室 |
| 完整弹窗 | `src/pages/full-dialog/index.ux` | 完整弹窗 |
| 弹起来测试 | `src/pages/popup-test/index.ux` | 弹起来测试 |
| 弹窗组件测试 | `src/pages/dialog-demo/index.ux` | 弹窗组件测试 |
| 组件化测试 | `src/pages/comp-demo/index.ux` | 组件化测试 |
| 激活码系统 | `src/pages/activation-lab/activation-lab.ux` | 激活码系统 |
| 勾选 Demo | `src/pages/check-demo/check-demo.ux` | 勾选 Demo |
| 手风琴 Demo | `src/pages/accordion-demo/accordion-demo.ux` | 手风琴 Demo |
| 添加课程 Demo | `src/pages/add-course-demo/add-course-demo.ux` | 添加课程 Demo |
| 设备信息 | `src/pages/device-info/device-info.ux` | 设备信息 |
| 震动实验室 | `src/pages/vibration-lab/vibration-lab.ux` | 震动实验室 |
| 二维码生成 | `src/pages/qrcode-generator/qrcode-generator.ux` | 二维码生成 |
| 导出课程表 | `src/pages/schedule-qrcode/schedule-qrcode.ux` | 导出课程表 |
| 课程表管理 | `src/pages/schedule-manager/schedule-manager.ux` | 课程表管理 |

## 5. 验证步骤

1. 打开任意实验室页面
2. 点击右上角"📌钉首页"按钮
3. 看到 Toast 提示"已钉到首页"
4. 返回首页
5. 首页顶部出现钉页面链接栏，水平排列，超出自动换行
6. 点击链接可跳转到对应页面