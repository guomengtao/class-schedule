# Input Method Pages

## Pages

### 1. `/pages/chinese-input` (Legacy)

**Component**: `chinese-input`

**Description**: Old input page with built-in QWERTY keyboard. Does NOT use the `InputMethod` component. Used across most text input scenarios. Also accessible as Lab entry "中文输入".

**Callers** (7 pages + 1 lab menu entry):

| Caller | File | Line |
|---|---|---|
| Add Course | `src/pages/add-course/add-course.ux` | 458 |
| Course Detail | `src/pages/detail/detail.ux` | 520 |
| Schedule Manager | `src/pages/schedule-manager/schedule-manager.ux` | 228 |
| Course Manager | `src/pages/course-manager/course-manager.ux` | 169 |
| Custom Content | `src/pages/custom-content-edit/custom-content-edit.ux` | 345 |
| QRCode Generator | `src/pages/qrcode-generator/qrcode-generator.ux` | 127 |
| Homepage Settings | `src/pages/homepage-settings/homepage-settings.ux` | 343 |
| Lab Menu | `src/data/lab-list.js` (as "中文输入") | 18 |

---

### 2. `/pages/chinese-input-full` (New)

**Component**: `chinese-input-full`

**Description**: New input page using the `InputMethod` component (`src/components/InputMethod/InputMethod.ux`). Supports multiple keyboard modes: Comfort (T9), Standard (QWERTY), Arc. Used by nickname editing.

**Callers** (1 page):

| Caller | File | Line |
|---|---|---|
| Nickname Edit | `src/pages/nickname-edit/nickname-edit.ux` | 150 |

---

### 3. `/pages/keyboard-demo` (Keyboard Lab)

**Component**: `keyboard-demo`

**Description**: Demo/test page for the `InputMethod` component. Allows switching keyboard type (QWERTY / T9) and screen shape (Circle / Rect / Pill-shaped). Lab entry "键盘实验室".

**Callers**: Lab menu only (`src/data/lab-list.js`, line 5)

---

### 4. `/pages/countdown-demo` (Input Keyboard)

**Component**: `countdown-demo`

**Description**: Simple demo page using the `InputMethod` component. Lab entry "输入键盘".

**Callers**: Lab menu only (`src/data/lab-list.js`, line 6)

---

## Summary

| Page | Keyboard Engine | Modes | Accessed From |
|---|---|---|---|
| `chinese-input` | Built-in QWERTY | CN/EN, 123 | 7 production pages + Lab |
| `chinese-input-full` | `InputMethod` component | T9 / QWERTY / Arc | 1 production page (nickname-edit) |
| `keyboard-demo` | `InputMethod` component | QWERTY / T9 | Lab only |
| `countdown-demo` | `InputMethod` component | Default | Lab only |

## Shared Component

**`src/components/InputMethod/InputMethod.ux`** — The reusable keyboard component used by `chinese-input-full`, `keyboard-demo`, and `countdown-demo`. Supports T9 (Comfort), QWERTY (Standard), and Arc keyboard layouts.