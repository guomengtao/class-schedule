# PNG 图标叹号问题分析报告

## 一、问题现象

多个页面出现图标显示为"!"（叹号），例如：
- **中文输入法页面**（`chinese-input.ux`）：返回按钮图标叹号
- **添加课程页面**（`add-course.ux`）：返回按钮图标叹号
- 等等…共计20+个页面

用户疑问：页面头部已经使用全站共用的 `header.css`，为什么还会出现图标错误？

---

## 二、根因分析：header.css ≠ 图标逻辑

### 2.1 header.css 只负责什么

`header.css` 是一个**纯CSS样式文件**，它只定义布局、尺寸、颜色等视觉属性：

```css
/* header.css 示例内容 */
.back-btn-icon {
  width: 48px;
  height: 48px;
  border-radius: 24px;
}
```

它**不包含任何 JavaScript 逻辑**，无法为页面提供 `iconTheme` 变量。

### 2.2 图标路径依赖 JavaScript 变量

所有页面中的图标引用都使用了模板变量 `{{ iconTheme }}`：

```html
<!-- 典型的图标引用 -->
<image class="back-btn-icon" src="../../common/icons/{{ iconTheme }}/icon_back.png"></image>
```

这个 `{{ iconTheme }}` 会在运行时解析为 `"dark"` 或 `"light"`，最终组装成实际的图标路径：
- `../../common/icons/dark/icon_back.png`
- `../../common/icons/light/icon_back.png`

**如果 `iconTheme` 没有被定义，路径会变成**：
- `../../common/icons/undefined/icon_back.png` → **加载失败 → 显示"!"**

### 2.3 正确的页面是怎么做的

已正常工作的页面（如 `index.ux`、`detail.ux`）有**三件套**：

```javascript
// ✅ 正确模式
export default {
  private: {
    iconTheme: "dark",   // ① 默认值，确保首次渲染不出错
    theme: { ... }
  },

  onInit() {
    var self = this
    store.getTheme(function(t, themeName) {
      self.theme = t
      self.updateIconSrc(themeName)  // ② 初始化时更新
    })
  },

  onShow() {
    var self = this
    store.getTheme(function(t, themeName) {
      self.theme = t
      self.updateIconSrc(themeName)  // ③ 每次显示时更新
    })
  },

  updateIconSrc(themeName) {
    this.iconTheme = (themeName === 'light' || themeName === 'warm') ? 'light' : 'dark'
  }
}
```

---

## 三、问题清单

### 问题1：缺少 `iconTheme` 变量的页面（21个）

以下页面在模板中使用了 `{{ iconTheme }}`，但 JavaScript 中**未定义**该变量，导致图标路径解析失败：

| 序号 | 页面文件 | 有 header.css? | 有 iconTheme? | 状态 |
|------|----------|:---:|:---:|:---:|
| 1 | `add-course.ux` | ✅ | ❌ | 叹号 |
| 2 | `course-manager.ux` | ✅ | ❌ | 叹号 |
| 3 | `chinese-input.ux` | ✅ | ❌ | 叹号 |
| 4 | `week-view.ux` | ❌ | ❌ | 叹号 + 路径错误 |
| 5 | `activation.ux` | ✅ | ❌ | 叹号 |
| 6 | `bs-demo1.ux` | ✅ | ❌ | 叹号 |
| 7 | `bs-demo2.ux` | ✅ | ❌ | 叹号 |
| 8 | `bs-demo3.ux` | ✅ | ❌ | 叹号 |
| 9 | `bs-demo4.ux` | ✅ | ❌ | 叹号 |
| 10 | `bs-demo5.ux` | ✅ | ❌ | 叹号 |
| 11 | `countdown-manage.ux` | ✅ | ❌ | 叹号 |
| 12 | `template-picker.ux` | ✅ | ❌ | 叹号 |
| 13 | `schedule-qrcode.ux` | ✅ | ❌ | 叹号 |
| 14 | `statistics.ux` | ✅ | ❌ | 叹号 |
| 15 | `homepage-settings.ux` | ✅ | ❌ | 叹号 |
| 16 | `test-area-v2.ux` | ✅ | ❌ | 叹号 |
| 17 | `vibration-lab.ux` | ✅ | ❌ | 叹号 |
| 18 | `backup-restore.ux` | ✅ | ❌ | 叹号 |
| 19 | `donate.ux` | ✅ | ❌ | 叹号 |
| 20 | `black-screen-check.ux` | ✅ | ❌ | 叹号 |
| 21 | `pinned-pages.ux` | ✅ | ❌ | 有 updateIconSrc 方法但从未调用，也无默认值 |

