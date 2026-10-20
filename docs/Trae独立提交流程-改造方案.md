# Trae 独立提交流程：解决「Trae 提交被拖进 workbuddy 任务流程」方案

> 状态：方案（待评审）
> 适用范围：所有 Trae IDE 会话的 `git commit` 提交
> 关联规则：`ev/ev-mcp/rules/trae-global-rules.md`（Trae 独立体系）、`~/.trae/rules/project_rules.md`、`多人多AI统一协调开发总纲.md`
> 创建：2026-10-20

---

## 1. 问题背景

### 1.1 现状现象

Trae 会话执行 `git commit` 时，会**错误地走进 workbuddy 的提交/任务流程**，表现为：

- 裸敲 `git commit -m ...` 被 `~/.githooks/commit-msg` 的 **`[ev-author]` 署名闸门**拦截，提示用 `zsh ~/Documents/guomengtao/tools/hooks/ev-commit.sh -m "..."`（workbuddy 转发表）。
- 即使改用 `ev-commit.sh`，也会被 `~/.githooks/pre-commit` 认领门禁拦截，要求 **`evtask-` 单号**（带 `evm-` 也被判「无正式单号」）。
- Trae 花名 / `evm-` 单号在提交时没有自己的落点，被 workbuddy 的 `.claims/` + `evtask-` 体系覆盖或错配。

### 1.2 为什么会这样

Git 钩子是**按机器安装的，不分会话来源**：

```
core.hooksPath = ~/.githooks/
  ├─ pre-commit   → 认领门禁（ID_RE 只认 evtask-*）
  └─ commit-msg   → 署名闸门 + 溯源 trailer（Ev-Session / Ev-Task）
```

而 `~/.githooks/` 的正本是 workbuddy 体系（`ev/ev-hooks/`）生成、分发的。它只认识 workbuddy 的 `evtask-` 单号、workbuddy 的 `.claims/` 认领、workbuddy 的花名解析器 `ev-session-author.sh`。**Trae 是另一套体系（ev-mcp / `evm-`），但提交走的是同一套钩子** → 必然被 workbuddy 流程劫持。

### 1.3 目标

让 Trae 的 `git commit` 走**独立、自洽的流程**：
1. 署名归 **Trae 花名 / `evm-` 会话 id**（不冒 workbuddy 名、不依赖 workbuddy 花名库）。
2. 认领门禁能识别 **Trae 的提交**，用 `evm-` 单号放行，不强行要求 `evtask-`。
3. 提交可溯源：`Ev-Session` / `Ev-Sid-Uuid` 用 Trae 身份，`Ev-Task` 能识别 `evm-` 单号。
4. 不破坏 workbuddy 既有提交（两套灰度共存）。

---

## 2. 根因分析（逐层拆解）

### 2.1 署名层：`commit-msg` 的 [ev-author] 闸门（已治本，仍需制度化）

`~/.githooks/commit-msg` → `check_author()`：

- 用 `session_identity()` 调 `~/.workbuddy/scripts/ev-session-author.sh` 解析**会话 UUID**。
- 规则：作者 email 的 local part **必须 == 解析出的会话 UUID**，否则拦。

**关键事实（已核实，2026-10-19 治本）**：`ev-session-author.sh` **已原生内置 Trae 会话感知分支**：

```python
_forced = bool(os.environ.get("EV_SESSION_NAME", "").strip() or
               os.environ.get("EV_SESSION_SID", "").strip())
if _forced:
    uuid = os.environ.get("EV_SESSION_SID", "").strip() or os.environ.get("EV_SESSION_NAME", "").strip()
    name  = os.environ.get("EV_SESSION_NAME", "").strip() or uuid
    sid   = uuid
    ...  # 输出 "<name>\t<uuid>\t<sid>"，exit 0
```

**结论**：只要 Trae 在 `ev-commit.sh` 前注入 `EV_SESSION_NAME`（Trae 花名）+ `EV_SESSION_SID`（`evm-` 会话 id），署名解析器就会**原样输出 Trae 身份**，author/committer、`[ev-author]` 闸门全部归 Trae。**无需改 workbuddy 钩子**。缺的是把这一约定**写进 Trae 规则并做成统一入口**。

### 2.2 认领门禁层：`pre-commit` 的 ID_RE 只认 evtask-（核心堵点）

`~/.githooks/pre-commit`：

```python
ID_RE = re.compile(r"evtask-[A-Za-z]-")   # 只认 evtask-，不认 evm-
```

- 被 stage 提交的文件必须被「带单号的 status=in_progress 认领」覆盖。
- 认领 JSON 读自 **`~/Documents/guomengtao/.claims/*.json`**（workbuddy 本地权威层）。
- Trae 的 `evm-` 单号和认领存于 **Supabase（ev_mcp_tasks）**，**不在 `.claims/`**。
- ⇒ Trae 非快速通道改动，无论署名多正确，都会被 pre-commit 拦下要 `evtask-`。

**这是「设计上把 Trae 绑死到 workbuddy 任务流程」的根本点。**

### 2.3 溯源层：`commit-msg` 的 trailer

