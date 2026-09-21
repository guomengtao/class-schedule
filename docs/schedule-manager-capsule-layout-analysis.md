# Schedule Manager Capsule Layout Analysis

## Overview

This document analyzes layout issues on the **schedule-manager** page when displayed on a **capsule screen (198px wide)**. The issues are:

1. Schedule name row cannot fit in one line
2. Two-line wrapping causes visual chaos
3. **Expanded content (actions) is not visible at all**

---

## 1. Capsule Screen Space Budget

| Dimension | Value |
|-----------|-------|
| Screen width | **198px** |
| Page padding (16+16) | -32px |
| Content area width | **166px** |
| Item padding (8+8, capsule) | -16px |
| Item internal width | **150px** |

---

## 2. Item Row: One Line Cannot Fit

### 2.1 Element Width Breakdown

The `.item-row` on capsule contains these horizontal elements:

| Element | Width | Notes |
|---------|-------|-------|
| box (checkbox) | 28px | `.box` width, flex-shrink: 0 |
| name margin-left | 8px | Capsule override |
| name "课程表Ab3" | ~93px | 6 chars × 20px, but name is 3-10 chars |
| course-count margin-left | 4px | Capsule override |
| course-count "15门" | ~52px | Number varies, "门" fixed |
| expand-arrow image | ~28px | Arrow icon |

**Total minimum**: 28 + 8 + 60 (3-char name) + 4 + 40 (1-digit count) + 28 = **168px > 150px** ❌

**Total typical**: 28 + 8 + 93 (6-char name) + 4 + 52 (2-digit count) + 28 = **213px > 150px** ❌

**Total worst-case**: 28 + 8 + 140 (10-char name max) + 4 + 52 + 28 = **260px > 150px** ❌

### 2.2 Conclusion

Even the shortest possible name ("课程表A" = 4 chars = 80px) gives 188px > 150px. **One line can never fit on capsule screen.**

---

## 3. Two-Line Wrapping: Current State (Chaotic)

### 3.1 Current Capsule CSS for Name

```css
@media (shape: capsule), (shape: pill-shaped) {
  .name {
    font-size: 20px;
    lines: 2;           /* allows 2-line wrapping */
    text-overflow: ellipsis;
    margin-left: 8px;
    line-height: 28px;
  }
  .course-count {
    font-size: 20px;
    margin-left: 4px;
    flex-shrink: 0;     /* never wraps */
    line-height: 28px;
  }
}
```

### 3.2 Visual Result (with `lines: 2`)

With name `lines: 2`, the flex layout produces:

```
Line 1: [box 28px] [name line1 "课程表"] [course-count "15门"] [arrow ▼]
Line 2: [         ] [name line2 "Ab3"     ] [                       ]
```

**Problems**:
- `course-count` stays on line 1 because it's `flex-shrink: 0` and flows after the name
- The arrow stays at the far right of line 1
- Line 2 has only the name continuation, leaving empty space on the right
- The layout looks **unbalanced and disorganized**

### 3.3 What Actually Happens with `lines: 2`

In QuickApp flexbox, `lines: 2` on a `<text>` element tells the text to wrap internally. The `<text>` element itself still participates as a single flex item. The browser/engine wraps *text content* inside the `<text>` element across 2 lines, but the element's box is determined by the flex container.

For a name like "课程表Ab3" (6 chars, ~93px):
- `lines: 2` → text wraps at ~47px per line
- "课程表" = 60px > 47px → wraps: "课程" on line 1, "表Ab3" on line 2
- The `<text>` element box becomes ~94px wide (still one flex item)

But the `.item-left` also contains `course-count` which is a separate `<text>` element. Both flex items try to fit in 94px (item-left = 150 - 28 - 28 = 94px). Name needs ~60px min-width + course-count needs ~44px = 104px > 94px. **Still overflows!**

### 3.4 The Real Problem

Even with `lines: 2`, the name element still needs its intrinsic width in the flex container. The `course-count` with `flex-shrink: 0` refuses to shrink. Together they exceed the available 94px in `.item-left`, causing:

- `course-count` gets pushed out of view (overflow hidden or clipped)
- Or the layout breaks with overlapping elements

---

## 4. Expanded Content: Why Nothing Is Visible

