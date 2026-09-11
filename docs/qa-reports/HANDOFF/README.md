# HANDOFF 目录约定

QA（我）和作者（Tom）异步沟通的地方。**双方写的文件完全不重叠，所以 git 冲突在物理上不可能发生。**

## 三文件分工（最重要）

| 文件 | 谁写 | 另一方 | 作用 |
|---|---|---|---|
| **`STATUS.md`** | **QA** | 作者只读 | **缺陷总台账**——所有编号的当前状态，一张表看全貌 |
| **`REPLY.md`** | **作者** | QA 只读 | 唯一的回复入口（已修 / 不是问题 / 提问 / 真机现象） |
| `2026-09-11-roundN.md` | QA | 作者只读 | 每轮质检新建一份，只增不改旧 |

> **想看"哪些改了、哪些没改"→ 只看 `STATUS.md`。**
> 作者的意见不写进 STATUS（会冲突），写 `REPLY.md`，QA 下轮同步进 STATUS 的「作者备注」列 —— 效果一样，但零冲突。

## 作者怎么答复

三档，挑最省事的：

1. **commit 带编号**（首选，文档一个字都不用写）
   ```bash
   git commit -m "fix(qa): P0-2 首页不显示已修"
   git commit -m "fix(qa): P0-1 P0-5 串表 + 备份主题键"
   ```
   QA 每轮自动扫 `git log <上轮HEAD>..HEAD --grep='fix(qa)'`，摘编号后打开代码复核。
2. **改 `REPLY.md`**：适合要解释、反驳、提问。不管回哪一轮，都写这一个文件。
3. **只改代码不说话**：QA 会自己重扫。但「认为不是问题」和「无法静态确认」两类**必须**说一声，否则每轮重复报。

## 会不会 git 冲突？

**不会**，因为双方从不改同一个文件。

唯一可能遇到的是**push 被拒**（QA 又推了新 round，作者本地落后）——这不是冲突，别去手动改文件：

```bash
git pull --rebase git@github.com:guomengtao/class-schedule.git main
git push    git@github.com:guomengtao/class-schedule.git main
```

> 本仓库 HTTPS 直连被阻断，**必须走 SSH**。

## QA 每轮开始做什么

1. `git fetch` 比对 HEAD，扫 `fix(qa):` 编号
2. 读 `REPLY.md`
3. **打开代码复核**——文档会过期，只有代码是真的
4. 更新 `STATUS.md`，新建本轮 `roundN.md`

## 状态图例（STATUS.md 用）

🔴 未修 ｜ 🟠 处理中 ｜ 🟡 已修待验 ｜ 🟢 已验证修复 ｜ ⏸ 挂起（等作者回答） ｜ ⚪ 已关闭（有意为之 / 不是问题）

作者填 `REPLY.md` 三区的哪一类，我这边就记成对应的标记 —— 对照表见 `REPLY.md` 开头。
