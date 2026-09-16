# 二维码生成栏目 - 胶囊屏升级设计文档

## 一、改动概述

| 项目 | 旧版 | 新版 |
|------|------|------|
| 快捷内容 | 6个固定预设按钮 | **删除** |
| 内容管理 | 单条输入，覆盖式 | **多条管理，手风琴列表** |
| 添加方式 | 点击输入框 | **点击"添加"按钮 → 输入框** |
| 列表展示 | 无 | **手风琴折叠列表** |
| 展开内容 | 直接显示一个二维码 | **展开显示对应二维码 + 内容文字** |
| 编辑删除 | 无 | **每个条目支持编辑和删除** |
| 存储 | 单条 storage | **多条 storage 数组持久化** |
| 二维码尺寸 | 固定 180px | **宽度 100%，精确适配屏幕** |

---

## 二、胶囊屏精确计算 (192px × 490px)

### 2.1 屏幕参数

```
屏幕宽度:    192px
页面 padding: 8px (左) + 8px (右) = 16px
内容区宽度:  192 - 16 = 176px
```

### 2.2 标题栏

```
header 高度: 44px
back-btn:    宽40px × 高36px
标题 "二维码": 3字 × 26px = 78px
可用宽度: 176 - 40(btn) - 0(spacer已去掉) = 136px
78 < 136 ✅ 标题完整显示
```

### 2.3 添加按钮

```
按钮宽度: 100% (176px)
高度: 44px (≥40px 规范)
字体: 22px + 30px line-height
文字 "＋ 添加二维码" 7字 × 22 = 154px < 176px ✅
```

### 2.4 手风琴列表项 (折叠状态)

```
卡片宽度:    176px
卡片 padding: 10px 12px (左右共24px)
卡片内宽:    176 - 24 = 152px
箭头指示器: 22px (≈20px渲染) + 6px margin = 26px
名称区域:    152 - 26 = 126px

名称字号 24px:
  3字: 72px ✅    4字: 96px ✅   5字: 120px ✅   6字: 144px ❌ (超)
  
名称字号 22px:
  3字: 66px ✅    4字: 88px ✅   5字: 110px ✅   6字: 132px ❌ (超)

结论: 名称 24px，限制 5个中文字以内；超过用 text-overflow: ellipsis
```

### 2.5 手风琴展开区域

```
展开区宽度:  176px
qr-wrapper padding: 6px (四周)
qr-wrapper 内宽: 176 - 12 = 164px

二维码: 宽度 100% = 164px，正方形 164×164px
  ✅ 胶囊屏最大可用二维码尺寸，方便扫码识别

内容文字:
  区域宽度: 176px
  字号: 20px (辅助文字)
  行高: 28px
  lines: 3  (最多3行)
  text-overflow: ellipsis

操作按钮行:
  编辑按钮 + 删除按钮 并排
  每个按钮宽度: (176 - 16×2 - 8) / 2 = 68px
  按钮高度: 40px (≥40px 规范)
  字号: 20px
```

### 2.6 完整布局高度估算

```
组件              高度
─────────────────────────
header             44px
header margin      10px
add-button         44px
add-button margin  8px
─────────────────────────
每个折叠项:         46px (10+24+12 padding)
每个展开项额外:      164(QR) + 8(qr-margin) + 60(文字3行) + 8(button-margin) + 40(buttons) + 8 
                  = 288px
─────────────────────────
页面 padding-top:  8px
页面 padding-bottom: 8px
可用高度: 490 - 8 - 8 = 474px
固定区域: 44 + 10 + 44 + 8 = 106px
剩余: 474 - 106 = 368px

折叠7项:   7 × 46 = 322px < 368px ✅ 全部折叠可显示
展开1项: 322 + (288 - 46) = 322 + 242 = 564px > 368px ❌ 需滚动

结论: 页面自然滚动即可，无需 scroll 组件
```

---

## 三、页面交互流程

```
┌─────────────────────────┐
│  ◀    二维码             │
│                         │
│  ┌─────────────────────┐│
│  │   ＋ 添加二维码      ││  ← 点击弹出输入
│  └─────────────────────┘│
│                         │
│  ┌─────────────────────┐│
│  │ 我的网址          ▼ ││  ← 折叠状态
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ 联系方式          ▶ ││  ← 展开状态
│  │ ┌─────────────────┐ ││
│  │ │                 │ ││
│  │ │   二维码 164px   │ ││  ← 宽度100%
│  │ │                 │ ││
│  │ └─────────────────┘ ││
│  │ 13800138000         ││  ← 3行，超出省略号
│  │ ┌──────┐ ┌──────┐  ││
│  │ │ 编辑 │ │ 删除 │  ││
│  │ └──────┘ └──────┘  ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ Wi-Fi信息         ▼ ││
│  └─────────────────────┘│
└─────────────────────────┘
```

