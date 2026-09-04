# Xiaomi Vela 快应用自定义弹窗/遮罩层实现方案

## 背景

在 [xiaomi-quickapp-overlay-bug-analysis.md](./xiaomi-quickapp-overlay-bug-analysis.md) 中分析了当前 `unlock-dialog.ux` 弹窗在小米手环上不工作的两个问题：
1. 遮罩层跑到页面下面（`position: fixed` 不生效）
2. 没有透明效果（`rgba()` 在内联 style 中可能不生效）

经过对 Vela JS 应用框架官方文档的深度调研，确认了以下关键事实，并整理出可用的实现方案。

---

## Vela 平台 CSS/组件能力确认

### 支持的能力

| 能力 | 支持情况 | 说明 |
|------|:--:|------|
| `position: absolute` | ✅ | 离开文档流，相对于最近的定位祖先定位 |
| `position: relative` | ✅ | 相对定位 |
| `rgba()` 颜色格式 | ✅ | 官方文档多处使用 `rgba(0,0,0,0.54)` 等 |
| `opacity` 属性 | ✅ | 在通用样式列表中 |
| `<stack>` 组件 | ✅ | 层叠容器，子组件按书写顺序堆叠，后写的覆盖前写的 |
| `display` 属性 | ✅ | 支持 `flex` 和 `none` |
| `visibility` 属性 | ✅ | 支持 `visible` 和 `hidden` |
| `left` / `top` / `right` / `bottom` | ✅ | **仅支持 px 单位** |
| `width` / `height` 百分比 | ✅ | 支持 `100%` 等百分比值 |
| `if` 指令 | ✅ | 条件渲染 |
| `show` 指令 | ✅ | 显示/隐藏切换 |
| `flex` 布局 | ✅ | `justify-content`、`align-items` 均支持 |

### 不支持的能力

| 能力 | 支持情况 | 替代方案 |
|------|:--:|------|
| `position: fixed` | ❌ | 用 `position: absolute` + `<stack>` 替代 |
| `z-index` | ❌ | 用 `<stack>` 子组件书写顺序控制层级 |
| `left`/`top` 百分比 | ❌ | 用 `justify-content: center` + `align-items: center` 居中 |
| `transition` 动画 | ❌ | 无过渡动画，弹窗直接出现/消失 |
| `prompt.showDialog` | ❌ | 无系统弹窗 API，需自行实现 |

---

## 核心原理：`<stack>` + `position: absolute` 替代 `position: fixed`

### 为什么不用 `position: fixed`

手机快应用自定义弹窗的标准写法是 `position: fixed` 全屏覆盖，但 Vela 的 `position` 仅支持 `absolute` 和 `relative`。当 `position: fixed` 不被识别时，元素回退为 `static`，出现在正常文档流底部。

### 替代方案：`<stack>` 层叠容器

`<stack>` 是 Vela 提供的层叠布局容器。它的子组件按照书写顺序依次堆叠，**后写的子组件覆盖在前写的子组件之上**。这天然替代了 `z-index` 的层级控制。

```html
<stack>
  <div class="layer1">最底层</div>
  <div class="layer2">覆盖 layer1</div>
  <div class="layer3">覆盖 layer1 和 layer2（最顶层）</div>
</stack>
```

### 弹窗实现结构

```
<stack>                          ← 根容器，层叠布局
├── <div class="page-content">   ← ① 页面正常内容（底层）
│   └── ...页面内容...
├── <div class="dialog-overlay"> ← ② 弹窗遮罩层（覆盖在页面之上）
│   └── <div class="dialog-box"> ← ③ 弹窗内容（覆盖在遮罩之上）
│       └── ...弹窗内容...
</stack>
```

---

## 方案一：`<stack>` + `position: absolute` 全屏遮罩弹窗（推荐）

### 完整代码骨架

```html
<template>
  <stack class="page-root">
    <!-- ====== ① 页面正常内容 ====== -->
    <div class="page-content" style="background-color: {{ theme.bg }}">
      <div class="back-header">
        <input class="back-btn" type="button" value="◀ 返回" onclick="goBack"
               style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
        <text class="header-title" style="color: {{ theme.text }}">页面标题</text>
      </div>

      <!-- 页面主体内容... -->
    </div>

    <!-- ====== ② 弹窗遮罩层（覆盖在页面之上） ====== -->
    <div class="dialog-overlay" if="{{ showDialog }}" onclick="closeDialog">
      <!-- ====== ③ 弹窗卡片 ====== -->
      <div class="dialog-box" style="background-color: {{ theme.card }}" onclick="stopBubble">
        <text class="dialog-title" style="color: {{ theme.accent }}">解锁高级功能</text>

        <text class="dialog-desc" style="color: {{ theme.textSecondary }}">
          一次性解锁，永久使用全部高级功能
        </text>

        <div class="benefits">
          <div for="{{ benefits }}" class="benefit-row">
            <text class="benefit-icon" style="color: {{ theme.accent }}">✓</text>
            <text class="benefit-text" style="color: {{ theme.text }}">{{ $item }}</text>
          </div>
        </div>

        <input class="dialog-btn dialog-btn-primary" type="button" value="立即解锁"
               onclick="doUnlock"
               style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />

        <input class="dialog-btn dialog-btn-secondary" type="button" value="暂不需要"
               onclick="closeDialog"
               style="background-color: {{ theme.btnSecondary }}; color: {{ theme.btnSecondaryText }}" />
      </div>
    </div>
  </stack>
</template>
```

