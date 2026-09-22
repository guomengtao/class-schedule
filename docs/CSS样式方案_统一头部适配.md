# CSS样式方案：轻量级统一头部适配

> 适用于小米手环/手表等Vela快应用穿戴设备，解决组件化加载慢、内存占用高的问题。

---

## 背景

在小米手环这类轻量级穿戴设备上，快应用框架**没有**像Vue/React那样高效的运行时组件化能力。快应用自定义组件拥有独立的ViewModel，每个组件实例都会创建一份独立的数据监听器，在内存本就紧张的手环上会直接导致卡顿甚至白屏。

官方明确**不建议**在手表手环上使用自定义组件。

### 多屏规格

| 设备 | 屏幕形状 | 分辨率 |
|------|----------|--------|
| 小米手环9 | 胶囊屏（capsule） | 192×490 |
| 手环8 Pro / 9 Pro | 矩形屏（rect） | 336×480 |
| 圆屏手表 | 圆形屏（circle） | 466×466 |

官方建议手环场景至少准备**两套UI布局**：矩形屏和圆屏可共用一套，胶囊屏单独一套。

---

## 核心思路

不创建组件实例，把头部抽象为一组**公共CSS类**，在每个页面的模板中直接写头部结构，通过`<import>`引入外部样式文件。

**零JS运行时开销，零内存增量。**

---

## 公共样式文件

创建 `common/header.css`：

```css
/* 头部容器 */
.header {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 16px;
}

/* 返回按钮 */
.header-back {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  font-size: 24px;
  text-align: center;
  line-height: 44px;
  flex-shrink: 0;
}

/* 标题 */
.header-title {
  flex: 1;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  line-height: 40px;
  lines: 1;
  text-overflow: ellipsis;
}

/* 占位元素（保持左右对称） */
.header-placeholder {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

/* ── 胶囊屏适配 ── */
@media screen and (shape: capsule) {
  .header {
    height: 50px;
    padding: 0 12px;
  }

  .header-back {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    font-size: 20px;
    line-height: 36px;
  }

  .header-title {
    font-size: 24px;
    line-height: 34px;
  }

  .header-placeholder {
    width: 36px;
    height: 36px;
  }
}

/* ── 圆屏适配 ── */
@media screen and (shape: circle) {
  .header {
    height: 56px;
    padding-top: 12px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .header-title {
    font-size: 30px;
    line-height: 44px;
  }
}
```

---

## 页面中的使用方式

每个页面只需引入样式文件，然后在模板中写头部结构，在 `private` 中传入 `pageTitle`：

```html
<import src="../../common/header.css"></import>

<template>
  <div class="page" style="background-color: {{ theme.bg }}">
    <!-- 统一头部 -->
    <div class="header">
      <input class="header-back" type="button" value="◀" onclick="goBack"
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="header-title" style="color: {{ theme.text }}">{{ pageTitle }}</text>
      <div class="header-placeholder"></div>
    </div>

    <!-- 页面内容 -->
  </div>
</template>
```

---

## 优势

| 维度 | 说明 |
|------|------|
| **运行时开销** | 零 — 无组件实例，无独立ViewModel，无数据监听器 |
| **内存增量** | 零 — 仅仅是模板中的几行原生DOM |
| **屏幕适配** | 全自动 — CSS `@media (shape: ...)` 根据屏幕形状自动切换样式 |
| **开发效率** | 高 — 每个页面只需设置一个 `pageTitle` 字符串 |
| **可维护性** | 高 — 所有屏幕适配逻辑集中在 `common/header.css` 一个文件中 |

---

## 备注

手环用户分区剩余空间低于 **60MB** 时就会开始出现白屏和卡顿，快应用本身的内存预算非常紧张。快应用原生支持 `@media` 查询设备屏幕形状，`shape` 相关的适配接口正是为穿戴设备设计的。使用纯CSS方案是从框架层面最贴合推荐的实践。