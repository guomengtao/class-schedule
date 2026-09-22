# Input Method Comparison Analysis

## Project A: Class App InputMethod (`src/components/InputMethod/`)
## Project B: Vela_input_method (`github.com/NEORUAA/Vela_input_method`)

> **Analysis method**: Direct source code comparison via `git clone` on 2026-09-10.

---

## 0. Executive Summary

**Our project is a stripped-down fork of Vela_input_method.** The two projects share:

- **Identical** dictionary engine (`dicUtil.js` - 490 vs 492 lines, only diff = Japanese support)
- **Identical** dictionary data files (`dic.js`, `dic_words.js`, `dic_words_initials.js`, `pinyin_syllables.js`)
- **Identical** multi-tier matching algorithm (exact → prefix → forward index → initials → mixed → composed)
- **Identical** lazy-init + chunked index building performance optimization
- **Identical** screen adaptation strategy (circle / rect / pill-shaped)
- **Identical** keyboard asset images (same PNG files with same names)
- **Same** comment annotations explaining lazy-init rationale

Vela_input_method is the **upstream** that has more features. Our version removed T9 keyboard support, Japanese input, screenWidth auto-detection, and some API properties.

---

## 1. Architecture & Positioning

| Aspect | Class InputMethod | Vela_input_method |
|--------|------------------|-------------------|
| **Type** | Embedded UI component | Embedded UI component |
| **Platform** | Xiaomi Vela QuickApp | Xiaomi Vela QuickApp |
| **Role** | Component within a larger app | Reusable component for any app |
| **Component name** | `index.ux` (default QuickApp name) | `InputMethod.ux` (explicit name) |
| **Import path** | `<import name="input-method" src="../../components/InputMethod/index.ux">` | `<import name="input-method" src="../../components/InputMethod/InputMethod.ux">` |
| **Installation** | Part of Class app repo | Manual copy from GitHub |
| **File size** | 847 lines (`index.ux`) + asset images | 1016 lines (`InputMethod.ux`) + asset images |

**Correction from previous analysis**: Both are embedded components, NOT system-level input methods. Both use the same `dicUtil.js` engine, same dictionary files, and same asset images. Vela_input_method is just a more feature-complete version.

---

## 2. What Vela_input_method Has That We Don't

### 2.1 T9 Keyboard Layout

Vela_input_method supports **two keyboard layouts** via the `keyboardtype` property:

```
keyboardtype: "QWERTY"  (default, full QWERTY keyboard)
keyboardtype: "T9"      (9-key numpad layout)
```

**T9 layout definition** (from `InputMethod.ux:data.keys.t9`):
```javascript
t9: [
  ["abc", "def"],
  ["ghi", "jkl", "mno"],
  ["pqrs", "tuv", "wxyz"],
]
```

**Our project** hardcodes QWERTY-only. We have NO `keyboardtype` property, NO T9 template branches, NO T9 assets.

**T9 assets in Vela_input_method** (`assets/t9/`):
```
cn.png  en.png  a.png  123.png  space.png  del.png  back2.png  bigA.png
```

### 2.2 Japanese Input (Romaji → Kanji/Kana)

Vela_input_method has a dedicated Japanese dictionary file and engine integration:

**`assets/dic_jp.js`** (14 lines) - Romaji to kanji/kana mapping:
```javascript
// Romaji → Japanese character mapping
// Examples:
//   "nihongo":"日本語", "watashi":"私", "sakura":"桜"
//   "konnichiwa":"こんにちは", "arigatou":"ありがとう"
```

**Engine integration in `dicUtil.js`**:
- Imports `getDictJp` from `dic_jp.js`
- Stores dictionary in `this.dict.romaji2kanji`
- Adds `lang === 'jp'` branch in `getSingleHanzi()` for romaji lookup
- Japanese candidates generated when `lang === 'jp'`

**Separate Japanese number/symbol mode** (`numFlag_jp`):
- Japanese has its own symbol layout (`sign_jp` and `sign62_jp`)
- Includes Japanese-specific symbols like `"…"` (ellipsis), `"、"` (Japanese comma)
- Separate toggle state so CN/EN symbols don't interfere with JP symbols

**Our project** has NO Japanese support. No `dic_jp.js`, no `numFlag_jp`, no `romaji2kanji`, no `lang === 'jp'` engine paths.

### 2.3 screenWidth Auto-Detection

Vela_input_method has an `adjustScreenWidth()` method called in `onInit`:

```javascript
if (this.screentype === "rect" || this.screentype === "pill-shaped") {
  this.adjustScreenWidth();
}
```

This dynamically detects the device width via the Vela system API and binds it to `screenWidth` in the template, enabling the same component to adapt to different rect screen sizes (e.g., n67 vs o65).

**Our project** does NOT have this. We hardcode screen dimensions based on the `screentype` prop.

### 2.4 keyboardtype Public API Property

Vela_input_method exposes `keyboardtype` as a component property:

```
Attributes:
  Name          Type    Default   Required  Description
  keyboardtype  string  "QWERTY"  No        "QWERTY" or "T9"
```

This is a **public API** that consumers can set. Our project has no such property.

### 2.5 T9 Multi-Tap Waiting Mechanism

Vela_input_method implements a `waitingList`/`waitingIndex` mechanism for T9 multi-tap:
- When a T9 key (e.g., "abc") is pressed, the characters are stored in `waitingList`
- Subsequent presses cycle through the list (`waitingIndex` increments)
- Pressing a different key or waiting commits the current selection