This is the **critical issue** the user reports: expanding an item shows nothing.

### 4.1 The Actions CSS Gap

Looking at the capsule media query for `.action-btn`:

```css
/* Capsule override */
.action-btn {
  flex: none;
  width: calc(50% - 4px);
  height: 36px;
  margin-bottom: 6px;
}
```

But the **default** `.action-btn` style is:

```css
.action-btn {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;    /* ← NOT overridden in capsule! */
}
```

### 4.2 Width Calculation (per button)

In the capsule, each button:
- `width: calc(50% - 4px)` = 50% of parent (150px) - 4px = **71px**
- `margin-right: 8px` (inherited from default) = **+8px**
- **Total per button: 79px**

Two buttons per row: 79px × 2 = **158px > 150px** (parent width) ❌

### 4.3 Wrapping Chaos

With `flex-wrap: wrap` on `.action-row` and 3 buttons per row:

```
Expected 2-column layout:
┌──────────┬──────────┐
│  重命名  │   复制   │
├──────────┼──────────┤
│   导出   │          │  ← 3rd button wraps to new row, 1 per row
└──────────┴──────────┘
```

**Actual result** (buttons overflow parent):
- Line 1: button1 (79px) fits, button2 (79px) wraps because 158 > 150
- Line 2: button2 (79px) alone
- Line 3: button3 (79px) alone
- Divider (1px + 8px margin × 2)
- Line 4-6: next 3 buttons, same wrapping

**Total actions height**: 6 button rows × (36px + 6px margin) + divider + padding = **~280px**

### 4.4 Why It Appears "Invisible"

The expanded actions area is ~280px tall. On a capsule screen:

- Screen height: ~300px (typical capsule)
- Top padding: 44px (status bar area)
- Header: 44px
- Item row: ~56px (2 lines of text)
- **Remaining for actions: 300 - 44 - 44 - 56 = 156px**

**280px needed > 156px available** → Actions content is pushed **below the visible area**!

