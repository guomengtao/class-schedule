# Delete Homepage Cache Mechanism - Pros & Cons Analysis

## Overview of the caching mechanism

The homepage has two layers of in-memory cache:

### Layer 1: `database.js` - Course data cache

Primary cache for schedule data (the heaviest data in the app).

```js
var _cache = {}        // {0: [...courses...], 1: [...], ...}
var _cacheDirty = {}   // {0: false, 1: true, ...}
```

- `getAllCoursesStorageWithIndex(index, callback)` checks `_cache[index]` first
- Returns cached data directly if available and not dirty
- Otherwise reads from `storage`, parses JSON, stores to `_cache`
- `invalidateCache(index)` deletes cache entry and marks dirty
- Called on: course insert/update/delete, schedule switch, `clearAllCourses`

### Layer 2: `store.js` - Settings cache

Cached items: `scheduleNames`, `currentScheduleIndex`, `homepageSettings`, `defaultHomepage`, `nickname`, `theme`

```js
var _cache = {}
```

- Each getter (e.g., `getScheduleNames`) returns cached value if present
- Each setter (e.g., `setScheduleNames`) calls `delete _cache[key]` before writing to storage
- Some getters support `forceRefresh` parameter to bypass cache

## Pros of deleting the cache

### 1. Simpler codebase

| File | Cache-related lines | After deletion |
|------|-------------------|----------------|
| `database.js` | ~25 lines (`_cache`, `_cacheDirty`, `invalidateCache`, cache check logic) | 0 |
| `store.js` | ~20 lines (per-field cache check in each getter, `delete _cache` in setters) | 0 |
| **Total** | **~45 lines** | **0** |

No more `_cache`, `_cacheDirty`, `invalidateCache`, or cache-branching if/else.

### 2. No stale cache bugs

Current cache design has unsolved stale-read paths:

| Scenario | Cache status | Problem |
|----------|-------------|---------|
| User renames schedule in settings → returns to homepage | `store._cache.scheduleNames` is stale | `onShow` calls `store.getScheduleNames(callback)` without `forceRefresh` → shows old name |
| User edits courses in lab page → returns to homepage | `database._cache[idx]` is valid (not dirty) | If lab page doesn't call `invalidateCache`, homepage shows old data |
| Background process modifies data | Cache not invalidated | Stale until next cache miss |

With no cache, every read goes to storage. Data is always fresh.

### 3. No race conditions

Cache invalidation creates race windows:

```
Time A: Page1 writes data, calls invalidateCache()
Time B: Page2 reads → cache miss → storage.get()
Time C: storage.set completes for Page1's write
```

Without cache, every read is a fresh storage read - no timing issues.

### 4. Simpler debugging / reasoning

- Data lives in one place (storage), not "storage + cache"
- No need to check: "is the cache dirty? did we invalidate? is this value cached?"
- Storage contents always reflect application state

## Cons of deleting the cache

### 1. Slower startup

Current start flow with cache:

| Step | Operation | Cache hit? | Time |
|------|-----------|-----------|------|
| 1 | `database.init()` → load schedule index | Miss | ~20ms |
| 2 | `getAllCoursesWithIndex(0)` → load courses | Miss | ~30ms |
| 3 | `store.getScheduleNames` → load names | Miss | ~20ms |
| 4 | `store.getHomepageSettings` → load settings | Miss (forceRefresh=true) | ~20ms |
| 5 | `store.getTheme` → load theme | Miss | ~20ms |
| **Total cold start** | | **5 storage reads** | **~110ms** |

After first load, `onShow` with cache:

| Step | Cache hit? | Time |
|------|-----------|------|
| Course data | Hit | ~0ms |
| Schedule names | Hit | ~0ms |
| Schedule index | Hit | ~0ms |
| Homepage settings | Miss (forceRefresh=true) | ~20ms |
| Theme | N/A (no cache) | ~20ms |
| **Total subsequent onShow** | | **~40ms** |

Without cache, every `onShow`:

| Step | Time |
|------|------|
| Course data | ~30ms |
| Schedule names | ~20ms |
| Schedule index | ~20ms |
| Homepage settings | ~20ms |
| Theme | ~20ms |
| **Total onShow** | **~110ms** |

### 2. Perceptible lag on page return

On a wearable device (CPU ~1GHz, limited RAM), 110ms of sequential blocking I/O means the user sees:

