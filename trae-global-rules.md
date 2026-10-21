# Trae 全局规则

> **真源位置**：`ev/ev-mcp/rules/trae-global-rules.md`（纳入 git 版本控制，换机不丢失）
> **加载方式**：`~/.trae/rules/project_rules.md` → **软链**指向本文件（单一真源，不漂移）
> **适用范围**：所有 Trae IDE 会话，跨项目生效
> **操作手册**：`ev/ev-mcp/docs/ev-mcp-Trae领单与花名手册.md`（分步操作详解）

---

## 〇、与总纲的关系

**本文件是 Trae 的独立规则（领单 / 花名 / 门禁），不重复总纲的公共开发规范。**

- 公共开发规范（兼容性、版本发布、Git 纪律、跨端协议、签名密钥）→ 见 `多人多AI统一协调开发总纲.md`（Trae + WorkBuddy 通用）
- WorkBuddy 独立规则（花名 / 领单 / SDR / 钩子）→ 见 `ev/ev-hooks/docs/WorkBuddy会话纪律-花名领单SDR钩子.md`
- **本文件 = Trae 独立规则**（ev-mcp 领单 + 花名 + 门禁）

---

## 一、领单与花名体系（ev-mcp 独立，唯一通道）

### 1.1 为什么独立

- **workbuddy 体系**（`ev-claim.sh` / `ev-add-task.js` / `ev-session-name.sh`，读本地 `workbuddy.db`、打 `app-auth.gudq.com` API）是**另一个运行环境**的产物，不适用于 Trae。
- **ev-mcp 体系**（`ev/ev-mcp/index.js`，一个零依赖 MCP Server）是为 **Trae IDE 这类 AI 客户端**设计的：AI 直接调 MCP 工具，走 Supabase 线上存储，落 `ev_mcp_sessions`（花名）+ `ev_mcp_tasks`（任务/单号）+ `ev_mcp_logs`（对话）。

### 1.2 两套单号体系对照（防混淆）

| 维度 | **Trae（本规则）** | workbuddy（另一环境） |
| --- | --- | --- |
| 领单 | ev-mcp `ev_add_task` → **`evm-`** 单号 | `task-register` / `ev-add-task.js` → `evtask-` 单号 |
| 花名 | ev-mcp `ev_name_session` | `ev-session-name.sh` |
| 落库 | Supabase：`ev_mcp_sessions` / `ev_mcp_tasks` / `ev_mcp_logs` | 后端 `app-auth.gudq.com` |
| 实现 | `ev/ev-mcp/index.js`（MCP Server，零依赖） | `ev/ev-hooks/` 脚本 + 钩子 |

> **两套单号体系不相通**：`evm-`（ev-mcp）≠ `evtask-`（workbuddy）。Trae 只认 `evm-`，引用时写明来源。

---

## 二、铁律（Hard Gates，最高优先级）

### Gate 0：先领单、后开工

> 任何非免登记工作，必须**严格按顺序**先领单 → 确认认领 → 才允许编辑文件。**先领单、后开工；没有认领，就没有动手资格。**
>
> **多文件必领单**：凡改动涉及 >1 个文件，必须先申请到 `evm-` 单号；单文件 ≤5 行免登记仍适用，但跨文件无论多小都得先领单。

### Trae 禁用清单

Trae 会话内**不得**调用以下 workbuddy 工具：
- `task-register` / `task-close` / `task-notify` / `task-ping`
- `ev-claim.sh claim` / `ev-claim.sh release`
- `ev-add-task.js` / `ev-session-name.sh`
- 不得领取或关闭 `evtask-*` 单号
- 不得关闭他仓/他人 `evtask-*` 任务

Trae 一切任务生命周期（领单、收尾、收割）**只经 ev-mcp**：`ev_add_task` / `ev_start` / `ev_done` / `ev_harvest`。

### File-count ladder（文件计数阶梯）

