# Trash Icon Not Displaying & ID Parameter Bug - Root Cause Analysis

## Issue 1: Trash Icon Not Rendering

### Symptom

The trash icon button in the detail page header does not render:

```html
<text class="header-trash-icon">&#128465;</text>
```

### Root Cause

The QuickApp framework (running on a wearable device with LVGL rendering engine) does **not support rendering Unicode characters from the Supplementary Multilingual Plane (SMP, U+10000+)** in any element, including `<text>`.

The trash emoji `🗑` is Unicode character `U+1F5D1` (&#128465;), which resides in the SMP. The framework's rendering engine cannot handle these characters and produces the error:

```
[AIOTJS] [setFromJs:599] error - Unhandled type
```

### Evidence

1. BMP characters like `&#9664;` (◀, U+25C4) and `&#9654;` (▶, U+25B6) work correctly in both `<input>` and `<text>` elements throughout the codebase.
2. BMP character `&#10005;` (✕, U+2715) works correctly in `<text>` elements (see `demo-music.ux` line 15).
3. SMP character `&#128465;` (🗑, U+1F5D1) fails silently in both `<input>` and `<text>` elements.

### Solution

Use BMP character `&#10005;` (✕) as the delete icon, which is proven to work in this codebase:

```html
<div class="header-trash-btn" onclick="deleteCourse">
  <text class="header-trash-icon">&#10005;</text>
</div>
```

---

## Issue 2: Edit Course Always Shows "美术" (Wrong ID)

### Symptom

Clicking any course on the index page to edit it always opens the detail page showing "美术" instead of the selected course.

### Root Cause

**Async race condition in `onInit()`**. The `storage.get()` calls are **asynchronous**, but the original code called `loadCoursesWithData()` synchronously right after the `storage.get()` calls.

```javascript
// Original code - BUGGY
onInit() {
    storage.get({ key: "detail_classId", success: function(val) {
        self.classId = val || ""  // Async callback, runs LATER
    }})
    storage.get({ key: "detail_day", success: function(val) {
        self.day = val || ""      // Async callback, runs LATER
    }})
    this.loadCoursesWithData()    // Runs IMMEDIATELY, before callbacks fire
}
```

When `loadCoursesWithData()` -> `loadExistingCourseData()` executes, `self.classId` and `self.day` are still empty strings (their initial values). The function then hits the guard:

```javascript
if (!self.classId || !self.day) {
    self.selectCourse(0)  // Always falls here -> picks first course
    return
}
```

`selectCourse(0)` picks the first course in the sorted `presetCourses` array, which is "美术" (first alphabetically/time-sorted in the defaultCourses list).

### Why `onShow()` Didn't Fix It

The `onShow()` lifecycle hook also calls `loadCoursesWithData()`, but `loadCoursesWithData()` internally calls `storage.get(COURSE_LIST_KEY)` - another async call. The first render from `onInit` already set the UI to "美术" via `selectCourse(0)`, and the `onShow` update might not have changed the `courseIndex` since it was already at 0.

### Solution

Use a **gate pattern** to ensure both `detail_classId` and `detail_day` are loaded before calling `loadCoursesWithData()`:

```javascript
onInit() {
    var classIdLoaded = false
    var dayLoaded = false

    function tryLoadCourses() {
        if (classIdLoaded && dayLoaded) {
            self.loadCoursesWithData()
        }
    }

    storage.get({
        key: "detail_classId",
        success: function(val) {
            self.classId = val || ""
            classIdLoaded = true
            tryLoadCourses()
        },
        fail: function() {
            self.classId = ""
            classIdLoaded = true
            tryLoadCourses()
        }
    })
    storage.get({
        key: "detail_day",
        success: function(val) {
            self.day = val || ""
            if (!self.day) { self.setDefaultDay() }
            dayLoaded = true
            tryLoadCourses()
        },
        fail: function() {
            self.day = ""
            self.setDefaultDay()
            dayLoaded = true
            tryLoadCourses()
        }
    })
}
```

This ensures `loadCoursesWithData()` is only called after both `classId` and `day` have been set from storage.