# Pinned Pages UI Redesign

## Target Screen

Capsule-shaped screen (pill-shaped), primary design target.

## Design Principles

1. **Simple** — no extra decoration, clear functional hierarchy
2. **Whitespace** — generous spacing between elements, breathing room
3. **Capsule-first** — layout optimized for narrow tall capsule screens
4. **Clear interaction** — tap to open, long-press to manage

## Current Status & Problems

| Problem | Details |
|---------|---------|
| Confusing checkbox | The ☑ checkbox looks like multi-select but actually unpins the page |
| Dense layout | Items packed tightly, no breathing room |
| No visual hierarchy | All items look the same, no distinction |
| URI displayed | Internal route paths shown to user — meaningless noise |
| Capsule not optimized | No dedicated capsule layout, using generic fallback |

## Proposed UI Structure

### Home Page Pinned Bar (index.ux)

```
 ┌─────────────────────────────┐
 │  📌 Course Manager  ·  Settings  ·  Stats  ›  │
 └─────────────────────────────┘
```

- Single-line horizontal scrollable row
- Each item: rounded pill-shaped tag with icon + name
- "dot" separator between items
- Right arrow indicates swipe for more
- Only show when at least one page is pinned

### Pinned Pages Management Page

```
 ┌─────────────────────────────┐
 │         ←  Pinned Pages           │
 │                                   │
 │   ┌─────────────────────────┐    │
 │   │  📋 Course Manager      │    │
 │   │  Manage all courses     │    │
 │   │                    [Unpin]   │
 │   └─────────────────────────┘    │
 │                                   │
 │   ┌─────────────────────────┐    │
 │   │  ⚙️ Settings            │    │
 │   │  App preferences        │    │
 │   │                    [Unpin]   │
 │   └─────────────────────────┘    │
 │                                   │
 │   ┌─────────────────────────┐    │
 │   │  📊 Statistics          │    │
 │   │  Course stats & charts  │    │
 │   │                    [Unpin]   │
 │   └─────────────────────────┘    │
 │                                   │
 │         [ Pin this page ]         │
 └─────────────────────────────────────┘
```

## Detailed Component Design

### 1. Home Page Pinned Bar

| Property | Value |
|----------|-------|
| Position | Below custom content, above bottom buttons |
| Height | 44px (capsule) |
| Background | `theme.cardLight` or transparent |
| Scroll | Horizontal, single row |
| Item padding | 8px 14px (horizontal) |
| Item margin-right | 6px |
| Item border-radius | 14px (pill shape) |
| Item font-size | 22px |
| Icon margin-right | 4px |

### 2. Pinned Page Card (Management Page)

| Property | Value |
|----------|-------|
| Card padding | 14px 16px |
| Card margin-bottom | 10px |
| Card border-radius | 14px |
| Card background | `theme.card` |
| Name font-size | 30px |
| Description font-size | 24px |
| Description color | `theme.textMuted` |
| Unpin button | Subtle text, right aligned |
| Unpin font-size | 22px |
| Unpin color | `theme.textMuted` (normal), `theme.deleteText` (pressed) |

### 3. Empty State

```
 ┌─────────────────────────────┐
 │                                   │
 │            📌                    │
 │                                   │
 │     No pinned pages yet          │
 │                                   │
 │   Open any page and pin it to    │
 │   the home screen for quick      │
 │   access.                        │
 │                                   │
 └─────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Icon size | 48px |
| Icon margin-bottom | 14px |
| Title font-size | 28px |
| Title margin-bottom | 8px |
| Description font-size | 24px |
| Description line-height | 32px |
| Description text-align | center |

## Interaction Design

| Action | Behavior |
|--------|----------|
| Tap card body | Open page via `router.push` |
| Tap "Unpin" | Remove from list with confirmation toast |
| Tap "Pin this page" | Pin current management page itself |
| Tap pinned tag (home) | Open the page directly |
| Long-press pinned tag (home) | Open management page |

## Capsule Screen Layout (Primary)

### Management Page

```
Total height: 100% (capsule: ~320px visible area)
 ┌──────────────────── padding-top: 44px ────────────────────┐
 │ Header: 34px (back + title, centered)                     │
 │ Spacing: 6px                                              │
 │ Description: 28px (single line hint text)                 │
 │ Spacing: 8px                                              │
 │ ┌──────────── Card 1 ────────────┐  62px                  │
 │ │ Name 30px                     │                         │
 │ │ Description 24px + Unpin btn  │                         │
 │ └────────────────────────────────┘                        │
 │ Spacing: 8px                                              │
 │ ┌──────────── Card 2 ────────────┘  62px                  │
 │ ...                                                       │
 │ [spacer - flex: 1]                                       │
 │ "Pin this page" link: 28px                                │
 └────────────────── padding-bottom: 12px ──────────────────┘
```

### Max visible cards: 3 (with partial 4th)

## Color Tokens

| Token | Usage |
|-------|-------|
| `theme.card` | Card background |
| `theme.bg` | Page background |
| `theme.accent` | Pinned item tag text |
| `theme.text` | Page name |
| `theme.textSecondary` | Description text |
| `theme.textMuted` | Hint text, unpin button |
| `theme.cardLight` | Home pinned bar background |

## Implementation Files

| File | Change |
|------|--------|
| `src/pages/pinned-pages/pinned-pages.ux` | Full rewrite: card layout, description, unpin button |
| `src/pages/index/modules/pinned-pages.js` | Add icon support to pinned items |
| `src/pages/index/index.ux` | Update pinned bar template for new style |
| `src/data/pin-helper.js` | No change needed (data format stays the same) |

## Data Format

No change to storage format:

```json
[
  { "name": "Course Manager", "uri": "/pages/course-manager" },
  { "name": "Settings", "uri": "/pages/settings" }
]
```

Optionally add `icon` field in the future if needed.

## Migration

- No data migration needed
- Existing pinned pages will display with new UI automatically
- All existing pages that call `pinPage()` continue to work unchanged

## Size Impact

- CSS additions: ~100 lines
- Template changes: minimal
- No new assets or dependencies
- Expected RPK size increase: < 1KB