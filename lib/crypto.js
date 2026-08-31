const crypto = require("crypto");

const GLOBAL_MASTER_SALT = "k3f9x";

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
  var hmac = crypto.createHmac("sha256", GLOBAL_MASTER_SALT);
  hmac.update(productIdIndex);
  return hmac.digest("hex").substring(0, 5);
}

function computeFixedSalt() {
  var hmac = crypto.createHmac("sha256", GLOBAL_MASTER_SALT);
  hmac.update("fixed");
  return hmac.digest("hex").substring(0, 5);
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