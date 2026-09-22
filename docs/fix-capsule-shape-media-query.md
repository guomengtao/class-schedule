# Bug: @media (shape: capsule) 在胶囊屏上不生效

## 发现时间
2026-09-13

## 现象
所有针对胶囊屏的 `@media (shape: capsule) { ... }` CSS 规则在真机/模拟器上**从不生效**。胶囊屏上的页面样式应该是胶囊屏适配的，但实际上一直显示的是方屏/默认屏样式。

## 根因

### 核心问题：`device.getInfo()` 返回的 `screenShape` 值是 `"pill-shaped"`，不是 `"capsule"`

```
device.getInfo 实际返回：
{
  "screenShape": "pill-shaped",   ← 实际值
  "screenWidth": 212,
  "screenHeight": 520,
  "deviceType": "band"
}
```

但 CSS 里写的是：
```css
@media (shape: capsule) { ... }   ← 永远匹配不上！
```

### 为什么之前以为有胶囊屏适配
因为同一批 `@media` 块里通常也写了 `circle` 和 `rect`，这些在圆屏/方屏上确实生效，造成了"胶囊屏适配也在工作"的错觉。实际上胶囊屏那条分支从头到尾没触发过。

### 发现过程（调试日志）
在 `capsule-hide-test` 页面加 `console.log` 打印后发现：

```
screenShape = pill-shaped          ← 设备返回值
@media (shape: capsule)            ← CSS 写的值
shortSide = 212, max-width match = false   ← 宽度兜底也没触发
FINAL: media query should match = true     ← JS 逻辑判断对了，但 CSS 不认
```

## 修复方案

### CSS 写法（双值兼容）
```css
/* 修复前 */
@media (shape: capsule) { ... }

/* 修复后 */
@media (shape: capsule), (shape: pill-shaped) { ... }
```

两个值都写上，兼容不同版本的框架/设备。

### JS 端（already 兼容）
`device.getInfo()` 的调用方 `translateShape()` 已经做了双值兼容：
```javascript
if (shape === "capsule" || shape === "pill-shaped") return "胶囊屏"
```

## 受影响页面（共 31 个文件，33 处）

| # | 文件 | 行号 |
|---|------|------|
| 1 | custom-content-edit/custom-content-edit.ux | 556 |
| 2 | week-view/week-view.ux | 951 |
| 3 | nickname-edit/nickname-edit.ux | 271 |
| 4 | add-course/add-course.ux | 841 |
| 5 | schedule-manager/schedule-manager.ux | 865 |
| 6 | reset-data/reset-data.ux | 573 |
| 7 | reset-data/reset-data.ux | 744 |
| 8 | bs-demo1/bs-demo1.ux | 166 |
| 9 | detail/detail.ux | 944 |
| 10 | course-manager/course-manager.ux | 482 |
| 11 | pinned-pages/pinned-pages.ux | 281 |
| 12 | template-picker/template-picker.ux | 192 |
| 13 | welcome/welcome.ux | 264 |
| 14 | qrcode-generator/qrcode-generator.ux | 286 |
| 15 | black-screen-check/black-screen-check.ux | 243 |
| 16 | chinese-input/chinese-input.ux | 298 |
| 17 | lab/lab.ux | 348 |
| 18 | index-full/index-full.ux | 791 |
| 19 | device-info/device-info.ux | 338 |
| 20 | activation/activation.ux | 969 |
| 21 | backup-restore/backup-restore.ux | 684 |
| 22 | vibration-lab/vibration-lab.ux | 979 |
| 23 | schedule-qrcode/schedule-qrcode.ux | 377 |
| 24 | chinese-input-full/chinese-input-full.ux | 345 |
| 25 | donate/donate.ux | 307 |
| 26 | bs-demo5/bs-demo5.ux | 232 |
| 27 | homepage-settings/homepage-settings.ux | 556 |
| 28 | bs-demo4/bs-demo4.ux | 321 |
| 29 | bs-demo3/bs-demo3.ux | 272 |
| 30 | statistics/statistics.ux | 413 |
| 31 | settings/settings.ux | 806 |

已修复：capsule-hide-test/capsule-hide-test.ux（行 115）

## 验证方式
在胶囊屏模拟器（手环 9/10）上，打开任意修复过的页面，检查胶囊屏专属样式是否生效。对比修复前后的 UI 差异。