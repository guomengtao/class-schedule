# AstroBox 插件与课表同步路径分析

> 承接 `docs/表盘联动性与仓库结构深度分析.md` 的 P2 路径（手机中转载入）。
> 本轮回答三个具体问题：**① AstroBox 插件能写入数据到表盘吗？② 必须开发独立 App 吗？③ 必须安卓吗，macOS / iOS 行不行？**
>
> 结论先行：**① 不能"写表盘"，它是发给手环上的「快应用」；② 不必开发独立 App，插件是官方推荐路径；③ 不必安卓，全平台可用（但 iOS 上插件以解释模式运行）。**

---

## 零、直接回答

| 问题 | 回答 |
|---|---|
| AstroBox 插件能"写入数据到表盘"吗？ | ❌ **不能写表盘内部数据**。表盘是资源包，插件只能"**安装整个表盘文件**"。已实证的课表同步路径是：插件 → `interconnect` → **手环上的快应用**。 |
| 必须开发独立 App 吗？ | ❌ **不必**。可开发 **AstroBox 插件**（官方扩展机制），由宿主负责蓝牙/协议；也可参考已开源的同类实现。 |
| 必须安卓吗？ | ❌ **不必**。AstroBox 支持 Windows / macOS / iOS·iPadOS / Android / Linux / 浏览器。 |
| macOS / iOS 可以吗？ | ✅ **可以**。macOS Sonoma 14+、iOS/iPadOS 16.5+。**注意**：iOS 上插件以**解释模式**运行，性能低于桌面/安卓。 |

---

## 一、关键澄清：不是"写表盘"，是"发给快应用"

这一点必须纠正，否则方向会走偏：

| 操作 | AstroBox 插件能不能做 | 说明 |
|---|---|---|
| 安装/替换一个表盘（`.bin`） | ✅ 能 | `queue.add_resource_to_queue(ResourceType::Watchface, path)` |
| **修改表盘内部的数据** | ❌ 不能 | 表盘无自定义数据槽（见数据固化机制分析） |
| **把课表数据发给手环上的快应用** | ✅ **能（已实证）** | `interconnect.send_qaic_message` |
| 安装/替换一个快应用（`.rpk`） | ✅ 能 | `ResourceType::Quickapp` |
| 读写手环设备数据 | ✅ 能（有权限机制） | `transport.send` / `transport.request` |

**所以"课表同步"的正确形态是**：

```
手机侧（AstroBox 插件）
        │  interconnect（send-qaic-message）
        ▼
手环侧「课程表快应用」→ 写入自己的 storage → 显示
```

**而不是**写进表盘。这与前几轮的结论完全一致：**要"能存能改的课程表"，就必须是快应用。**

---

## 二、决定性实证：Var课程表同步器 + 技术细节

### 2.1 已有现成产品在这么做

米坛社区知识库（`wiki.bandbbs.cn/Guides/astrobox/astrobox-plugin.html`）明确记载了一个名为「**Var课程表同步器**」的插件：

> 打开 AstroBox V2 → 点击「插件」→ 插件市场 → 找到 *Var课程表同步器* → 安装 → 重启 → **在插件内配置课程表** → 点击「发送」→ **给予所有权限** → 即可在手环显示。

这证明：**"手机侧配置课表 → 插件发送 → 手环显示"这条链路是真实可用、已有产品化的。**

### 2.2 技术实现（来自开源仓库 `AzumaChiaki/Varclass-Astrobox-rust`）

| 环节 | 实现 |
|---|---|
| 插件形态 | Rust 编译为 **`wasm32-wasip2` WebAssembly Component** |
| 运行环境 | AstroBox v2 插件系统（WASI Preview 2 + WIT Component Model + wasmtime） |
| 发现手环应用 | `thirdpartyapp.get_thirdparty_app_list(addr)` → 按 `app_name` 找到"Var课程表" → 取 `package_name` |
| 注册接收 | `register.register_interconnect_recv(addr, pkg)` |
| **发送课表** | `interconnect.send_qaic_message(addr, pkg, payload)` |
| 接收回包 | `on_event` 回调，需**递归解包** `data/payload/payloadText/eventPayload/message/content/body/result` |
| 设备协议 | `transport.send` / `transport.request`（协议标识 `XIAOMI-VELA-V5-PROTOBUF`） |
| UI | 声明式链式 Builder（无 HTML/JS/CSS）：`ui::element::new(ElementType::BUTTON, ...).on(Event::CLICK, "id")` |

该插件的功能清单（作者回归清单）包括：添加/编辑/删除课程、粘贴 JSON 导入、**从手环获取课程**、**推送到手环**。

> **注意**：该仓库 README 主要是 AstroBox v2 官方插件开发文档的转载（源：`plugindoc.astrobox.online`），业务功能是从作者自写的"注意事项"反推的；**未见其实现"表盘课程同步"**。

---

## 三、平台支持（官网权威清单）

`astrobox.online` 官网列出：

