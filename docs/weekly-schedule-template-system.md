# Weekly Schedule Template System

## 1. Overview

Add a template system to the weekly schedule overview (`week-view`) page, allowing users to choose from multiple display templates. Users can select their preferred template in the lab page, and the week-view page will render according to the selected template.

---

## 2. Template Data Model

Each template is defined by a JS object:

```js
{
  id: "minimal-char",           // unique identifier
  name: "\u5355\u5b57\u6781\u7b80",           // display name (Chinese)
  desc: "Single character subject names, no extra info, pure color blocks",
  preview: "/pages/week-grid-simple", // preview demo page path
  // --- template rendering configuration ---
  config: {
    showRowNum: false,           // show/hide row number on left
    showRoom: false,             // show/hide classroom
    showTeacher: false,          // show/hide teacher name
    showTime: false,             // show/hide time range
    subjectDisplay: "char",      // "full" | "char" (full name or single char)
    dayLabel: "cn-num",          // "en" | "cn-num" (Mon-Fri or \u4e00\u4e8c\u4e09\u56db\u4e94)
    colorScheme: "subject",      // "subject" | "pastel" | "gradient"
    blockStyle: "rounded",       // "rounded" | "square" | "pill"
    cellPadding: 2,              // padding between cells
    fontSize: 18,                // font size for subject text
    showLegend: false,           // show/hide color legend
    denseMode: false             // compact layout toggle
  }
}
```

---

## 3. Template List (Planned)

### 3.1 Minimal Char (single character, ultra-minimal) -- Done

| Field | Value |
|-------|-------|
| ID | `minimal-char` |
| Description | Single Chinese character per subject, no room/row numbers |
| Preview | `/pages/week-grid-simple` |
| Day labels | \u4e00 \u4e8c \u4e09 \u56db \u4e94 |
| Subject display | Single char (\u6570/\u82f1/\u8bed/\u7269/\u4f53/\u5316) |
| Row numbers | Hidden |
| Classroom | Hidden |
| Block style | 12px rounded |

### 3.2 Minimal EN (English abbreviation, ultra-minimal)

| Field | Value |
|-------|-------|
| ID | `minimal-en` |
| Description | English 3-letter subject abbreviations, clean blocks |
| Preview | `/pages/week-grid-demo` |
| Day labels | `Mon Tue Wed Thu Fri` |
| Subject display | 3-letter (`Math`, `Eng`, `Chn`, `Phy`, `PE`, `Chem`) |
| Row numbers | Hidden |
| Classroom | Hidden |
| Block style | 8px rounded |

### 3.3 Standard Block (detailed info)

| Field | Value |
|-------|-------|
| ID | `standard-block` |
| Description | Full subject name + classroom + time, row numbers |
| Preview | `/pages/week-overview-demo` |
| Day labels | Mon Tue Wed Thu Fri |
| Subject display | Full name |
| Row numbers | Shown |
| Classroom | Shown |
| Block style | 6px rounded |

### 3.4 Compact Grid (dense, information-rich)

| Field | Value |
|-------|-------|
| ID | `compact-grid` |
| Description | Compact layout with more rows visible at once |
| Day labels | \u4e00 \u4e8c \u4e09 \u56db \u4e94 |
| Subject display | Full name |
| Row numbers | Shown |
| Classroom | Shown (short) |
| Block style | 4px rounded, dense mode |

### 3.5 Color Pastel (soft colors)

| Field | Value |
|-------|-------|
| ID | `color-pastel` |
| Description | Soft pastel color scheme, gentle on eyes |
| Day labels | Mon Tue Wed Thu Fri |
| Subject display | Full name |
| Color scheme | Pastel (soft pink, mint, lavender, peach, sky blue) |
| Block style | 10px rounded |

### 3.6 Minimal Pill (pill-shaped blocks)

| Field | Value |
|-------|-------|
| ID | `minimal-pill` |
| Description | Pill-shaped blocks with single characters, capsule-style |
| Day labels | \u4e00 \u4e8c \u4e09 \u56db \u4e94 |
| Subject display | Single char |
| Block style | pill (50% radius) |
| Row numbers | Hidden |
| Classroom | Hidden |

---

## 4. Template Selection Page

### 4.1 Page: `schedule-template-picker`

A new lab page that shows available templates in a vertical list/card layout.

```
+----------------------------------+
| back         Template Select     |
+----------------------------------+
|                                    |
|  +----------------------------+  |
|  | [preview thumbnail]        |  |
|  | Minimal Char               |  |
|  | Single char, no extras     |  |
|  | [Use]                      |  |
|  +----------------------------+  |
|                                    |
|  +----------------------------+  |
|  | [preview thumbnail]        |  |
|  | Standard Block             |  |
|  | Full info, row numbers     |  |
|  | [Use]                      |  |
|  +----------------------------+  |
|                                    |
|  +----------------------------+  |
|  | [preview thumbnail]        |  |
|  | Compact Grid               |  |
|  | Dense, info-rich           |  |
|  | [Use]                      |  |
|  +----------------------------+  |
|                                    |
+----------------------------------+
```

