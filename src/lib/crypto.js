const GLOBAL_MASTER_SALT = "k3f9x";

function sha256Hex(str) {
  var msg = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 128) {
      msg.push(c);
    } else if (c < 2048) {
      msg.push((c >> 6) | 192);
      msg.push((c & 63) | 128);
    } else {
      msg.push((c >> 12) | 224);
      msg.push(((c >> 6) & 63) | 128);
      msg.push((c & 63) | 128);
    }
  }
  var bitLen = msg.length * 8;
  msg.push(0x80);
  while ((msg.length + 8) % 64 !== 0) {
    msg.push(0);
  }
  for (var i = 0; i < 4; i++) {
    msg.push(0);
  }
  msg.push((bitLen >>> 24) & 0xFF);
  msg.push((bitLen >>> 16) & 0xFF);
  msg.push((bitLen >>> 8) & 0xFF);
  msg.push(bitLen & 0xFF);

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  for (var chunk = 0; chunk < msg.length; chunk += 64) {
    var w = new Array(64);
    for (var t = 0; t < 16; t++) {
      w[t] = (msg[chunk + t * 4] << 24) | (msg[chunk + t * 4 + 1] << 16) | (msg[chunk + t * 4 + 2] << 8) | msg[chunk + t * 4 + 3];
    }
    for (var t = 16; t < 64; t++) {
      var s0 = ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3);
      var s1 = ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (var t = 0; t < 64; t++) {
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }

  var hex = "";
  for (var i = 0; i < 8; i++) {
    var v = (H[i] >>> 0).toString(16);
    while (v.length < 8) v = "0" + v;
    hex += v;
  }
  return hex;
}

function hmacSHA256(key, message) {
  var blockSize = 64;
  var keyBytes = [];
  for (var i = 0; i < key.length; i++) {
    keyBytes.push(key.charCodeAt(i));
  }
  if (keyBytes.length > blockSize) {
    var keyHash = sha256Hex(key);
    keyBytes = [];
    for (var i = 0; i < keyHash.length; i += 2) {
      keyBytes.push(parseInt(keyHash.substring(i, i + 2), 16));
    }
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }
  var iPad = [];
  var oPad = [];
  for (var i = 0; i < blockSize; i++) {
    iPad.push(keyBytes[i] ^ 0x36);
    oPad.push(keyBytes[i] ^ 0x5c);
  }
  var inner = "";
  for (var i = 0; i < blockSize; i++) {
    inner += String.fromCharCode(iPad[i]);
  }
  inner += message;
  var innerHash = sha256Hex(inner);
  var outer = "";
  for (var i = 0; i < blockSize; i++) {
    outer += String.fromCharCode(oPad[i]);
  }
  for (var i = 0; i < innerHash.length; i += 2) {
    outer += String.fromCharCode(parseInt(innerHash.substring(i, i + 2), 16));
  }
  return sha256Hex(outer);
}

const REDEEM_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEVICE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function hexToDigitKey(hex, length) {
  var result = "";
  for (var i = 0; i < hex.length && result.length < length; i++) {
    var val = parseInt(hex.charAt(i), 16);
    if (!isNaN(val)) {
      result += String(val % 10);
    }
  }
  while (result.length < length) {
    result += "0";
  }
  return result;
}

function computeProductSalt(productIdIndex) {
  return hmacSHA256(GLOBAL_MASTER_SALT, productIdIndex).substring(0, 5);
}

function computeFixedSalt() {
  return hmacSHA256(GLOBAL_MASTER_SALT, "fixed").substring(0, 5);
}

function generateChecksum1(s) {
  var sum = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    sum = (((c << 1) + sum) % 1000);
  }
  return String(Math.floor(sum / 10) % 10);
}

function scrambleN(value, key) {
  var result = "";
  for (var i = 0; i < value.length; i++) {
    var v = parseInt(value.charAt(i), 10);
    var k = parseInt(key.charAt(i % key.length), 10);
    result += String((v + k) % 10);
  }
  return result;
}

function unscrambleN(scrambled, key) {
  var result = "";
  for (var i = 0; i < scrambled.length; i++) {
    var s = parseInt(scrambled.charAt(i), 10);
    var k = parseInt(key.charAt(i % key.length), 10);
    result += String((s - k + 10) % 10);
  }
  return result;
}

function redeemCodeToNumber(code) {
  var value = 0;
  for (var i = 0; i < 4; i++) {
    var idx = REDEEM_CHARSET.indexOf(code.charAt(i));
    if (idx === -1) {
      return null;
    }
    value = value * 36 + idx;
  }
  return value;
}

function numberToRedeemCode(num) {
  if (num < 0 || num > 1679615) {
    return null;
  }
  var result = "";
  for (var i = 0; i < 4; i++) {
    result = REDEEM_CHARSET.charAt(num % 36) + result;
    num = Math.floor(num / 36);
  }
  return result;
}

function deviceIdToNumber(deviceId) {
  var value = 0;
  for (var i = 0; i < 4; i++) {
    var idx = DEVICE_CHARSET.indexOf(deviceId.charAt(i));
    if (idx === -1) {
      return null;
    }
    value = value * 62 + idx;
  }
  return value;
}

