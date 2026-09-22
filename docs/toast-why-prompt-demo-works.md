# Toast 弹窗：为什么体验页有效，其他页面无效？

## 问题描述

在项目中，`prompt-demo` 页面（弹窗演示页）的所有 Toast 弹窗都能正常弹出，但我们在其他 8 个页面添加的 `prompt.showToast()` 调用全部失效。本文从代码层面逐行对比，分析根本原因。

---

## 1. 有效页面：prompt-demo.ux 的完整实现

### 1.1 页面结构

[prompt-demo.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/prompt-demo/prompt-demo.ux) 是一个独立的 Toast 演示页面，包含三类演示：

| 功能区 | 按钮数量 | 说明 |
|--------|:------:|------|
| Toast 基础演示 | 4 个 | 默认、短、长、超长 duration |
| 自定义 Toast | 6 个消息 + 4 个时长 | 内容 + 时长自由组合 |
| 更多场景演示 | 6 个 | 加载中、剪贴板、密码错误等 |

### 1.2 核心代码（完整 import 区）

```javascript
// prompt-demo.ux — 第 54-56 行
import router from "@system.router"
import prompt from "@system.prompt"    // ← 关键！导入了 prompt 模块
const store = require("../../data/store.js")
```

### 1.3 Toast 调用方式

```javascript
// 基础 Toast — 第 97-134 行
showDefaultToast() {
    prompt.showToast({                     // ← 使用导入的 prompt 对象
        message: "这是一条默认 Toast 提示（1500ms）",
        duration: 1500
    })
}

showCustomToast(index) {
    var msg = CUSTOM_MESSAGES[index] || "未知消息"
    prompt.showToast({                     // ← 同上
        message: msg,
        duration: this.selectedDuration
    })
}
```

### 1.4 为什么有效？

整个调用链路完整且正确：

```
import prompt from "@system.prompt"
     │
     ▼
prompt.showToast({ message: "...", duration: 1500 })
     │
     ▼
Vela JS 框架 → HarmonyOS 原生 Toast 组件 → 屏幕上弹出提示
```

核心：**`prompt` 对象是通过 `import` 显式绑定到 `@system.prompt` 模块的，框架知道该调用哪个原生能力。**

---

## 2. 无效页面：以 detail.ux 为例

### 2.1 页面 import 区

```javascript
// detail.ux — 第 120-122 行
import router from "@system.router"
// ❌ 缺少：import prompt from "@system.prompt"
const store = require("../../data/store.js")
const database = require("../../data/database.js")
```

### 2.2 Toast 调用方式

```javascript
// detail.ux — 第 518-521 行
database.updateCourse(updatedCourse, function() {
    prompt.showToast({ message: "课程已更新" })   // ← 调用失败！
    router.back()
})
```

### 2.3 为什么无效？

调用链路断裂：

```
prompt.showToast({ message: "课程已更新" })
     │
     ▼
prompt === undefined   （未 import，变量不存在）
     │
     ▼
Vela JS 框架静默忽略 undefined 上的方法调用
     │
     ▼
❌ 无任何输出，无报错，无 Toast 弹窗
```

核心：**`prompt` 变量未定义，`prompt.showToast()` 等价于 `undefined.showToast()`，Vela JS 框架静默处理，不报错也不执行。**

---

## 3. 逐页对比：import 差异

### 3.1 有效页面（2 个）

