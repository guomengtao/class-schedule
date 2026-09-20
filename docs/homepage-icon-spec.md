# Homepage Icon Specification

## 1. Overview

This document defines the icon standards for the schedule homepage (`index.ux`). All icons use a consistent 2px stroke width with dark/light theme dual-mode support.

### Icon Directory Structure

```
src/common/icons/
├── dark/          ← light-colored icons for dark backgrounds
│   ├── icon_arrow_left.png    (solid filled triangle)
│   ├── icon_arrow_right.png   (solid filled triangle)
│   ├── icon_plus.png          (2px thin line)
│   ├── icon_chevron_up.png    (2px thin line, Lucide style)
│   ├── icon_chevron_down.png  (2px thin line, Lucide style)
│   └── icon_swap.png          (2px thin line, Lucide arrow-left-right)
└── light/         ← dark-colored icons for light backgrounds
    └── ... (same filenames, different color)
```

### Icon Size & Color Rules

| Parameter | Value |
|-----------|-------|
| Canvas size | 32×32 px |
| Stroke width | **2px** (all thin-line icons) |
| Dark theme color | `rgb(200,200,200)` |
| Light theme color | `rgb(60,60,60)` |
| Background | Transparent (RGBA 0,0,0,0) |

---

## 2. Icon Catalog

### 2.1 Day Navigation Arrows (solid filled triangles)

| | Left Arrow | Right Arrow |
|---|---|---|
| **Usage** | `prevDay` button | `nextDay` button |
| **CSS class** | `.nav-btn-img` | `.nav-btn-img` |
| **File** | `icon_arrow_left.png` | `icon_arrow_right.png` |
| **Style** | **Solid filled triangle** | **Solid filled triangle** |
| **Reference** | Lucide `chevron-left` (filled variant) | Lucide `chevron-right` (filled variant) |
| **Icon size** | 24×24 px | 24×24 px |
| **Container** | `.nav-btn-circle` (48×48, round 24px) | `.nav-btn-circle` (48×48, round 24px) |

```html
<div class="nav-btn-circle" onclick="prevDay">
  <image class="nav-btn-img" src="../../common/icons/{{ iconTheme }}/icon_arrow_left.png">
</div>

<div class="nav-btn-circle" onclick="nextDay">
  <image class="nav-btn-img" src="../../common/icons/{{ iconTheme }}/icon_arrow_right.png">
</div>
```

**CSS snippet:**
```css
.nav-btn-circle {
  width: 48px; height: 48px;
  border-radius: 24px;
  justify-content: center; align-items: center;
  flex-shrink: 0;
}
.nav-btn-img {
  width: 24px; height: 24px;
}
```

---

### 2.2 Add Course Button (thin-line plus)

| | Plus Icon |
|---|---|
| **Usage** | `openAddCoursePage` button |
| **CSS class** | `.add-btn-icon` |
| **File** | `icon_plus.png` |
| **Style** | **Thin line, 2px stroke** (two crossing lines) |
| **Reference** | Lucide `plus` |
| **Icon size** | 24×24 px (default), 22×22 (capsule), 24×24 (rect) |

```html
<div class="add-btn-wrapper" onclick="openAddCoursePage"
     style="background-color: transparent; border-width: 2px; border-color: {{ theme.accent }}">
  <image class="add-btn-icon" src="../../common/icons/{{ iconTheme }}/icon_plus.png">
  <text class="add-btn-label" if="{{ !isCapsule }}">添加课程</text>
</div>
```

**CSS:**
```css
.add-btn-icon { width: 24px; height: 24px; }
@media (shape: capsule) { .add-btn-icon { width: 22px; height: 22px; } }
```

---

### 2.3 Quick Add Expand/Collapse (thin-line chevron)

| | Collapsed (down) | Expanded (up) |
|---|---|---|
| **Usage** | Click to expand quick-add panel | Click to collapse quick-add panel |
| **CSS class** | `.quick-add-arrow-img` | `.quick-add-arrow-img` |
| **File** | `icon_chevron_down.png` | `icon_chevron_up.png` |
| **Style** | **Thin line, 2px stroke, Lucide `chevron-down`** | **Thin line, 2px stroke, Lucide `chevron-up`** |
| **Icon size** | 20×20 px | 20×20 px |