function numberToDeviceId(num) {
  if (num < 0 || num > 14776335) {
    return null;
  }
  var result = "";
  for (var i = 0; i < 4; i++) {
    result = DEVICE_CHARSET.charAt(num % 62) + result;
    num = Math.floor(num / 62);
  }
  return result;
}

function parseInput12(input) {
  var cleaned = input.replace(/\s/g, "");
  if (cleaned.length !== 12) {
    return null;
  }

  var group1 = cleaned.substring(0, 2);
  var group2 = cleaned.substring(2, 6);
  var group3 = cleaned.substring(6, 8);
  var group4 = cleaned.substring(8, 12);

  if (!/^\d{2}$/.test(group1)) {
    return null;
  }
  if (!/^[A-Z0-9]{4}$/.test(group2)) {
    return null;
  }
  if (!/^\d{2}$/.test(group3)) {
    return null;
  }
  if (!/^[A-Za-z0-9]{4}$/.test(group4)) {
    return null;
  }

  return {
    productIdIndex: group1,
    redeemCode: group2,
    months: group3,
    deviceId: group4
  };
}

function generateActivationCode(input12) {
  var parsed = parseInput12(input12);
  if (!parsed) {
    return null;
  }

  var redeemNum = redeemCodeToNumber(parsed.redeemCode);
  if (redeemNum === null) {
    return null;
  }

  var deviceNum = deviceIdToNumber(parsed.deviceId);
  if (deviceNum === null) {
    return null;
  }

  var productIdNum = parseInt(parsed.productIdIndex, 10);
  var monthsNum = parseInt(parsed.months, 10);

  var REDEEM_RANGE = 1679616n;
  var MONTHS_RANGE = 100n;
  var DEVICE_RANGE = 14776336n;

  var combined = BigInt(productIdNum) * REDEEM_RANGE * MONTHS_RANGE * DEVICE_RANGE
    + BigInt(redeemNum) * MONTHS_RANGE * DEVICE_RANGE
    + BigInt(monthsNum) * DEVICE_RANGE
    + BigInt(deviceNum);

  return combined.toString().padStart(18, "0");
}

function decryptActivationCode(code) {
  if (code.length !== 18) {
    return {
      valid: false,
      reason: "Code must be 18 digits, got " + code.length,
      productIdIndex: "??",
      redeemCode: "????",
      months: "??",
      deviceId: "????"
    };
  }
  if (!/^\d{18}$/.test(code)) {
    return {
      valid: false,
      reason: "Code must be all numeric digits",
      productIdIndex: "??",
      redeemCode: "????",
      months: "??",
      deviceId: "????"
    };
  }

  var REDEEM_RANGE = 1679616n;
  var MONTHS_RANGE = 100n;
  var DEVICE_RANGE = 14776336n;

  var combined = BigInt(code);

  var deviceNum = Number(combined % DEVICE_RANGE);
  combined = combined / DEVICE_RANGE;

  var monthsNum = Number(combined % MONTHS_RANGE);
  combined = combined / MONTHS_RANGE;

  var redeemNum = Number(combined % REDEEM_RANGE);
  combined = combined / REDEEM_RANGE;

  var productIdNum = Number(combined);

  var productIdIndex = String(productIdNum).padStart(2, "0");
  var months = String(monthsNum).padStart(2, "0");

  var redeemCode = numberToRedeemCode(redeemNum);
  if (!redeemCode) {
    return {
      valid: false,
      reason: "Failed to decode redeem code",
      productIdIndex: productIdIndex,
      redeemCode: "????",
      months: months,
      deviceId: "????"
    };
  }

  var deviceId = numberToDeviceId(deviceNum);
  if (!deviceId) {
    return {
      valid: false,
      reason: "Failed to decode device ID",
      productIdIndex: productIdIndex,
      redeemCode: redeemCode,
      months: months,
      deviceId: "????"
    };
  }

  return {
    valid: true,
    productIdIndex: productIdIndex,
    redeemCode: redeemCode,
    months: months,
    deviceId: deviceId,
    original: productIdIndex + redeemCode + months + deviceId
  };
}

function fmtCode18(code) {
  return code.substring(0, 4) + " " + code.substring(4, 8) + " " +
    code.substring(8, 12) + " " + code.substring(12, 16) + " " +
    code.substring(16, 18);
}

module.exports = {
  GLOBAL_MASTER_SALT: GLOBAL_MASTER_SALT,
  generateChecksum1: generateChecksum1,
  scrambleN: scrambleN,
  unscrambleN: unscrambleN,
  redeemCodeToNumber: redeemCodeToNumber,
  numberToRedeemCode: numberToRedeemCode,
  deviceIdToNumber: deviceIdToNumber,
  numberToDeviceId: numberToDeviceId,
  parseInput12: parseInput12,
  generateActivationCode: generateActivationCode,
  decryptActivationCode: decryptActivationCode,
  fmtCode18: fmtCode18,
  computeProductSalt: computeProductSalt,
  computeFixedSalt: computeFixedSalt
};