| 文件 | import 行 | `prompt` 导入 |
|------|----------|:--:|
| [prompt-demo.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/prompt-demo/prompt-demo.ux#L54) | `import prompt from "@system.prompt"` | ✅ |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L25) | `import prompt from "@system.prompt"` | ✅ |

### 3.2 无效页面（8 个）

| 文件 | 现有 import | `prompt` 导入 |
|------|------------|:--:|
| [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L120) | `import router from "@system.router"` | ❌ |
| [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L114) | `import router from "@system.router"` | ❌ |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L82) | `import router from "@system.router"` | ❌ |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L59) | `import router from "@system.router"` | ❌ |
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L58) | `import router from "@system.router"` | ❌ |
| [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L145) | `import router from "@system.router"` | ❌ |
| [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux#L22) | `import router from "@system.router"` | ❌ |
| [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L95) | `import router from "@system.router"` | ❌ |

---

## 4. 深层次分析：Vela JS 模块系统

### 4.1 框架设计原则

Vela JS 是 HarmonyOS 快应用框架，采用**显式模块导入**设计：

```
┌─────────────────────────────────────────────────┐
│                  Vela JS 页面                     │
│                                                   │
│  import router from "@system.router"    ← 显式引入 │
│  import prompt from "@system.prompt"    ← 显式引入 │
│  import vibrator from "@system.vibrator" ← 显式引入 │
│                                                   │
│  所有系统能力通过 @system.xxx 模块暴露              │
│  不存在全局 window.xxx 对象                        │
└─────────────────────────────────────────────────┘
```

### 4.2 为什么 `import router` 可以，`import prompt` 不行？

这与代码无关，而是**我们在写代码时遗忘了 import**。对比：

| 系统能力 | 有效页面 | 无效页面 |
|----------|:------:|:------:|
| `router` | `import router from "@system.router"` | `import router from "@system.router"` |
| `prompt` | `import prompt from "@system.prompt"` | **❌ 缺失** |
| `vibrator` | `import vibrator from "@system.vibrator"` | `import vibrator from "@system.vibrator"` |

**结论**：无效页面只导入了 `router` 和 `vibrator`，但没有导入 `prompt`。这是我们在添加 Toast 代码时遗漏的关键步骤。

### 4.3 框架的静默失败机制

```javascript
// 当 prompt 未 import 时：
prompt.showToast({ message: "hello" })

// 等价于：
undefined.showToast({ message: "hello" })

// Vela JS 的处理方式：
// 1. 不在控制台输出任何错误
// 2. 不抛出异常
// 3. 不中断后续代码执行
// 4. 静默跳过，用户完全无感知
```

这种设计导致问题难以排查——代码看起来完全正确，但就是不生效。

### 4.4 为什么没有报错？

在浏览器环境中，调用 `undefined.method()` 会抛出 `TypeError: Cannot read property of undefined`。但在 Vela JS 框架中：

1. 框架运行在受限的 JavaScript 引擎上（HarmonyOS 快应用 Runtime）
2. 为了用户体验，框架对未导入模块的调用做了**容错处理**
3. 不会因为一个 Toast 弹窗失败而崩溃整个页面
4. 代价是开发者无法通过报错发现问题

---

## 5. 对比总结

| 维度 | prompt-demo.ux | 其他 8 个页面 |
|------|:---:|:---:|
| `import prompt` | ✅ 有 | ❌ 无 |
| `prompt.showToast()` 调用 | 正确 | 正确 |
| 调用时 `prompt` 的值 | `@system.prompt` 模块实例 | `undefined` |
| 框架响应 | 调用原生 Toast API | 静默忽略 |
| 用户看到的效果 | ✅ 弹窗出现 | ❌ 无任何反应 |
| 控制台输出 | 无异常 | 无异常（静默失败） |

---

## 6. 修复方案

只需在每个无效页面的 `<script>` 标签内的 import 区域，添加一行：

```javascript
import prompt from "@system.prompt"
```

### 标准 import 模式（所有页面统一）

```javascript
import router from "@system.router"
import prompt from "@system.prompt"    // ← 添加这一行
// ... 其他 import ...
```

### 项目中的参考标准

[gen-pages.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/gen-pages.js#L37) 自动生成脚本已经包含了这一行，说明这是项目认可的规范：

```javascript
'import prompt from "@system.prompt"\n'
```

---

## 7. 经验教训

1. **Vela JS 不是浏览器环境**：没有 `window` 全局对象，所有系统能力必须显式 import
2. **静默失败是双刃剑**：用户体验好（不崩溃），但开发调试困难（无报错）
3. **写代码前先看 import**：调用任何 `@system.xxx` 模块前，确认已 import
4. **参考已有代码**：`course-manager.ux` 是唯一手动编写且正确使用 `prompt` 的页面，可作为范本
5. **自动化检查**：建议在 `gen-pages.js` 中增加对 `prompt.showToast` 调用的 import 检查