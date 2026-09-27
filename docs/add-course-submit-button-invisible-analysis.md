# Add Course Page - Submit Button Invisibility Analysis

## Overview

The **Add Course** page (`src/pages/add-course/add-course.ux`) is a single-page form with the following sections stacked vertically:

1. **Header** (back button + title)
2. **Course Selection** (horizontally scrollable course cards)
3. **Time Picker** (start/end hour + minute steppers)
4. **Location Input** (optional, editable text)
5. **Weekday Selection** (7 buttons: Mon-Sun)
6. **Bottom Action Bar** (Cancel + Confirm Add buttons)

The **Confirm Add** button at the very bottom of the scroll becomes partially or fully invisible on certain screen shapes, especially the **capsule screen** (the primary target form factor).

---

## Root Causes

### 1. Bottom Bar Inside Scroll Container (Primary Cause)

The bottom action bar is placed **inside** the `<scroll>` component:

```html
<scroll class="main-scroll" scroll-y="true">
  <!-- ... course section ... -->
  <!-- ... time section ... -->
  <!-- ... location section ... -->
  <!-- ... weekday section ... -->
  <div class="bottom-bar">          ← HERE: inside scroll
    <input class="cancel-btn" ... />
    <input class="save-btn" ... />
  </div>
</scroll>
```

This means:

- The buttons **do not stay fixed** at the bottom of the screen — they scroll with the content.
- When the total content height exceeds the visible area, users must scroll to the very bottom to see the buttons.
- On **capsule screens** (watch form factor, ~160px visible content height), the content easily overflows.

### 2. Insufficient Bottom Padding Inside Scroll

The `.page-root` has bottom padding of `30px`, but this padding is **outside** the scroll area:

```css
.page-root {
  padding: 30px 16px 30px 16px;  /* 30px bottom padding is outside scroll */
}
```

The `.main-scroll` has **no padding-bottom**:

```css
.main-scroll {
  flex: 1;
  min-height: 0;
  flex-direction: column;
  /* ❌ No padding-bottom */
}
```

The `.bottom-bar` only has `margin-bottom: 16px`:

```css
.bottom-bar {
  margin-top: 14px;
  margin-bottom: 16px;  /* Only 16px gap from scroll bottom edge */
}
```

When the user scrolls to the very bottom, the save button is only **16px** away from the bottom of the scroll area. Combined with the page-root's `30px` bottom padding, the visible gap is barely **46px**, which is less than the button's own height (48px). The button appears **cramped against the bottom edge**, making it look partially clipped or uncomfortably close to the edge.

### 3. Capsule Screen Vertical Layout Makes the Bar Taller

On the capsule screen, the bottom bar switches from horizontal to vertical layout:

```css
@media (shape: capsule), (shape: pill-shaped) {
  .bottom-bar {
    flex-direction: column;    /* Horizontal → vertical */
    margin-top: 10px;
    margin-bottom: 12px;
  }
  .cancel-btn {
    width: 100%;
    height: 48px;
    margin-bottom: 8px;       /* Extra spacing between stacked buttons */
  }
  .save-btn {
    width: 100%;
    height: 48px;
  }
}
```

**Height comparison:**

| Screen Shape | Bottom Bar Height |
|---|---|
| Rect (horizontal) | 48px (single row) |
| Capsule (vertical) | 48px + 8px + 48px = **104px** (two stacked rows) |

The capsule layout consumes **104px** instead of 48px, making the overflow problem significantly worse.

### 4. Cumulative Content Height Exceeds Capsule Viewport

Estimated content height breakdown for capsule screen:

| Section | Approx Height | Notes |
|---|---|---|
| Page padding-top | 30px | `.page-root` |
| Header | 44px | `.header` |
| Header margin-bottom | 10px | `header.css` |
| Course section | ~80px | title row + scroll (60px) + margin |
| Time picker section | ~180px | 2 labels + 2 stepper blocks + margins |
| Location section | ~80px | title + input box + margins |
| Weekday section | ~80px | title + buttons + margins |
| Bottom bar | ~104px | 2 stacked buttons |
| Page padding-bottom | 30px | `.page-root` |
| **Total** | **~638px** | **But capsule viewport ~466x466** (square watch) |

On a capsule screen with **466x466px** resolution, the status bar occupies ~60px at the top. The available content height is roughly **370-400px**, yet the content demands **~638px**. This forces scrolling, and the bottom buttons end up far below the fold.

### 5. No Scroll-to-Bottom Guidance

There is no visual hint (such as a fading gradient, a "scroll for more" indicator, or auto-scrolling) to inform users that there is more content below. Users may not realise they need to scroll to find the submit button.

### 6. CSS Comment Reveals This Was a Known Problem

The CSS file already contains a telling comment:

```css
/* min-height: 0 is key: flex children default to min-height:auto,
   content pushes the bottom buttons out of the visible area */
.main-scroll {
  flex: 1;
  min-height: 0;
  ...
}
```

This comment admits that the bottom buttons were being **pushed out of the visible area**, and the only fix was `min-height: 0` on the scroll container — which is a partial band-aid, not a complete solution.

---

## Impact

| Screen Shape | Severity | Description |
|---|---|---|
| **Capsule (pill-shaped)** | **Critical** | Buttons require scrolling to reach; vertical stacking makes bar 2x taller; no visual hint |
| **Rect** | Moderate | Horizontal layout is shorter; still requires scrolling but buttons are easier to spot |
| **Circle** | Moderate | Same as capsule but with even less usable width |

---

## Recommended Fixes

### Option A (Recommended): Fix Bottom Bar Outside Scroll

Move `.bottom-bar` **outside** the `<scroll>` and make it a fixed sibling:

```html
<div class="page-root">
  <div class="header">...</div>
  <scroll class="main-scroll" scroll-y="true">
    <!-- all form content except bottom bar -->
  </scroll>
  <div class="bottom-bar fixed">    ← Outside scroll, stays visible
    <input class="cancel-btn" ... />
    <input class="save-btn" ... />
  </div>
</div>
```

Corresponding CSS:

```css
.page-root {
  padding: 30px 16px 0 16px;       /* Remove bottom padding, add to bottom-bar instead */
}
.main-scroll {
  flex: 1;
  min-height: 0;
  padding-bottom: 10px;            /* Add breathing room at scroll bottom */
}
.bottom-bar.fixed {
  flex-shrink: 0;
  padding: 10px 0 30px 0;          /* Move bottom padding here */
}
```

This ensures the submit button is **always visible** without scrolling.

### Option B: Add Scroll Bottom Padding

If keeping the bar inside the scroll, add generous `padding-bottom`:

```css
.main-scroll {
  padding-bottom: 40px;  /* Ensure buttons have breathing room at scroll end */
}
```

### Option C: Cap Content Height + Auto-Scroll

Ensure the total content fits within the capsule viewport, and auto-scroll to reveal the bottom bar when the user finishes filling in fields.

---

## Related Files

| File | Path |
|---|---|
| Add Course Page | [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux) |
| Shared Header | [header.css](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/common/header.css) |
| Design Proposal | [添加课程页面全新设计方案.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/doc/添加课程页面全新设计方案.md) |
| Requirements Doc | [添加课程栏目开发需求文档.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/添加课程栏目开发需求文档.md) |