| 平台 | 版本要求 |
|---|---|
| Windows | 10 20H2 及以上 |
| **macOS** | **Sonoma (14+)** |
| **iOS / iPadOS** | **16.5+** |
| Android | 10+ |
| Linux | Debian / RedHat |
| 浏览器 | Chromium 119+ |

官网称"**五大主流平台保持一致的功能与体验**"。插件体系支持 **Rust / TinyGo / JS / C# / Python**（统一编译为 WASM）。

### 平台差异（重要）

| 平台 | 插件执行引擎 | 影响 |
|---|---|---|
| 桌面 / Android | Cranelift **JIT** | 性能好 |
| **iOS** | **Pulley64 解释模式** | **性能较低**，复杂插件体验可能打折 |

另：单插件内存上限 **128 MiB**；插件的 `std fs` 仅能访问自身目录。

**结论**：**开发一次，全平台可用**——因为插件是 WASM、平台差异由宿主屏蔽。所以"必须安卓吗"的答案是**不必**；macOS 体验最佳，iOS 可用但受解释执行限制。

---

## 四、三条实现路径对比

| 路径 | 做法 | 成本 | 平台覆盖 | 评价 |
|---|---|---|---|---|
| **A. 开发 AstroBox 插件** | Rust/WASM 插件，复用宿主的蓝牙+协议 | 低-中 | 全平台（1 次开发） | ✅ **推荐** |
| B. 开发独立 App | 自己实现 BLE + Protobuf + interconnect | 高 | 需分平台开发（iOS 最麻烦） | 仅在需要脱离 AstroBox 时选 |
| C. 复用/参考开源实现 | 参考 `Varclass-Astrobox-rust`、`Schedule-Vela` | 低 | 同 A | ✅ 起步最快 |

**共同前提（无论哪条路）**：手环侧的快应用必须**提供"接收数据"的接口**——即注册 interconnect 接收、解析 payload、写入本地存储。**Ev课程表目前没有这个接口，需要开发。**

---

## 五、完整技术链路（推荐落地形态）

```
┌─────────────────────────────────────────────────────────────┐
│  手机侧（任选其一，推荐插件）                                  │
│  ├─ AstroBox 插件（Rust → WASM）                             │
│  │    · 录入/导入课表（JSON / 拾光 / WakeUp / CSES …）        │
│  │    · 调用 send_qaic_message 发送                          │
│  └─ 或 独立 App（自实现 BLE + Protobuf）                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ BLE + Protobuf（AstroBox 宿主代劳）
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  手环侧：Ev课程表（快应用，需新增"接收接口"）                  │
│  ① register_interconnect_recv 注册接收                       │
│  ② 解析 payload（JSON，格式 A）                              │
│  ③ 写入 @system.storage（allCourses_N）                      │
│  ④ 页面刷新 / Toast 提示                                     │
└─────────────────────────────────────────────────────────────┘
```

**数据契约直接复用现有格式 A**（见 `docs/import-export-json-format-analysis.md`）：按 `day` 分组、`time` 为 `"HH:MM - HH:MM"` 合一字符串，避免二次转换。

---

## 六、竞品情报（重要）

调研中发现了两个**直接竞品**，且都已建立"手机侧导入"链路：

| 产品 | 形态 | 数据来源 | 分发 |
|---|---|---|---|
| **Jursin/Schedule-Vela**（腕上课程表） | 开源快应用（GPL-3.0） | **需通过 AstroBox 插件或同步器 App 导入**；支持导入**拾光课程表 / WakeUp / 星链课表 / CSES** 配置 | 米坛社区 + GitHub |
| **Var课程表** | 快应用 + AstroBox 插件（Var课程表同步器） | 手机侧录入 / 粘贴 JSON / 从手环拉取 | 爱发电付费 + 插件市场 |

### 对本项目的启示

| 维度 | 竞品做法 | Ev课程表现状 | 建议 |
|---|---|---|---|
| 数据录入 | **手机侧批量导入**（插件/App） | 仅**手环上手动编辑** | ⚠️ **这是最大差距** |
| 生态互通 | 支持导入主流课表 App 配置 | 无 | 可增加"导入拾光/WakeUp/CSES" |
| 分发 | 米坛 + GitHub + 插件市场 | 米坛 + 轻腕 + GitHub | 可上架 AstroBox 插件市场 |
| 差异化 | — | **手环上直接编辑（无需手机）** | ✅ 保留并宣传这个优势 |

**结论**：Ev课程表的"手环直接编辑"是竞品没有的优势，但**缺"手机侧批量导入"是明显短板**——大量用户已有现成课表配置，不想再手输一遍。

---

## 七、对本项目的建议

### 7.1 优先级建议

| 优先级 | 动作 | 理由 |
|---|---|---|
| **P0** | 在 Ev课程表**快应用侧新增"接收接口"**（注册 interconnect、解析 JSON、写 storage） | 这是所有手机侧导入方案的前置条件，成本可控 |
| **P1** | 开发/适配一个 **AstroBox 插件**（可参考 `Varclass-Astrobox-rust`） | 一次开发全平台，直接获得"手机侧导入"能力 |
| P2 | 支持导入主流课表格式（拾光 / WakeUp / CSES / ICS） | 降低用户迁移成本，对标竞品 |
| P3 | 上架 AstroBox 插件市场 | 获得渠道曝光（与米坛互补） |

