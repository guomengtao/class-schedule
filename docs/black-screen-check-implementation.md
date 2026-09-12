# 黑屏检测功能实现说明

## 一、概述

在设置页面加入"黑屏检测"入口，包含1个主列表页 + 5个测试demo页，用于在手环真机上逐步复现和定位黑屏bug的根因。

**入口路径**：设置 → 黑屏检测

---

## 二、文件结构

```
src/pages/black-screen-check/black-screen-check.ux   # 主列表页
src/pages/bs-demo1/bs-demo1.ux                       # Demo1: min-height塌缩
src/pages/bs-demo2/bs-demo2.ux                       # Demo2: @media shape适配缺失
src/pages/bs-demo3/bs-demo3.ux                       # Demo3: 激活页同款结构
src/pages/bs-demo4/bs-demo4.ux                       # Demo4: right/bottom浮层定位
src/pages/bs-demo5/bs-demo5.ux                       # Demo5: 条件渲染无forceUpdate
src/manifest.json                                    # 路由注册（6条）
src/pages/settings/settings.ux                       # 入口链接
```

### manifest.json 路由注册

```json
{ "pages": { ... }, "router": { "entry": "..." } }
```

每个页面通过 `router.push({ uri: "/pages/xxx" })` 跳转。

---

## 三、主列表页设计

### 页面布局（胶囊屏优先）

```
┌──────────────────────────────┐
│  ◀         黑屏检测           │  顶部标题栏
├──────────────────────────────┤
│  逐个测试，返回后观察是否黑屏。  │  提示文字
│  已测项目会变灰标记。          │
├──────────────────────────────┤
│  1  min-height:100% 塌缩     ›│  未测：正常颜色
│  2  @media shape 适配缺失    ›│
│  3  激活页同款结构           ›│
│  4  right/bottom 浮层定位    ›│
│  5  条件渲染 无forceUpdate   ›│
├──────────────────────────────┤
│        [ 重置标记 ]           │  一键清除所有已测标记
└──────────────────────────────┘
```

### 交互逻辑

1. **点击某项** → `testedItems[name] = true` → 该项背景变暗、文字变灰、`›` 变为 `✓` → 跳转对应demo
2. **返回列表** → 已测项保持灰色 + `✓`标记，一目了然
3. **点击"重置标记"** → 所有 `testedItems` 恢复为 `false`，颜色恢复

### 关键技术点

```javascript
// testedItems 跟踪状态
private: {
  testedItems: {
    'bs-demo1': false,
    'bs-demo2': false,
    'bs-demo3': false,
    'bs-demo4': false,
    'bs-demo5': false
  }
}

// 点击时标记已测 + 跳转
openDemo(name) {
  this.testedItems[name] = true
  router.push({ uri: "/pages/" + name })
}

// 重置
resetAll() {
  this.testedItems = { 'bs-demo1': false, ... }
}
```

模板中通过三元表达式动态切换颜色：
```html
style="background-color: {{ testedItems['bs-demo1'] ? theme.cardLight : theme.card }}"
style="color: {{ testedItems['bs-demo1'] ? theme.textMuted : theme.text }}"
```

列表使用 `flex: 1` 但不设置 `overflow: scroll`，确保所有5个项目直接展开可见，无需滚动。

---

## 四、5个测试Demo页面

每个页面底部有统一的翻页导航栏，支持顺序遍历。

### Demo1: min-height:100% 塌缩

| 项目 | 内容 |
|------|------|
| 测试目标 | Vela引擎对 `min-height:100%` 的支持情况 |
| 关键CSS | 根容器 `min-height: 100%`，无显式 `height` |
| 正常表现 | 3个内容卡片填满全屏 |
| 黑屏表现 | 仅在左上角一小块出现内容，其余黑屏 |
| 页码 | 1 / 5 |

### Demo2: @media shape 适配缺失

| 项目 | 内容 |
|------|------|
| 测试目标 | 缺少 `@media (shape: capsule/rect/circle)` 声明时CSS是否失效 |
| 关键CSS | 无任何 `@media (shape:)` 声明 |
| 正常表现 | 所有卡片按基础CSS正常显示 |
| 黑屏表现 | Vela可能忽略全部CSS声明，页面塌缩 |
| 页码 | 2 / 5 |

### Demo3: 激活页同款结构

| 项目 | 内容 |
|------|------|
| 测试目标 | 复制 activation.ux 的页面结构，测试黑屏是否与结构相关 |
| 关键CSS | `min-height:100%` + `scroll` + 步骤卡片布局 |
| 正常表现 | 步骤卡片正常展开，可滚动 |
| 黑屏表现 | 与激活页同bug：只有左上角一小块 |
| 页码 | 3 / 5 |

