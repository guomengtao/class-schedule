# Project Slimming Plan

## Analysis Date

2026-08-30

---

## 1. Current Size Overview

| Category | Size | Notes |
|:---|:---|:---|
| `src/` (source code) | 968K | 23 pages, components, data, i18n, lib |
| `build/` (build output) | 4.1M | 22 pages (3.7M JS + 87K PNG + others) |
| `node_modules/` | 354M | Dependencies (not in RPK) |
| `docs/` | 600K | 59 markdown analysis documents |
| `dist/` | 444K | RPK output file |
| Root `.md` files | ~50K | 12 analysis/CHANGELOG files |
| `.DS_Store` | 8K | 3 macOS metadata files |

**RPK 压缩包**: ~1.0M → **安装后解压**: ~5.7M → **设备显示**: ~6MB

---

## 2. Build Output Breakdown (4.1M)

### 2.1 By Category

| Category | Size | Percentage |
|:---|:---|:---|
| Pages JS | 3.7M | 90.2% |
| Components (InputMethod) | 208K | 5.1% |
| Images (PNG) | 87K | 2.1% |
| Other (data, i18n, META-INF) | ~28K | 0.7% |
| **Total** | **4.1M** | **100%** |

### 2.2 Pages by Size (Ranked)

| Rank | Page | Build Size | Percentage | Category |
|:---:|:---|:---:|:---:|:---|
| 1 | chinese-input | 552K | 13.5% | Core (InputMethod) |
| 2 | index | 320K | 7.8% | Core |
| 3 | detail | 252K | 6.2% | Core |
| 4 | add-course | 240K | 5.9% | Core |
| 5 | activation | 216K | 5.3% | Core |
| 6 | schedule-manager | 192K | 4.7% | Core |
| 7 | settings | 180K | 4.4% | Core |
| 8 | reset-data | 176K | 4.3% | Core |
| 9 | activation-lab | 176K | 4.3% | Dev/Lab |
| 10 | week-view | 172K | 4.2% | Core |
| 11 | statistics | 172K | 4.2% | Core |
| 12 | vibration-lab | 164K | 4.0% | Core |
| 13 | schedule-qrcode | 164K | 4.0% | Core |
| 14 | qrcode-test | 120K | 2.9% | Dev/Lab |
| 15 | numpad-input | 108K | 2.6% | Dev/Lab |
| 16 | background-running | 100K | 2.4% | Dev/Lab |
| 17 | prompt-demo | 96K | 2.3% | Dev/Lab |
| 18 | device-info | 96K | 2.3% | Core |
| 19 | qrcode-generator | 92K | 2.2% | Core |
| 20 | course-manager | 88K | 2.1% | Core |
| 21 | nickname-edit | 76K | 1.9% | Core |
| 22 | test-area | 72K | 1.8% | Dev/Lab |
| | **Total** | **4.1M** | **100%** | |

---

## 3. Optimization Opportunities

### 3.1 Quick Wins (Low Risk, High Impact)

#### A. Remove Dev/Test Pages — Save ~740K (18%)

These pages are only used during development/testing and are accessible via "功能实验室" (Feature Lab):

| Page | Size | Purpose |
|:---|:---:|:---|
| activation-lab | 176K | Activation code testing (duplicate of activation) |
| qrcode-test | 120K | QR code capacity testing |
| background-running | 100K | Background running demo |
| prompt-demo | 96K | Prompt API demo |
| test-area | 72K | General test area |
| numpad-input | 108K | Numpad input testing |
| **Total** | **~672K** | |

**Action**: Remove these pages from `src/pages/`, `manifest.json` router config, and the "功能实验室" menu in settings.

**Note**: `activation-lab` (176K) is essentially a duplicate of `activation` (216K). If both are needed, consider merging them into one page.

#### B. Remove `loader` Page from src — Save ~8K

The `loader` page exists in `src/pages/loader/` but is NOT registered in `manifest.json` and has no build output. It's a dead/orphaned page.

**Action**: Delete `src/pages/loader/` directory.

#### C. Clean Up `.DS_Store` Files — Save 8K

3 `.DS_Store` files exist in the project (src/common, src, root).

**Action**: Delete all `.DS_Store` files and add to `.gitignore`.

---

### 3.2 Medium Effort (Moderate Risk, Good Impact)

#### D. Keyboard Asset Optimization — Save ~104K

The InputMethod component has 3 keyboard layout image sets:

| Layout | Size | Images | Used For |
|:---|:---:|:---:|:---|
| full | 104K | 26 | Full keyboard layout |
| arc | 52K | 13 | Arc/circle screen layout |
| horizontal | 52K | 14 | Horizontal/band layout |

**Problem**: All 3 layouts are bundled into the build, but only one is needed per device type.

**Solution**: 
- Use conditional imports or platform-specific builds to only include the relevant layout
- Or generate a single unified sprite sheet instead of individual PNGs
- **Savings**: ~104K if only one layout is kept

#### E. Dictionary File Optimization — Save ~50-80K

Source dictionary files in `src/components/InputMethod/assets/`:

