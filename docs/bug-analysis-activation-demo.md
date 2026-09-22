# Bug Analysis: Activation Lab Demo Shows Letters in Encryption Result

## Bug Summary

**Symptom:** In the activation code system page (`activation-lab`), when clicking any Demo button, the encryption result displayed contains letters (uppercase and lowercase), making it not pure digits.

**Expected:** 16-digit pure numeric activation code (e.g., `0001000100301234`)

**Actual:** 16-character mixed alphanumeric code (e.g., `0001aBcD0030XyZ9`)

---

## Root Cause Analysis

### The `encode4` function uses Base62 encoding (includes letters)

**File:** [activation-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation-lab/activation-lab.ux#L200-L201)

```javascript
var CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
var BASE = 62

function encode4(n) {
  var result = ''
  var v = n
  for (var i = 0; i < 4; i++) {
    result = CHARSET[v % BASE] + result
    v = Math.floor(v / BASE)
  }
  return result
}
```

`encode4` is the core encoding function used by all hash and checksum functions. It uses Base62 encoding with `CHARSET` containing letters (A-Z, a-z), so the output always contains letters.

### Call Chain

```
Demo button click
  → presetEncryptV2(deviceId, productId, days)
    → encryptV2(deviceId, productId, days)
      → deviceIdToHashV2(deviceId)  → encode4() → produces letters!
      → checksumV2(plain)           → encode4() → produces letters!
    → fmtCode16(result.full)
      → displays 16-char mixed alphanumeric code (NOT pure digits)
```

### Affected Functions

| Function | Purpose | Calls |
|----------|---------|-------|
| `deviceIdToHash` | 12-bit device ID hash | `encode4()` |
| `checksum` | 12-bit checksum | `encode4()` |
| `deviceIdToHashV2` | 16-bit device ID hash | `encode4()` |
| `checksumV2` | 16-bit checksum | `encode4()` |

---

## Fix

Replace `encode4` with pure numeric encoding:

```javascript
function encode4(n) {
  return (Math.abs(n) % 10000).toString().padStart(4, '0')
}
```

This produces 4-digit pure numbers (0000-9999), so all activation codes (both 12-bit and 16-bit) become pure digits.

Also remove the now-unused `CHARSET` and `BASE` variables, and update `decodeV2`/`decrypt` validation to use pure digit regex.

---

## Files Changed

| File | Change |
|------|--------|
| [activation-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation-lab/activation-lab.ux#L200-L201) | `encode4` → pure numeric, remove `CHARSET`/`BASE` |
| [activation-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation-lab/activation-lab.ux#L278-L287) | `deviceIdToHashV2`/`checksumV2` → simplify to `encode4(Math.abs(hash))` |
| [activation-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation-lab/activation-lab.ux#L307-L308) | `decryptV2` → validate with `/^\d{16}$/` |
| [activation-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation-lab/activation-lab.ux#L236-L237) | `decrypt` → validate with `/^\d{12}$/` |