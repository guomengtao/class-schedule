# 高级版提示模式升级方案

## 1. 背景

当前项目存在多个弹窗 Demo 页面和居中强弹窗（Modal Dialog）组件，这些在手表/手环等小屏穿戴设备上体验极差：遮挡严重、打扰感强、与手指滑动操作习惯冲突。

## 2. 需要删除的文件

### 2.1 弹窗 Demo 页面

| 页面路径 | 说明 | 删除原因 |
|---------|------|---------|
| `src/pages/dialog-demo/index.ux` | 弹窗组件测试 | 仅用于测试 `simple-dialog` 组件，无实际功能 |
| `src/pages/full-dialog/index.ux` | 完整弹窗 | 仅用于展示《将进酒》弹窗 Demo，无实际功能 |
| `src/pages/popup-test/index.ux` | 弹起来测试 | 同上，弹窗 Demo 测试页 |
| `src/pages/popup-test/popup-test.ux` | 弹起来测试（复制） | 重复文件 |

### 2.2 弹窗 Demo 组件

| 组件路径 | 说明 | 删除原因 |
|---------|------|---------|
| `src/components/simple-dialog/index.ux` | 简单弹窗组件 | 居中强弹窗模式，不适合穿戴设备 |
| `src/components/full-dialog/index.ux` | 完整弹窗组件 | 同上，仅用于 Demo |

### 2.3 需要清理的引用

| 文件 | 需要移除的内容 |
|------|-------------|
| `src/pages/test-area/test-area.ux` | 移除 `openUnlockDemo`、`openDialogDemo`、`openPopupTest` 三个菜单项及对应方法 |
| `src/pages/index/index.ux` | 如果首页有弹窗相关入口，需移除 |
| `src/pages/manifest.json` | 移除 `dialog-demo`、`full-dialog`、`popup-test` 三个页面的路由注册 |

## 3. 保留并升级的组件

### 3.1 `unlock-dialog.ux` — 当前唯一的实际解锁弹窗

当前状态：使用居中强弹窗模式（`overlay` + `dialog` 居中布局）

**需要升级**为以下三种推荐模式之一，而非直接删除。

## 4. 三种推荐提示模式

**核心原则：不建议使用居中强弹窗（Modal Dialog）。** 在手表和手环的小屏设备上，强弹窗遮挡严重、打扰感太强，容易让用户产生被拦截的排斥感。

| 交互场景 | 推荐方式 | 呈现效果与优势 |
|---------|---------|-------------|
| **点击进入了加密栏目** | **页面内联卡片** | 页面直接展示精致的 Pro 解锁卡片（配合背景高斯模糊），不弹出遮罩层，感知最自然 |
| **主动触发某项 Pro 功能** | **底部半屏抽屉** | 从底部滑出占屏 60% 的抽屉，保留上方部分背景。用户手势下滑即可顺手关闭，体验轻盈 |
| **在列表中点击了 🔒 图标** | **Toast 弱提示** | 屏幕顶部或底部弹出 2 秒自动消失的轻提示（如："需激活 Pro 版使用"），不打断浏览流程 |

### 4.1 页面内联卡片（Inline Pro Card）

**适用场景**：页面能打开，但内容需要 Pro 才能完整使用

**原理**：页面完全可以点击进去，背景能隐约看到模糊的界面或模版数据（给用户看"里面有什么"），让用户先看到价值，产生"我想用这个功能"的期待感。

**Vela JS 实现**：

```html
<template>
  <div class="page">
    <div class="header">
      <input class="back-btn" type="button" value="◀ 返回" onclick="goBack" />
      <text class="title">课程统计</text>
    </div>

    <div class="preview-content" style="filter: blur(4px); opacity: 0.3">
      <text class="preview-title">本周课程分布</text>
      <text class="preview-data">星期一：3 节课</text>
      <text class="preview-data">星期二：2 节课</text>
    </div>

    <div class="pro-card" style="background-color: {{ theme.card }}">
      <text class="pro-icon">👑</text>
      <text class="pro-title" style="color: {{ theme.accent }}">课程统计 — Pro 专属</text>
      <text class="pro-desc" style="color: {{ theme.textSecondary }}">解锁后可查看完整课程分布、各科数量排行、每周趋势分析</text>
      <div class="pro-benefits">
        <text class="benefit" style="color: {{ theme.text }}">✓ 课程分布图表</text>
        <text class="benefit" style="color: {{ theme.text }}">✓ 各科数量排行</text>
        <text class="benefit" style="color: {{ theme.text }}">✓ 每周趋势分析</text>
      </div>
      <input class="pro-btn" type="button" value="了解 Pro" onclick="goUnlock" />
    </div>
  </div>
</template>
```