### 4.2 Storage

Selected template stored in persistent storage:

```
key: "schedule_template_id"
value: "minimal-char" | "minimal-en" | "standard-block" | ...
```

### 4.3 Integration with week-view page

The `week-view` page reads the template config from storage on `onShow()`:

```js
onShow() {
  var self = this
  storage.get({
    key: "schedule_template_id",
    success: function(id) {
      self.applyTemplate(id || "standard-block")
    },
    fail: function() {
      self.applyTemplate("standard-block")
    }
  })
}
```

`applyTemplate(id)` maps the template config to rendering variables:

```js
applyTemplate(id) {
  var tpl = TEMPLATES[id] || TEMPLATES["standard-block"]
  this.showRowNum = tpl.config.showRowNum
  this.showRoom = tpl.config.showRoom
  this.showTeacher = tpl.config.showTeacher
  this.showTime = tpl.config.showTime
  this.subjectDisplay = tpl.config.subjectDisplay
  this.dayLabel = tpl.config.dayLabel
  this.colorScheme = tpl.config.colorScheme
  this.blockStyle = tpl.config.blockStyle
  this.cellPadding = tpl.config.cellPadding
  this.fontSize = tpl.config.fontSize
  this.showLegend = tpl.config.showLegend
  this.denseMode = tpl.config.denseMode
}
```

---

## 5. Template Rendering in week-view.ux

### 5.1 Day labels

```html
<!-- if dayLabel === "en" -->
<text class="week-day">Mon Tue Wed Thu Fri Sat Sun</text>

<!-- if dayLabel === "cn-num" -->
<text class="week-day">\u4e00 \u4e8c \u4e09 \u56db \u4e94 \u516d \u65e5</text>
```

### 5.2 Subject display

```html
<!-- if subjectDisplay === "full" -->
<text class="course-name">{{ course.name }}</text>

<!-- if subjectDisplay === "char" -->
<text class="course-char">{{ course.displayChar }}</text>
```

### 5.3 Row numbers

```html
<!-- if showRowNum === true -->
<text class="time-label">{{ $item.time }}</text>

<!-- if showRowNum === false: hidden or empty spacer -->
<text class="time-label" if="{{ showRowNum }}">{{ $item.time }}</text>
```

### 5.4 Block style

```css
/* rounded */
.course-cell { border-radius: 6px; }

/* pill */
.course-cell { border-radius: 50px; }

/* square */
.course-cell { border-radius: 2px; }
```

### 5.5 Color scheme

```js
// "subject" - color coded by subject type
var COLOR_MAP = {
  "\u6570\u5b66": "#4A90D9",
  "\u82f1\u8bed": "#50B86C",
  "\u8bed\u6587": "#9B59B6",
  // ...
}

// "pastel" - soft pastel colors
var PASTEL_MAP = {
  "\u6570\u5b66": "#A8D8EA",
  "\u82f1\u8bed": "#AAE6C3",
  "\u8bed\u6587": "#DBC4F0",
  // ...
}

// "gradient" - gradient blocks (solid color fallback)
```

---

## 6. Implementation Roadmap

| Phase | Task | Dependencies |
|-------|------|-------------|
| P1 | Define template data model in shared module | None |
| P1 | Create `schedule-template-picker` page | Template model |
| P1 | Add template storage read/write | Storage API |
| P2 | Refactor `week-view.ux` to read template config | Template model |
| P2 | Implement conditional rendering for each config | week-view refactor |
| P2 | Support "minimal-char" and "standard-block" templates | week-view refactor |
| P3 | Support all template variants | Phase 2 |
| P3 | Add preview thumbnails in picker | Template picker |

---

## 7. Template Registration (lab-list.js)

```js
ALL_PAGES = [
  // ... existing pages ...
  { name: "\u6a21\u677f\u9009\u62e9", uri: "/pages/schedule-template-picker" },
]
```

Manifest registration:

```json
"pages/schedule-template-picker": {
  "component": "schedule-template-picker"
}
```

---

## 8. Existing Templates (Demo Pages)

These lab pages serve as visual prototypes for their respective templates:

| Template ID | Demo Page | Status |
|-------------|-----------|--------|
| `minimal-char` | `/pages/week-grid-simple` | Done |
| `minimal-en` | `/pages/week-grid-demo` | Done |
| `standard-block` | `/pages/week-overview-demo` | Done |
| `compact-grid` | TBD | Not started |
| `color-pastel` | TBD | Not started |
| `minimal-pill` | TBD | Not started |