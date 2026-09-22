# 6个Demo页面布局混乱分析报告

## 综述

本报告分析6个demo页面（水果、城市、电影、书籍、星座、家具）的布局混乱问题。

**共同根因**：所有页面的列表容器 `.list` 使用 `flex: 1` 但**缺少 `<scroll>` 滚动包装**，10个列表项总高度远超手表屏幕（约454px），导致内容溢出、重叠、不可见。

---

## 1. 水果列表 (demo-fruit)

### 页面特征
- 交替行色（偶数行有背景，奇数行透明）
- 绿色编号 `#2ecc71`
- 左对齐 + 右对齐编号

### 布局计算

```
每个stripe-item高度 = 50px(上padding) + 36px(文字) + 50px(下padding) + 4px(margin-bottom) = 140px
10个stripe-wrapper总高度 = 10 × 140px = 1400px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1400px |
| footer | ~40px |
| **总计** | **~1626px** |
| 屏幕高度 | ~454px |
| **溢出比** | **3.6倍** |

### 具体表现
- 仅能看到前2-3个水果（苹果、香蕉、橙子）
- 交替色在溢出区域可能产生视觉断裂
- 删除按钮左滑后无法完整显示

---

## 2. 城市列表 (demo-city)

### 页面特征
- 紫色圆形头像badge `#9b59b6`，显示首字
- 卡片式布局，圆角14px
- 每个卡片有badge(56px) + 文字 + 编号

### 布局计算

```
每个item-wrapper高度 = 40px(上padding) + 56px(badge) + 40px(下padding) + 24px(margin-bottom) = 160px
10个item-wrapper总高度 = 10 × 160px = 1600px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1600px |
| footer | ~40px |
| **总计** | **~1826px** |
| 屏幕高度 | ~454px |
| **溢出比** | **4.0倍** |

### 具体表现
- 仅能看到前2个城市（北京、上海）
- badge圆形头像被截断或重叠
- 编号 `#3` 及之后的项完全不可见

---

## 3. 电影列表 (demo-movie)

### 页面特征
- 粉色顶部边框 `border-top: 6px solid #e91e63`
- 卡片式，底部圆角，无上圆角
- 包含电影名 + 标签 + 编号
- **无滑动删除功能**（缺少 `ontouchstart`/`ontouchend`）

### 布局计算

```
每个banner-card高度 = 30px(上padding) + 34px(标题) + 14px(margin-top) + 20px(标签行) + 30px(下padding) + 20px(margin-bottom) + 6px(border-top) = 154px
10个banner-card总高度 = 10 × 154px = 1540px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1540px |
| footer | ~40px |
| **总计** | **~1766px** |
| 屏幕高度 | ~454px |
| **溢出比** | **3.9倍** |

### 具体表现
- 仅能看到前2部电影（肖申克救赎、霸王别姬）
- 粉色顶部边框被截断
- 电影标签"电影"与编号可能重叠
- 无滑动删除功能，与其他demo不一致

### 额外问题
- 缺少 swipe 滑动删除支持（`onTouchStart`/`onTouchEnd` 未定义）
- 没有 `item-wrapper` 包裹层，与其他demo结构不一致

---

## 4. 书籍列表 (demo-book)

### 页面特征
- 大号序号 `01-10`，颜色 `#34495e`
- 古典风格，双线感
- 序号宽度60px，文字左对齐

### 布局计算

```
每个item-wrapper高度 = 40px(上padding) + 48px(大号序号) + 40px(下padding) + 24px(margin-bottom) = 152px
10个item-wrapper总高度 = 10 × 152px = 1520px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1520px |
| footer | ~40px |
| **总计** | **~1746px** |
| 屏幕高度 | ~454px |
| **溢出比** | **3.8倍** |

### 具体表现
- 仅能看到前2-3本书（红楼梦、西游记、三国演义）
- 大号序号 `01` `02` 48px字号在小屏上占据过多空间
- 后续书籍的古典编号完全不可见

---

## 5. 星座列表 (demo-star)

### 页面特征
- 药丸圆形头像 `border-radius: 50px`，橙色 `#ff9800`
- 列表项圆角50px，形成药丸效果
- 每个卡片有圆形头像(60px) + 文字

