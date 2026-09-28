# pages.html 审核结果功能规划

> 目标页面：`https://app-auth.gudq.com/pages.html`（逐页截图档案）
> 后端：Vercel serverless + Upstash Redis（`app-auth` 仓库，已有 `api/admin/`）
> 文档性质：可行性 + 实施方案（待评审 → 实施）
> 核心诉求：在档案页每张截图上增加「审核结果」交互，AI 可对接读取精确定位修复

---

## 一、需求拆解

| # | 需求 | 说明 |
|---|---|---|
| 1 | **问题按钮组（多选）** | 文字遮挡 / 文字省略 / 标题显示不全 / 布局错位 / 按钮过小 / 越界裁切 / 对齐偏移 / 颜色对比 等预设标签，可多选 |
| 2 | **点击图片标注位置** | 在截图上点击/拖框，画一个矩形框框起问题区域，记录像素坐标（按图片原始分辨率归一化，避免不同显示尺寸偏差） |
| 3 | **快速批注** | 自由文本输入补充说明 |
| 4 | **删除按钮** | 把该截图从档案 DATA 移除（仅标记删除，图片文件保留可恢复） |
| 5 | **换一张最新版** | 标记 `needsRecapture`，提示该截图需重新采集；AI 采集时优先处理 |
| 6 | **AI 对接读取** | 审核结果持久化到后端，AI 通过 `web_fetch` 读 JSON，精确知道每页改哪里 |

## 二、可行性结论

**完全可行**，技术栈现成：

- **前端**：pages.html 已是纯 HTML+JS+内联 DATA，加交互无需框架，原生 DOM 即可
- **后端**：已有 `api/admin/` 模式 + Upstash Redis，新增 `api/admin/review` 端点存取审核结果
- **AI 对接**：AI 用 `web_fetch https://app-auth.gudq.com/api/admin/review` 读 JSON，每条含 `pageId + shotFile + 问题类型[] + 框坐标 + 批注`，直接定位修复
- **坐标归一化**：按图片原始像素（如 192×490）记录比例坐标，AI 对照截图像素即可精确到点

## 三、UI 设计

每张截图卡片下方增加一行**审核工具条**：

```
┌──────────────────────────────────────┐
│  [截图缩略图，可点击/拖框标注]         │
│  ┌──┐  ← 标注框（红色半透明叠加）       │
│  └──┘                                │
├──────────────────────────────────────┤
│ 问题：[遮挡] [省略] [标题不全] [错位]   │  ← 多选 chips，点击高亮
│       [按钮小] [越界] [对齐] [对比]     │
│ 框选：x=24% y=18% w=12% h=8%  [清除]  │  ← 显示当前框坐标
│ 批注：[_______________________]        │  ← 自由文本
│ [提交审核] [换最新版] [删除] [已修复]  │  ← 操作按钮
└──────────────────────────────────────┘
```

- **点击/拖框**：在 `<img>` 上叠一层透明 `<div class="anno-layer">`，监听 mousedown/mousemove/mouseup 画框；坐标存为相对图片宽高的百分比（0~1），AI 端按图片原始像素还原
- **多选 chips**：原生 button toggle，高亮态存入数组
- **操作按钮**：提交/换最新版/删除/已修复

## 四、数据结构

### 4.1 单条审核结果（前端 → 后端 POST）

```json
{
  "pageId": "backup-restore",
  "shotFile": "pages/backup-restore-unlock-modal.png",
  "issues": ["文字省略", "标题显示不全"],
  "box": { "x": 0.24, "y": 0.18, "w": 0.12, "h": 0.08 },
  "note": "弹窗标题「解锁高级版」截成「解锁高级…」",
  "action": "fix",
  "reviewer": "用户/AI",
  "at": "2026-09-28T15:30:00Z"
}
```

- `box`：归一化坐标（0~1），null 表示未框选
- `action`：`fix`（待修复）/ `recapture`（换最新版）/ `delete`（删除）/ `resolved`（已修复）

### 4.2 后端存储（Upstash Redis）