### CSS 样式

```css
/* 根容器：stack 层叠布局，占满全屏 */
.page-root {
  width: 100%;
  height: 100%;
}

/* 页面内容：正常流 */
.page-content {
  width: 100%;
  height: 100%;
  flex-direction: column;
}

/* 弹窗遮罩层：absolute 铺满全屏 */
.dialog-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 弹窗卡片 */
.dialog-box {
  width: 80%;
  border-radius: 16px;
  padding: 24px 20px;
  flex-direction: column;
  align-items: center;
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
}

.dialog-desc {
  font-size: 12px;
  text-align: center;
  margin-bottom: 16px;
  line-height: 18px;
}

.benefits {
  width: 100%;
  flex-direction: column;
  margin-bottom: 20px;
}

.benefit-row {
  flex-direction: row;
  align-items: center;
  margin-bottom: 6px;
}

.benefit-icon {
  font-size: 14px;
  margin-right: 8px;
  width: 20px;
  text-align: center;
}

.benefit-text {
  font-size: 13px;
  flex: 1;
}

.dialog-btn {
  width: 100%;
  height: 36px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.dialog-btn-primary {
  /* 主按钮样式 */
}

.dialog-btn-secondary {
  /* 次要按钮样式 */
}
```

### JS 逻辑

```javascript
export default {
  private: {
    showDialog: false,
    benefits: ["多课表管理", "数据备份与恢复", "首页自定义", "多套主题"],
    theme: {}
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
  },

  showDialog() {
    this.showDialog = true
  },

  closeDialog() {
    this.showDialog = false
  },

  doUnlock() {
    this.showDialog = false
    router.push({ uri: "/pages/activation" })
  },

  stopBubble() {
    // 阻止点击事件冒泡到遮罩层，防止点击弹窗内容时关闭弹窗
  }
}
```

### 关键点说明

1. **`<stack>` 替代 `z-index`**：页面内容写在前面，弹窗写在后面，弹窗自然覆盖在页面上方
2. **`position: absolute` 铺满**：`left: 0; top: 0; width: 100%; height: 100%` 让遮罩层铺满整个 stack 容器
3. **`rgba()` 半透明**：在 CSS 类中（非内联 style）使用 `rgba()`，Vela 明确支持
4. **`if` 控制显隐**：`if="{{ showDialog }}"` 控制弹窗的挂载/卸载
5. **flex 居中**：用 `justify-content: center; align-items: center` 居中弹窗卡片，避免依赖百分比定位
6. **事件冒泡控制**：遮罩层 `onclick="closeDialog"`，弹窗卡片 `onclick="stopBubble"` 阻止冒泡

---

## 方案二：底部半屏抽屉（Bottom Sheet）

适用于不需要完全遮挡背景的轻提示场景。

### 实现结构

```html
<template>
  <stack class="page-root">
    <!-- 页面内容 -->
    <div class="page-content">...</div>

    <!-- 底部抽屉 -->
    <div class="bottom-sheet-overlay" if="{{ showSheet }}" onclick="closeSheet">
      <div class="bottom-sheet" style="background-color: {{ theme.card }}" onclick="stopBubble">
        <div class="sheet-handle" style="background-color: {{ theme.textMuted }}"></div>
        <text class="sheet-title" style="color: {{ theme.accent }}">解锁 Pro 功能</text>
        <text class="sheet-desc" style="color: {{ theme.textSecondary }}">此功能需要 Pro 版才能使用</text>
        <input class="sheet-btn" type="button" value="立即解锁" onclick="doUnlock"
               style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      </div>
    </div>
  </stack>
</template>
```

### CSS

```css
.bottom-sheet-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.35);
  flex-direction: column;
  justify-content: flex-end;
}

.bottom-sheet {
  width: 100%;
  border-radius: 16px 16px 0 0;
  padding: 8px 16px 16px 16px;
  flex-direction: column;
  align-items: center;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  margin-bottom: 12px;
}

.sheet-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
}

.sheet-desc {
  font-size: 12px;
  text-align: center;
  margin-bottom: 16px;
}

.sheet-btn {
  width: 100%;
  height: 34px;
  border-radius: 17px;
  font-size: 13px;
  font-weight: bold;
}
```

---

## 方案三：页面内联卡片（Inline Card）

适用于页面可以打开但内容需要 Pro 的场景，不弹出遮罩，而是在页面内展示升级卡片。

