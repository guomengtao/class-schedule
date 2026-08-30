# Toast 弹窗全部失效根因分析

## 问题现象

在以下 8 个文件中添加了 `prompt.showToast()` 调用，但运行时**没有任何弹窗出现**：

| 文件 | 调用 `prompt.showToast` 的行数 |
|------|:--:|
| detail.ux | 2 处 |
| add-course.ux | 1 处 |
| index.ux | 1 处 |
| reset-data.ux | 4 处 |
| schedule-manager.ux | 4 处 |
| settings.ux | 1 处 |
| nickname-edit.ux | 1 处 |
| vibration-lab.ux | 2 处 |

---

## 根因：缺少 `import prompt from "@system.prompt"`

### 技术背景

在 Vela JS (HarmonyOS QuickApp) 框架中，`prompt` **不是全局对象**，必须通过 ES module import 显式引入：

```javascript
import prompt from "@system.prompt"
```

### 证据对比

**能正常弹窗的页面**（有 import）：

| 文件 | import 行 |
|------|-----------|
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L25) | `import prompt from "@system.prompt"` |
| [prompt-demo.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/prompt-demo/prompt-demo.ux#L54) | `import prompt from "@system.prompt"` |

**弹窗失效的页面**（缺少 import）：

| 文件 | 现有 import | 缺少 |
|------|------------|:--:|
| [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L120) | `import router from "@system.router"` | ❌ prompt |
| [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L114) | `import router from "@system.router"` | ❌ prompt |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L82) | `import router from "@system.router"` | ❌ prompt |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L59) | `import router from "@system.router"` | ❌ prompt |
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L58) | `import router from "@system.router"` | ❌ prompt |
| [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L145) | `import router from "@system.router"` | ❌ prompt |
| [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux#L22) | `import router from "@system.router"` | ❌ prompt |
| [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L95) | `import router from "@system.router"` | ❌ prompt |

---

## 为什么 `prompt` 不能直接使用？

### 错误认知

在浏览器环境和部分框架中，`prompt` 是全局对象（如 `window.prompt`），可以直接调用。但在 Vela JS 框架中：

1. **Vela JS 是 HarmonyOS 轻量级快应用框架**，基于 JavaScript 子集
2. 所有系统能力（router、prompt、vibrator、storage 等）都通过 `@system.xxx` 模块暴露
3. **必须显式 import** 才能使用，不存在全局 `prompt` 对象
4. 未 import 时调用 `prompt.showToast()` 会静默失败（不报错，也不执行）

### 项目中的标准模式

[gen-pages.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/gen-pages.js#L37) 脚本在生成共享页面时会自动注入：

```javascript
'import prompt from "@system.prompt"\n'
```

但手动编写的页面需要手动添加这一行。

---

## 修复方案

在每个缺少 import 的文件中，在 `import router from "@system.router"` 之后添加一行：

```javascript
import prompt from "@system.prompt"
```

### 需要修改的 8 个文件

| 文件 | 插入位置 | 插入内容 |
|------|----------|----------|
| [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L120) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L114) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L82) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L59) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L58) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L145) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux#L22) | `import router` 之后 | `import prompt from "@system.prompt"` |
| [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L95) | `import router` 之后 | `import prompt from "@system.prompt"` |

> **注意**：[course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L25) 已有 `import prompt from "@system.prompt"`，无需修改。

---

## 影响范围

- **受影响 Toast 数量**：16 处（全部新增的 Toast 调用）
- **受影响文件**：8 个
- **修复工作量**：每个文件添加 1 行 import，共 8 行代码

---

## 经验教训

在 Vela JS 框架中开发时：
1. 使用任何 `@system.xxx` 模块前，必须先确认是否已 import
2. 不能用浏览器环境的全局对象思维来写 Vela JS 代码
3. 参考已有代码（如 `course-manager.ux`）的 import 模式
4. `gen-pages.js` 脚本是自动页面 import 的标准参考