### 7.2 关键判断

- **不需要**为进入这个链路开发独立 App——**AstroBox 插件足以**，且全平台覆盖。
- **不需要**执着于"写表盘"——那条路技术上不成立（表盘无数据槽）。
- **真正要做的是**：让 Ev课程表具备"被手机侧写入"的能力，打通"手机导入 → 手环显示"。

---

## 七·补、EV 同步器插件现状（本项目 · v1.0.20 内测中）

> 由本项目作者发布，仓库 `guomengtao/app-auth`，当前处于**内测**阶段。

### 基本信息

| 项 | 内容 |
|---|---|
| 名称 | **EV Schedule Sync**（EV 课程表同步器） |
| 最新版 | **v1.0.20**（2026-09-22 发布） |
| 下载 | `https://github.com/guomengtao/app-auth/releases/tag/ev-schedule-sync-v1.0.20` |
| 产物 | `EV-Schedule-Sync-v1.0.20.abp`（约 395 KB）—— **`.abp` 即 AstroBox 插件包格式** |
| 插件详情页 | `https://app-auth.gudq.com/user-guide.html?r=astrobox` |
| 版本历史 | v1.0.14「HelloWorld 修复版」(09-21) → v1.0.20「设备菜单 + Demo JSON 导入」(09-22) |

### v1.0.20 已实现的能力

1. **设备目标菜单**：列出所有已配对设备，实时显示连接状态（●已连接 / ○离线），**逐个检测设备上是否安装 EV 课程表**，只有「已连接 + 已安装」的设备可选。
2. **操作前守卫检查**：导入 / 导出前校验目标设备状态 —— 未选择设备 / 设备离线 / 未安装 EV 课程表 → 拦截并给出明确提示，并显示**真实包名 `com.application.watch.classschedule`**。
3. **Demo JSON 快捷导入**：内置带详细注释的 JSON 模板 →「复制 Demo JSON」→ 交给 AI 助手编辑 → 粘贴回来导入；**逐字段严格校验**（day 1-7 / HH:MM / 开始早于结束 / weekType / 周次非空），错误提示精确到字段名。
4. 界面顶部常驻版本号，便于核对设备上装的是哪一版。

### 技术要点（印证前文分析）

- 插件是 **`.abp`（AstroBox 插件包）**，Rust 实现，**要求 `api_level = 2`、Rust edition 2021、版本号递增**。
- 官方沉淀的关键经验：
  - WIT 中**不存在** `thirdpartyapp::is_installed()` → 改为**拉取应用列表后按包名匹配**。
  - 修过 `std::sync::Mutex` **重入死锁**（渲染时持锁调用 `build_*` 导致插件卡死）。
  - 仓库新增 `ABP安装排错手册.md`（§0 一分钟自查 9 项 / §6 成功配方 / §7 打包后内容自检命令）。
- ⚠️ **重要风险**：本仓库 `src/` 中**未发现任何 `interconnect` / 接收接口代码**，说明**快应用侧的「接收数据」能力可能尚未实现**。插件虽已能导入 JSON，但要真正写入手环，**快应用侧必须先提供接收接口**（即第七节的 P0）。

### 相关外围信息（已核实）

- 手环端安装方式：**用 AstroBox 推送 `.rpk`**，支持 **10 Pro / 9 Pro / 9 / S3 / S4**（方屏 / 胶囊 / 圆屏自动匹配）。
- AstroBox 下载：`https://astrobox.online/downloads/`，酷安亦可搜到。
- 用户支持 QQ 群：**936886288**。

---

## 八、待确认清单

1. AstroBox 插件 API 的**完整列表与权限模型**（官方文档：`plugindoc.astrobox.online`）。
2. `send_qaic_message` 的**载荷大小上限**（一周课表 JSON 体积是否超限）。
3. **快应用侧接收接口的现状（最高优先级）**：本仓库 `src/` 未发现 `interconnect` / `recv` 相关代码 —— 需确认"接收课表数据"的能力是否已实现（**这是插件能否真正写入的前提**）；同时确认 Vela 中 `system.interconnect` 服务端 / 客户端的官方写法。
4. iOS 解释模式下的**实际稳定性**（建议真机验证再承诺）。
5. 是否需要**证书一致**才能与手环通信（Vela FAQ 提到手表↔手机通信需证书匹配）。

---

> 说明：本文"已核实"依据 AstroBox 官网（`astrobox.online`，支持平台与插件体系）、米坛知识库（`wiki.bandbbs.cn` 关于 Var课程表同步器的使用教程）、开源仓库 `AzumaChiaki/Varclass-Astrobox-rust`（AstroBox v2 插件开发文档转载 + 实战注意事项）、`Jursin/Schedule-Vela` 与米坛资源页（检索时间 2026-09-22）。插件 API 细节、载荷上限、iOS 稳定性等标注为**待确认**，请以官方插件文档与真机为准。
