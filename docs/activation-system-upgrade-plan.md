# Activation Code System Upgrade Plan: 12-bit → 16-bit (4+4+4+4)

## 1. Current State Analysis

### 1.1 Current System

| Item | Current State |
| :--- | :--- |
| Activation code length | **12-bit** |
| Format | `HHHH DDDD CCCC` (device hash 4-bit + days 4-bit + checksum 4-bit) |
| Product ID | **None**, cannot distinguish multiple products |
| Encoding | Base62 (contains letters), first 4-bit and last 4-bit contain letters |
| Decryption input | Stepper (+/- per-digit adjustment), 12-bit with letters, cumbersome |
| Pages | `src/pages/activation-lab/` (lab) and `src/pages/activation/` (user-facing) |

### 1.2 Current 12-bit Format

```
┌──────────────┬──────────────┬──────────────┐
│  4-bit Device │  4-bit Days  │  4-bit Checksum │
│  Hash (Base62)│  (Pure Num)  │  (Base62)       │
└──────────────┴──────────────┴──────────────┘
```

Example: `00010030Aa09`

### 1.3 Problems

1. **No product ID**: Cannot distinguish which product the activation code belongs to when multiple products exist
2. **Base62 encoding**: Letters mixed in, not friendly for pure numeric keypad input on wearables
3. **Stepper input**: Each digit requires +/- button to adjust, extremely slow for 12-bit codes
4. **No future-proofing**: Cannot support multi-product matrix

---

## 2. Upgrade Target

### 2.1 New 16-bit Format: 4+4+4+4

```
┌──────────┬──────────┬──────────┬──────────┐
│  4-bit   │  4-bit   │  4-bit   │  4-bit   │
│ Product  │ Device   │  Days    │ Checksum │
│   ID     │  Hash    │          │          │
└──────────┴──────────┴──────────┴──────────┘
  PPPP       HHHH       DDDD       CCCC
```

Example: `0001000100301234`

### 2.2 Field Capacity

| Field | Bits | Max Capacity | Description |
| :--- | :--- | :--- | :--- |
| **Product ID** | **4-bit** | **10000 types** (0000-9999) | Supports full product matrix |
| **Device Hash** | **4-bit** | **10000 devices** | Supports 10k devices per product |
| **Days** | **4-bit** | **9999 days (~27 years)** | 9999 = permanent |
| **Checksum** | **4-bit** | **10000 types** | Balanced security |
| **Total** | **16-bit** | **10^16 combinations** | 100 trillion, brute force nearly impossible |

### 2.3 Why 4+4+4+4?

| Plan | Product ID | Device Hash | Days | Checksum | Total | Max Products | Max Devices |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Conservative | 2-bit | 4-bit | 4-bit | 6-bit | 16-bit | 99 | 10000 |
| Aggressive | 3-bit | 5-bit | 3-bit | 5-bit | 16-bit | 1000 | 100000 |
| **Recommended** | **4-bit** | **4-bit** | **4-bit** | **4-bit** | **16-bit** | **10000** | **10000** |
| Extended | 4-bit | 5-bit | 3-bit | 4-bit | 16-bit | 10000 | 100000 |

**4+4+4+4 is the most balanced plan — no field is a weak link.**

---

## 3. Product ID Allocation Plan

| Product ID Range | Usage | Description |
| :--- | :--- | :--- |
| `0001` | EV Schedule | Your first product |
| `0002-0099` | Reserved | Future 98 products |
| `0100-0999` | Reserved | Future 900 products |
| `1000-9998` | Reserved | Future 8999 products |
| `9999` | All-Product Pass | One purchase, all products available |

---

## 4. Encryption & Decryption Algorithm

### 4.1 Product Configuration

```javascript
var PRODUCTS = {
  '0001': { name: 'EV Schedule', icon: '📚' },
  '9999': { name: 'All-Product Pass', icon: '🌟' }
}
```

### 4.2 4-bit Device Hash (Pure Numeric)