### 4.2 底部半屏抽屉（Bottom Sheet）

**适用场景**：用户主动触发某项 Pro 功能时

**交互**：从底部滑出占屏 60% 的抽屉，用户手势下滑即可顺手关闭，体验轻盈。

**Vela JS 实现**：

```html
<template>
  <div class="page">
    <div class="bottom-sheet" show="{{ showSheet }}" style="background-color: {{ theme.card }}">
      <div class="sheet-handle" style="background-color: {{ theme.textMuted }}"></div>
      <text class="sheet-title" style="color: {{ theme.accent }}">解锁 Pro 功能</text>
      <text class="sheet-desc" style="color: {{ theme.textSecondary }}">{{ featureName }} 需要 Pro 版才能使用</text>
      <div class="sheet-benefits">
        <div for="{{ benefits }}" class="benefit-row">
          <text class="check" style="color: {{ theme.accent }}">✓</text>
          <text class="benefit-text" style="color: {{ theme.text }}">{{ $item }}</text>
        </div>
      </div>
      <input class="sheet-btn" type="button" value="立即解锁" onclick="goUnlock" />
      <input class="sheet-cancel" type="button" value="暂不需要" onclick="hideSheet" />
    </div>
  </div>
</template>
```

### 4.3 Toast 弱提示

**适用场景**：在列表中点击了 🔒 图标

**交互**：屏幕顶部或底部弹出 2 秒自动消失的轻提示。

```javascript
prompt.showToast({ message: "需激活 Pro 版使用" })
```

## 5. 针对独立小区域/按钮的优雅方案

### 5.1 手风琴折叠展开式（Accordion）

**交互**：点击该按钮/小区域，不弹窗不跳转，直接在下方平滑展开一行提示。

```text
[ 🔒 导出心率趋势 CSV 数据 ]  ← 点击后向下展开
└── 💡 Pro 专属功能：升级即可一键导出全天原始数据  [ 去解锁 ]
```

**Vela JS 实现**：

```html
<template>
  <div class="container">
    <div class="feature-row" onclick="toggleProHint">
      <text class="title">导出数据报告</text>
      <text class="pro-badge">PRO</text>
    </div>
    <div class="pro-accordion" if="{{ showProHint }}">
      <text class="hint-text">Pro 专属：解锁可导出 CSV 格式原始数据</text>
      <input type="button" value="去解锁" onclick="goUnlock" class="btn-unlock" />
    </div>
  </div>
</template>
```

### 5.2 原地替换 / 行内 Banner（Inline Card）

**交互**：小区域直接展示为锁状态卡片，点击卡片右侧按钮直接唤起提示。

```text
┌──────────────────────────────────────┐
│ 👑 压力指数分析 (Pro 专属)            │
│ 解锁后可查看全天压力变化曲线  [ 了解Pro ] │
└──────────────────────────────────────┘
```

## 6. 设计原则总结

| 原则 | 说明 |
|------|------|
| **不要强硬打断** | 避免弹出一个带有"关闭/取消"和"去购买"两个大按钮的全屏遮罩 |
| **注重滑动手势** | 穿戴设备上，从底部滑出的半屏卡片比居中弹窗更符合手指滑动操作习惯 |
| **买不买都能顺畅退出** | 确保用户可以非常轻松地通过右滑或下滑退出提示，回到上一步 |
| **先看价值再拦截** | 让用户先看到功能内容（模糊预览），产生期待感，而不是一上来就被"无权限"挡住 |

## 7. 实施步骤

1. 删除 `src/pages/dialog-demo/`、`src/pages/full-dialog/`、`src/pages/popup-test/` 三个目录
2. 删除 `src/components/simple-dialog/`、`src/components/full-dialog/` 两个组件目录
3. 清理 `src/pages/test-area/test-area.ux` 中的弹窗 Demo 菜单项
4. 清理 `src/pages/manifest.json` 中的路由注册
5. 改造 `src/components/unlock-dialog.ux`：从居中强弹窗改为底部半屏抽屉模式
6. 为 Pro 功能页面添加页面内联卡片模式