### Demo4: right/bottom 浮层定位

| 项目 | 内容 |
|------|------|
| 测试目标 | `position: absolute` + `left:0; top:0; right:0; bottom:0` 四边定位的兼容性 |
| 关键CSS | 遮罩使用 `left/right/top/bottom` 定位 + 按钮唤起弹窗 |
| 正常表现 | 弹窗遮罩覆盖全屏，居中显示 |
| 黑屏表现 | 遮罩塌缩到左上角 |
| 页码 | 4 / 5 |

### Demo5: 条件渲染 无forceUpdate

| 项目 | 内容 |
|------|------|
| 测试目标 | Vela固件条件渲染不重绘bug |
| 关键CSS | `show="{{ condition }}"` 切换内容区域 |
| 正常表现 | 开关按钮正确切换内容显示/隐藏 |
| 黑屏表现 | 切换后布局错乱或黑屏，`onShow` 不重绘 |
| 页码 | 5 / 5 |

---

## 五、底部翻页导航

每个demo页面底部有统一的导航栏：

```
Demo1:   [              1/5        下一项 › ]
Demo2-4: [ ‹ 上一项     2-4/5      下一项 › ]
Demo5:   [ ‹ 上一项     5/5                ]
```

### 实现

```javascript
// Demo2 为例
goPrev() { router.push({ uri: "/pages/bs-demo1" }) }
goNext() { router.push({ uri: "/pages/bs-demo3" }) }
```

导航栏样式（胶囊屏默认）：
- 高度：28px
- 页码字体：18px
- 按钮宽度：80px，圆角6px
- 圆形屏放大：导航栏padding 12px 14px，按钮 100×36，页码 24px
- 方屏适配：按钮 90×36，页码 22px

---

## 六、屏幕形状适配策略

遵循项目规则：**默认首先支持胶囊版尺寸，其次才是方屏幕版**。

### CSS结构

```css
/* ===== 基础样式 = 胶囊版 ===== */
.page {
  padding: 44px 6px 10px 6px;
  ...
}

/* ===== 圆形屏放大 ===== */
@media (shape: circle) {
  .page {
    padding: 44px 36px 44px 36px;
  }
  ...
}

/* ===== 胶囊屏（与基础一致） ===== */
@media (shape: capsule) {
  .page {
    padding: 44px 6px 10px 6px;
  }
}

/* ===== 方屏适配 ===== */
@media (shape: rect) {
  .page {
    padding: 44px 6px 6px 6px;
  }
  ...
}
```

### 关键尺寸对照

| 属性 | 胶囊版（默认） | 圆形屏 | 方屏 |
|------|---------------|--------|------|
| 页面padding | 44px 6px 10px 6px | 44px 36px 44px 36px | 44px 6px 6px 6px |
| 返回按钮 | 48×28, font 11px | 64×40, font 24px | 50×40, font 24px |
| 标题字体 | 22px | 30-32px | 26-28px |
| 内容字体 | 18px | 24px | — |
| 卡片间距 | 10px | 14px | — |

---

## 七、使用指南

### 测试步骤

1. 打开设置 → 黑屏检测
2. 按顺序点击 Demo1 至 Demo5
3. 每个页面加载后观察：
   - 内容是否填满全屏？
   - 是否只在左上角出现？
   - 其余部分是否黑屏？
4. 返回列表，已测项显示 `✓`
5. 记录出现黑屏的页面编号

### 典型测试结果

| 页面 | 正常 | 黑屏 | 含义 |
|------|------|------|------|
| Demo1 | ✅ | ❌ | `min-height:100%` 不是元凶 |
| Demo2 | ✅ | ❌ | `@media shape` 缺失不导致黑屏 |
| Demo3 | ✅ | ❌ | 激活页黑屏与结构无关 |
| Demo4 | ✅ | ❌ | 四边定位正常 |
| Demo5 | ✅ | ❌ | 条件渲染正常 |

如果全部正常，黑屏根因不在这些方向，需排查Vela引擎版本或系统级问题。

---

## 八、设计要点

1. **零滚动**：主列表页5个项目全部直接展开，胶囊屏（402×476）足够容纳
2. **已测标记**：点击即标记，返回后灰色+✓提示，避免重复测试
3. **顺序遍历**：底部导航栏支持 `上一项/下一项`，无需返回列表
4. **一键重置**：底部"重置标记"按钮清除所有已测状态
5. **胶囊优先**：所有基础样式为胶囊屏尺寸，圆形屏通过 `@media` 放大