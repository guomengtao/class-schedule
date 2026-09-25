# 上游 Vela_input_method 修复对照（2026-09-25）

> 上游仓库：https://github.com/NEORUAA/Vela_input_method
> 起因：跑道屏"点展开三角形后弹出的方框里**没有候选**"，怀疑官方已修复，核对上游提交记录。

## 一、结论速览

**上游确实修了，而且我们缺的正好是关键那一个。**

| 我们的版本 | 上游版本 | 差了什么 |
|---|---|---|
| `f549d31`（2026-09-10，"upgrade Vela input method to latest version"） | 上游 main 最新 = `67338b1e`（2026-09-18） | **3 个功能修复 + 2 个优化** |

**证据链（可复现）**：

- `f549d31` 提交说明写的是 *"Replace InputMethod component with latest from NEORUAA/Vela_input_method (**fix circle screen multi-pinyin display**)"*
- 这句话对应的上游提交是 **`43689243`（2026-08-06，"fix: 修复 circle 屏多拼候选与拼音小字行显示"）**
- 而上游紧接着的**下一个提交**就是 `4c9d377b`（**2026-08-07**）
- 且 `43689243` 正是 `4c9d377b` 的**父提交**

→ **我们引入的恰好是"修复前一个提交"的版本。**

## 二、缺失的上游修复（按重要性）

### 1. ⭐ `4c9d377b`（2026-08-07）`fix: 修复 9Pro 等机型候选恒空（字典初始化不依赖 hide watch）`

**这是我们症状最直接的对应项**（"方框里没有候选"）。

**上游诊断原文**：

> 部分机型 **watch 链不可靠导致 dict 永不初始化 → 候选恒空**

**改动（`components/InputMethod/InputMethod.ux`，+17/−8）**：

```diff
     if (this.screentype === "rect" || this.screentype === "pill-shaped") {
       this.adjustScreenWidth();
     }
-    // 字典懒初始化：进入页面时键盘隐藏(hide=true)，无需建 3000 词索引。
-    // 改到首次键盘弹出(hide→false)时才 initDict ……
+    // 字典懒初始化：进入页面时不阻塞主线程……
+    // 不依赖 hide watch（部分机型 watch 链不可靠导致 dict 永不初始化 → 候选恒空），
+    // 改为在 onInit 统一延迟执行；initDict 幂等且 forwardIndex 分片构建（见 dicUtil.js）。
+    this._ensureDictInitSoon();
     if (!this.hide) {
-      // 挂载即展开的用法：键盘子树直接创建并保活
+      // 挂载即展开的用法：键盘显式直接创建并保活
       this.keyboardCreated = true
-      this._ensureDictInit();
     }
```

```diff
     _ensureDictInit() {
       if (this.__dictInitStarted) return
-      this.__dictInitStarted = true
       SimpleInputMethod.initDict()
+      this.__dictInitStarted = true          // ← 标志从"之前"改为"成功返回之后"
+    },
+    // 首帧后启动字典初始化：不阻塞进入页面，也不依赖 hide watch 链
+    _ensureDictInitSoon() {
+      if (this.__dictInitStarted) { return }
+      setTimeout(() => { this._ensureDictInit(); }, 0)
     },
```

**两个要点**：
1. **初始化触发不再依赖 `hide`** —— 原设计只在 `hide === false` 时初始化，靠 `$watch("hide")` 兜底；某些机型 watch 链失效 → **字典永不构建 → 候选恒空**；
2. **`__dictInitStarted` 标志位从"initDict 之前"移到"成功返回之后"** —— 提前置位时，一旦初始化抛异常（如某机型 JS 引擎不支持部分语法），标志已置位 → **永远不再重试 → 候选恒空**。

**✅ 已移植到 Lab**（`src/components/InputMethodLab/InputMethodLab.ux`）。
> 注意：上游用箭头函数 `() => {}`，本项目按历史约定（部分机型/工具链对箭头函数支持问题）改为 `function` + `var self = this`。

### 2. `462bc948`（2026-09-11）`fix: 展开全部候选后候选词自然换行`

**围绕下展面板的纯布局修复**（`InputMethod.ux`，+51/−64）：