- `append_session_trailer()` 写的 `Ev-Session`/`Ev-Sid-Uuid` 若走注入分支，已是 Trae 身份（层面 2.1 已治本）。
- `Ev-Task` 只从 message 或 `.claims/` 认领里搜 `evtask-`；Trae 的 `evm-` 单号不会进 trailer。→ 需扩展。

### 2.4 终端层：Trae RunCommand 输出不可靠（已记录，此处不展开）

Trae JSON `RunCommand` 长中文会被 PTY 的 direnv ANSI 串扰拆断、回显丢失。方案 A 用「消息写文件 + `-F` + 工具读回验证」规避（见 `ev/ev-mcp/rules/project_rules.md §A`）。

---

## 3. 总体设计

分两层，各干各的，互不阻塞：

| 层 | 归属 | 动作 | 是否需钩子维护方 |
|----|------|------|:--:|
| **A. Trae 侧提交流程** | Trae 会话（可立即落地） | 统一 `trae-commit` 入口：注入 `EV_SESSION_NAME`/`EV_SESSION_SID` 调 `ev-commit.sh -F` | 否 |
| **B. 钩子侧支持 evm-** | workbuddy 钩子维护方 | 让 `pre-commit` / `commit-msg` 识别 Trae 会话 + `evm-` 单号 | 是 |

> 原则：A 先落地，让 Trae 不再冒 workbuddy 名、可正确署名；B 消除「必须 evtask-」的硬堵点，让 Trae 任务闭环。

---

## 4. 方案 A：Trae 独立提交流程（会话侧）

### 4.1 统一入口：`trae-commit`（包装 `ev-commit.sh`）

新建 Trae 侧统一提交包装（建议放 `ev/ev-mcp/scripts/trae-commit.sh`，Trae 可写区）。思想：**复用 workbuddy 的 `ev-commit.sh` + 已内置的 `_forced` 注入分支，但身份全部用 Trae 的 evm- 值**，不调用任何 workbuddy 领单/花名工具。

```bash
#!/usr/bin/env bash
# trae-commit.sh —— Trae 独立提交包装（经 ev-commit.sh 透明署名，身份注入 Trae evm-）
set -euo pipefail
# 必传：Trae 会话花名与 evm- 会话 id（由 ev_add_task / ev_name_session 结果给出）
: "${EV_SESSION_NAME:?需传 Trae 花名}"
: "${EV_SESSION_SID:?需传 evm- 会话 id，如 evm-trae-...}"
# 单号可通过 message 文件里的 Ev-Task: evm-... 带入
exec env EV_SESSION_NAME="$EV_SESSION_NAME" EV_SESSION_SID="$EV_SESSION_SID" \
  ~/.workbuddy/scripts/ev-commit.sh "$@"
```

> 该包装唯一作用：把 Trae 身份经 `_forced` 分支喂给 `ev-session-author.sh`。**不产生任何 workbuddy 任务/认领副作用。**

### 4.2 标准提交五步（Trae 会话手册化）

1. **领单**：`ev_mcp.ev_add_task(title, description≥50字)` → 记下 `evm-` 单号。
2. **起花名**：`ev_mcp.ev_name_session(name)` → 记下花名。
3. **写消息文件**：用 Write 工具把 commit message（title + body + `Ev-` 单号行）写入 `_commit_msg.txt`：

   ```
   feat(xxx): 一句话标题

   详细 body（中文、多行，零命令行中文）。

   Ev-Task: evm-{tool}-{proj}-{yymmdd}-{hhmm}-{rand}
   ```

4. **提交**（单行、零中文在命令行）：
   ```bash
   cd <repo> && git add <文件> && \
     EV_SESSION_NAME="🏮花名" EV_SESSION_SID="evm-trae-xxx" \
     bash <trae-commit.sh> -F _commit_msg.txt; echo "RC=$?"
   ```
5. **验证**：用 Read 工具读 `.git/logs/HEAD` 确证 HEAD 推进、author 为 Trae 身份；成功后 `rm -f _commit_msg.txt`。

### 4.3 方案 A 能解决 / 不能解决

- ✅ 解决：署名不再冒 workbuddy 名；`[ev-author]` 闸门通过；提交可溯源到 Trae。
- ❌ 不解决：`pre-commit` 仍要求 `evtask-`（快速通道 ≤5 行/纯 md 可过，实质改动会被拦）。→ 交方案 B。

---

## 5. 方案 B：钩子侧支持 `evm-`（维护方改造）

目标：`~/.githooks/` 的 `pre-commit` / `commit-msg` 能**识别 Trae 提交**，用 `evm-` 放行。

### 5.1 识别 Trae 会话

给 Trae 提交注入唯一环境标记（方案 A 的包装脚本已携带）：

```bash
export EV_TRAE_SESSION=1          # Trae 提交标识，包装脚本必须设置
export EV_MCP_SESSION_ID="evm-trae-xxx"   # Trae 会话 id（主键）
export EV_MCP_TASK_ID="evm-..."           # 本会话进行中 evm- 任务单号
```