| File | Size | Purpose |
|:---|:---:|:---|
| dic_words.js | 69K | Full word dictionary |
| dic_words_initials.js | 41K | Initials-based lookup |
| dic.js | 26K | Dictionary index |
| dicUtil.js | 18K | Dictionary utilities |
| pinyin_syllables.js | 3.5K | Pinyin syllables |
| **Total** | **~157K** | |

**Optimization options**:
- Remove rarely-used words from the dictionary
- Use a more compact data format (binary, compressed)
- Load dictionary on-demand instead of bundling
- Consider removing initials-based lookup if not used

#### F. Merge `activation-lab` into `activation` — Save ~176K

Both pages handle activation functionality. `activation-lab` appears to be a testing/lab variant. Merging them into one page with a debug mode flag would eliminate the duplicate.

---

### 3.3 Repository Cleanup (No Impact on RPK Size)

#### G. Clean Up Root Markdown Files — Save ~50K

12 analysis markdown files in the project root:

| File | Size |
|:---|:---|
| week-view-content-analysis.md | 8K |
| week-view-analysis.md | 7K |
| missing-features-analysis.md | 7K |
| scroll-analysis.md | 6K |
| rename-keyboard-analysis.md | 6K |
| README.md | 12K |
| trash-icon-analysis.md | 4K |
| settings-version-analysis.md | 3K |
| auto-version-bump.md | 3K |
| CHANGELOG.md | 4K |
| CHANGELOG-2026-08-25.md | 3K |
| screen-adaptation-status.md | 2K |

**Action**: Move these to `docs/` directory or delete if analysis is complete/outdated.

#### H. Move `docs/` Out of Repository — Save 600K

59 markdown files (600K) of analysis documents. These are useful for development history but don't belong in the source repository.

**Options**:
- Move to a separate wiki or documentation repo
- Add to `.gitignore` and keep locally only
- Archive old/outdated analysis files

#### I. Add `build/` to `.gitignore` — Save 4.1M from Git

The `build/` directory (4.1M) is a build artifact. It should be generated during CI/CD, not stored in the repository.

**Action**: Add `build/` and `dist/` to `.gitignore` and rely on CI/CD to build.

---

### 3.4 Long-term Architectural Improvements

#### J. Code Splitting & Lazy Loading

Currently, all pages are bundled into a single build. Implementing proper code splitting would:
- Reduce initial load time
- Allow pages to be loaded on-demand
- Potentially reduce the RPK size

#### K. Shared Component Extraction

Several pages may share similar UI patterns. Extracting shared components could reduce code duplication:
- Form inputs (numpad-input, chinese-input share patterns)
- QR code handling (qrcode-generator, qrcode-test, schedule-qrcode)
- List/card layouts (course-manager, schedule-manager, week-view)

#### L. Image Format Optimization

- Convert PNG images to WebP format for better compression
- Use SVG where possible for simple icons
- Consider using icon fonts instead of individual PNG files

#### M. i18n Cleanup

The 3 i18n files (`defaults.json`, `en.json`, `zh-CN.json`) currently contain identical content (only `app.name`). Either:
- Remove unused locale files
- Or properly populate them with translations

---

## 4. Priority Action Plan

### Phase 1: Immediate (1-2 hours)

| Action | Estimated Savings | Risk |
|:---|:---:|:---|
| Delete `.DS_Store` files | 8K | None |
| Delete `loader` orphan page | 8K | None |
| Move root `.md` files to `docs/` | 50K (repo) | None |
| Add `build/` and `dist/` to `.gitignore` | 4.5M (repo) | None |

### Phase 2: Short-term (1 day)

| Action | Estimated Savings | Risk |
|:---|:---:|:---|
| Remove dev/test pages from build | ~672K | Low |
| Optimize keyboard assets (keep 1 layout) | ~104K | Medium |
| Merge activation-lab into activation | ~176K | Medium |

### Phase 3: Medium-term (1 week)

| Action | Estimated Savings | Risk |
|:---|:---:|:---|
| Dictionary optimization | ~50-80K | Medium |
| Code splitting / lazy loading | Variable | High |
| Image format optimization | ~30-50K | Low |

---

## 5. Summary

| Scenario | Build Size | RPK Size | Device Display | Reduction |
|:---|:---:|:---:|:---:|:---:|
| Current | 4.1M | ~1.0M | ~6MB | — |
| Phase 1 + 2 | ~3.0M | ~750K | ~4.5MB | -25% |
| Phase 1 + 2 + 3 | ~2.5M | ~600K | ~3.5MB | -40% |

**Key Takeaway**: The fastest way to reduce the app size is removing dev/test pages (Phase 2), which would immediately save ~672K from the build output. Combined with keyboard asset optimization, the total savings could reach ~950K, reducing the device display size from ~6MB to approximately ~4.5MB.

---

## 6. Risk Assessment

| Risk | Mitigation |
|:---|:---|
| Removing dev pages breaks "功能实验室" menu | Keep menu structure, remove only the page implementations |
| Keyboard layout removal breaks certain device types | Test on all target devices (watch, band, circle screen) |
| Dictionary optimization breaks Chinese input | Run comprehensive input tests before release |
| Build directory removal breaks CI/CD | Ensure CI/CD pipeline generates build from src |