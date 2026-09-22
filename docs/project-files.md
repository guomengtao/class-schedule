# Project File Structure (by Link Relations)

## Navigation Legend

```
Page ──→ Destination    router.push / nav.push
Page ──→ *              dynamic routing (pinned pages / lab list)
Page ←── (back)         router.back() only
```

---

## 1. Entry

### `/pages/welcome` — Welcome / Splash

```
welcome ──→ /pages/index-full     (default homepage)
welcome ──→ /pages/week-view      (alternative homepage)
welcome ──→ /pages/settings
```

---

## 2. Home

### `/pages/index-full` — Main Schedule (home page)

```
index-full ──→ /pages/detail              (click class card)
index-full ──→ /pages/add-course          (bottom "+ Add")
index-full ──→ /pages/settings            (bottom "Settings")
index-full ──→ /pages/schedule-manager    (top schedule switcher)
index-full ──→ /pages/week-view           (top "Zong" button)
index-full ──→ * /pages/*                 (pinned pages bar, dynamic)
```

---

## 3. Settings Tree

### `/pages/settings` — Settings Hub

```
settings ──→ /pages/nickname-edit         (edit nickname)
settings ──→ /pages/lab                   (lab / test area)
settings ──→ /pages/activation            (premium activation)
settings ──→ /pages/donate                (donate page)
settings ──→ /pages/homepage-settings     (homepage configuration)
settings ──→ /pages/backup-restore        (data backup & restore)
settings ──→ /pages/reset-data            (reset everything)
settings ──→ /pages/template-picker       (theme/color picker)
settings ──→ /pages/welcome               (welcome page)
```

### `/pages/homepage-settings` — Homepage Config

```
homepage-settings ──→ /pages/activation
homepage-settings ──→ /pages/custom-content-edit
homepage-settings ──→ /pages/chinese-input
```

### `/pages/nickname-edit` — Edit Nickname

```
nickname-edit ──→ /pages/chinese-input-full
```

### `/pages/backup-restore` — Backup & Restore

```
backup-restore ──→ /pages/activation
```

### `/pages/reset-data` — Reset Data

```
reset-data ──→ /pages/activation
```

### `/pages/template-picker` — Theme Picker

```
template-picker ←── (back only)
```

---

## 4. Course Management Tree

### `/pages/add-course` — Add Course

```
add-course ──→ /pages/course-manager      (bottom "Manage Courses")
add-course ──→ /pages/chinese-input       (name input)
```

### `/pages/detail` — Course Detail / Edit

```
detail ──→ /pages/course-manager          (manage all courses)
detail ──→ /pages/chinese-input           (edit course name)
```

### `/pages/course-manager` — Course List Manager

```
course-manager ──→ /pages/chinese-input   (edit course name)
```

### `/pages/schedule-manager` — Schedule List Manager

```
schedule-manager ──→ /pages/chinese-input      (edit schedule name)
schedule-manager ──→ /pages/schedule-qrcode    (share QR code)
schedule-manager ──→ /pages/week-view          (weekly overview)
schedule-manager ──→ /pages/statistics         (schedule statistics)
schedule-manager ──→ /pages/activation         (premium upgrade)
```

### `/pages/custom-content-edit` — Edit Custom Content

```
custom-content-edit ──→ /pages/chinese-input
```

---

## 5. Input Method Pages

### `/pages/chinese-input` — Legacy Input (built-in QWERTY keyboard)

```
chinese-input ←── add-course
chinese-input ←── detail
chinese-input ←── schedule-manager
chinese-input ←── course-manager
chinese-input ←── custom-content-edit
chinese-input ←── qrcode-generator
chinese-input ←── homepage-settings
chinese-input ←── lab (lab menu entry)
```

### `/pages/chinese-input-full` — New Input (InputMethod component)

```
chinese-input-full ←── nickname-edit
```

---

## 6. Other Utility Pages

### `/pages/qrcode-generator` — QR Code Generator

```
qrcode-generator ──→ /pages/chinese-input
```