```javascript
function deviceIdTo4Digit(id) {
  var hash = 0
  for (var i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0')
}
```

### 4.3 4-bit Checksum (Pure Numeric)

```javascript
function generateChecksum4(str) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0')
}
```

### 4.4 Encrypt: Generate 16-bit Activation Code

```javascript
function encryptV2(deviceId, productId, days) {
  if (!PRODUCTS[productId]) return null
  if (days < 1 || days > 9999) return null

  var idHash = deviceIdTo4Digit(deviceId)          // 4-bit
  var daysPart = days.toString().padStart(4, '0')  // 4-bit
  var plain = productId + idHash + daysPart        // 12-bit
  var checksum = generateChecksum4(plain)          // 4-bit
  return plain + checksum                          // 16-bit
}
```

### 4.5 Decrypt: Parse 16-bit Activation Code

```javascript
function decryptV2(encrypted) {
  if (encrypted.length !== 16) return null
  if (!/^\d{16}$/.test(encrypted)) return null

  var productId = encrypted.substring(0, 4)
  var idHash = encrypted.substring(4, 8)
  var daysPart = encrypted.substring(8, 12)
  var checksum = encrypted.substring(12, 16)

  var plain = productId + idHash + daysPart
  if (generateChecksum4(plain) !== checksum) return null

  var days = parseInt(daysPart, 10)

  return {
    productId: productId,
    productName: PRODUCTS[productId] ? PRODUCTS[productId].name : 'Unknown Product',
    idHash: idHash,
    days: days === 9999 ? -1 : days,
    isPermanent: days === 9999
  }
}
```

### 4.6 Device-side Verification

```javascript
function verifyActivationV2(encrypted, myDeviceId, expectedProductId) {
  var result = decryptV2(encrypted)
  if (!result) return { success: false, reason: 'Invalid activation code' }

  if (expectedProductId && result.productId !== expectedProductId) {
    return { success: false, reason: 'Product ID mismatch' }
  }

  var myHash = deviceIdTo4Digit(myDeviceId)
  if (result.idHash !== myHash) {
    return { success: false, reason: 'Device ID mismatch' }
  }

  return {
    success: true,
    productId: result.productId,
    productName: result.productName,
    days: result.days,
    isPermanent: result.isPermanent
  }
}
```

---

## 5. Page Redesign: Decryption Verification Area

### 5.1 Current State: Stepper Input

The current decryption area uses a stepper (+/- per-digit) — extremely slow, especially with 12-bit Base62 mixed codes.

### 5.2 Target State: Numpad Input (16-cell Grid)

Reference implementation: `src/pages/numpad-input/numpad-input.ux`

Replace the stepper with a **16-cell grid + numpad keypad**, same as the existing `numpad-input` page. The 16 cells visually group as 4+4+4+4, making the format self-explanatory.

### 5.3 UI Layout

