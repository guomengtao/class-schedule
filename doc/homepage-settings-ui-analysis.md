# 首页设置 UI 规范分析报告

## 一、页面结构

```
┌──────────────────────────────────────────┐
│  ◀              首页                      │  header
├──────────────────────────────────────────┤
│  快速添加                    [switch]     │  section1
│  课程提醒                    [switch]     │
│  钉首页                      [switch]     │
│    └ 管理钉首页              管理         │  (展开)
├──────────────────────────────────────────┤
│  总课程                      [switch]     │  section2
│  今日                        [switch]     │
│  明日                        [switch]     │
├──────────────────────────────────────────┤
│  自定义                      [switch]     │  section3
│    └ 输入...                  ›           │  (展开)
│    └ 预览文字                             │
├──────────────────────────────────────────┤
│  时钟                        [switch]     │  section4
│    └ 年 月 日   时 : 分 : 秒              │  (展开)
│    └ 2026年9月 12:30:45                  │
├──────────────────────────────────────────┤
│         [Premium Modal Overlay]           │  (非Pro时弹出)
└──────────────────────────────────────────┘
```

## 二、字号列表

| 元素 | 默认 | 胶囊旧 | 变化 |
|------|------|--------|------|
| title | 36px | **32px** | ⚠️ -11% |
| item-label | 32px | 32px | ✅ |
| input-text | 32px | **30px** | ⚠️ -6% |
| preview-text | 32px | **30px** | ⚠️ -6% |
| unit-text | 26px | **28px** | ⬆️ 增大，OK |
| colon-sep | 26px | **28px** | ⬆️ 增大，OK |
| time-preview | 34px | 34px | ✅ |
| **modal-title** | 36px | **26px** | ❌ -28% |
| **modal-desc** | 28px | **20px** | ❌ -29% |
| **benefit-item** | 32px | **20px** | ❌ -38% |
| modal-btn-primary | 28px | **24px** | ⚠️ -14% |
| modal-btn-secondary | 28px | **22px** | ⚠️ -21% |

> **5个页面元素缩小 + 5个Modal元素缩小 = 10个字号违规**

---

## 三、宽度验证

### 3.1 方屏 454px（默认）

| 组件 | 内容区 | 文字需宽 | 结果 |
|------|--------|----------|------|
| title "首页" | 434-64(箭头)=370 | 72px | ✅ |
| item-label | 434-32(section)=402-44(switch)=358 | "课程提醒" 128px | ✅ |
| input-text | 358-38(arrow)=320 | "自定义内容" 192px | ✅ |
| unit-chip行 | 402 | 6chip×54+3sep×36=432 | ⚠️超30px→wrap |
| modal-card 80% | 363-48=315 | desc 16字×28=448 | ⚠️2行换行 |

> 方屏可接受

### 3.2 胶囊屏 198px

| 组件 | 内容区 | 旧字号 | 新(恢复) | 
|------|--------|--------|----------|
| title "首页" | 174-56=118 | 32px=64✅ | 36px=72✅ |
| item-label | 174-32-52=90 | 32px "课程提醒" 128❌ | 32px+ellipsis ✅ |
| input-text | 90-38=52 | 30px×4=120❌ | 32px+ellipsis ✅ |
| modal-card 90% | 178-32=146 | title 26px=130✅ | **36px=180❌** |
| modal-card 92% | 182-20=162 | - | **36px=180 → lines:2 ✅** |
| benefit-item | 162-16=146 | 20px×7=140✅ | 32px×7=224→ellipsis |

---

## 四、修改方案

### 4.1 胶囊屏 @media 恢复全部字号

```css
@media (shape: capsule) {
  .title { font-size: 36px; }        /* 32→36 */
  .input-text { font-size: 32px; }   /* 30→32 */
  .preview-text { font-size: 32px; } /* 30→32 */
  
  .modal-title { font-size: 36px; }      /* 26→36 */
  .modal-desc { font-size: 28px; }       /* 20→28 */
  .benefit-item { font-size: 32px; }     /* 20→32 */
  .modal-btn-primary { font-size: 28px; } /* 24→28 */
  .modal-btn-secondary { font-size: 28px; } /* 22→28 */
}
```

### 4.2 胶囊屏 Modal 布局调整（补偿字号恢复）

```css
  .modal-card {
    width: 92%;           /* 90→92，补偿字号增大 */
    padding: 14px 10px;   /* 18+16→14+10，释放空间 */
  }
  .modal-title {
    font-size: 36px;
    lines: 2;             /* 允许换行 */
    text-align: center;
  }
  .modal-desc {
    font-size: 28px;
    lines: 3;             /* 允许较多换行 */
  }
  .benefit-item {
    font-size: 32px;
    lines: 1;
    text-overflow: ellipsis;
  }
```

验证恢复后 Modal：
- modal-card: 92%=182px, padding 10+10=20 → 内部 162px
- title "解锁高级版" @ 36px lines:2: "解锁高" + "级版" 两行 ✅
- desc @ 28px lines:3: 162/(28×0.55)≈10字/行，16字→2行 ✅
- benefit "✓ 多课表管理" @ 32px + ellipsis: "✓ 多课表..." ✅

### 4.3 默认样式加截断保护

```css
.item-label { lines: 1; text-overflow: ellipsis; }
.input-text { lines: 1; text-overflow: ellipsis; }
.benefit-item { lines: 1; text-overflow: ellipsis; }
```

---

## 五、改动汇总

| 位置 | 改动 | 旧 | 新 |
|------|------|----|----|
| 胶囊 title | 恢复字号 | 32px | **36px** |
| 胶囊 input-text | 恢复字号 | 30px | **32px** |
| 胶囊 preview-text | 恢复字号 | 30px | **32px** |
| 胶囊 modal-title | 恢复字号 | 26px | **36px** |
| 胶囊 modal-desc | 恢复字号 | 20px | **28px** |
| 胶囊 benefit-item | 恢复字号 | 20px | **32px** |
| 胶囊 modal-btn-primary | 恢复字号 | 24px | **28px** |
| 胶囊 modal-btn-secondary | 恢复字号 | 22px | **28px** |
| 胶囊 modal-card | 调整布局 | 90%/18+16 | **92%/14+10** |
| 胶囊 modal-title | 添加换行 | - | **lines:2** |
| 胶囊 modal-desc | 添加换行 | - | **lines:3** |
| 默认 item-label | 防溢出 | - | **lines:1+ellipsis** |
| 默认 input-text | 防溢出 | - | **lines:1+ellipsis** |
| 默认 benefit-item | 防溢出 | - | **lines:1+ellipsis** |

### 字号全部保持原值：

| 元素 | 默认 | 胶囊新 | 结果 |
|------|------|--------|------|
| title | 36px | 36px | ✅ |
| input-text | 32px | 32px | ✅ |
| preview-text | 32px | 32px | ✅ |
| modal-title | 36px | 36px | ✅ |
| modal-desc | 28px | 28px | ✅ |
| benefit-item | 32px | 32px | ✅ |
| modal-btn-primary | 28px | 28px | ✅ |
| modal-btn-secondary | 28px | 28px | ✅ |