| 层面 | 改动 |
|---|---|
| 模板 | **4 处**下展区块各**去掉两层多余的定宽/定高包裹容器**，让 `{{item}}` 只由一层容器承载 |
| 数据 | **`resultList2` 从「按 maxlength 分页的二维数组」改为「一维数组」**，候选不再受每页数量限制 |
| CSS | 新增 `.expanded-scroll { flex-direction:column }`、`.expanded-candidates { position:absolute; left:0; top:0; width:100%; flex-direction:row; **flex-wrap:wrap**; justify-content:center; align-items:center; align-content:flex-start; flex-shrink:0 }`、`.expanded-candidates66 { padding:10px }` |
| CSS | `.calbtn-down-text` 去掉 `margin-left/right`、`lines:1`、`text-overflow:ellipsis`，改为 `padding:8px 10px` + `min-height:52px` + `max-width:100%` + `flex-shrink:0` + `text-align:center` |
| CSS | **删除**固定尺寸类 `.item3 { width:324px; height:52px }`、`.item67 { height:50px }`、`.item66 { height:42px }` |
| 其它 | 下展箭头 `right: 8px → 5px` |

**最终效果**：展开全部候选后，候选词按内容宽度**自然换行**，不再被 `maxlength` 分页与固定宽高截断。

**⏳ 尚未移植**（建议数据层验证通过后再做）。

### 3. `40d2d80b` + `67338b1e`（2026-09-18）`fix: 修复包内词库读取返回 202`

**上游诊断**：

> 部分 Vela 运行时读取包内 `.json` 文件会返回 `202: invalid file type`，因此词库资源使用 `.txt` 扩展名，运行时仍按需读取并通过 `JSON.parse` 解析。

**改动**：`assets/dictionary/*.json` → `*.txt`（28 个词库文件重命名）+ `dictionaryLoader.js` 的 URI 后缀改为 `.txt` + 失败回调透传错误码与消息（如 `202: invalid file type`）+ 测试桩模拟该限制。

**❌ 本项目不适用**：我们的词库是 `dic.js` / `dic_words.js` / `dic_jp.js` 等 **`.js` 模块（静态 import）**，不是包内 `.json` 运行时读取。
> 但**值得记住这个坑**：若将来改为"按需读取包内文件"的方案，**不要用 `.json` 扩展名**。

### 4. 其它未合入的改动（供参考）

| 提交 | 日期 | 内容 | 本项目是否适用 |
|---|---|---|---|
| `eee0b968` | 09-11 | 可修改的词库路径 | 不适用（我们无独立词库路径） |
| `b064bb20` | 09-11 | 词库加载内存优化 | 部分理念适用 |
| `608aa9e1` | 09-11 | Merge PR #18：保留输入驱动词典加载，避免恢复全量预加载 | ⚠️ **与本项目策略相反**（我们是全量一次性加载 + 分片）；若内存吃紧可参考 |
| `43689243` | 08-06 | circle 屏多拼候选与拼音小字行显示 | ✅ **已包含在 `f549d31` 里** |

## 三、当前处置

| 项 | 状态 |
|---|---|
| `4c9d377b` 字典初始化修复 | ✅ **已移植到 Lab**（`InputMethodLab.ux`）：`_ensureDictInitSoon()` + 标志位后置 |
| `462bc948` 下展布局修复 | ⏳ 待移植（一维数组 + `flex-wrap` 自然换行） |
| `40d2d80b` 词库 `.txt` | ❌ 不适用（架构不同），仅记录避坑 |

**验证方式**：Lab 页面（工具 → 输入法实验台）输入拼音 → 点展开三角形 → 看方框里是否出现候选；配合「诊断」开关可区分"数据为空"与"`<list>` 不渲染"。

## 四、后续建议

1. **若 Lab 验证通过** → 把 `4c9d377b` 的改动搬回正式 `InputMethod.ux`（改动极小，仅 `onInit` + 2 个方法）；
2. **再评估 `462bc948`** —— 它把 `resultList2` 从二维改一维，会同时牵动模板结构（4 处）与 CSS，属于结构性调整，建议**单独一轮**做并单独回归；
3. **建立"上游同步"习惯**：本次的根因就是"引入的版本停在了修复前一个提交"，而当时的提交说明只写了"latest"。以后同步上游时应**记录具体 upstream SHA**，而不是只写 "latest"。