```
┌─────────────────────────────────────┐
│        Activation Code System       │
├─────────────────────────────────────┤
│  [Encrypt Generation Area]          │
│  ... (existing content kept)        │
├─────────────────────────────────────┤
│  Decrypt Verification               │
│  Enter 16-digit activation code     │
│                                     │
│  ┌──────┬──────┬──────┬──────┐     │
│  │  P   │  P   │  P   │  P   │     │  ← Product ID (4-bit)
│  ├──────┼──────┼──────┼──────┤     │
│  │  H   │  H   │  H   │  H   │     │  ← Device Hash (4-bit)
│  ├──────┼──────┼──────┼──────┤     │
│  │  D   │  D   │  D   │  D   │     │  ← Days (4-bit)
│  ├──────┼──────┼──────┼──────┤     │
│  │  C   │  C   │  C   │  C   │     │  ← Checksum (4-bit)
│  └──────┴──────┴──────┴──────┘     │
│                                     │
│  ┌──────┬──────┬──────┐            │
│  │  1   │  2   │  3   │            │
│  ├──────┼──────┼──────┤            │
│  │  4   │  5   │  6   │            │
│  ├──────┼──────┼──────┤            │
│  │  7   │  8   │  9   │            │
│  ├──────┼──────┼──────┤            │
│  │  C   │  0   │  ←   │            │
│  └──────┴──────┴──────┘            │
│                                     │
│  Device ID: [________]              │
│  [ Decrypt & Verify ]               │
│                                     │
│  ┌─ Result ──────────────────────┐  │
│  │ Status: Pass / Fail            │  │
│  │ Product: EV Schedule (0001)    │  │
│  │ Days: 30 / Permanent           │  │
│  └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.4 Template Code (Decrypt Area)

```html
<div class="section" style="background-color: {{ theme.card }}">
  <text class="section-title" style="color: {{ theme.text }}">Decrypt Verification</text>
  <text class="section-desc" style="color: {{ theme.textSecondary }}">16-digit pure numeric, group by 4-bit</text>

  <!-- 16-cell grid, visually grouped as 4+4+4+4 -->
  <div class="cells-grid" style="background-color: {{ theme.card }}">
    <div class="cells-row">
      <div class="cell {{ cursor === 0 ? 'cell-active' : '' }}" onclick="onCellClick(0)">
        <text class="cell-text">{{ cell0 !== null ? cell0 : '-' }}</text>
      </div>
      <div class="cell {{ cursor === 1 ? 'cell-active' : '' }}" onclick="onCellClick(1)">
        <text class="cell-text">{{ cell1 !== null ? cell1 : '-' }}</text>
      </div>
      <div class="cell {{ cursor === 2 ? 'cell-active' : '' }}" onclick="onCellClick(2)">
        <text class="cell-text">{{ cell2 !== null ? cell2 : '-' }}</text>
      </div>
      <div class="cell {{ cursor === 3 ? 'cell-active' : '' }}" onclick="onCellClick(3)">
        <text class="cell-text">{{ cell3 !== null ? cell3 : '-' }}</text>
      </div>
    </div>
    <!-- ... 3 more rows for cells 4-15 ... -->
    <!-- cells 4-7: Device Hash -->
    <!-- cells 8-11: Days -->
    <!-- cells 12-15: Checksum -->
  </div>

  <!-- 3x4 Numpad Keypad -->
  <div class="keypad">
    <div class="keypad-row">
      <div class="keypad-btn" onclick="onKeyPress(1)"><text class="keypad-text">1</text></div>
      <div class="keypad-btn" onclick="onKeyPress(2)"><text class="keypad-text">2</text></div>
      <div class="keypad-btn" onclick="onKeyPress(3)"><text class="keypad-text">3</text></div>
    </div>
    <div class="keypad-row">
      <div class="keypad-btn" onclick="onKeyPress(4)"><text class="keypad-text">4</text></div>
      <div class="keypad-btn" onclick="onKeyPress(5)"><text class="keypad-text">5</text></div>
      <div class="keypad-btn" onclick="onKeyPress(6)"><text class="keypad-text">6</text></div>
    </div>
    <div class="keypad-row">
      <div class="keypad-btn" onclick="onKeyPress(7)"><text class="keypad-text">7</text></div>
      <div class="keypad-btn" onclick="onKeyPress(8)"><text class="keypad-text">8</text></div>
      <div class="keypad-btn" onclick="onKeyPress(9)"><text class="keypad-text">9</text></div>
    </div>
    <div class="keypad-row">
      <div class="keypad-btn keypad-clear" onclick="onClear">
        <text class="keypad-text" style="color: #e74c3c">C</text>
      </div>
      <div class="keypad-btn" onclick="onKeyPress(0)">
        <text class="keypad-text">0</text>
      </div>
      <div class="keypad-btn keypad-delete" onclick="onDelete">
        <text class="keypad-text" style="color: #e74c3c">←</text>
      </div>
    </div>
  </div>

  <!-- Device ID for verification -->
  <div class="input-row">
    <text class="input-prefix">Device ID</text>
    <div class="text-input" onclick="inputVerifyDeviceId">
      <text class="input-text">{{ verifyDeviceId || 'Tap to enter device ID' }}</text>
    </div>
  </div>

  <input class="generate-btn" type="button" value="Decrypt & Verify" onclick="doDecryptV2" />

  <!-- Result display -->
  <div class="result-box" show="{{ decryptResult }}">
    <text class="result-label">Decrypt Result</text>
    <text class="result-code">{{ decryptResult }}</text>
    <text class="result-detail" show="{{ decryptDetail }}">{{ decryptDetail }}</text>
  </div>