### `/pages/schedule-qrcode` — Schedule QR Code

```
schedule-qrcode ←── schedule-manager
schedule-qrcode ──→ /pages/activation        (premium)
```

### `/pages/statistics` — Schedule Statistics

```
statistics ←── schedule-manager
```

### `/pages/week-view` — Weekly View

```
week-view ←── index-full
week-view ←── schedule-manager
```

### `/pages/activation` — Premium Activation

```
activation ←── settings
activation ←── schedule-manager
activation ←── backup-restore
activation ←── reset-data
activation ←── homepage-settings
activation ←── schedule-qrcode (via unlock-dialog)
activation ←── vibration-lab (via unlock-dialog)
```

### `/pages/donate` — Donate Page

```
donate ←── settings
```

---

## 7. Lab Pages (from `/data/lab-list.js`)

### `/pages/lab` — Lab Hub

```
lab ──→ (all lab pages below, dynamic from lab-list.js)
lab ──→ /pages/activation
```

### Lab entries & their only entrance is via `/pages/lab`:

```
/pages/pinned-pages         *  (can also push dynamically to any page)
/pages/qrcode-generator     ──→ /pages/chinese-input
/pages/vibration-lab
/pages/keyboard-demo
/pages/week-overview-demo
/pages/week-grid-demo
/pages/week-grid-simple
/pages/donate
/pages/schedule-manager     (also accessible from index-full)
/pages/device-info
/pages/backup-restore       (also accessible from settings)
/pages/chinese-input        (also used by many production pages)
/pages/statistics           (also accessible from schedule-manager)
/pages/homepage-settings    (also accessible from settings)
/pages/week-view            (also accessible from index-full)
/pages/course-manager       (also accessible from add-course / detail)
/pages/activation           (also accessible from many pages)
/pages/schedule-qrcode      (also accessible from schedule-manager)
/pages/reset-data           (also accessible from settings)
/pages/nickname-edit        (also accessible from settings)
/pages/add-course           (also accessible from index-full)
/pages/detail               (also accessible from index-full)
/pages/settings             (also accessible from index-full)
```

---

## 8. Shared Components

| Component | Used By |
|---|---|
| `components/InputMethod/InputMethod.ux` | `chinese-input-full`, `keyboard-demo`, `countdown-demo`(deleted) |
| `components/clock/index.ux` | (not used as import, logic in index-full modules) |
| `components/day-nav/index.ux` | (not used as import, logic in index-full modules) |
| `components/premium-overlay.ux` | `schedule-manager` |
| `components/pro-card.ux` | `schedule-qrcode`, `statistics` |
| `components/unlock-dialog.ux` | `qrcode-generator`, `schedule-manager`, `vibration-lab`, `schedule-qrcode`, `settings` |

---

## 9. Data Modules

| Module | Role |
|---|---|
| `data/store.js` | Theme, settings, storage helpers |
| `data/database.js` | Course CRUD, cache layer, storage I/O |
| `data/schedule.js` | Schedule data structure helpers |
| `data/lab-list.js` | Lab menu definition (ALL_PAGES array) |
| `data/version.js` | App version info |
| `data/auth-store.js` | Premium authentication |
| `data/products.js` | In-app product definitions |
| `data/pin-helper.js` | Pinned pages persistence |
| `data/storage-tables.js` | Storage schema documentation |
| `data/premium-overlay.js` | Premium overlay logic |

---

## 10. Index-Full Modules (`pages/index-full/modules/`)

| Module | Role |
|---|---|
| `class-list.js` | Class card rendering, goToClassDetail, openScheduleManager |
| `bottom-buttons.js` | "+ Add Course" and "Settings" buttons |
| `clock.js` | Time display clock |
| `day-nav.js` | Day navigation (prev/next/today) |
| `status-bar.js` | Current class status bar |
| `custom-content.js` | Custom content display |
| `pinned-pages.js` | Pinned pages bar |
| `quick-add.js` | Quick add course UI |
| `week-indicator.js` | Week/schedule switcher indicator |