### 布局计算

```
每个item-wrapper高度 = 30px(上padding) + 60px(avatar) + 30px(下padding) + 24px(margin-bottom) = 144px
10个item-wrapper总高度 = 10 × 144px = 1440px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1440px |
| footer | ~40px |
| **总计** | **~1666px** |
| 屏幕高度 | ~454px |
| **溢出比** | **3.7倍** |

### 具体表现
- 仅能看到前2-3个星座（白羊座、金牛座、双子座）
- 药丸形状在溢出区域可能被截断变形
- 圆形头像重叠时产生视觉混乱

---

## 6. 家具列表 (demo-furniture)

### 页面特征
- 极简风格，无特殊色调
- **渐进缩进**：`margin-left: {{ $idx * 6 }}px`（每个元素比前一个多缩进6px）
- 棕色编号 `#795548`

### 布局计算

```
每个item-wrapper高度 = 50px(上padding) + 34px(文字) + 50px(下padding) + 24px(margin-bottom) = 158px
10个item-wrapper总高度 = 10 × 158px = 1580px
```

| 组件 | 高度 |
|------|------|
| header | ~120px |
| add-row | ~66px |
| 10个列表项 | 1580px |
| footer | ~40px |
| **总计** | **~1806px** |
| 屏幕高度 | ~454px |
| **溢出比** | **4.0倍** |

### 具体表现
- 仅能看到前2个家具（桌子、椅子）
- 渐进缩进导致第10个元素有 `margin-left: 54px`，在手表窄屏上右侧被截断
- 缩进效果在溢出时产生错位视觉

### 额外问题
- 渐进缩进 `$idx * 6` px 在手表窄屏(~454px宽)上，第10个元素缩进54px，加上 `padding: 24px × 2 = 48px`，内容区只剩约 `454 - 16*2 - 54 - 48 = 320px`，文字可能被截断

---

## 溢出比汇总对比

| 页面 | 单item高度 | 10项总高 | 总页面高度 | 溢出比 | 可见项数 |
|------|-----------|---------|-----------|--------|---------|
| 水果 | 140px | 1400px | 1626px | 3.6x | 2-3 |
| 城市 | 160px | 1600px | 1826px | 4.0x | 2 |
| 电影 | 154px | 1540px | 1766px | 3.9x | 2 |
| 书籍 | 152px | 1520px | 1746px | 3.8x | 2-3 |
| 星座 | 144px | 1440px | 1666px | 3.7x | 2-3 |
| 家具 | 158px | 1580px | 1806px | 4.0x | 2 |

---

## 修复方案

每个页面需要在 `.list` 外层包裹 `<scroll>` 组件：

```html
<!-- 修复前 -->
<div class="list">
  <div for="{{ listData }}" class="...">...</div>
</div>

<!-- 修复后 -->
<scroll class="list-scroll" scroll-y="{{true}}">
  <div class="list">
    <div for="{{ listData }}" class="...">...</div>
  </div>
</scroll>
```

```css
/* 修复前 */
.list { flex: 1; flex-direction: column; }

/* 修复后 */
.list-scroll { flex: 1; flex-direction: column; }
.list { flex-direction: column; }
```

### 电影页面额外修复
- 需要添加 `item-wrapper` 包裹层以支持滑动删除
- 需要添加 `onTouchStart`/`onTouchEnd` 处理函数

---

## 建议

1. 所有6个页面统一添加 `<scroll>` 滚动包装
2. `padding` 值从 40-50px 减少到 20-24px，提升单屏可见项数到 4-5 个
3. 电影页面补充滑动删除功能，与其他demo保持一致
4. 家具页面渐进缩进在小屏上应限制最大缩进值（如 `Math.min($idx * 6, 30)`）
5. 在 `gen-pages.js` 生成模板中统一加入scroll包装，避免逐个修复