</div>
```

### 5.5 Script Logic (Decrypt Area)

```javascript
export default {
  private: {
    // 16 cells for input
    cell0: null, cell1: null, cell2: null, cell3: null,
    cell4: null, cell5: null, cell6: null, cell7: null,
    cell8: null, cell9: null, cell10: null, cell11: null,
    cell12: null, cell13: null, cell14: null, cell15: null,
    cursor: 0,
    verifyDeviceId: '',
    decryptResult: '',
    decryptDetail: '',
    decryptSuccess: false
  },

  // Cell click: set cursor position
  onCellClick(index) {
    doVibrate()
    this.cursor = index
  },

  // Keypad digit press: fill current cell and advance cursor
  onKeyPress(digit) {
    doVibrate()
    var idx = this.cursor
    this['cell' + idx] = digit
    if (this.cursor < 15) {
      this.cursor = this.cursor + 1
    }
  },

  // Delete: clear current cell, move cursor back
  onDelete() {
    doVibrate()
    var idx = this.cursor
    if (this['cell' + idx] === null || this['cell' + idx] === undefined) {
      if (this.cursor > 0) {
        this.cursor = this.cursor - 1
        idx = this.cursor
      }
    }
    this['cell' + idx] = null
    if (this.cursor > 0) {
      this.cursor = this.cursor - 1
    }
  },

  // Clear all cells
  onClear() {
    doVibrate()
    for (var i = 0; i < 16; i++) {
      this['cell' + i] = null
    }
    this.cursor = 0
  },

  // Execute decrypt verification
  doDecryptV2() {
    var code = ''
    for (var i = 0; i < 16; i++) {
      var val = this['cell' + i]
      if (val === null || val === undefined) {
        this.decryptResult = 'Please enter the complete 16-digit activation code'
        this.decryptDetail = ''
        this.decryptSuccess = false
        return
      }
      code += val
    }

    var result = decryptV2(code)
    if (!result) {
      this.decryptResult = 'Invalid activation code'
      this.decryptDetail = ''
      this.decryptSuccess = false
      return
    }

    this.decryptSuccess = true
    if (result.isPermanent) {
      this.decryptResult = 'Verification Passed - Permanent Activation'
    } else {
      this.decryptResult = 'Verification Passed - ' + result.days + ' days'
    }

    this.decryptDetail =
      'Product: ' + result.productName + ' (' + result.productId + ')\n' +
      'Device Hash: ' + result.idHash + '\n' +
      'Days: ' + (result.isPermanent ? 'Permanent' : result.days)
  }
}
```

### 5.6 Styles (Reference from numpad-input.ux)

```css
.cells-grid {
  flex-direction: column;
  border-radius: 12px;
  padding: 8px;
  margin-bottom: 14px;
  width: 100%;
}

.cells-row {
  flex-direction: row;
  justify-content: center;
}

.cell {
  width: 36px;
  height: 26px;
  border-radius: 6px;
  border-width: 1px;
  margin: 2px;
  justify-content: center;
  align-items: center;
}

.cell-active {
  border-width: 2px;
  border-color: #ff8c00;
}

.cell-text {
  font-size: 14px;
  font-weight: bold;
}

.keypad {
  flex-direction: column;
  border-radius: 12px;
  padding: 8px;
  width: 100%;
}

.keypad-row {
  flex-direction: row;
  justify-content: center;
  margin-bottom: 4px;
}

.keypad-btn {
  width: 48px;
  height: 34px;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  justify-content: center;
  align-items: center;
  margin-left: 10px;
  margin-right: 10px;
}

