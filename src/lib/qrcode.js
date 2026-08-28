var QRCode = (function() {

  var GF_EXP = []
  var GF_LOG = []

  ;(function initGF() {
    GF_LOG[0] = 0
    var x = 1
    for (var i = 0; i < 256; i++) {
      GF_EXP[i] = x
      GF_LOG[x] = i
      x = (x << 1) ^ (x & 0x80 ? 0x11D : 0)
      x &= 0xFF
    }
  })()

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0
    return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255]
  }

  function gfPolyMul(p1, p2) {
    var res = []
    for (var i = 0; i < p1.length + p2.length - 1; i++) res[i] = 0
    for (var i = 0; i < p1.length; i++) {
      for (var j = 0; j < p2.length; j++) {
        res[i + j] ^= gfMul(p1[i], p2[j])
      }
    }
    return res
  }

  function getGeneratorPoly(degree) {
    var poly = [1]
    for (var i = 0; i < degree; i++) {
      poly = gfPolyMul(poly, [1, GF_EXP[i]])
    }
    return poly
  }

  function computeEC(data, ecCount) {
    var gen = getGeneratorPoly(ecCount)
    var res = []
    for (var i = 0; i < ecCount; i++) res[i] = 0
    for (var i = 0; i < data.length; i++) {
      var fb = (data[i] ^ res[0]) & 0xFF
      for (var j = 0; j < ecCount - 1; j++) {
        res[j] = res[j + 1] ^ gfMul(fb, gen[ecCount - 1 - j])
      }
      res[ecCount - 1] = gfMul(fb, gen[0])
    }
    return res
  }

  var EC_BLOCKS = {
    "L": [
      [7, 1, 19], [10, 1, 34], [15, 1, 55], [20, 1, 80],
      [26, 1, 108], [18, 2, 68], [20, 2, 78], [24, 2, 97],
      [30, 2, 116], [18, 2, 68, 2, 69], [20, 4, 81], [24, 6, 92],
      [26, 6, 107], [30, 6, 115], [22, 6, 139], [24, 6, 156],
      [28, 6, 171], [30, 6, 188], [28, 6, 216], [28, 6, 242],
      [26, 6, 272], [28, 6, 286], [30, 6, 311], [30, 6, 338],
      [30, 6, 367], [30, 6, 401], [30, 6, 436], [30, 6, 449],
      [30, 6, 487], [30, 6, 527], [30, 6, 556], [30, 6, 583],
      [30, 6, 620], [30, 6, 660], [30, 6, 702], [30, 6, 720],
      [30, 6, 770], [30, 6, 802], [30, 6, 846], [30, 6, 893]
    ],
    "M": [
      [10, 1, 16], [16, 1, 28], [26, 1, 44], [18, 2, 32],
      [24, 2, 43], [16, 4, 27], [18, 4, 31], [22, 2, 38, 2, 39],
      [22, 3, 36, 2, 37], [26, 4, 43, 1, 44], [30, 1, 50, 4, 51],
      [22, 6, 46, 2, 47], [22, 6, 54, 2, 55], [24, 6, 57, 2, 58],
      [24, 6, 67, 2, 68], [24, 6, 74, 2, 75], [28, 6, 71, 4, 72],
      [28, 6, 85, 4, 86], [26, 6, 103, 2, 104], [26, 6, 115, 2, 116],
      [26, 6, 135, 2, 136], [26, 6, 142, 2, 143], [28, 6, 148, 2, 149],
      [28, 6, 165, 2, 166], [28, 6, 178, 2, 179], [28, 6, 196, 2, 197],
      [28, 6, 219, 2, 220], [28, 6, 225, 2, 226], [28, 6, 244, 2, 245],
      [28, 6, 264, 2, 265], [28, 6, 280, 2, 281], [28, 6, 290, 2, 291],
      [28, 6, 311, 2, 312], [28, 6, 332, 2, 333], [28, 6, 355, 2, 356],
      [28, 6, 361, 2, 362], [28, 6, 389, 2, 390], [28, 6, 403, 2, 404],
      [28, 6, 424, 2, 425], [28, 6, 452, 2, 453]
    ],
    "Q": [
      [13, 1, 13], [22, 1, 22], [18, 2, 17], [26, 2, 24],
      [18, 2, 15, 2, 16], [24, 4, 19], [18, 2, 14, 4, 15],
      [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
      [28, 4, 22, 4, 23], [26, 4, 26, 4, 27], [24, 8, 20, 2, 21],
      [20, 8, 22, 2, 23], [24, 5, 24, 5, 25], [30, 7, 24, 5, 25],
      [28, 8, 27, 2, 28], [28, 8, 30, 2, 31], [26, 8, 33, 2, 34],
      [28, 7, 37, 3, 38], [28, 7, 40, 4, 41], [24, 8, 40, 2, 41],
      [30, 8, 39, 4, 40], [28, 8, 46, 3, 47], [30, 8, 47, 3, 48],
      [30, 8, 53, 3, 54], [30, 8, 58, 5, 59], [30, 8, 59, 5, 60],
      [30, 8, 65, 6, 66], [30, 8, 71, 6, 72], [30, 8, 76, 8, 77],
      [30, 8, 78, 8, 79], [30, 8, 85, 8, 86], [30, 8, 91, 8, 92],
      [30, 8, 97, 8, 98], [30, 8, 100, 8, 101], [30, 8, 107, 8, 108],
      [30, 8, 112, 8, 113], [30, 8, 118, 8, 119], [30, 8, 125, 8, 126]
    ],
    "H": [
      [17, 1, 9], [28, 1, 16], [22, 2, 13], [16, 4, 9],
      [22, 2, 11, 2, 12], [28, 4, 15], [26, 4, 13], [26, 4, 14, 2, 15],
      [24, 4, 12, 4, 13], [28, 6, 15, 2, 16], [24, 3, 12, 8, 13],
      [28, 7, 14, 4, 15], [22, 12, 11, 4, 12], [24, 11, 12, 5, 13],
      [24, 11, 12, 5, 13], [30, 10, 13, 7, 14], [24, 9, 15, 11, 16],
      [28, 10, 15, 10, 16], [24, 11, 16, 10, 17], [26, 12, 17, 8, 18],
      [26, 12, 18, 8, 19], [26, 12, 20, 8, 21], [28, 12, 21, 8, 22],
      [28, 12, 23, 8, 24], [28, 12, 25, 8, 26], [28, 12, 27, 8, 28],
      [28, 12, 29, 8, 30], [28, 12, 30, 9, 31], [28, 12, 33, 9, 34],
      [28, 12, 35, 9, 36], [28, 12, 38, 10, 39], [28, 12, 40, 10, 41],
      [28, 12, 44, 10, 45], [28, 12, 47, 10, 48], [28, 12, 50, 10, 51],
      [28, 12, 52, 10, 53], [28, 12, 56, 10, 57], [28, 12, 58, 11, 59],
      [28, 12, 62, 11, 63], [28, 12, 65, 11, 66]
    ]
  }

  function getECBlockInfo(typeNumber, ecLevel) {
    var table = EC_BLOCKS[ecLevel]
    if (!table || typeNumber < 1 || typeNumber > 40) return null
    return table[typeNumber - 1]
  }

  var REMAINDER_BITS = [0,0,7,7,7,7,7,0,0,0,0,0,0,0,3,3,3,3,3,3,3,4,4,4,4,4,4,4,3,3,3,3,3,3,3,0,0,0,0,0]

  function encodeByte(text, ecLevel) {
    var ecLevelIndex = { "L": 0, "M": 1, "Q": 2, "H": 3 }[ecLevel] || 0

    var bytes = []
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i)
      if (code < 0x80) {
        bytes.push(code)
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F))
      } else if (code < 0x10000) {
        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F))
      } else {
        bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F))
      }
    }

    for (var typeNumber = 1; typeNumber <= 40; typeNumber++) {
      var info = getECBlockInfo(typeNumber, ecLevel)
      if (!info) continue

      var ecPerBlock = info[0]
      var blocks = []
      var totalData = 0
      var totalEC = 0

      for (var b = 1; b < info.length; b += 2) {
        var count = info[b]
        var dataCount = info[b + 1]
        totalData += count * dataCount
        totalEC += count * ecPerBlock
        for (var j = 0; j < count; j++) {
          blocks.push({ dataCount: dataCount, ecCount: ecPerBlock })
        }
      }

      if (bytes.length > totalData) continue

      var modeIndicator = [0, 1, 0, 0]
      var charCountBits = typeNumber <= 9 ? 8 : 16
      var charCount = []
      for (var ci = charCountBits - 1; ci >= 0; ci--) {
        charCount.push((bytes.length >> ci) & 1)
      }

      var dataBits = modeIndicator.concat(charCount)
      for (var di = 0; di < bytes.length; di++) {
        for (var bi = 7; bi >= 0; bi--) {
          dataBits.push((bytes[di] >> bi) & 1)
        }
      }

      var terminatorCount = Math.min(4, totalData * 8 - dataBits.length)
      for (var ti = 0; ti < terminatorCount; ti++) dataBits.push(0)

      while (dataBits.length % 8 !== 0) dataBits.push(0)

      var padBytes = [0xEC, 0x11]
      var padIdx = 0
      while (dataBits.length < totalData * 8) {
        var pb = padBytes[padIdx % 2]
        for (var bi = 7; bi >= 0; bi--) {
          dataBits.push((pb >> bi) & 1)
        }
        padIdx++
      }

      var dataCodewords = []
      for (var di = 0; di < dataBits.length; di += 8) {
        var cw = 0
        for (var bi = 0; bi < 8; bi++) {
          cw = (cw << 1) | (dataBits[di + bi] || 0)
        }
        dataCodewords.push(cw)
      }

      var ecCodewords = []
      var offset = 0
      for (var bi = 0; bi < blocks.length; bi++) {
        var blockData = []
        for (var db = 0; db < blocks[bi].dataCount; db++) {
          blockData.push(dataCodewords[offset + db])
        }
        offset += blocks[bi].dataCount
        ecCodewords.push(computeEC(blockData, blocks[bi].ecCount))
      }

      var finalData = []
      var maxDataPerBlock = blocks[0].dataCount
      for (var ci = 0; ci < maxDataPerBlock; ci++) {
        for (var bi = 0; bi < blocks.length; bi++) {
          if (ci < blocks[bi].dataCount) {
            finalData.push(dataCodewords[bi === 0 ? ci : blocks.slice(0, bi).reduce(function(s, b) { return s + b.dataCount }, 0) + ci])
          }
        }
      }

      var maxEC = ecCodewords[0].length
      for (var ei = 0; ei < maxEC; ei++) {
        for (var bi = 0; bi < blocks.length; bi++) {
          if (ei < ecCodewords[bi].length) {
            finalData.push(ecCodewords[bi][ei])
          }
        }
      }

      var remainderBits = REMAINDER_BITS[typeNumber]
      var finalBits = []
      for (var di = 0; di < finalData.length; di++) {
        for (var bi = 7; bi >= 0; bi--) {
          finalBits.push((finalData[di] >> bi) & 1)
        }
      }
      for (var ri = 0; ri < remainderBits; ri++) finalBits.push(0)

      var modules = makeMatrix(typeNumber)

      var mask = evaluateMask(modules, finalBits, typeNumber, ecLevelIndex)
      placeDataWithMask(modules, finalBits, typeNumber, mask)
      applyFormatInfo(modules, typeNumber, ecLevelIndex, mask)

      return { modules: modules, moduleCount: typeNumber * 4 + 17 }
    }

    return null
  }

  function makeMatrix(typeNumber) {
    var size = typeNumber * 4 + 17
    var m = []
    for (var i = 0; i < size; i++) {
      m[i] = []
      for (var j = 0; j < size; j++) m[i][j] = null
    }
    addFinders(m, size)
    addTiming(m, size)
    addAlignments(m, typeNumber)
    addDarkModule(m, typeNumber)
    reserveFormat(m, typeNumber)
    return m
  }

  function addFinders(m, size) {
    placeFinder(m, 0, 0)
    placeFinder(m, size - 7, 0)
    placeFinder(m, 0, size - 7)
  }

  function placeFinder(m, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r
        var cc = col + c
        if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue
        if (r >= 0 && r <= 6 && (c === 0 || c === 6)) {
          m[rr][cc] = true
        } else if (c >= 0 && c <= 6 && (r === 0 || r === 6)) {
          m[rr][cc] = true
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          m[rr][cc] = true
        } else {
          m[rr][cc] = false
        }
      }
    }
    for (var r = -1; r <= 7; r++) {
      var rr = row + r
      if (rr >= 0 && rr < m.length) {
        for (var c = -1; c <= 7; c++) {
          var cc = col + c
          if (cc >= 0 && cc < m.length) {
            if (r < 0 || r > 6 || c < 0 || c > 6) {
              m[rr][cc] = false
            }
          }
        }
      }
    }
  }

  function addTiming(m, size) {
    for (var i = 8; i < size - 8; i++) {
      m[i][6] = (i % 2 === 0)
      m[6][i] = (i % 2 === 0)
    }
  }

  function addAlignments(m, typeNumber) {
    var centers = getAlignmentCenters(typeNumber)
    for (var i = 0; i < centers.length; i++) {
      for (var j = 0; j < centers.length; j++) {
        var row = centers[i]
        var col = centers[j]
        if (m[row][col] !== null) continue
        placeAlignment(m, row, col)
      }
    }
  }

  function getAlignmentCenters(typeNumber) {
    if (typeNumber === 1) return []
    var num = Math.floor(typeNumber / 7) + 2
    var step = 26
    var last = typeNumber * 4 + 21
    var centers = []
    centers.push(6)
    for (var i = 0; i < num - 1; i++) {
      centers.push(last - step * (num - 2 - i))
    }
    centers.push(last)
    return centers
  }

  function placeAlignment(m, row, col) {
    for (var r = -2; r <= 2; r++) {
      for (var c = -2; c <= 2; c++) {
        var rr = row + r
        var cc = col + c
        if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue
        m[rr][cc] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0))
      }
    }
  }

  function addDarkModule(m, typeNumber) {
    var size = typeNumber * 4 + 17
    m[size - 8][8] = true
  }

  function reserveFormat(m, typeNumber) {
    var size = typeNumber * 4 + 17
    for (var i = 0; i < 9; i++) {
      if (m[8][i] === null) m[8][i] = false
      if (m[i][8] === null) m[i][8] = false
    }
    for (var i = 0; i < 8; i++) {
      if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false
      if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false
    }
    m[size - 8][8] = true
  }

  function placeDataWithMask(m, bits, typeNumber, mask) {
    var size = typeNumber * 4 + 17
    var fn = MASK_PATTERNS[mask]
    var col = size - 1
    var row = size - 1
    var dir = -1
    var idx = 0
    while (col > 0) {
      if (col === 6) col--
      while (row >= 0 && row < size) {
        for (var c = 0; c < 2; c++) {
          var cc = col - c
          if (m[row][cc] === null && idx < bits.length) {
            m[row][cc] = !!bits[idx] !== fn(row, cc)
            idx++
          }
        }
        row += dir
      }
      dir = -dir
      row += dir
      col -= 2
    }
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (m[r][c] === null) m[r][c] = false
      }
    }
  }

  var MASK_PATTERNS = [
    function(r, c) { return (r + c) % 2 === 0 },
    function(r, c) { return r % 2 === 0 },
    function(r, c) { return c % 3 === 0 },
    function(r, c) { return (r + c) % 3 === 0 },
    function(r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0 },
    function(r, c) { return (r * c) % 2 + (r * c) % 3 === 0 },
    function(r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0 },
    function(r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0 }
  ]

  function evaluateMask(baseMatrix, bits, typeNumber, ecLevelIndex) {
    var size = typeNumber * 4 + 17
    var bestMask = 0
    var bestScore = Infinity

    for (var mask = 0; mask < 8; mask++) {
      var test = cloneMatrix(baseMatrix, size)
      placeDataWithMask(test, bits, typeNumber, mask)
      var score = computeScore(test, size)
      if (score < bestScore) {
        bestScore = score
        bestMask = mask
      }
    }
    return bestMask
  }

  function cloneMatrix(m, size) {
    var copy = []
    for (var i = 0; i < size; i++) {
      copy[i] = []
      for (var j = 0; j < size; j++) {
        copy[i][j] = m[i][j]
      }
    }
    return copy
  }

  function computeScore(m, size) {
    var score = 0

    for (var r = 0; r < size; r++) {
      var run = 0
      var prev = null
      for (var c = 0; c < size; c++) {
        var val = m[r][c]
        if (val === prev) {
          run++
        } else {
          if (run >= 5) score += 3 + run - 5
          run = 1
          prev = val
        }
      }
      if (run >= 5) score += 3 + run - 5
    }

    for (var c = 0; c < size; c++) {
      var run = 0
      var prev = null
      for (var r = 0; r < size; r++) {
        var val = m[r][c]
        if (val === prev) {
          run++
        } else {
          if (run >= 5) score += 3 + run - 5
          run = 1
          prev = val
        }
      }
      if (run >= 5) score += 3 + run - 5
    }

    for (var r = 0; r < size - 1; r++) {
      for (var c = 0; c < size - 1; c++) {
        if (m[r][c] === m[r+1][c] && m[r][c] === m[r][c+1] && m[r][c] === m[r+1][c+1]) {
          score += 3
        }
      }
    }

    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size - 10; c++) {
        if (m[r][c] && !m[r][c+1] && m[r][c+2] && m[r][c+3] && m[r][c+4] && !m[r][c+5] && m[r][c+6] && !m[r][c+7] && !m[r][c+8] && !m[r][c+9] && !m[r][c+10]) {
          score += 40
        }
        if (!m[r][c] && m[r][c+1] && !m[r][c+2] && !m[r][c+3] && !m[r][c+4] && m[r][c+5] && !m[r][c+6] && m[r][c+7] && m[r][c+8] && m[r][c+9] && m[r][c+10]) {
          score += 40
        }
      }
    }

    for (var c = 0; c < size; c++) {
      for (var r = 0; r < size - 10; r++) {
        if (m[r][c] && !m[r+1][c] && m[r+2][c] && m[r+3][c] && m[r+4][c] && !m[r+5][c] && m[r+6][c] && !m[r+7][c] && !m[r+8][c] && !m[r+9][c] && !m[r+10][c]) {
          score += 40
        }
        if (!m[r][c] && m[r+1][c] && !m[r+2][c] && !m[r+3][c] && !m[r+4][c] && m[r+5][c] && !m[r+6][c] && m[r+7][c] && m[r+8][c] && m[r+9][c] && m[r+10][c]) {
          score += 40
        }
      }
    }

    var darkCount = 0
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (m[r][c]) darkCount++
      }
    }
    var total = size * size
    var ratio = Math.floor((darkCount / total) * 100)
    var prev = ratio - ratio % 5
    var next = prev + 5
    score += Math.min(Math.abs(prev - 50) / 5, Math.abs(next - 50) / 5) * 10

    return score
  }

  function getFormatBits(ecLevelIndex, maskPattern) {
    var data = (ecLevelIndex << 3) | maskPattern
    var bch = data
    for (var i = 0; i < 10; i++) {
      bch = (bch << 1) ^ ((bch >> 9) * 0x537)
    }
    var bits = ((data << 10) | (bch & 0x3FF)) ^ 0x5412
    var result = []
    for (var i = 14; i >= 0; i--) {
      result.push((bits >> i) & 1)
    }
    return result
  }

  function applyFormatInfo(m, typeNumber, ecLevelIndex, mask) {
    var size = typeNumber * 4 + 17
    var bits = getFormatBits(ecLevelIndex, mask)

    for (var i = 0; i < 6; i++) {
      m[8][i] = !!bits[i]
    }
    m[8][7] = !!bits[6]
    m[8][8] = !!bits[7]
    m[7][8] = !!bits[8]
    for (var i = 0; i < 6; i++) {
      m[5 - i][8] = !!bits[9 + i]
    }

    for (var i = 0; i < 7; i++) {
      m[size - 1 - i][8] = !!bits[i]
    }
    for (var i = 0; i < 7; i++) {
      m[8][size - 7 + i] = !!bits[8 + i]
    }
  }

  function create(text, level) {
    level = level || "L"
    var result = encodeByte(text, level)
    if (!result) {
      return { modules: [], moduleCount: 0 }
    }
    return result
  }

  return { create: create }
})()

module.exports = QRCode