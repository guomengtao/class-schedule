# Edit Course Page Header Icons - PNG Replacement Analysis

## Overview

Analyze whether the icons at the top of the edit course page (`detail.ux`) have been replaced with PNG images. The project has standardized on using PNG icons (`src/common/icons/`) instead of Unicode characters for better cross-device rendering consistency.

---

## 1. Page: `detail.ux` (Edit Course - Main)

**Path**: [detail.ux](../src/pages/detail/detail.ux)

### 1.1 Back Button (Line 4)

| Item | Current | Status |
|------|---------|--------|
| **Before** | `<text class="back-btn" ...>◀</text>` | ❌ Unicode |
| **After** | `<image class="back-btn-icon" src=".../icon_back.png">` | ✅ **Fixed: replaced with PNG** |

### 1.2 Left/Right Course Switching Arrows (Lines 24, 35)

| Item | Current | Status |
|------|---------|--------|
| **Before** | `<input class="swipe-arrow" type="button" value="◀/▶" ...>` | ❌ Unicode |
| **After** | `<image class="swipe-arrow-icon" src=".../icon_arrow_left/right.png">` | ✅ **Fixed: replaced with PNG** |

### 1.3 Trash / Delete Button (Line 8)

| Item | Current | Status |
|------|---------|--------|
| **Code** | `<image class="header-trash-icon" src="../../common/icons/{{ iconTheme }}/icon_trash.png">` | ✅ OK |

---

## 2. Page: `lab-edit-course.ux` (Edit Course - Capsule)

**Path**: [lab-edit-course.ux](../src/pages/lab-edit-course/lab-edit-course.ux)

### 2.1 Back Button (Line 4)

| Item | Current | Status |
|------|---------|--------|
| **Code** | `<image class="back-btn-icon" src=".../icon_back.png">` | ✅ OK |

### 2.2 Left/Right Course Switching Arrows (Lines 28, 32)

| Item | Current | Status |
|------|---------|--------|
| **Before** | `<input class="arrow-btn" type="button" value="◀/▶" ...>` | ❌ Unicode |
| **After** | `<image class="arrow-btn-icon" src=".../icon_arrow_left/right.png">` | ✅ **Fixed: replaced with PNG** |

### 2.3 Trash / Delete Button (Line 10)

| Item | Current | Status |
|------|---------|--------|
| **Code** | `<image class="trash-icon" src=".../icon_trash.png">` | ✅ OK |

---

## 3. Summary

| Page | Element | Before | After | Status |
|------|---------|--------|-------|--------|
| `detail.ux` | Back button | Unicode `◀` | `icon_back.png` | ✅ Fixed |
| `detail.ux` | Left arrow | Unicode `◀` | `icon_arrow_left.png` | ✅ Fixed |
| `detail.ux` | Right arrow | Unicode `▶` | `icon_arrow_right.png` | ✅ Fixed |
| `detail.ux` | Trash button | - | `icon_trash.png` | ✅ OK |
| `lab-edit-course.ux` | Back button | - | `icon_back.png` | ✅ OK |
| `lab-edit-course.ux` | Left arrow | Unicode `◀` | `icon_arrow_left.png` | ✅ Fixed |
| `lab-edit-course.ux` | Right arrow | Unicode `▶` | `icon_arrow_right.png` | ✅ Fixed |
| `lab-edit-course.ux` | Trash button | - | `icon_trash.png` | ✅ OK |

**All 5 items fixed.** No Unicode characters remain in the header area.

---

*Last updated: 2026-09-20 (after fixing)*