### 问题2：缺少图标文件（1个）

| 引用的文件名 | 引用位置 | dark/ | light/ |
|-------------|----------|:---:|:---:|
| `icon_chevron_right.png` | `test-area.ux:21` | ❌ 不存在 | ❌ 不存在 |

### 问题3：图标路径错误（1个）

**`week-view.ux`** 位于 `src/pages/week-view/`，其图标路径写为：
```html
<image src="../common/icons/{{ iconTheme }}/icon_back.png">
```

`../` 从 `week-view/` 退回一级到 `pages/`，找不到 `common/icons/`。

正确路径应为：
```html
<image src="../../common/icons/{{ iconTheme }}/icon_back.png">
```

---

## 四、对比：正常页面 vs 问题页面

### ✅ 正常工作的页面（14个）

| 页面 | 有 header.css? | iconTheme 定义 | 三件套完整? |
|------|:---:|:---:|:---:|
| `index.ux` | ❌ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `detail.ux` | ❌ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `settings.ux` | ❌ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `device-info.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `course-manager-v2.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `test-area.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `vibration-lab-v2.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `reset-data.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `schedule-manager.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `qrcode-generator.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `custom-content-edit.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `header-demo1.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `header-demo2.ux` | ✅ | `iconTheme: "dark"` + updateIconSrc | 是 |
| `lab-edit-course.ux` | ❌ | `iconTheme: "dark"` + updateIconSrc | 是 |

### ❌ 问题页面（22个）

参见上面"问题清单"。

---

## 五、修改方案

### 5.1 方案A：逐页面添加 `iconTheme`（精确修复）

为每个缺失页面添加三件套代码。需要在 `private:` 中加默认值，在 `onInit()` / `onShow()` 中调用 `updateIconSrc`。

修改量：21个文件，每文件约10行代码。

### 5.2 方案B：创建图标主题 mixin（推荐）

提取公共逻辑到 `src/common/icon-theme-mixin.js`：

```javascript
// src/common/icon-theme-mixin.js
import store from '../store/index'

export default {
  private: {
    iconTheme: "dark"
  },

  updateIconSrc(themeName) {
    this.iconTheme = (themeName === 'light' || themeName === 'warm') ? 'light' : 'dark'
  },

  initIconTheme() {
    var self = this
    store.getTheme(function(t, themeName) {
      self.theme = t
      self.updateIconSrc(themeName)
    })
  }
}
```

然后每个页面只需：

```javascript
import iconThemeMixin from '../../common/icon-theme-mixin'

export default {
  mixins: [iconThemeMixin],

  onInit() {
    this.initIconTheme()
    // ...其他初始化逻辑
  },

  onShow() {
    this.initIconTheme()
    // ...其他显示逻辑
  }
}
```

修改量：新建1个 mixin 文件 + 修改21个页面（每页面减少约20行重复代码）。

### 5.3 缺失图标文件修复

为 `icon_chevron_right.png` 在 `dark/` 和 `light/` 目录各生成一个：
- `dark/icon_chevron_right.png`：白色/浅色"›"符号，透明背景
- `light/icon_chevron_right.png`：深灰色"›"符号，透明背景

### 5.4 week-view 路径修复

```html
<!-- 错误 -->
<image src="../common/icons/{{ iconTheme }}/icon_back.png">
<!-- 正确 -->
<image src="../../common/icons/{{ iconTheme }}/icon_back.png">
```

---

## 六、结论

| 问题 | 原因 | 影响页面数 |
|------|------|:---:|
| `iconTheme` 未定义 | 页面缺少 JS 变量定义 | 21 |
| `icon_chevron_right.png` 缺失 | 图标文件从未生成 | 1 |
| week-view 路径错误 | `../` 应为 `../../` | 1 |
| **合计受影响页面** | | **23** |

**关于用户疑问**："头部不是全站共用 CSS 了吗，怎么还有图标错误？"

回答：`header.css` 只是一个 CSS 样式文件，它处理的是 `.back-btn-icon` 等类名的**尺寸、颜色、布局**。图标路径中的 `{{ iconTheme }}` 是一个 **JavaScript 模板变量**，必须由每个页面的 JS 代码独立提供。两者是不同层面的东西——CSS管样式，JS管数据。因此即使所有页面引入了同一个 `header.css`，只要某个页面没有在 JS 中定义 `iconTheme`，该页面的图标依然会显示叹号。