- **第 1 个未认领文件** → 允许（记入快速通道，改完立即提交）
- **第 2 个未认领文件** → **停手。先领单再编辑。**
- 此后每多一个文件 → 无认领不编辑
- 计数器仅通过认领或结束会话重置；切换仓库不重置
- 认领仅覆盖指定文件，编辑认领列表外的文件 = 未认领

---

## 三、标准流程速查

### Step 1 · 起花名

1. 调 `ev_status` → 看 SDR 表格 `花名` 栏：
   - `❓未命名` → 需起名
   - 已有花名 → 跳过
2. **AI 自己起，禁止问用户**：
   `ev_name_session(name="🐘象往")`   （≤8 汉字，含 ≥1 emoji，同项目唯一）
3. 花名门禁：未设花名前，除 `ev_name_session` / `ev_status` 外全部工具拒绝。

### Step 2 · 领单

```
ev_add_task(title="任务标题", description="目标+改动范围+验收，≥50 字")
```

返回单号：**`evm-{tool}-{proj}-{yymmdd}-{hhmm}-{rand}`**

### Step 3 · 推进与收尾

| 动作 | 工具 | 说明 |
| --- | --- | --- |
| 开始 | `ev_start(id=单号)` | 置 doing |
| 记对话 | `ev_log_message(...)` | 有进行中任务必须带 `task_id` |
| 完成 | `ev_done(id=单号)` | 置 done |
| 看状态 | `ev_status` | SDR 表格，每轮开场必调 |
| 收割 | `ev_harvest` | 列出已 done |

### Step 4 · 快速通道（免登记）

以下情况无需领单：
- 仅咨询 / 问答 / 查代码
- 纯 `.md` ≤50 行
- 单文件代码改动 ≤5 行

---

## 四、会话开工检查清单

每次 Trae 会话首次动工前：

- [ ] 重读总纲变更日志（`多人多AI统一协调开发总纲.md` §〇），判断是否有新修订
- [ ] 调 `ev_status` 查看 SDR 表格
- [ ] 花名未设 → `ev_name_session` 起名
- [ ] 有实质改动 → `ev_add_task` 领单
- [ ] 检查 `git status` + PROJECT-MAP.md 认领行，不动他人 WIP
- [ ] 一个会话最多一个进行中 `evm-` 任务

---

## 五、参考

- 操作详解：`ev/ev-mcp/docs/ev-mcp-Trae领单与花名手册.md`
- MCP 未加载排查：`ev/ev-mcp/docs/ev-mcp使用帮助-读不到MCP排查.md`
- 公共开发规范：`多人多AI统一协调开发总纲.md`
- 本文件变更日志：git log `ev/ev-mcp/rules/trae-global-rules.md`
---

## 六、UI 硬约定：每个页面都要能返回（2026-10-21 定）

**默认规则**：新增任何页面（`src/pages/*/*.ux`），顶部必须有一个**可点击的返回入口**，点了回到上一页（`router.back()`）。有顶栏就必须有标题。

**豁免（只有这三类）**：
1. 首页 / 主界面——`router.back()` 回来会直接退出应用的根页面
2. 欢迎页 / 引导页（`welcome`）
3. 全屏展示类（`watch-face-*` 表盘预览：整屏 absolute 布局、本就无顶栏、靠左右滑动切换）

**两种实现，按顶栏形态选**：
- 标准 `header` 顶栏 → `<div class="back-btn-wrapper"><image src="/common/icons/{{ iconTheme }}/icon_back.png">`
- 自定义顶栏（如 `add-course-v2` 的 topbar）→ 文字箭头 `<text class="back-text" onclick="goBack">‹</text>`，宽 28px，不依赖图标资源

**为什么要写进规则**：这不是审美问题。手环没有系统返回键、没有边缘手势，页面一旦没有返回入口，用户只能长按侧键重进应用。`add-course-v2` 就这样裸奔了很久。

**审计命令**（新增页面后跑一次，输出为空才算合格）：