```html
<image class="quick-add-arrow-img"
       src="../../common/icons/{{ iconTheme }}/{{ quickAdd.expanded ? 'icon_chevron_up' : 'icon_chevron_down' }}.png">
```

**CSS:**
```css
.quick-add-arrow-img {
  width: 20px; height: 20px;
  margin-left: 4px;
}
@media (shape: rect) {
  .quick-add-arrow-img { width: 20px; height: 20px; }
}
```

**Lucide reference:** https://lucide.dev/icons/chevron-down

---

### 2.4 Schedule Switcher (thin-line arrow-left-right)

| | Swap Icon |
|---|---|
| **Usage** | Click to open schedule manager (switch schedules) |
| **CSS class** | `.week-swap-icon` |
| **File** | `icon_swap.png` |
| **Style** | **Thin line, 2px stroke, Lucide `arrow-left-right`** (dual horizontal arrows) |
| **Icon size** | 16×16 px |

```html
<div class="week-indicator" onclick="openScheduleManager">
  <image class="week-swap-icon" src="../../common/icons/{{ iconTheme }}/icon_swap.png">
  <text class="week-text" style="color: {{ theme.accent }}">{{ currentScheduleName }}</text>
</div>
```

**CSS:**
```css
.week-swap-icon {
  width: 16px; height: 16px;
}
```

**Lucide reference:** https://lucide.dev/icons/arrow-left-right

---

## 3. Summary Table

| Position | Icon File | Style | Stroke | Size | Container |
|----------|-----------|-------|--------|------|-----------|
| Day nav left | `icon_arrow_left.png` | Solid triangle | N/A (filled) | 24×24 | 48×48 circle |
| Day nav right | `icon_arrow_right.png` | Solid triangle | N/A (filled) | 24×24 | 48×48 circle |
| Add course | `icon_plus.png` | Thin plus | 2px | 24×24 | Flexible wrapper |
| Quick add | `icon_chevron_down/up.png` | Thin chevron | 2px | 20×20 | Inline |
| Schedule switch | `icon_swap.png` | Thin arrows L/R | 2px | 16×16 | Inline with text |

## 4. Theme Dual-Mode

Each icon has two color variants:

- **`dark/`** — White/light gray (`rgb(200,200,200)`) for dark backgrounds (`#1a1a2e` and similar)
- **`light/`** — Dark gray (`rgb(60,60,60)`) for light backgrounds (`#f0f0f0` and similar)

The correct variant is selected automatically via `{{ iconTheme }}` in the template path:

```
src="../../common/icons/{{ iconTheme }}/icon_plus.png"
```

`iconTheme` is derived from the current theme name in `updateIconSrc()`:

- `'dark'` → themes: 默认深蓝, 星空紫, 极客绿, 暗夜红, 赛博朋克, 酷黑, 曜石黑
- `'light'` → themes: 晨光白, 暖阳米, 樱花粉, 清新绿

## 5. Icon Generation

Icons are generated using Pillow (`PIL`) via `_gen_homepage_icons.py` in the project root. Run:

```bash
python3 _gen_homepage_icons.py
```

The script generates both `dark/` and `light/` variants for all 6 icons at once.

### Generation Rules

| Icon | Drawing Method | Description |
|------|---------------|-------------|
| `arrow_left` | `draw.polygon()` | Solid filled triangle pointing left |
| `arrow_right` | `draw.polygon()` | Solid filled triangle pointing right |
| `plus` | `draw.rectangle()` ×2 | Two crossing rectangles forming "+" |
| `chevron_up` | `draw.line()` ×2 | Two lines forming "^" |
| `chevron_down` | `draw.line()` ×2 | Two lines forming "v" |
| `swap` | `draw.line()` ×4 | Two horizontal arrows in opposite directions |

### Color Constants

```python
COLORS = {
    "dark":  (200, 200, 200, 255),
    "light": ( 60,  60,  60, 255),
}
```

---

*Last updated: 2026-09-20*