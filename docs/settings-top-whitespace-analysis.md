# Settings Page Top Whitespace Analysis

## Problem

Settings page (`settings.ux`) does not show the expected "one row of top whitespace" before the back button. The back button appears too close to the top edge of the screen.

---

## Root Cause Analysis

### 1. Default CSS — Top Padding Too Small

```css
/* Line 403-405 */
.settings-page {
  flex-direction: column;
  padding: 8px;        /* Only 8px on ALL sides! */
  min-height: 100%;
}

/* Line 411-413 */
.back-header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
  padding: 6px 0;      /* Adds 6px top padding to the header row */
}
```

**Actual top space before the back button = 8px (page) + 6px (header) = 14px**

14px is barely visible as "one row of whitespace". On a 466px screen, that's only 3% of the screen height.

### 2. Media Query Overrides — Inconsistent Top Padding

| Screen Shape | Rule | Top Padding | Visible? |
|:---|:---|:---:|:---:|
| Default | `padding: 8px` | 14px total | ❌ Too small |
| Circle | `padding: 44px 36px` | 44px | ✅ Visible |
| Capsule | `padding: 16px 8px` | 16px | ⚠️ Barely |
| Rect | `padding: 6px` | 10px total | ❌ Way too small |

### 3. Core Issue: `padding` vs `padding-top`

All media queries use shorthand `padding: Xpx` which applies to all four sides equally. This means:

- Circle: 44px top (good) but also 44px bottom (wasted space)
- Rect: 6px top (too small) — this is the problem

The user's vision is: **"top whitespace is a separate concern from side padding"**. The top should have a fixed, visible gap regardless of the horizontal padding.

---

## Visual Comparison

```
Current (rect screen):          Expected:
┌──────────────┐                ┌──────────────┐
│ 6px          │                │ 20px          │  ← Empty row
│ ┌──────────┐ │                │              │
│ │◀ 返回 设置│ │  ← too close   │ ┌──────────┐ │
│ └──────────┘ │                │ │◀ 返回 设置│ │
│              │                │ └──────────┘ │
│  content     │                │              │
│              │                │  content     │
│              │                │              │
└──────────────┘                └──────────────┘
  14px top gap                    20px top gap
  (back button at 14px)           (back button at 20px)
```

---

## Affected CSS Classes

### Root container: `.settings-page`

```css
/* Current: uniform padding, no separate top control */
.settings-page {
  padding: 8px;    /* Default: 8px top */
}
@media (shape: circle) {
  .settings-page { padding: 44px 36px; }  /* 44px top, forced by circle shape */
}
@media (shape: capsule) {
  .settings-page { padding: 16px 8px; }   /* 16px top, barely visible */
}
@media (shape: rect) {
  .settings-page { padding: 6px; }        /* 6px top, invisible */
}
```

### Header row: `.back-header`

```css
/* Current: header padding adds to page padding */
.back-header {
  padding: 6px 0;   /* Adds 6px more on top of page padding */
}
@media (shape: circle) {
  .back-header { padding: 0 20px; }       /* 0 top, 20px left/right */
}
@media (shape: capsule) {
  .back-header { padding: 0 4px; }        /* 0 top, 4px left/right */
}
@media (shape: rect) {
  .back-header { padding: 4px 0; }        /* 4px top, 0 left/right */
}
```

### Problem: Two layers of padding stacking unpredictably

```
Top space = .settings-page padding-top + .back-header padding-top

Default:  8 + 6  = 14px
Circle:  44 + 0  = 44px  ✅
Capsule: 16 + 0  = 16px  ⚠️
Rect:     6 + 4  = 10px  ❌
```

---

## Fix Strategy

### Option A: Remove back-header top padding, control from page root only

```css
/* Default */
.back-header {
  padding: 0;    /* Remove top padding from header */
}

/* Each shape controls top whitespace via the page root */
@media (shape: rect) {
  .settings-page {
    padding: 20px 6px 6px 6px;   /* 20px top, 6px others */
  }
}
@media (shape: capsule) {
  .settings-page {
    padding: 24px 8px 12px 8px;  /* 24px top */
  }
}
@media (shape: circle) {
  .settings-page {
    padding: 44px 36px 44px 36px;  /* Already correct */
  }
}
```

### Option B: Use `padding-top` explicitly

```css
.settings-page {
  padding-top: 20px;    /* Fixed top whitespace */
  padding-left: 8px;
  padding-right: 8px;
  padding-bottom: 8px;
}
```

This way the top padding is always explicit and visible.

---

## Same Issue on Other Pages

This problem is not unique to settings. All pages share the same pattern:

| Page | Default Top | Rect Top | Capsule Top |
|:---|:---:|:---:|:---:|
| settings | 14px | 10px | 16px |
| index | 16px | 8px | 20px |
| schedule-manager | 16px | 12px | 20px |
| course-manager | 16px | 6px | 16px |
| detail | 16px | 16px | 22px |
| add-course | 16px | 18px | 24px |
| week-view | 14px | 4px | 16px |
| nickname-edit | 16px | 16px | 16px |
| reset-data | 14px | 10px | 20px |
| vibration-lab | 14px | 10px | 20px |

All of these have less than 24px top padding on rect/capsule screens, which is insufficient for "one visible row of whitespace".

---

## Recommended Target

| Screen Shape | Target Top Padding |
|:---|:---:|
| Circle | 44px (current) |
| Capsule | 24px (increase from 16px) |
| Rect | 20px (increase from 6-10px) |

This ensures a consistent, visible blank row at the top of ALL pages, on ALL screen shapes.