# Ev课程表 小米手环9Pro 左上角黑屏问题修复清单

## 问题描述

| 项目 | 内容 |
|------|------|
| 现象 | 模拟器一切正常，手环9Pro真机只渲染左上角，其余黑屏 |
| 根因 | Vela渲染引擎不支持 `min-height:100%` 撑满屏幕，必须显式指定宽高；同时规避Vela固件布局bug |
| 硬件 | 手环9Pro 分辨率 336×480 |

---

## 涉及文件

| 文件 | 操作 |
|------|:--:|
| [src/pages/index/index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | 修改 |

---

## 1. template 修改

### 给最外层根 div 增加 id

```html
<div id="schedule-page" class="schedule-page" style="background-color: {{ theme.bg }}">
```

---

## 2. style 根容器 `.schedule-page` 修改

**删除旧的 `min-height:100%`；删除硬编码 44px 顶部 padding**

```css
.schedule-page {
  flex-direction: column;
  background-color: #1a1a2e;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  /* 手环没有大状态栏，44px会把布局顶出可视区 */
  padding: 8px 8px 8px 8px;
}
```

> Vela快应用：`config.json` 的 `window.backgroundColor` **完全无效**，不要指望配置兜底，必须 div 背景铺满。

### 校验已有代码（不要改错）

`.class-grid-item` 已经写了 `position:relative`，**保留不动**，给内部 `.progress-bg` absolute 定位做锚点。

```css
.class-grid-item {
  position: relative;
  width: 100%;
  min-height: 60px;
  border-radius: 12px;
  padding: 0;
  margin-bottom: 10px;
  flex-direction: row;
  overflow: hidden;
}
```

---

## 3. script 脚本修改

在页面 `onShow()` 末尾，增加 `$forceUpdate()`，解决Vela部分固件初次条件渲染 `if` 嵌套导致不重绘黑屏。

```js
onShow() {
  var self = this
  //===== 原有全部代码保持原样 =====

  // 强制重绘布局，修复Vela条件渲染局部黑屏
  this.$forceUpdate()
},
```

> 注意：不要在 `onInit` 写 `$forceUpdate`，`onInit` 阶段 DOM 还未构建，会无效。

---

## 4. 需要规避的已知 Vela 坑

| 序号 | 问题 | 说明 |
|:--:|------|------|
| 1 | `min-height:100%` 撑满页面 | 真机直接失效，模拟器欺骗你 |
| 2 | 横向 scroll 组件 `quick-add-scroll` | 外层不要嵌套多层 flex，目前写法可以保留，后续如果出现横向滚动异常再调整 |
| 3 | 大量 `if="{{xxx}}"` 条件渲染 | Vela 重绘风险点；能使用 `display:none` 的场景优先，不要全部用 `if` 销毁重建 DOM |

---

## 5. 测试 & 发布验证流程（无真机情况下）

1. AIoT IDE 模拟器设备选择：**小米手环9 Pro(336×480 DPR2.1)**，模拟器仅作参考，不能代表真机表现。
2. 打测试包，优先发给米坛里反馈黑屏的 9Pro 用户内测。
3. 收集用户信息：澎湃OS版本、截图、hilog日志，排查是否存在 JS 异常导致渲染中断。

---

## 6. 备选兜底方案（改完依旧黑屏时）

极少数旧固件，即使写死 `height:100%` 也会异常。根 div 外层再套一层百分百容器：

```html
<div style="width:100%;height:100%;">
  <div id="schedule-page" class="schedule-page" style="background-color: {{ theme.bg }}">
    <!--原有全部页面内容-->
  </div>
</div>
```

---

## 变更总结

| 序号 | 变更项 | 状态 |
|:--:|------|:--:|
| 1 | 根 div 增加 `id="schedule-page"` | ✅ |
| 2 | `.schedule-page` 设置 `width:100%; height:100%; box-sizing:border-box;`，移除 `min-height:100%`，顶部 padding 从 44px 改为 8px | ✅ |
| 3 | `onShow()` 末尾增加 `this.$forceUpdate()` | ✅ |
| 4 | 不要使用 `config.json` 的 `window.backgroundColor` 做兜底，Vela不生效 | ❌ |
| 5 | 保留 `.class-grid-item` 的 `position:relative`，不要删除 | 保留 |