钩子据此走 Trae 分支，不再要求 workbuddy 身份 / `.claims`。

### 5.2 pre-commit 认领门禁改造

- 单号正则扩展为同时认两套：
  ```python
  ID_RE_TRAE = re.compile(r"evm-[A-Za-z0-9]+-")     # Trae
  ID_RE_WB   = re.compile(r"evtask-[A-Za-z]-")      # workbuddy
  ```
- 当 `EV_TRAE_SESSION=1`：
  - 认领复核改读 **ev-mcp 认领源**（`ev_mcp_tasks` 的 in_progress，经 ev-mcp 查询或本地 `ev/ev-mcp/data/` 缓存），不再只扫 workbuddy `.claims/`。
  - 覆盖 staged 文件 且 status=in_progress 且 topic/单号 == 本会话 → 放行。
  - 找不到 → 输出「先 ev_add_task 领 evm- 单号 / 或快速通道」的可复制下一步。

### 5.3 commit-msg 改造

- `[ev-author]` 闸门：`EV_TRAE_SESSION=1` 时，改为校验 `GIT_AUTHOR_EMAIL` local part == `$EV_MCP_SESSION_ID`（而不是调 workbuddy 解析器）。
- trailer：`Ev-Task` 增加 `evm-` 单号识别（message 里的 `Ev-Task:` 优先，其次查 ev-mcp 本会话任务）。

### 5.4 改造前后对比

| 维度 | 改造前（Trae） | 改造后（Trae） |
| ---- | ---- | ---- |
| 署名 | 冒 workbuddy 名 / 被拦 | Trae 花名 + evm- 会话 id |
| 单号 | 必须 evtask- | evm- 即可 |
| 认领源 | `.claims/`（workbuddy） | ev_mcp_tasks |
| 溯源 trailer | Ev-Session=workbuddy / Ev-Task 空 | 全 Trae |
| workbuddy 会话 | 不受影响 | 不受影响 |

---

## 6. 落地步骤与验收

### 6.1 第一步（Trae 侧，可立即做）
- [ ] 在 `ev/ev-mcp/scripts/` 增加 `trae-commit.sh`（4.1）
- [ ] 在 `ev-mcp` `project_rules.md` 补「Trae 标准提交流程」章节（4.2），替代当前 §A 的临时写法

### 6.2 第二步（钩子维护方，需 workbuddy/ev-hooks 协同）
- [ ] 改造 `~/.githooks/pre-commit`（5.2）
- [ ] 改造 `~/.githooks/commit-msg`（5.3）
- [ ] 正本同步回 `ev/ev-hooks/`，重新分发各仓

### 6.3 验收用例
| # | 场景 | 预期 |
|---|----|----|
| 1 | Trae 单文件 ≤5 行 / 纯 md ≤50 行 | 无单号直接过（快速通道） |
| 2 | Trae 实质改动 + evm- 认领 | pre-commit 放行，author/sid 均 Trae |
| 3 | Trae 实质改动但未领单 | 拦，提示 ev_add_task 领 evm- 单号 |
| 4 | workbuddy 会话提交 | 行为不变（evtask- 路径不受影响） |
| 5 | 提交后 `git log --format=%an <%ae>` | Trae 花名 + `evm-...@ev.local` |

### 6.4 回滚
- 方案 A 回滚：删除 `trae-commit.sh`、恢复 project_rules 即可，无全局副作用。
- 方案 B 回滚：恢复 `~/.githooks/` 正本（`_bak-archive/` 已备份），重新分发。

---

## 7. 责任边界与后续

- **Trae 会话**：负责方案 A（提交流程制度化），并主动在提交时注入 `EV_TRAE_SESSION` + evm- 环境，把「走独立流程」落实为自觉习惯。
- **workbuddy/ev-hooks 维护方**：负责方案 B（钩子改造成 support `evm-`），需要时可在总量纲开会对齐 ID_RE 扩展口径。
- **未决问题**：
  1. pre-commit 认领「读 ev-mcp 认领源」的实时查询实现（直连 Supabase vs 本地缓存），需 ev-mcp 提供查询接口。
  2. `evm-` 与 `evtask-` 共存时，同一文件被两套认领覆盖的优先级。

---

## 8. 参考文件

- `ev/ev-mcp/rules/trae-global-rules.md` —— Trae 独立体系（evm- 领单/花名铁律、禁用清单）
- `ev/ev-mcp/rules/project_rules.md` §A/§B —— Trae 提交稳策（`-F` 消息文件、工具读回验证）
- `~/.githooks/pre-commit` —— 认领门禁（ID_RE 只认 evtask-）
- `~/.githooks/commit-msg` —— 署名闸门 + trailer
- `~/.workbuddy/scripts/ev-session-author.sh` —— 已内置 `_forced` Trae 注入分支
- `~/.workbuddy/scripts/ev-commit.sh` —— workbuddy 署名提交包装（真源 `ev/ev-hooks/`）
- `ev/ev-mcp/docs/ev-mcp-Trae领单与花名手册.md` —— Trae 领单/花名操作手册