.keypad-text {
  font-size: 18px;
  font-weight: bold;
}
```

---

## 6. Encrypt Generation Area (Kept with Modifications)

### 6.1 Changes

| Item | Before | After |
| :--- | :--- | :--- |
| Activation code length | 12-bit | 16-bit |
| Encoding | Base62 (letters) | Pure numeric |
| Product ID | None | Selectable from `PRODUCTS` config |
| Preset buttons | 6 groups (device ID + days) | 6 groups (product ID + device ID + days) |
| Result display | 12-bit with spaces | 16-bit with 4+4+4+4 grouping |

### 6.2 Preset Button Updates

```javascript
// Before: deviceId + days
{ id: 'Aa09', days: 30 }
{ id: 'Bb19', days: 90 }

// After: productId + deviceId + days
{ productId: '0001', deviceId: 'Aa09', days: 30, label: 'EV Schedule / 30 days' }
{ productId: '0001', deviceId: 'Bb19', days: 90, label: 'EV Schedule / 90 days' }
{ productId: '0001', deviceId: 'Xy99', days: 365, label: 'EV Schedule / 365 days' }
{ productId: '0001', deviceId: 'AbCd', days: 9999, label: 'EV Schedule / Permanent' }
{ productId: '9999', deviceId: 'TeSt', days: 7, label: 'All-Pass / 7 days' }
{ productId: '9999', deviceId: 'DeMo', days: 180, label: 'All-Pass / 180 days' }
```

### 6.3 Result Display Format

```javascript
function fmtCode16(code) {
  if (!code || code.length !== 16) return code
  return code.substring(0, 4) + ' ' + code.substring(4, 8) + ' ' +
         code.substring(8, 12) + ' ' + code.substring(12, 16)
}
// Output: "0001 0001 0030 1234"
```

---

## 7. Migration Strategy

### 7.1 Dual-track Operation (Don't Break Old Codes)

```
User enters activation code → Determine length
    ├── 12-bit → Old decrypt (compatible)
    └── 16-bit → New decrypt (new features)
```

### 7.2 Compatibility Code

```javascript
function decryptAuto(code) {
  if (!code) return null

  // Pure numeric 16-bit → new format
  if (code.length === 16 && /^\d{16}$/.test(code)) {
    return decryptV2(code)
  }

  // 12-bit (may contain letters) → old format
  if (code.length === 12) {
    var result = decryptLegacy(code)
    if (result) {
      result.productId = '0001'
      result.productName = 'EV Schedule'
    }
    return result
  }

  return null
}
```

### 7.3 Migration Phases

| Phase | Content | Timeline |
| :--- | :--- | :--- |
| Phase 1 | Implement new 16-bit algorithm, keep old 12-bit compatible | Now |
| Phase 2 | Update activation-lab page UI (decrypt area uses numpad input) | Now |
| Phase 3 | Update user-facing activation page | After lab verification |
| Phase 4 | New activation codes use 16-bit by default | After stabilization |
| Phase 5 | Deprecate old 12-bit codes (optional) | After full transition |

---

## 8. Hot-Product Scenario Tests

### Scenario 1: You build 100 products
Product ID range `0001-0100`, 4-bit product ID supports 10000 types — **sufficient** ✅

### Scenario 2: A product has 8000 devices
Device hash 4-bit supports 10000 devices — **sufficient** ✅

### Scenario 3: User buys permanent license
Days `9999` = permanent — **preserved** ✅

### Scenario 4: 1000 products × 8000 devices
Product ID 1000 types × device hash 10000 devices = **10 million combinations** — **sufficient** ✅

### Scenario 5: Acquired by a big company, 1 million users
4-bit device hash (10000 devices) not enough → upgrade to 5-bit requires version change, but by then you'll have a team 😄

---

## 9. Security Comparison

| Threat | Old Defense (12-bit) | New Defense (16-bit) |
| :--- | :--- | :--- |
| User tampers with days | Checksum mismatch → reject | Same, 4-bit checksum |
| User forges device ID | Device hash mismatch → reject | Same + product ID verification |
| User enters random digits | 1/62^4 ≈ 1/14.7M hit rate | 1/10000 hit rate |
| Brute force | 5-error lockout recommended | Same recommendation |
| Cross-product abuse | **Not preventable** | Product ID mismatch → reject |
| Replay attack | Server records used codes | Same |

---

## 10. File Change Checklist

| File Path | Change Type | Effort |
| :--- | :--- | :--- |
| `src/pages/activation-lab/activation-lab.ux` | Rewrite decrypt area + add product ID | Large |
| `src/pages/activation/activation.ux` | Rewrite decrypt area | Large |
| `src/data/auth-store.js` | Add product ID field | Medium |
| `src/data/products.js` | New product config file | Small |
| `src/pages/numpad-input/numpad-input.ux` | Reference only (reuse styles/logic) | None |

---

## 11. White Screen Prevention

### 11.1 Root Cause Analysis

The previous page had a white screen issue. The root cause is:

```
Timeline of page load:
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Framework creates component instance                  │
  │    → theme = {}  (empty object, from private definition) │
  │                                                         │
  │ 2. Template renders FIRST (before onInit callback)       │
  │    → {{ theme.bg }}  = undefined                        │
  │    → {{ theme.card }} = undefined                       │
  │    → {{ theme.text }} = undefined                       │
  │    → background-color: undefined → WHITE SCREEN!        │
  │                                                         │
  │ 3. onInit() fires                                       │
  │    → store.getTheme(callback)  (async)                  │
  │                                                         │
  │ 4. Callback eventually fires                            │
  │    → theme = { bg: '#1a1a2e', card: '#16213e', ... }   │
  │    → Page re-renders with correct colors                │
  └─────────────────────────────────────────────────────────┘