```html
<template>
  <div class="page" style="background-color: {{ theme.bg }}">
    <!-- 页面头部 -->
    <div class="back-header">...</div>

    <!-- 模糊预览内容 -->
    <div class="preview-content" style="opacity: 0.3; filter: blur(4px)">
      <!-- 功能预览 -->
    </div>

    <!-- 内联升级卡片 -->
    <div class="pro-card" if="{{ !isPro }}" style="background-color: {{ theme.card }}">
      <text class="pro-title" style="color: {{ theme.accent }}">课程统计 — Pro 专属</text>
      <text class="pro-desc" style="color: {{ theme.textSecondary }}">解锁后可查看完整数据</text>
      <input class="pro-btn" type="button" value="了解 Pro" onclick="goUnlock"
             style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
    </div>
  </div>
</template>
```

---

## 对比：当前实现 vs 推荐方案

| | 当前 `unlock-dialog.ux` | 推荐方案（`<stack>` + `absolute`） |
|------|------|------|
| 定位方式 | `position: fixed` | `position: absolute` 在 `<stack>` 内 |
| 层级控制 | `z-index: 1000` | `<stack>` 子元素书写顺序 |
| 半透明 | `style="background-color: rgba(0,0,0,0.35)"` 内联 | CSS 类中 `background-color: rgba(0,0,0,0.5)` |
| 居中方式 | `justify-content: flex-end` | `justify-content: center; align-items: center` |
| 显隐控制 | `show="{{ visible }}"` | `if="{{ showDialog }}"` |
| 兼容性 | ❌ Vela 不支持 `fixed` | ✅ 全部使用 Vela 支持的属性 |
| 复用性 | 独立组件，通过 store 引用调用 | 直接写在页面中，或封装为组件 |

---

## 迁移步骤

### 1. 改造 `unlock-dialog.ux` 组件

将组件从 `position: fixed` 改为 `position: absolute`，并确保使用它的页面根容器是 `<stack>`：

```diff
- <div class="sheet-overlay" show="{{ visible }}" style="background-color: rgba(0,0,0,0.35)" onclick="doCancel">
+ <div class="sheet-overlay" if="{{ visible }}" onclick="doCancel">
```

```diff
  .sheet-overlay {
-   position: fixed;
+   position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
+   width: 100%;
+   height: 100%;
+   background-color: rgba(0, 0, 0, 0.35);
    flex-direction: column;
    justify-content: flex-end;
-   z-index: 1000;
  }
```

### 2. 改造使用弹窗的页面

将页面根容器从 `<div>` 改为 `<stack>`：

```diff
  <template>
-   <div class="settings-page" style="background-color: {{ theme.bg }}">
+   <stack class="settings-page">
+     <div class="settings-content" style="background-color: {{ theme.bg }}">
        <!-- 页面内容 -->
+     </div>
      <unlock-dialog id="unlockDialog"></unlock-dialog>
-   </div>
+   </stack>
  </template>
```

```css
.settings-page {
  width: 100%;
  height: 100%;
}

.settings-content {
  width: 100%;
  height: 100%;
  flex-direction: column;
}
```

### 3. 受影响的页面列表

| 页面 | 文件 | 改造内容 |
|------|------|---------|
| 设置 | `settings.ux` | 根容器改为 `<stack>` |
| 课程表管理 | `schedule-manager.ux` | 根容器改为 `<stack>` |
| 数据备份恢复 | `backup-restore.ux` | 根容器改为 `<stack>` |
| 首页设置 | `homepage-settings.ux` | 根容器改为 `<stack>` |
| 振动实验室 | `vibration-lab.ux` | 根容器改为 `<stack>` |
| 二维码生成 | `qrcode-generator.ux` | 根容器改为 `<stack>` |
| 课程表二维码 | `schedule-qrcode.ux` | 根容器改为 `<stack>` |
| 勾选 Demo | `check-demo.ux` | `.premium-overlay` 改为 `position: absolute` |

---

## 圆屏/小屏适配注意事项

### 安全区域

手环屏幕多为圆形或圆角矩形，弹窗内容需要避开屏幕边缘：

```css
/* 圆屏安全区 */
@media (shape: circle) {
  .dialog-box {
    width: 70%;
    max-width: 280px;
    padding: 16px 12px;
  }

  .dialog-title {
    font-size: 15px;
  }

  .dialog-desc {
    font-size: 11px;
  }
}
```

### 内容精简

手环屏幕小（常见 192×490 或 466×466），弹窗内容必须精简：
- 标题不超过 2 行
- 描述文字不超过 3 行
- 按钮不超过 2 个
- 功能列表不超过 4 项

---

## 总结

| 要点 | 说明 |
|------|------|
| 核心方案 | `<stack>` + `position: absolute` + `rgba()` |
| 半透明 | ✅ `rgba()` 在 CSS 类中明确支持 |
| 层级控制 | `<stack>` 子元素书写顺序，后写的在上面 |
| 居中 | `justify-content: center` + `align-items: center` |
| 显隐 | `if` 指令控制挂载/卸载 |
| 动画 | ❌ 不支持 `transition`，接受无过渡动画 |
| 关键陷阱 | 不要用 `position: fixed`、不要用 `z-index`、不要用内联 `rgba()` |