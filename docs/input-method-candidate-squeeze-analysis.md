# Chinese Input Method - Capsule Screen "More Candidates" Text Squeezing Analysis

## problem description

On capsule (pill-shaped) screens, after typing Pinyin and clicking the `↓` arrow to expand the "More Candidates" panel, candidate words in the list appear horizontally squeezed -- multi-character words are compressed and hard to read.

---

## scope

| Component/Page | File | Description |
|---------------|------|-------------|
| `InputMethod.ux` | `src/components/InputMethod/InputMethod.ux` | Core IME component, shared by `chinese-input-full` / `keyboard-demo` / `countdown-demo` |
| `chinese-input-full.ux` | `src/pages/chinese-input-full/chinese-input-full.ux` | Production page (nickname editing) |
| Legacy `chinese-input.ux` | `src/pages/chinese-input/chinese-input.ux` | No "More Candidates" feature, unaffected |

---

## Architecture

```
pill-shaped keyboard (305px high)
                                  
  +-- Toolbar (192x110px) --------+
  | lang | scroll(120px) | del |^||
  +-------------------------------+
                                  
  +-- Keyboard scroll (keyboard66) +
  |  Q W E R T Y U I O P          |
  |   A S D F G H J K L           |
  |    Z X C V B N M  [space]     |
  +-------------------------------+
                                  
  +-- More Candidates (down panel)-+
  |  +-- list66 ---------------+   |
  |  | candidate 1             |   |
  |  | candidate 2  <-- SQUEEZ |   |
  |  | candidate 3             |   |
  |  | candidate 4             |   |
  |  +-------------------------+   |
  |        [ ^ close ]            |
  +-------------------------------+
```

---

## Root Cause Analysis

### THE Real Root Cause: `.item { flex: 1 }`

The down panel's DOM structure:

```html
<list-item type="waitingRows66" class="item66" for="{{itemArray in resultList2}}">
  <div class="item column center" for="{{item in itemArray}}">
    <text class="calbtn-down-text" ...>{{item}}</text>
  </div>
</list-item>
```

The `.item` class has:

```css
.item {
  height: 52px;
  flex: 1;      /* culprit */
}
```

`flex: 1` = `flex: 1 1 0%`, meaning **each child divides the parent container width equally**.

The math on a capsule screen:

| Item | Value |
|------|-------|
| Screen width | 192px |
| `l66DownPanelWidth` | `min(max(192-12,120),192)` = **180** |
| `.list66` inline width | `l66DownPanelWidth - 6` = **174** |
| `.list66` padding | 10 x 2 = **20** |
| Usable content width | **154px** |
| Candidates per list-item (cap = maxlength) | **5** |
| **Each candidate gets** | **154 / 5 = 30.8px** |

**A 30.8px slot holding 28px font** -- a 2-character Chinese word needs ~56px, but only 31px is allocated. `.calbtn-down-text` has `flex-shrink: 0` which refuses to shrink, so text overflows/overlaps = the "squeezing" visual effect.

### Actually a Class Gap, Not a Screen Width Problem

The circle screen's down panel uses:

```html
<div class="item column center list3-item" ...>
```

Where:

```css
.list3-item {
  flex: none;       /* overrides .item { flex: 1 } */
  width: auto;
  padding-left: 6px;
  padding-right: 6px;
}
```

The capsule screen's `.list66` **was missing this same flex override**. That's why circle screen worked fine while capsule didn't.

---

## What Was Fixed

### Fix 1: Capsule Screen Uses 1 Candidate Per Row (instead of 5)

In `setResultListAll()`, the down panel pagination uses `rowCap`:

```js
const rowCap = (this.screentype === 'pill-shaped') ? 1 : cap;
```

With `rowCap = 1`, each `<list-item>` contains only one `<div class="item">`, so `flex: 1` has nothing to divide -- the single child fills the full row width naturally.

### Fix 2: CSS Override (Belts and Suspenders)

```css
.list66 .item {
  flex: none;
  width: 100%;
  min-width: 0;
  padding-left: 6px;
  padding-right: 6px;
}
```

This mirrors the existing `.list3-item` pattern, providing a safety net even if per-page count changes in the future.

### Fix 3: Dynamic Panel Width

The down panel container width dynamically adapts to screenWidth:

```js
self.l66DownPanelWidth = Math.min(Math.max(data.screenWidth - 12, 120), 192);
```

Prevents the panel from overflowing the screen edge on narrow capsule devices.

---

## Trigger Flow (Before Fix)

```
User types Pinyin -> resultList2 = [[a, b, c, d, e], [f, g, h, i, j], ...]
    (each sub-array = 5 items = maxlength cap)
    ↓
User clicks down arrow -> downFlag = 'down' -> <list class="list66"> visible
    ↓
list66 renders: 5 candidates per list-item via for="{{item in itemArray}}"
    ↓
.item { flex: 1 } divides 154px by 5 -> 30.8px per candidate
    ↓
28px font overflows 30.8px slot -> text squeezed / ellipsis failed
```

---

## After Fix

```
resultList2 = [[a], [b], [c], [d], [e], [f], ...]
    (each sub-array = 1 item = rowCap on pill-shaped)
    ↓
list66 renders: 1 candidate per list-item
    ↓
.item { flex: 1 } has nothing to divide -> single child fills full width
    ↓
28px font has 154px available -> fits 5+ characters normally
```

---

## Comparison with Circle Screen

| Aspect | Circle (`.list3`) | Capsule (`.list66`) Before Fix | Capsule (`.list66`) After Fix |
|--------|-------------------|-------------------------------|-------------------------------|
| Flex override | `.list3-item { flex: none }` | **Missing** | `.list66 .item { flex: none }` |
| Per-page count | `maxlength` (e.g. 5) | `maxlength` (e.g. 5) | **1** |
| Item width | Auto | 30.8px | Full row (~154px) |
| Result | Normal | Squeezed | Normal |

---

## Verification Checklist

- [ ] Capsule (160px) type `nihao` -> top horizontal candidate row unchanged (still scrollable)
- [ ] Click `↓` -> down panel opens, each candidate fills full row, no squeezing
- [ ] Long candidates (e.g. "Zhongguo" -> "China") displayed fully
- [ ] Circle screen regression: `.list3` down panel unaffected
- [ ] Rect screen regression: `.list67` unaffected
- [ ] Multiple `↓↑` toggles show no width accumulation/drift

---

## Related Documents

| Document | Content |
|----------|---------|
| `docs/four-issues-analysis.md` (Bug 4) | Circle screen `list3` 324px container analysis |
| `docs/capsule-text-occlusion-analysis.md` | Capsule screen text occlusion analysis |
| `docs/chinese-input-enhancement-plan.md` | Input method enlargement/adaptation plan |