```

**The gap between step 2 and step 4 is the white screen window.** On slow devices or when storage is slow, this gap can be several hundred milliseconds or even seconds.

### 11.2 Solution: Default Theme Fallback

**Strategy: Initialize `theme` with a complete default value, not an empty object.**

```javascript
// ===== DEFAULT THEME: hardcoded fallback, matches the "blue" theme =====
var DEFAULT_THEME = {
  bg: '#1a1a2e',
  card: '#16213e',
  cardLight: '#0f3460',
  accent: '#7ec8e3',
  text: '#ffffff',
  textSecondary: '#888899',
  textMuted: '#555566',
  border: '#0f3460',
  borderLight: '#2a2a5a',
  keyBg: '#1a1a3e',
  keyBorder: '#2a2a5a'
}

export default {
  private: {
    // ✅ Use DEFAULT_THEME as initial value, NOT {}
    theme: DEFAULT_THEME,

    // ... other data fields ...
    cell0: null, cell1: null, cell2: null, cell3: null,
    cell4: null, cell5: null, cell6: null, cell7: null,
    cell8: null, cell9: null, cell10: null, cell11: null,
    cell12: null, cell13: null, cell14: null, cell15: null,
    cursor: 0,
    // ...
  },

  onInit() {
    var self = this
    // Theme is already set to DEFAULT_THEME — no white screen gap
    // Async load will replace with user's preferred theme
    store.getTheme(function(t) {
      if (t && t.bg) {
        self.theme = t
      }
      // If t is empty/null, keep DEFAULT_THEME
    })
    self.buildPresetLabels()
  }
}
```

### 11.3 Defensive Theme Loading

```javascript
onInit() {
  var self = this

  // Step 1: Load theme with fallback
  try {
    store.getTheme(function(t) {
      if (t && t.bg && t.card && t.text) {
        // Valid theme object received
        self.theme = t
      }
      // else: keep DEFAULT_THEME, no white screen
    })
  } catch (e) {
    // store.getTheme threw an error — keep DEFAULT_THEME
    console.log('Theme load failed, using default theme')
  }

  // Step 2: Safe initialization (wrapped in try-catch)
  try {
    self.buildPresetLabels()
  } catch (e) {
    console.log('buildPresetLabels failed: ' + e)
  }
}
```

### 11.4 Safe `onShow()` with Storage

```javascript
onShow() {
  var self = this

  // Refresh theme
  try {
    store.getTheme(function(t) {
      if (t && t.bg) {
        self.theme = t
      }
    })
  } catch (e) {}

  // Safe storage access
  try {
    var storage = require("@system.storage")
    storage.get({
      key: "activation_lab_device_id",
      success: function(data) {
        if (data !== undefined && data !== null) {
          self.customDeviceId = String(data)
          storage.delete({ key: "activation_lab_device_id" })
        }
      },
      fail: function() {
        // Silent fail — don't crash the page
      }
    })
  } catch (e) {
    // storage module not available — skip
  }
}
```

### 11.5 Defensive `buildPresetLabels()` and `loadDemoCode()`

```javascript
buildPresetLabels() {
  var presets = [
    { productId: '0001', deviceId: 'Aa09', days: 30, key: 'presetBtn0' },
    { productId: '0001', deviceId: 'Bb19', days: 90, key: 'presetBtn1' },
    { productId: '0001', deviceId: 'Xy99', days: 365, key: 'presetBtn2' },
    { productId: '0001', deviceId: 'AbCd', days: 9999, key: 'presetBtn3' },
    { productId: '9999', deviceId: 'TeSt', days: 7, key: 'presetBtn4' },
    { productId: '9999', deviceId: 'DeMo', days: 180, key: 'presetBtn5' }
  ]

  for (var i = 0; i < presets.length; i++) {
    var p = presets[i]
    try {
      var r = encryptV2(p.deviceId, p.productId, p.days)
      if (r) {
        this[p.key] = fmtCode16(r)
      }
    } catch (e) {
      // Skip this preset if encrypt fails
      this[p.key] = 'Error'
    }
  }
},