**Our project** does NOT have T9, so it does not need this mechanism. However, the `waitingList`/`waitingIndex` data properties are also absent from our component.

---

## 3. Detailed Source Code Comparison

### 3.1 Main Component File (`index.ux` vs `InputMethod.ux`)

| Aspect | Class (847 lines) | Vela (1016 lines) |
|--------|-------------------|-------------------|
| Template nodes | QWERTY only | QWERTY + T9 branches |
| Script methods | CN+EN only | CN+EN+JP + T9 |
| Props | `hide`, `maxlength`, `vibratemode`, `screentype` | Same + `keyboardtype` |
| Data | `numFlag` | `numFlag` + `numFlag_jp` |
| | No `waitingList` | Has `waitingList`/`waitingIndex` |
| | No `screenWidth` | Has `screenWidth` + `adjustScreenWidth()` |
| Event `visibilityChange` | Present | Present (same) |
| Event `complete` | Present | Present (same) |
| Event `delete` | Present | Present (same) |
| Event `keyDown` | Present | Present (same) |
| Asset paths | `./assets/` (relative) or `/components/InputMethod/assets/` (absolute) | `./assets/` (relative) |

### 3.2 Dictionary Engine (`dicUtil.js`)

**Vela: 492 lines | Class: 490 lines**

The diff is minimal — only **2 substantive differences**:

| Line | Vela_input_method | Class |
|------|------------------|-------|
| Import | `import { getDictJp } from './dic_jp.js'` | **Not present** |
| Init | `this.dict.romaji2kanji = getDictJp()` | **Not present** |
| getSingleHanzi | Has `jp` branch returning `this.dict.romaji2kanji[pinyin]` | Returns empty for `jp` |

Everything else is identical: syllable set, segmentation algorithm, word matching, forward index building, chunked init. The same bugs, the same edge cases, the same variable names.

### 3.3 Dictionary Data Files

All dictionary files are **byte-for-byte identical**:

| File | Size (lines) | Content |
|------|-------------|---------|
| `dic.js` | 11 | Pinyin → single character mapping (~6,763 chars) |
| `dic_words.js` | 1,180 | Pinyin → multi-character word mapping (~3,000 words) |
| `dic_words_initials.js` | 815 | Abbreviation index (e.g. "nb"→"牛逼") |
| `pinyin_syllables.js` | 57 | Valid pinyin syllable list (~400 entries) |

### 3.4 Asset Images

Both projects share the same keyboard button image assets across all screen types:

| Screen type | Assets | Vela has | Class has |
|-------------|--------|----------|-----------|
| `full/` | Circle screen QWERTY (~35 PNGs) | ✅ | ✅ |
| `horizontal/` | Rect screen keyboard (~14 PNGs) | ✅ | ✅ |
| `arc/` | Pill-shaped screen keyboard (~13 PNGs) | ✅ | ✅ |
| `t9/` | T9 keyboard buttons (~8 PNGs) | ✅ | **❌ Missing** |

---

## 4. Why Our Project Stripped These Features

The design intent is clear from the codebase context:

1. **T9 removed** — The Class app uses a text-heavy interface (class timetables, notes). T9 is inefficient for this use case. QWERTY provides faster, more accurate input.

2. **Japanese removed** — The app targets Chinese users (中文用户). Japanese input adds dictionary bloat (~14KB for `dic_jp.js`) with zero benefit for the target audience. Our app only needs CN + EN.

3. **screenWidth removed** — Our app targets specific watch models. The `screentype` prop is sufficient; auto-detection is unnecessary complexity.

4. **Component renamed** — `index.ux` is the QuickApp convention. The original `InputMethod.ux` name was kept by Vela_input_method for clarity.

---

## 5. What We Could Gain from Vela_input_method

Despite having fewer features, there are things we could learn from the upstream:

| Potential Improvement | Current State | Vela Approach |
|----------------------|---------------|---------------|
| **T9 as fallback** | QWERTY only | keyboardtype prop for switching |
| **screenWidth adaptation** | Manual screentype prop | Auto-detect + adjust |
| **Asset organization** | Assets in `assets/` | Same, but has `t9/` subdir |
| **API completeness** | Fewer properties/events | More complete component API |
| **maintainability** | Component renamed to `index.ux` | Explicit `InputMethod.ux` name |

---

## 6. Summary

| Dimension | Class InputMethod | Vela_input_method |
|-----------|------------------|-------------------|
| **Relationship** | 🔽 **Stripped-down fork** | ⬆️ **Upstream** |
| **Engine** | Identical (CN only) | Identical (CN + JP) |
| **Dictionaries** | Identical content | Same + `dic_jp.js` |
| **Keyboard layouts** | QWERTY only | QWERTY + T9 |
| **Languages** | Chinese, English | Chinese, English, Japanese |
| **Screen adaptation** | Manual `screentype` prop | Manual + auto-detect |
| **API surface** | 4 props, 4 events | 5 props, 4 events |
| **Code size** | 847 lines | 1016 lines |
| **Asset count** | ~62 PNGs | ~70 PNGs (+8 T9) |

**Bottom line**: The two projects are not competitors — they are versions of the same codebase. Vela_input_method is the upstream with more features (T9, Japanese, screenWidth auto-detect). Our project is a focused fork that stripped these features to reduce size and complexity for a Chinese-only QWERTY use case. Any bug fix or engine improvement in Vela_input_method can likely be merged directly into our codebase with minimal conflict.