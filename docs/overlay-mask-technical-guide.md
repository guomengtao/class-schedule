# 弹窗遮罩实现技术路径

## 概述

为课程表应用实现弹窗遮罩功能，用于非高级会员时弹出升级提醒。经过多次迭代，最终确定了两套方案并行的策略。

## 迭代历程

### 第一阶段：组件化方案（premium-overlay）

**思路**：创建独立的 `premium-overlay` 组件，封装遮罩逻辑，在数据备份、首页设置等页面通过 `<import>` 引用。

**遇到的问题**：

| 问题 | 现象 | 原因 |
|------|------|------|
| 遮罩不渲染 | 调用 `show()` 后看不见遮罩 | `if="{{ visible }}"` 条件渲染，组件内数据变化不触发框架重渲染 |
| 定位异常 | 遮罩位置偏移 | `position: absolute` 在子组件中相对于组件根节点定位，而非页面 |
| 层级不够 | 遮罩被其他元素遮挡 | 缺少 `z-index` |

**尝试的修复**：

1. `if` 改为 `show` — 仍不生效，组件跨层级通信问题
2. `absolute` 改为 `fixed` — 定位正确但 flex 居中失效
3. 增加 `z-index: 1000` — 层级问题解决

**最终结论**：在当前框架（快应用/轻应用）中，子组件通过外部模块调用的方式控制 `show` 属性存在渲染时序问题，组件化方案不可靠。

### 第二阶段：内联方案（overlay-demo 方案一）

**思路**：不创建独立组件，将遮罩 HTML 直接写在目标页面内，用 `show="{{ variable }}"` 控制显示。

**关键代码**：

```html
<!-- 遮罩层直接写在页面模板内 -->
<div class="overlay-modal" show="{{ showDialog }}" onclick="hideOverlay">
  <div class="modal-card" style="background-color: {{ theme.card }}" onclick="stopBubble">
    <text class="modal-title" style="color: {{ theme.accent }}">解锁高级功能</text>
    <text class="modal-desc" style="color: {{ theme.textSecondary }}">一次性解锁，永久使用全部高级功能</text>
    <div class="benefit-list">
      <text class="benefit-item" style="color: {{ theme.text }}">✓ 多课表管理</text>
      <text class="benefit-item" style="color: {{ theme.text }}">✓ 数据备份与恢复</text>
      <text class="benefit-item" style="color: {{ theme.text }}">✓ 首页自定义</text>
      <text class="benefit-item" style="color: {{ theme.text }}">✓ 多套主题</text>
    </div>
    <input class="modal-btn-primary" type="button" value="立即解锁" onclick="hideOverlay" />
    <input class="modal-btn-secondary" type="button" value="暂不需要" onclick="hideOverlay" />
  </div>
</div>
```

```javascript
// 页面脚本
export default {
  private: {
    showDialog: false
  },

  doShow() {
    this.showDialog = true   // 同一页面内 set，框架立即响应
  },

  hideOverlay() {
    this.showDialog = false
  },

  stopBubble() {
    // 空函数，阻止点击卡片时冒泡到遮罩层导致关闭
  }
}
```

**CSS 关键点**：

```css
.overlay-modal {
  position: absolute;      /* 相对于页面 .page 定位，确保 flex 居中生效 */
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.15);  /* 半透明背景形成遮罩效果 */
  flex-direction: column;
  justify-content: center;  /* 垂直居中 */
  align-items: center;      /* 水平居中 */
}

.modal-card {
  width: 80%;
  border-radius: 16px;
  padding: 24px 20px;
  flex-direction: column;
  align-items: center;
}
```

**为什么 `absolute` 而非 `fixed`**：在当前框架中，`position: fixed` 与 `justify-content: center` 组合时 flex 居中失效，`absolute` 正常工作。

## 最终架构

```
┌─────────────────────────────────────────────┐
│  page (.page, position: relative/默认)       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  页面内容（按钮、文字等）              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─ overlay-modal (absolute, 100%x100%) ──┐│
│  │ 背景: rgba(0,0,0,0.15) 半透明遮罩      ││
│  │ justify-content: center                 ││
│  │ align-items: center                     ││
│  │                                          ││
│  │  ┌── modal-card (80%宽) ──────────────┐ ││
│  │  │  标题、描述、功能列表、按钮        │ ││
│  │  │  onclick="stopBubble" 阻止关闭     │ ││
│  │  └────────────────────────────────────┘ ││
│  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## 交互流程

```
用户点击按钮
    │
    ▼
doShow() → this.showDialog = true
    │
    ▼
框架检测 show="{{ showDialog }}" 变化
    │
    ▼
overlay-modal 渲染显示
    │
    ├── 点击遮罩背景 → hideOverlay() → showDialog = false → 关闭
    │
    └── 点击 modal-card → stopBubble() → 阻止冒泡，不关闭
```

## 复用方式

如需在其他页面（如数据备份、首页设置）添加遮罩弹窗，直接复制以下两段到目标页面：

1. **模板**：`<div class="overlay-modal" show="{{ showDialog }}" ...>` 整个遮罩结构
2. **脚本**：`showDialog`、`doShow`、`hideOverlay`、`stopBubble` 四个方法
3. **样式**：`.overlay-modal`、`.modal-card`、`.modal-title` 等 CSS 类

## 涉及的页面

| 页面 | 路径 | 遮罩方式 |
|------|------|----------|
| overlay-demo | `src/pages/overlay-demo/` | 内联（方案一/二/三） |
| overlay-test | `src/pages/overlay-test/` | 内联（方案一） |
| premium-test | `src/pages/premium-test/` | 组件调用测试 |
| backup-restore | `src/pages/backup-restore/` | 组件引用（待迁移为内联） |

## 心得总结

1. **组件通信不可靠时，优先用内联**：在轻量框架中，页面内 `show` 绑定比跨组件调用更可靠
2. **`absolute` 优于 `fixed`**：在当前框架中，`absolute` 配合 flex 居中表现一致
3. **`stopBubble` 是必要的**：点击弹窗卡片内部不应关闭弹窗，需要空函数阻止事件冒泡
4. **`show` 优于 `if`**：`show` 是显示/隐藏切换，`if` 是销毁/重建，弹窗场景用 `show` 更高效