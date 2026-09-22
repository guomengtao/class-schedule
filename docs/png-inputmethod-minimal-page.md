# PNG InputMethod Minimal Page — "hello world"

## Goal

Create a new lab page that uses the **PNG image keyboard** (InputMethod component) and displays "hello world", with the **minimum number of file changes and minimum lines of code**.

---

## Answer: 2 files, ~43 lines of code

| # | File | Action | Lines |
|---|------|--------|:-----:|
| 1 | `src/pages/chinese-input-png/chinese-input-png.ux` | **Create** | ~40 |
| 2 | `src/manifest.json` | **Edit** | +3 |

> `lab-list.js` already has the entry `{ name: "中文输入(图片)", uri: "/pages/chinese-input-png" }` — no change needed.

---

## File 1: Create page file

**Path**: `src/pages/chinese-input-png/chinese-input-png.ux`

```html
<import name="inputmethod" src="../../components/InputMethod/index.ux"></import>

<template>
  <div class="page">
    <div class="header">
      <input class="back-btn" type="button" value="返回" onclick="goBack" />
      <text class="title">hello world</text>
    </div>

    <text class="display-text">hello world</text>

    <div class="input-area" onclick="showKeyboard">
      <text class="placeholder">点击输入</text>
    </div>

    <inputmethod hide="{{ hideKeyboard }}" maxlength="5"
                 screentype="{{ screentype }}"
                 oncomplete="onComplete">
    </inputmethod>

    <text class="footer">InputMethod · PNG Keyboard</text>
  </div>
</template>

<script>
import router from "@system.router"

export default {
  data: {
    hideKeyboard: true,
    screentype: "rect"
  },

  goBack() {
    router.back()
  },

  showKeyboard() {
    this.hideKeyboard = false
  },

  onComplete(e) {
    this.hideKeyboard = true
  }
}
</script>

<style>
.page {
  flex-direction: column;
  padding: 44px 8px 8px 8px;
  min-height: 100%;
  background-color: #1a1a2e;
}
.header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
}
.back-btn {
  width: 60px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
  background-color: #16213e;
  color: #7ec8e3;
}
.title {
  font-size: 18px;
  font-weight: bold;
  flex: 1;
  text-align: center;
  color: #ffffff;
}
.display-text {
  font-size: 24px;
  text-align: center;
  margin: 20px 0;
  color: #ffffff;
}
.input-area {
  padding: 20px;
  border-radius: 10px;
  align-items: center;
  background-color: #16213e;
}
.placeholder {
  color: #888899;
  font-size: 14px;
}
.footer {
  text-align: center;
  font-size: 12px;
  margin-top: 10px;
  color: #555566;
}
</style>
```

---

## File 2: Register route in manifest.json

Add this entry inside `router.pages` in `src/manifest.json`:

```json
"pages/chinese-input-png": {
  "component": "chinese-input-png"
}
```

### Insert position (after `chinese-input-full`):

```json
"pages/chinese-input-full": {
  "component": "chinese-input-full"
},
"pages/chinese-input-png": {
  "component": "chinese-input-png"
},
```

---

## File 3: lab-list.js — already done

The entry already exists in `src/pages/home-module-demo/modules/lab-list.js`:

```javascript
{ name: "中文输入(图片)", uri: "/pages/chinese-input-png" }
```

No change needed.

---

## Summary

| Metric | Value |
|--------|:-----:|
| Files created | **1** |
| Files edited | **1** |
| Total files touched | **2** |
| Total lines of new code | **~43** |
| manifest.json lines added | **3** |
| lab-list.js changes | **0** (already exists) |

### Why so few?

1. **InputMethod is a self-contained component** — just `<import>` and use it, no need to copy any keyboard logic.
2. **Dictionary is module-level singleton** — `dicUtil.js` / `dic.js` are shared across all pages, zero extra cost.
3. **lab-list.js already has the entry** — someone pre-registered the lab name.
4. **The page only needs** a `<text>` showing "hello world", a clickable area to trigger the keyboard, and the `<inputmethod>` tag.

### Comparison with other input method pages

| Page | File | Lines | Complexity |
|------|------|:-----:|------------|
| `chinese-input.ux` | 1 file | ~200 | Full Chinese input, candidate selection, theme support |
| `chinese-input-full.ux` | 1 file | ~200 | Full version with extra features |
| `chinese-input-png.ux` (new) | 1 file | **~40** | Minimal: hello world + PNG keyboard |