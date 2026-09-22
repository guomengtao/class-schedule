# 中文输入法支持小写字母分析

## 一、现状分析

### 当前键盘布局
```
第一行: Q W E R T Y U I O P
第二行: A S D F G H J K L
第三行: Z X C V B N M  Del
底部:   123/ABC  空格  中/EN
```

### 当前输入逻辑（`chinese-input.ux` 第169-180行）
```javascript
onKeyPress(item) {
  if (this.lang === "cn" && !this.numFlag) {
    // 中文拼音模式 -> 转为小写拼 cval 查候选词
    this.cval += item.toLowerCase()
    this.updateCandidates()
  } else {
    // EN英文模式 或 数字模式 -> 直接追加大写字母
    this.inputValue += item  // item 是 "Q", "W" 这种大写
  }
}
```

### 问题根因
1. **键盘所有字母都是大写字符** (`["Q","W","E",...]`)
2. **EN模式直接追加 item**，所以输入的全是大写
3. **CN模式只用于拼拼音**，不直接输出英文字母

---

## 二、用户需求场景

| 场景 | 说明 | 举例 |
|------|------|------|
| A. 中文内容中夹小写字母 | 比如输入"iPhone"、"WiFi"、"PPTv2" | 自定义内容写"第1节课:math hw" |
| B. EN模式默认小写 | 英文输入默认小写，需要时切换大写 | 输入"hello" 而不是 "HELLO" |
| C. 拼音候选栏直接选字母 | 拼音没匹配到时可直接确认字母 | 输入"abc"候选里可选"a","ab","abc" |

---

## 三、解决方案

### 方案 1: EN模式增加 Shift 切换大小写（推荐）

**改动点：**
- 键盘底部新增一个 Shift 键（替换或增加）
- 增加 `shiftFlag` 状态
- EN模式按下字母时根据 shiftFlag 决定大小写

**逻辑：**
```javascript
// 新增状态
shiftFlag: false,

// onKeyPress 改动（EN分支）
} else {
  var char = item  // item 是大写 "Q"
  if (this.lang === "en" && !this.shiftFlag) {
    char = item.toLowerCase()  // 转为小写 "q"
  }
  this.inputValue += char
}

// 新增 toggleShift
toggleShift() {
  this.shiftFlag = !this.shiftFlag
}
```

**键盘调整：**
```
底行: Shift  空格  中/EN
或:   Shift  123  中/EN  （把123移到上一行）
```

**优点：** 符合真实键盘习惯，改动小
**缺点：** 需增加一个按键位置

---

### 方案 2: CN模式候选栏追加"直接字母"选项

**改动点：**
- 当拼音无匹配候选时，在候选栏显示当前 cval 的字母拆分
- 用户可以点击候选直接输出字母串

**逻辑：**
```javascript
updateCandidates() {
  // ... 原有逻辑 ...
  
  // 如果没有候选，追加字母本身
  if (row0.length === 0 && this.cval.length > 0) {
    row0.push(this.cval)           // 整个串
    for (var i = 0; i < this.cval.length; i++) {
      row0.push(this.cval[i])     // 每个字母
    }
  }
  this.resultRow0 = row0
}
```

**效果：**
```
输入 abc -> 候选栏显示: abc a b c
点击 abc -> 输入 abc
```

**优点：** 不增加按键，在中文模式下也能输出小写字母
**缺点：** 拼音候选多时字母选项被挤出候选栏

---

### 方案 3: EN模式默认小写 + 双击Shift锁定大写

**改动点：**
- 默认 EN 模式输出小写
- 单击 Shift = 临时大写（下一个字母大写）
- 双击 Shift = 锁定大写（全部大写）

**实现较复杂**，需要检测双击事件。

---

## 四、推荐实施顺序

| 优先级 | 方案 | 改动量 | 效果 |
|--------|------|--------|------|
| ⭐⭐⭐ | 方案2：CN候选追加字母 | 小 | 中文模式下直接输出字母 |
| ⭐⭐ | 方案1：EN加Shift键 | 中 | EN模式大小写自由切换 |
| ⭐ | 方案3：双击Shift锁定 | 大 | 体验更完善但复杂 |

### 最终推荐：方案1 + 方案2 组合

1. **先加方案2**（5分钟）：让中文模式无候选时可以点字母输出
2. **再加方案1**（15分钟）：EN模式加 Shift 键
3. 两个方案互补，覆盖所有场景

---

## 五、具体代码位置

| 文件 | 行号 | 说明 |
|------|------|------|
| `src/pages/chinese-input/chinese-input.ux` | 104-108 | 键盘 keys 定义（加 shiftFlag） |
| 同上 | 169-180 | `onKeyPress` 核心逻辑 |
| 同上 | 231-278 | `updateCandidates` 候选生成（追加字母） |
| 同上 | 22-50 | 模板 keyboard 区域（加 Shift 键按钮） |

---

## 六、风险评估

| 风险 | 影响 | 规避 |
|------|------|------|
| Shift 键占位置 | 底行较挤 | 把 Del 移到顶行或调整按键大小 |
| 候选栏字母混入中文候选 | 体验混乱 | 仅在 row0 为空时追加字母 |
| maxlen 限制 | 原本5字，字母也一样 | 用户可自行调大 maxlen |