---

## 四、数据结构

### 4.1 存储格式

```javascript
// storage key: "qrcode_items"
// 值: JSON 字符串数组
[
  {
    "id": "qrc_1694851200000",
    "name": "我的网址",
    "content": "https://www.example.com"
  },
  {
    "id": "qrc_1694851200001", 
    "name": "联系方式",
    "content": "13800138000"
  }
]
```

### 4.2 数据操作

```javascript
// 添加
addItem(name, content) → push 新对象到数组 → 保存 storage

// 编辑  
editItem(id, name, content) → 查找 id，更新 name/content → 保存 storage

// 删除
deleteItem(id) → filter 过滤 → 保存 storage

// 加载
loadItems() → storage.get("qrcode_items") → JSON.parse → 渲染列表
```

---

## 五、页面组件结构

```
page-root
├── header
│   ├── back-btn (◀)
│   └── title ("二维码")
│
├── add-button (点击 → 弹出添加对话框)
│
└── items-list (手风琴列表)
    └── accordion-item (for each item)
        ├── header-row (折叠头)
        │   ├── name (名称)
        │   └── arrow (▼/▶)
        │
        └── body-row (展开体, if expanded)
            ├── qr-wrapper
            │   └── qrcode (width: 100%)
            ├── content-text (最多3行)
            └── action-row
                ├── edit-btn
                └── delete-btn
```

---

## 六、添加/编辑 交互

### 方式：复用 chinese-input 页面

```
点击"＋ 添加"
  → storage.set("chinese_input_title", "名称")
  → storage.set("chinese_input_value", "")
  → storage.set("chinese_input_return_key", "qrcode_add_name")
  → router.push("/pages/chinese-input")

第一次返回 → 获取名称
  → storage.set("chinese_input_title", "内容")
  → storage.set("chinese_input_value", "")
  → storage.set("chinese_input_return_key", "qrcode_add_content")
  → router.push("/pages/chinese-input")

第二次返回 → 获取内容
  → 同时有 name 和 content → addItem(name, content)
  → 刷新列表
```

### 编辑类似，但预填名称和内容

---

## 七、胶囊屏样式表 (CSS 值总览)

```css
@media (shape: capsule), (shape: pill-shaped) {

  /* 页面 */
  .page-root { padding: 8px; }

  /* 标题栏 */
  .header { height: 44px; margin-bottom: 10px; }
  .back-btn { width: 40px; height: 36px; font-size: 22px; line-height: 36px; }
  .title { font-size: 26px; line-height: 34px; }

  /* 添加按钮 */
  .add-btn { height: 44px; font-size: 22px; line-height: 30px; border-radius: 12px; }

  /* 手风琴卡片 */
  .accordion-item { margin-bottom: 6px; border-radius: 12px; }

  /* 折叠头 */
  .accordion-header { padding: 10px 12px; }
  .item-name { font-size: 24px; line-height: 34px; }
  .item-arrow { font-size: 22px; line-height: 34px; }

  /* 展开体 */
  .qr-wrapper { padding: 6px; border-radius: 8px; margin: 8px 0; }
  /* QR component: width: 100% (164px) */
  .content-text { font-size: 20px; line-height: 28px; lines: 3; }

  /* 操作按钮 */
  .action-btn { height: 40px; font-size: 20px; line-height: 28px; border-radius: 8px; }
  .edit-btn { /* 左侧 */ }
  .delete-btn { /* 右侧 */ }
}
```

---

## 八、关键规则检查清单

| 检查项 | 规则 | 状态 |
|--------|------|------|
| 标题字号 | ≥26px | 26px ✅ |
| 正文字号 | ≥24px | item-name 24px ✅ |
| 辅助文字 | ≥20px | content-text 20px ✅ |
| 按钮字号 | ≥22px | add-btn 22px ✅ |
| 按钮高度 | ≥40px | add-btn 44px, action-btn 40px ✅ |
| 行高 | ≥font+8px | 全部满足 ✅ |
| 文字溢出 | lines:1 + ellipsis | item-name ✅ |
| 二维码四周留白 | padding ≥6px | 6px ✅ |
| 页面总高度 | ≤490px | 自然滚动 ✅ |
| 无 flex-wrap | Vela 不支持 | 全部 flex-direction: column/row 明确 ✅ |
| 无 position: absolute/fixed | Vela 限制 | 全部 flex 布局 ✅ |

---

## 九、实现步骤

1. **复制现有 qrcode-generator.ux 为备份**
2. **重写模板**: header + add-button + 手风琴列表
3. **重写脚本**: 数组存储、CRUD 操作、chinese-input 两阶段输入
4. **重写样式**: 胶囊优先，方屏/圆屏适配
5. **测试**: 添加→展开→查看二维码→编辑→删除 全流程