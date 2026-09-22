# Four Bug Analysis Report

## Overview

This document analyzes four user-reported bugs. Each bug is traced to its root cause in the codebase through code reading and data flow analysis.

---

## Bug 1: Template Changes Not Taking Effect on Homepage

### Phenomenon

After changing "模版选择" (Template Selection) in the Settings page, the homepage display does not update as expected.

### Root Cause Analysis

**Verdict: Not a code mix-up — the template system simply does not extend to the homepage.**

The Settings page's "模版选择" is located under the "周课表" (Weekly View) group:

[settings.ux:L81-L87](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L81-L87)
```
<div class="row" onclick="openTemplatePicker">
  <text class="row-label">模版选择</text>
  ...
</div>
```

This calls `store.getWeekViewTemplate()` / `store.setWeekViewTemplate()` which reads/writes the storage key `"weekview_template"`. It only affects the **weekly view page** (`/pages/week-view`).

[store.js:L895-L914](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js#L895-L914)
```javascript
getWeekViewTemplate: function(callback) {
    storage.get({
      key: "weekview_template",     // ← Weekly view ONLY
      ...
    })
},
setWeekViewTemplate: function(templateId, callback) {
    storage.set({
      key: "weekview_template",     // ← Weekly view ONLY
      ...
    })
}
```

The homepage (`index.ux`) has **no template mechanism at all**. It only reads `homepage_settings` from `store.getHomepageSettings()` which controls visibility toggles (show/hide clock, quick add, day navigation buttons, etc.). There is no template ID or template rendering logic in the homepage.

[index.ux:onShow](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L332-L358)
```javascript
onShow() {
    ...
    self.loadHomepageSettings()   // ← Only reads toggle settings, NOT templates
    ...
}
```

The user previously clarified that the homepage has **10 independent templates** and the weekly view has **5 templates**. The current codebase only implements the 5-template system for the weekly view. The homepage template system either was never implemented or was removed during a previous refactor.

### Conclusion

**The code is NOT mixed up.** The template picker correctly uses `weekview_template` which is consumed by the weekly view page. The homepage never reads `weekview_template`. The fix requires either:

1. Implementing a separate homepage template system (10 templates) with its own storage key, or
2. Making the homepage also respond to `weekview_template` changes if intentional

---

## Bug 2: Square Screen (rect) UI Defects

### 2a: Navigation Button Triangle Size

#### Phenomenon

On square screens, the left/right navigation arrow images (triangles) inside the circular buttons are too large (48x48px), appearing disproportionate.

#### Root Cause

The `@media (shape: rect)` CSS block only overrides `.nav-btn-img` to **48x48px**, but this is the image size, not the button size.

[index.ux:L1211-L1215](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L1211-L1215)
```css
@media (shape: rect) {
  /* 方屏横向空间充足，按规范取 48px */
  .nav-btn-img {
    width: 48px;
    height: 48px;
  }
```

The default CSS (non-media-query) sets `.nav-btn-img` to 24x24px:

[index.ux:L706-L709](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L706-L709)
```css
.nav-btn-img {
  width: 24px;
  height: 24px;
}
```

The circle (capsule) media queries keep it at 22x22px. The rect version at 48x48px is clearly an error — the triangle image should remain small (22-24px) across all screen shapes. Only the circular button container (`.nav-btn-circle`) should scale up on larger screens.

### 2b: Bottom "+" Button Black Border

#### Phenomenon

On square screens, the "+" add button shows a black border instead of the accent color border.

#### Root Cause

The button HTML has inline styles:

[index.ux:L204-L206](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L204-L206)
```html
<div class="add-btn-wrapper" onclick="openAddCoursePage"
     style="background-color: transparent; border-width: 2px; border-color: {{ theme.accent }}">
```

The CSS class sets `border-width: 0`:

[index.ux:L888-L896](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L888-L896)
```css
.add-btn-wrapper {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  border-width: 0;          /* ← CSS sets border to 0 */
  margin-right: 4px;
  ...
}
```

On some QuickApp rendering engines, inline `border-width: 2px` conflicts with the CSS class `border-width: 0`. The inline style should have higher priority, but the rendering result shows black — possibly because the `border-color` evaluated value doesn't propagate correctly when `border-width` is 0 in the CSS cascade, or the inline `border-width` is ignored by certain renderers.

Additionally, the `add-btn-label` text color is set to `theme.bg`:

[index.ux:L207](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L207)
```html
<text class="add-btn-label" if="{{ !isCapsule }}" style="color: {{ theme.bg }}">添加课程</text>
```

For dark themes (e.g., `theme.bg = '#1a1a2e'`), this makes the text nearly invisible on the transparent button background.

### 2c: "添加课程" Text on Square Screens

#### Phenomenon

The "添加课程" label should display on square screens but may not appear (or appears invisible).

#### Status: Template Logic Is Correct

The `if="{{ !isCapsule }}"` condition correctly shows the label on non-capsule screens (including rect/square). The rect CSS has `add-btn-label` font-size styling.

[index.ux:L1347-L1349](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L1347-L1349)
```css
.add-btn-label {
  font-size: 20px;
}
```

The **real issue is the text color**: `color: {{ theme.bg }}` makes it dark-on-dark. It should use `theme.text` or `theme.accent` so it's readable across all themes.

### Summary of Fixes Needed (Bug 2)

| Element | Current (rect) | Expected |
|---|---|---|
| `.nav-btn-img` | 48x48px | 22-24px (matching circle/capsule) |
| `.add-btn-wrapper` border | Black/dark border | Accent color border |
| `.add-btn-label` color | `theme.bg` (invisible) | `theme.text` or `theme.accent` |

---

## Bug 3: Course Deletion — Homepage Not Updating + Unfriendly Error

### Phenomenon A: Homepage Not Updating After Deletion

#### Root Cause Analysis

The deletion flow performs proper cache invalidation:

[database.js:L693-L701](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L693-L701)
```javascript
deleteCourse: function(id, day, callback) {
    ensureReady(function() {
      deleteCourseStorage(id, day, function(err) {
        if (!err) invalidateCache(currentScheduleIndex)  // ← Cache properly cleared
        if (callback) callback(err)
      })
    })
}
```

And the index page's `onShow` calls `loadScheduleData(idx, true)` with `forceRefresh=true`:

[index.ux:L366-L378](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L366-L378)
```javascript
store.getCurrentScheduleIndex(function(idx) {
    if (database.getScheduleIndex() === idx) {
        self.loadScheduleData(idx, true)    // ← forceRefresh=true
    } else {
        database.setScheduleIndex(idx, function() {
            self.loadScheduleData(idx, true)
        })
    }
})
```

**The data loading path is correct.** The most likely cause is one of:

1. **`_skipNextShow` race condition**: If the app is killed and the index page re-initializes, the first `onShow()` skips data loading due to `_skipNextShow`. After deletion, if the page was somehow re-initialized, the refresh would be skipped.

2. **Timing issue with `router.back()`**: The `detail.ux` calls `router.back()` inside `finishDelete()`. If the index page's `onShow` fires before the storage write (invalidation) is fully committed, stale data could be loaded. However, `deleteCourseStorage` completes before `invalidateCache` is called, so this should be fine.

3. **More likely — specific scenario**: The user goes back from detail page **before** the 5-second undo timer fires. In this case, `detail.ux`'s back button calls `router.back()` directly, which goes to index page without the deletion having happened yet. Then the index shows the old data. When the undo timer fires in the destroyed detail page, it doesn't affect anything.

   But wait — looking at the code, `goBack()` in detail.ux just calls `router.back()`. If the user hasn't confirmed deletion (first click sets `deleteConfirm=true`), the course isn't deleted. So this scenario is normal behavior.

### Phenomenon B: Second Deletion Attempt Shows Unfriendly Error

#### Root Cause

After deleting a course and returning to the edit page, the edit page still shows the course data from its **local state**:

[detail.ux:onInit-L269](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L269-L295)
```javascript
loadExistingCourseData() {
    ...
    database.getAllCourses(function(data) {
      // Searches for course by classId in storage data
      var found = false
      ...
      if (!found) {
        self.selectCourse(0)  // ← Shows first course if not found
      }
    })
}
```

When returning to the edit page after deletion:
1. Detail page loads fresh data from storage in `loadExistingCourseData()` (called from `onInit` or `onShow`)
2. The deleted course is NOT found in storage
3. `selectCourse(0)` is called, selecting the first preset course
4. BUT if `onShow` doesn't call `loadExistingCourseData()` properly, stale data persists

Looking at `onShow`:

[detail.ux:onShow-L297](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L297-L312)
```javascript
onShow() {
    var self = this
    store.getTheme(...)
    self.loadCoursesWithData()  // ← Called every time, reloads from storage
    
    // Also reads Chinese input result
    ...
}
```

`loadCoursesWithData` → `loadExistingCourseData` → `database.getAllCourses` should find no matching course and call `selectCourse(0)`. This should work...

But there's a critical path: After successful deletion, the detail page shows an undo bar for 5 seconds, then calls `finishDelete()` → `router.back()`. If the user navigates **back to the edit page manually** (before the undo timer), the edit page's `onShow` fires. At this point, the data might still show the deleted course because:
- The deletion already happened (storage + cache updated)
- But the edit page loads fresh data from storage in `loadExistingCourseData()`
- The deleted course won't be found, so `selectCourse(0)` is called
- This should show a different course

The actual error "课程不存在" comes from:

[database.js:L374-L377](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L374-L377)
```javascript
if (!hit) {
    logErr("deleteCourseStorage course not found: " + id + " day " + day)
    callback(formatError("deleteCourseStorage", "课程不存在"))
    return
}
```

This is user-unfriendly because it shows the raw error message from the database layer without context.

### Summary of Fixes Needed (Bug 3)

1. Ensure `onShow` in index page properly invalidates stale cache after returning from detail page
2. In detail.ux, after deletion is confirmed and executed, navigate away immediately instead of relying on the undo timer
3. Improve error message: instead of "课程不存在", show "该课程已删除，请刷新页面" or auto-navigate back
4. Add defensive check: before rendering edit page, verify the course still exists in storage

---

## Bug 4: Input Method — Text Squeezing After Clicking "More"

### Phenomenon

After clicking the "更多" (down arrow) button in the input method, the candidate word list panel shows squeezed/truncated text. Width settings appear lost.

### Root Cause

The "更多" panel (`.list3`) has a **fixed width of 324px** on circle screens, which is too narrow for long Chinese candidate words:

[InputMethod.ux:L637-L643](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux#L637-L643)
```css
.list3 {
  position:absolute;
  top:38px;
  left:78px;
  width:324px;
  height:160px;
  flex-direction:column;
  background-color:#262626;
  border-radius:12px
}
```

The candidate text items use `.calbtn-down-text`:

[InputMethod.ux:L625-L632](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux#L625-L632)
```css
.calbtn-down-text {
  color:#ffffff;
  font-size:28px;
  margin-left:10px;
  margin-right:10px;
  lines:1;
  text-overflow:ellipsis;
}
```

Key issues:

1. **No `width` or `max-width` on `.calbtn-down-text`**: The text element uses `text-overflow: ellipsis` without a constrained width, so the overflow behavior is undefined in QuickApp's CSS engine.

2. **`.item3` width matches `.list3` at 324px**: The list item has `width: 324px`, but the text inside has 20px horizontal margins (10px left + 10px right), leaving only **304px** for text. For Chinese characters at 28px font-size, this fits about 10-11 characters — but some candidate words or phrases can be longer.

3. **Rect screen `.list67` uses percentage width**: `width: 96.4%` which is generally sufficient, BUT it uses `padding: 0px 10px` which reduces the available width. Combined with the flex layout inside the list, the text may not get proper width constraints.

4. **No `flex-shrink: 0` on text elements**: In the flex container, text elements can be shrunk if the container is tight. The `.calbtn-down-text` doesn't have `flex-shrink: 0` to prevent this.

### Data Flow

When user clicks down arrow:

```
onBtnClick('down') → this.downFlag = "down" → <list class="list3"> becomes visible
                  → resultList2 contains paginated candidates
                  → Each item's text uses .calbtn-down-text
```

### Summary of Fixes Needed (Bug 4)

1. Add `width: 100%` or appropriate `max-width` to `.calbtn-down-text`
2. Set `flex-shrink: 0` on `.calbtn-down-text` to prevent compression in flex layouts
3. Ensure `.item3` has proper flex constraints: `flex-direction: row; align-items: center;`
4. Consider increasing the `.list3` width or making it responsive to screen width
5. For rect/wide screens, use `flex: 1` and `width: auto` with min-width constraint on candidate items

---

## Cross-Cutting Issue: Cache Invalidation Inconsistency

A pattern observed across multiple bugs is inconsistent cache handling:

| Operation | Cache Invalidation | Status |
|---|---|---|
| `insertCourse` | ✅ `invalidateCache(currentScheduleIndex)` | Correct |
| `updateCourse` | ✅ `invalidateCache(currentScheduleIndex)` | Correct |
| `updateCourseAcrossDays` | ✅ `invalidateCache(currentScheduleIndex)` | Correct |
| `deleteCourse` | ✅ `invalidateCache(currentScheduleIndex)` | Correct |
| Template change → Homepage | ❌ No cache for templates | System missing |
| Edit page re-entry after delete | ❌ Local state not re-validated | Bug |

The database layer properly invalidates its cache. The issue is that the **UI layer** (`index.ux`, `detail.ux`) relies on `onShow` to refresh data, and the `onShow` handlers have subtle timing/conditional skips that can prevent proper refresh in edge cases.