- key：`review:pages`（Hash）或 `review:list`（List）
- 每条审核结果作为一个 entry，按 `pageId + shotFile + at` 去重合并
- GET `/api/admin/review` 返回全部审核结果数组

### 4.3 AI 读取格式

AI 调用 `web_fetch https://app-auth.gudq.com/api/admin/review` 拿到：

```json
[
  { "pageId": "backup-restore", "shotFile": "...", "issues": ["文字省略"], "box": {...}, "note": "...", "action": "fix" },
  ...
]
```

每条可直接对照截图像素定位修复点。AI 修复后把 `action` 改 `resolved`（或用户手动点「已修复」）。

## 五、实施步骤

### 阶段 1：后端端点（app-auth 仓库）

1. 新建 `api/admin/review.js`：
   - `GET`：从 Upstash Redis 读 `review:list`，返回 JSON 数组
   - `POST`：接收一条审核结果，追加到 Redis List（带时间戳去重）
   - `DELETE`：按 `pageId + shotFile` 删除（已修复时清理）
2. 复用现有 `api/admin/` 的 Redis 连接封装

### 阶段 2：前端交互（pages.html）

1. 每张 `.card` 末尾插入审核工具条 DOM
2. `<img>` 上叠 `.anno-layer`：mousedown 起点、mousemove 画框、mouseup 固化；记录归一化坐标
3. 多选 chips：预设 8 个问题类型，点击切换高亮
4. 批注输入框 + 操作按钮（提交/换最新版/删除/已修复）
5. 提交时 `fetch('/api/admin/review', {method:'POST', body: JSON.stringify(...)})`
6. 已有审核结果的卡片，加载时 GET 一次回填显示（红色角标 + 框回显）

### 阶段 3：AI 对接闭环

1. AI 用 `web_fetch` 读 `/api/admin/review`
2. 每条对照 `pageId` 找到对应源码页 + `box` 坐标定位修复
3. 修复后 AI 把该条 `action` 置 `resolved`（POST 一条 resolved 记录覆盖）
4. 档案页刷新后该卡片红角标变绿

## 六、技术要点与风险

| 项 | 说明 |
|---|---|
| **坐标归一化** | 必须按图片原始像素（192×490）的百分比存，否则不同显示尺寸下框位置漂移。AI 端 `box.x * 192` 还原像素 |
| **框叠加层** | `.anno-layer` 用 `position:absolute; inset:0` 盖在 img 上，pointer-events:auto；图片用 `object-fit:cover`，框坐标需按 cover 后的实际显示区换算（实现时取 img 的 getBoundingClientRect） |
| **多选状态** | 前端用 Set 存储，提交时转数组 |
| **去重** | 同一 `pageId + shotFile` 多次提交，后端按最新 `at` 合并（保留最新一条或追加历史） |
| **鉴权** | `/api/admin/` 已有鉴权机制（若需），审核提交可放开 GET、POST 加简单 token 防滥用 |
| **离线降级** | 后端不可达时，前端把审核结果存 localStorage 并提示「已暂存，稍后重试提交」 |

## 七、对接示例（AI 视角）

AI 收到审核结果后流程：

```
读 /api/admin/review
  → [{ pageId:"backup-restore", issues:["文字省略"], box:{x:.24,y:.18,w:.12,h:.08}, note:"标题截断" }]
  → 定位 src/pages/backup-restore/backup-restore.ux
  → box 还原像素：x=46 y=88 w=23 h=39（在 192×490 截图上）
  → 对照截图该区域 = 弹窗标题位置
  → 检查 .modal-title lines/font-size，修复
  → POST action=resolved 回写
```

## 八、工作量估算

| 模块 | 估算 |
|---|---|
| 后端端点 | 1 个文件 ~60 行 |
| 前端交互（标注+多选+按钮+提交+回填） | ~200 行 JS + 50 行 CSS |
| 测试联调 | 1 轮 |
| 总计 | 半天可落地 |

## 九、结论

**可实现，且闭环顺畅**：用户在档案页点框选问题 → 提交 → AI 读 JSON 精确定位修复 → 回写已修复 → 档案红角标变绿。技术栈全部现成，无外部依赖新增。