loadDemoCode() {
  try {
    var demo = encryptV2("Aa09", "0001", 30)
    if (demo && demo.length === 16) {
      for (var i = 0; i < 16; i++) {
        this['d' + i] = demo[i]
      }
    }
  } catch (e) {
    // Silent fail — demo code is optional
  }
}
```

### 11.6 Defensive Cell Rendering

The template already uses `{{ cell0 !== null ? cell0 : '-' }}` — this is good. Ensure ALL cell references use this pattern to avoid `undefined` rendering.

```html
<!-- ✅ Good: null-safe -->
<text class="cell-text">{{ cell0 !== null ? cell0 : '-' }}</text>

<!-- ❌ Bad: would render "undefined" if cell0 is undefined -->
<text class="cell-text">{{ cell0 }}</text>
```

### 11.7 White Screen Prevention Checklist

| # | Check | Status |
| :--- | :--- | :--- |
| 1 | `theme` initialized with `DEFAULT_THEME` (not `{}`) | ✅ Required |
| 2 | `store.getTheme()` callback checks `t && t.bg` before assignment | ✅ Required |
| 3 | `store.getTheme()` wrapped in try-catch | ✅ Required |
| 4 | `onInit()` logic wrapped in try-catch | ✅ Required |
| 5 | `onShow()` storage access has `fail` callback | ✅ Required |
| 6 | `buildPresetLabels()` wrapped in try-catch per preset | ✅ Required |
| 7 | `loadDemoCode()` wrapped in try-catch | ✅ Required |
| 8 | All 16 cell references use `cellN !== null ? cellN : '-'` pattern | ✅ Required |
| 9 | `require()` calls wrapped in try-catch | ✅ Recommended |
| 10 | `fmtCode16()` and `fmtCode12()` accept null/undefined input | ✅ Recommended |

### 11.8 Complete Safe Initialization Pattern

```javascript
// ===== DEFAULT_THEME: hardcoded, never causes white screen =====
var DEFAULT_THEME = {
  bg: '#1a1a2e',
  card: '#16213e',
  cardLight: '#0f3460',
  accent: '#7ec8e3',
  text: '#ffffff',
  textSecondary: '#888899',
  textMuted: '#555566',
  border: '#0f3460',
  borderLight: '#2a2a5a'
}

