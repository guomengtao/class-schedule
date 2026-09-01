# 中文输入法如何输入小写字母

## 问题

当前 `chinese-input.ux` 页面在 EN（英文）模式下，所有字母按键都是大写（Q、W、E...），导致用户只能输入大写字母，无法输入小写字母。

## 根因

看 `chinese-input.ux` 中 `onKeyPress` 方法（第169-180行）：

```javascript
onKeyPress(item) {
  if (this.lang === "cn" && !this.numFlag) {
    // CN 拼音模式 -> 字母转小写用于拼拼音，不直接输出
    this.cval += item.toLowerCase()
    this.updateCandidates()
  } else {
    // EN 英文模式 -> 直接追加按键字符（大写）
    this.inputValue += item  // item 是 "Q", "W" 这种大写
  }
}
```

键盘定义（第104-108行）全部是大写字母：

```javascript
keys: {
  full: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ]
}
```

所以 EN 模式下直接追加的就是大写字母，用户无法输入小写。

## 解决方案

### 方案：EN 模式默认小写 + Shift 键切换大小写

**改动点：**

1. 新增 `shiftFlag` 状态变量
2. 修改 `onKeyPress`：EN 模式下默认转小写，shiftFlag 为 true 时保持大写
3. 键盘底部新增 Shift 键

**具体代码改动：**

```javascript
// 新增状态
shiftFlag: false,

// onKeyPress 改动（else 分支）
} else {
  var char = item
  if (this.lang === "en" && !this.numFlag && !this.shiftFlag) {
    char = item.toLowerCase()  // 默认小写
  }
  if (this.inputValue.length >= this.maxlen) return
  this.inputValue += char
}

// 新增方法
toggleShift() {
  this.shiftFlag = !this.shiftFlag
}
```

**键盘底行调整：**

```
原: 123/ABC   空格   中/EN
新: Shift   空格   中/EN
```

Shift 键高亮时表示大写锁定，默认不高亮时输出小写。

### 效果

| 模式 | Shift 状态 | 输入 "Q" | 结果 |
|------|-----------|---------|------|
| EN | 关（默认） | 按 Q | 输出 `q` |
| EN | 开（高亮） | 按 Q | 输出 `Q` |
| CN | — | 按 Q | 拼拼音 `q` |

## 涉及文件

| 文件 | 说明 |
|------|------|
| `src/pages/chinese-input/chinese-input.ux` | 模板加 Shift 键，脚本加 shiftFlag 逻辑 |

## 改动量

约 15 行代码，3 个改动点：
1. data 加 `shiftFlag: false`
2. `onKeyPress` 改 else 分支
3. 模板键盘底行加 Shift 按钮