```bash
cd src/pages && for f in */*.ux; do
  grep -q "icon_back\|goBack\|back-btn\|back-text" "$f" || echo "缺返回: $f"
done
```

已知豁免：`welcome/welcome.ux`、9 个 `watch-face-*`。

---

## 七、UI 硬约定：字号下限 18px（2026-10-21 定）

**结论先写**：`src/pages/**` 里**任何 `font-size` 不得小于 18px**。18px 是「装饰性提示」的硬底线，正文一律 **20px 起**。

### 7.1 为什么定 18px 而不是照抄规范表的 24px

设计规范 `docs/Ev课程表_手环字号规范_v1.md` 的档位是 20/24/28/32/36/40，但**代码实际落地值是它的 ≈0.65 倍**（设置页 24–30 对应「正文舒适/标题」，首页 20–22 对应「正文基准」）。换算下来规范最低档 24px → 15.6px，实测手环上**糊成一片**。所以本仓把两个最低档（24 / 20）合并成一个 18px 底线，向上保持 20 / 22 / 24 / 26 / 28 / 30。

### 7.2 代码字号表（唯一口径，按这张表取值）

| 用途 | 字号 | 备注 |
|---|---|---|
| 页面标题 | **24** | 胶囊屏 192 宽下「添加倒数日」5 字 = 120px，放得下 |
| 卡片/列表主文字 | **22–24** | 倒数日标题、课程名 |
| 正文、可点击文字 | **20** | 表单标签、日期、按钮、工具栏 |
| 次要说明、状态标签 | **18** | 「已关闭」「农历」、picker 单位、非选中行 |
| 装饰性提示 | 18（仅此一档） | 与上一行同级，不许再低 |
| 大数字 | 26–96 | 天数、剩余时间 |

**行高**：单行 `1.2–1.3 × 字号`（20 → 26，24 → 30）。不要依赖默认行高。

### 7.3 三条落地纪律

1. **写死像素，不用 auto**：`font-size` 必须显式写 px，不写 `em`/`%`/继承。
2. **放不下就改文案，不缩字号**：192px 内容区 168px，20px 只能放 8 个汉字。超了先精简文案（如「{{ n }}个倒数日」→「共{{ n }}条」），其次换行，**绝对不许降到 18 以下**。
3. **picker 的非选中行是唯一的「弱化」手段例外**：靠**颜色**（`#3d3d5c`）弱化，不靠字号。曾经用 13px 弱化，真机上等于没显示。

### 7.4 审计命令（改完页面跑一次，输出为空才算合格）

```bash
cd src/pages && grep -rn "font-size: *1[0-7]px" */*.ux ; \
grep -rn "font-size: *[1-9]px" */*.ux
```

已知待清：`countdown-edit` / `countdown-manage` 已于 2026-10-21 全量抬到 ≥18；其余页面按需逐页处理，**新改到的页面必须顺手清干净**（不要求一次性重构全站，但改到哪页清到哪页）。

### 7.5 反例（本次修复的真实清单）

| 位置 | 原值 | 现在的值 | 后果 |
|---|---|---|---|
| 编辑页 字段标签「名称/日期」 | 16 | 20 | 真机上像灰色噪点 |
| 编辑页 占位「点此输入名称」 | 16 | 20 | 看不出这行能点 |
| 编辑页 picker 单位「年/月/日」 | 13 | 18 | 完全不可见，不知道哪列是哪列 |
| 编辑页 picker 非选中行 | 13 | 18（更暗） | 不知道还能上下滑 |
| 编辑页 预览「2026-10-21 · 就是今天」 | 14 | 20 | 保存前确认不了日期 |
| 编辑页 错误提示「请先输入名称」 | 15 | 20 | 点了保存没反应，其实报错看不见 |
| 列表页 日期 | 16 | 20 | 分不清是公历还是别的 |
| 列表页 工具栏/「已关闭」 | 15–16 | 18–20 | 状态读不出来 |