export default {
  private: {
    theme: DEFAULT_THEME,  // ← KEY: never empty

    // 16 cells for decrypt area
    cell0: null, cell1: null, cell2: null, cell3: null,
    cell4: null, cell5: null, cell6: null, cell7: null,
    cell8: null, cell9: null, cell10: null, cell11: null,
    cell12: null, cell13: null, cell14: null, cell15: null,
    cursor: 0,

    // Encrypt area
    customDeviceId: '',
    customDays: '',
    encryptResult: '',
    encryptDetail: '',

    // Decrypt area
    verifyDeviceId: '',
    decryptResult: '',
    decryptDetail: '',
    decryptSuccess: false,

    // Preset buttons
    presetBtn0: '0001 / 30天',
    presetBtn1: '0001 / 90天',
    presetBtn2: '0001 / 365天',
    presetBtn3: '0001 / 永久',
    presetBtn4: '9999 / 7天',
    presetBtn5: '9999 / 180天'
  },

  onInit() {
    var self = this

    // Async theme: safe, DEFAULT_THEME already in place
    try {
      store.getTheme(function(t) {
        if (t && t.bg && t.card && t.text) {
          self.theme = t
        }
      })
    } catch (e) {}

    // Safe preset building
    try {
      self.buildPresetLabels()
    } catch (e) {}
  },

  onShow() {
    var self = this

    try {
      store.getTheme(function(t) {
        if (t && t.bg) {
          self.theme = t
        }
      })
    } catch (e) {}

    // Safe storage recovery
    try {
      var storage = require("@system.storage")
      storage.get({
        key: "activation_lab_device_id",
        success: function(data) {
          if (data) { self.customDeviceId = String(data) }
          storage.delete({ key: "activation_lab_device_id" })
        },
        fail: function() {}
      })
      storage.get({
        key: "activation_lab_verify_device_id",
        success: function(data) {
          if (data) { self.verifyDeviceId = String(data) }
          storage.delete({ key: "activation_lab_verify_device_id" })
        },
        fail: function() {}
      })
    } catch (e) {}
  },

  buildPresetLabels() {
    var presets = [
      { productId: '0001', deviceId: 'Aa09', days: 30, key: 'presetBtn0' },
      { productId: '0001', deviceId: 'Bb19', days: 90, key: 'presetBtn1' },
      { productId: '0001', deviceId: 'Xy99', days: 365, key: 'presetBtn2' },
      { productId: '0001', deviceId: 'AbCd', days: 9999, key: 'presetBtn3' },
      { productId: '9999', deviceId: 'TeSt', days: 7, key: 'presetBtn4' },
      { productId: '9999', deviceId: 'DeMo', days: 180, key: 'presetBtn5' }
    ]

    for (var i = 0; i < presets.length; i++) {
      var p = presets[i]
      try {
        var r = encryptV2(p.deviceId, p.productId, p.days)
        if (r) {
          this[p.key] = fmtCode16(r)
        }
      } catch (e) {}
    }
  },

  // ... rest of methods (onCellClick, onKeyPress, onDelete, onClear, doDecryptV2, goBack)
}
```

---

## 12. Summary

**Core Principle: 4-bit product ID + 4-bit device hash + 4-bit days + 4-bit checksum = 16-bit pure numeric, reserving capacity for 10000 products and 10000 devices, balanced with no weak links, sufficient to support the full lifecycle from personal project to mid-size commercial product.**

**Key Changes:**
1. Encryption/decryption upgraded from 12-bit Base62 to 16-bit pure numeric
2. New 4-bit product ID field for multi-product identification
3. Decrypt verification area replaced with numpad input (16-cell grid + keypad)
4. Backward compatible with old 12-bit codes via dual-track operation
5. White screen prevention: `DEFAULT_THEME` fallback + try-catch safety on all async operations