If the `<scroll>` component does not properly handle this overflow (or if there's a `height: 100%` constraint), the actions area is simply **off-screen and invisible** to the user.

### 4.5 Additional Factor: `.item { flex-shrink: 0 }`

```css
.item {
  flex-shrink: 0;  /* prevents shrinking */
}
```

When the item expands, `flex-shrink: 0` prevents the scroll container from compressing it. But the combined height (item row + actions) exceeds the screen, and without proper scrolling, the content is hidden below the viewport.

---

## 5. Root Cause Summary

| # | Issue | Cause | Impact |
|---|-------|-------|--------|
| 1 | Name row overflow | 213px content in 150px space | Name truncated, count hidden |
| 2 | `lines: 2` doesn't help | Flex items still compete for width | Layout still broken |
| 3 | `margin-right: 8px` not cleared | Default style bleeds into capsule | Buttons overflow parent |
| 4 | Actions too tall | 280px expanded area in <200px viewport | Content pushed off-screen |
| 5 | flex-wrap mismatch | 3 buttons + 2-column width = uneven rows | Visual chaos |

---

## 6. Proposed Fix

### 6.1 Strategy

1. **Priority**: Schedule name MUST be fully visible
2. **Actions**: Must fit within the viewport when expanded
3. **Clean layout**: No overlapping or clipped elements

### 6.2 Name Row: Split into Two Physical Rows

Instead of relying on `lines: 2` (which keeps elements as flex siblings), physically split the layout for capsule:

```html
<!-- Capsule: two-row layout for item-left -->
<div class="item-left-capsule">
  <div class="name-row-1">
    <div class="box">...</div>
    <text class="name">课程表Ab3</text>
    <image class="expand-arrow-img">...</image>
  </div>
  <div class="name-row-2">
    <text class="course-count">15门</text>
  </div>
</div>
```

Or, simpler CSS-only approach: change `.item-row` to `flex-wrap: wrap` on capsule and restructure:

```css
@media (shape: capsule), (shape: pill-shaped) {
  .item-row {
    flex-wrap: wrap;
  }
  .item-left {
    flex-direction: column;  /* stack name and count vertically */
    flex: 1;
    min-width: 0;
  }
  .name {
    width: 100%;
    lines: 2;
  }
  .course-count {
    margin-left: 38px;  /* align with name text (box 28 + margin 10) */
  }
}
```

### 6.3 Actions: Fix Button Width and Reduce Height

```css
@media (shape: capsule), (shape: pill-shaped) {
  .action-btn {
    flex: none;
    width: calc(50% - 4px);
    height: 32px;          /* reduce from 36px */
    margin-right: 0;        /* ← CRITICAL: clear default margin */
    margin-bottom: 4px;     /* reduce from 6px */
  }
  
  .action-btn:nth-child(odd) {
    margin-right: 8px;      /* only gap between 2 columns */
  }

  .action-divider {
    margin: 4px 0;          /* reduce from 8px */
  }

  .actions {
    padding-top: 8px;       /* reduce from 12px */
    margin-top: 6px;        /* reduce from 10px */
  }
}
```

### 6.4 Height Budget After Fix

| Element | Height |
|---------|--------|
| Page top padding | 44px |
| Header | 44px |
| Item row (2-line name) | ~56px |
| Actions padding-top | 8px |
| Button row 1 (3 buttons → 2 rows wrapped) | 32+4 + 32+4 = 72px |
| Divider | 1px + 8px margin |
| Button row 2 (same wrap) | 72px |
| Item padding | 20px |
| **Total expanded item** | **~280px** |

This still exceeds typical capsule height. **The scroll must work properly.** Verify:

1. The `<scroll>` component has `scroll-y="true"` ✓ (already present)
2. The scroll has explicit height or flex-grow to fill available space
3. No `overflow: hidden` on parent containers

### 6.5 Ensure Scroll Works

The page class should use `flex: 1` instead of `height: 100%`:

```css
.page {
  flex: 1;                /* instead of height: 100% */
  flex-direction: column;
  padding: 44px 12px 12px 12px;
}
```

And the parent `.page-root` stack should allow the scroll to take remaining space:

```css
.page-root {
  width: 100%;
  height: 100%;
  position: relative;
  flex-direction: column;
}
```

---

## 7. Visual Target

### 7.1 Collapsed State (Capsule)

```
┌────────────────────────────┐
│  ◀  课程表管理             │  header (44px)
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ [✓] 课程表Ab3          │ │  name on line 1
│ │      15门           ▼  │ │  count on line 2 + arrow
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ [ ] 课程表Xy7          │ │
│ │      8门            ▼  │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│   [+ 新增课程表]           │
│     固定到首页             │
└────────────────────────────┘
```

### 7.2 Expanded State (Capsule)

```
┌────────────────────────────┐
│  ◀  课程表管理             │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ [✓] 课程表Ab3       ▲  │ │  arrow flips up
│ │      15门               │ │
│ │ ┌─────────┬──────────┐ │ │
│ │ │ 重命名  │   复制   │ │ │  2 columns
│ │ ├─────────┼──────────┤ │ │
│ │ │  导出   │          │ │ │  3rd wraps
│ │ ├─────────┴──────────┤ │ │
│ │ │  总览   │   统计   │ │ │
│ │ ├─────────┼──────────┤ │ │
│ │ │  删除   │          │ │ │
│ │ └─────────┴──────────┘ │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ [ ] 课程表Xy7       ▼  │ │  other items still visible
│ │      8门                │ │
│ └────────────────────────┘ │
├────────────────────────────┤  ← scroll to see more
│   [+ 新增课程表]           │
└────────────────────────────┘
```

---

## 8. Implementation Checklist

| # | Change | File | Priority |
|---|--------|------|----------|
| 1 | Fix `.action-btn` margin-right to 0 in capsule | schedule-manager.ux | Critical |
| 2 | Reduce button heights and margins in capsule | schedule-manager.ux | High |
| 3 | Restructure `.item-left` for capsule (name + count vertical) | schedule-manager.ux | High |
| 4 | Ensure `.actions` padding/margin is reduced for capsule | schedule-manager.ux | High |
| 5 | Verify scroll component properly handles dynamic height | schedule-manager.ux | Medium |
| 6 | Test with 3-char, 6-char, and 10-char schedule names | manual test | High |

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux) | Capsule `@media` CSS block: fix action-btn margin, adjust item-left layout, ensure scroll works |