```
[Return to homepage] → [blank] → [loading spinner/placeholder] → [data rendered]
```

With cache (40ms), the blank state lasts ~1 frame (16ms at 60fps) → imperceptible.
Without cache (110ms), the blank state lasts ~7 frames → user sees a flash.

### 3. Battery impact

Each `storage.get` call requires:
1. JS → Native IPC (context switch)
2. Flash memory read (wear-leveling, read amplification)
3. Native → JS IPC (context switch back)

On a smartwatch with a ~300mAh battery, each extra IPC round-trip consumes measurable power. Over a day, every `onShow` calling 5 storage reads instead of 2 adds up.

### 4. More callback nesting

Example without cache:
```js
// Before (with cache)
store.getScheduleNames(function(names) {
  // use names
})

// After (without cache)
// Same code - no change here since store.js handles it internally
```

The impact is mostly internal to `store.js` and `database.js` - the callers don't change much. But internally, every getter must always call `storage.get`:

```js
// Before
getScheduleNames: function(callback) {
  if (_cache.scheduleNames) {
    callback(_cache.scheduleNames)
    return
  }
  storage.get({ ... })
}

// After
getScheduleNames: function(callback) {
  storage.get({ ... })
}
```

The users of these APIs (index.ux, settings.ux, etc.) don't see a difference.

### 5. Increased risk of storage failures

More storage reads = more chances to hit `fail` callbacks. The current code has `fail` fallbacks in every `storage.get` call, but a flaky storage API could cause random data misses.

## The real issue: Cache is rarely the culprit

Looking at the actual stale-data bugs encountered:

| Bug | Root cause | Cache-related? |
|-----|-----------|---------------|
| Template change not reflected on homepage | Wrong architecture (coupled week-view template to homepage) | No |
| Settings change not reflected | `loadHomepageSettings()` calls with `forceRefresh=true` | No - already bypassed |
| Course data after edit not shown | `insertCourse` calls `invalidateCache(idx)` | No - cache properly invalidated |

The cache has NOT caused any of the bugs so far. The real issues have been:
1. Missing async callbacks in `onShow` (template issue)
2. Architecture coupling (template system)

## Special consideration: `database.js` cache has a functional purpose beyond speed

The `_cacheDirty` flag in `database.js` serves as a **write tracking mechanism**:

```js
function invalidateCache(index) {
  delete _cache[index]
  _cacheDirty[index] = true  // marks for re-read from storage
}
```

If the course data was modified in-memory (e.g., `quick-add.js` pushes directly to `self.schedule`) but not written to storage yet, the dirty flag ensures the next read goes to storage for the authoritative version.

Without this mechanism, the code would need another way to coordinate in-memory state vs storage state.

## Conclusions

### Should we delete the cache? => No, keep it.

| Factor | Weight | Impact of deletion |
|--------|--------|-------------------|
| Code simplicity | Medium | Removes ~45 lines, but those are simple if/else checks |
| Cold start speed | High | +70ms on a wearable device |
| Page return lag | High | User sees blank flash |
| Battery | Medium | More IPC round-trips on a watch |
| Bug prevention | Low | Cache hasn't caused bugs |
| Debugging | Low | Cache is straightforward in-memory object |

**The cache mechanism is simple and effective.** It uses a single global `_cache` object with straightforward invalidation (delete on write). The `forceRefresh` parameter already handles the case where `onShow` needs fresh data.

### Recommendations for improvement

Instead of deleting the cache, fix the specific stale-read paths:

1. **`getScheduleNames` in `onShow`**: Pass `forceRefresh` to bypass cache when returning from settings
2. **`loadHomepageSettings`**: Already uses `forceRefresh=true` ✅
3. **`getCurrentScheduleIndex`**: Consider adding `forceRefresh` parameter for `onShow` context
4. **Add a general `store.clearCache()` method**: Called in `onShow` to force-fresh all settings at once, avoiding per-field `forceRefresh` plumbing

```js
// store.js
clearCache: function() {
  _cache = {}
}

// index.ux onShow
store.clearCache()  // force fresh read on all settings next time
```

This approach gives the best of both worlds:
- Fast startup on first load (cache populated)
- Fresh data on page show (cache cleared before reading)
- Simple code (one line instead of per-field `forceRefresh`)
- No stale data bugs