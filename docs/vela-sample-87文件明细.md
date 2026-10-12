# vela-sample 明细（87 文件大全）

> 来源：`open-vela-learning/packages_apps/wearable/vela-sample/`（open-vela 官方示例仓库 dev 分支）
> 性质：**官方组件 + 接口 + 框架特性的完整示例集**，是 Ev课程表快应用开发的首选抄写来源
> 规模：src 下 84 个文件（含 229 张全库 png 中的 3 张）+ `package.json` + `package-lock.json` + `README.md` = 87
> 结构：`interface/`（23 个 API 示例）+ `component/`（26 个组件示例）+ `framework/`（20 个框架特性示例）+ `home/`（示例导航页）+ `style/comm.css`（全局样式）
> manifest：`deviceTypeList: ["watch"]`、`minAPILevel: 1`、`designWidth: 480`、**注册了全部 23 个 system 能力**（可直接当权限清单抄）

---

## 一、根文件（5）

| 文件 | 说明 |
|---|---|
| `src/app.ux` | 应用入口，582B |
| `src/manifest.json` | 5.2KB。**features 段列全 23 个 `system.*` 能力**、router 段注册全部页面 → 直接当「能力开通清单 + 路由写法」参考 |
| `src/style/comm.css` | 1.3KB。**全局样式唯一来源**：`.page/.row/.column/.header/.btn/.tips/.code/.link` → 新页 `<style>@import '../../../style/comm.css';</style>` |
| `src/i18n/defaults.json` `en-US.json` `zh-CN.json` | 国际化三件套（各 200B 左右），配置语言键值 |
| `src/Common/` | `logo.png`、`arrow-0.png`、`arrow-1.png`（导航箭头）、`hello.zip`（zip 示例用）、`mp3/m2.mp3`（900KB 音频示例素材） |

## 二、`src/home/` — 示例导航页（2）

| 文件 | 说明 |
|---|---|
| `home/index.ux` | **示例总入口 / 目录页**：分类列全部示例并跳转 → 抄它的「列表 + 跳转」结构 |
| `home/data.js` | 5.8KB。目录数据（分类 → 示例名 → 路由），**可参考的数据组织方式** |

---

## 三、`src/interface/` — 系统接口示例（23）

### basic/（4）
| 文件 | 演示 |
|---|---|
| `basic/app/index.ux` | `@system.app` 应用信息 |
| `basic/configuration/index.ux` | `@system.configuration` 系统配置（语言/区域等） |
| `basic/device/index.ux` | ⭐ **`@system.device` 全量示例**：getInfo / getDeviceId / getSerial / 存储 / uptime（本项目取设备标识直接抄这个） |
| `basic/router/index.ux` | `@system.router` 页面跳转 push/replace/back |

### data/（2）
| 文件 | 演示 |
|---|---|
| `data/file/index.ux` | `@system.file` 文件读写（7.1KB，最完整之一） |
| `data/storage/index.ux` | `@system.storage` KV 本地存储 |

### network/（4）
| 文件 | 演示 |
|---|---|
| `network/fetch/index.ux` | `@system.fetch` 网络请求 |
| `network/interconnect/index.ux` | ⭐ `@system.interconnect` 跨设备互联（表↔手机） |
| `network/request/index.ux` | `@system.request` 下载/上传请求 |
| `network/uploadtask/index.ux` | `@system.uploadtask` 上传任务 |

### other/（2）
| 文件 | 演示 |
|---|---|
| `other/audio/index.ux` | `@system.audio` 音频播放控制 |
| `other/prompt/index.ux` | `@system.prompt` toast / dialog |

### security/（1）
| 文件 | 演示 |
|---|---|
| `security/crypto/index.ux` | `@system.crypto` 加解密 / 摘要（5.7KB） |

### system/（10）
| 文件 | 演示 |
|---|---|
| `system/battery/index.ux` | 电量查询 |
| `system/brightness/index.ux` | 亮度 + **setKeepScreenOn 常亮**（防息屏） |
| `system/event/index.ux` | 自定义事件 |
| `system/geolocation/index.ux` | 定位 |
| `system/network/index.ux` | 网络状态监听 |
| `system/record/index.ux` | 录音 |
| `system/sensor/index.ux` | 传感器（心率/加速度等） |
| `system/vibrator/index.ux` | 振动马达 |
| `system/volume/index.ux` | 音量控制 |
| `system/zip/index.ux` | 解压缩 |

---

## 四、`src/component/` — UI 组件示例（26）⭐ 组件抄写主战场

### basic/（10）基础组件
| 文件 | 组件 |
|---|---|
| `basic/a/index.ux` | `<a>` 链接 |
| `basic/barcode/index.ux` | `<barcode>` 条码 |
| `basic/chart/index.ux` | `<chart>` 图表（折线/柱状，矢量渲染） |
| `basic/image/index.ux` | `<image>` 图片 |
| `basic/image-animator/index.ux` | `<image-animator>` **帧动画**（可抄其序列帧播放） |
| `basic/marquee/index.ux` | `<marquee>` 跑马灯 |
| `basic/progress/index.ux` | `<progress>` 进度条 |
| `basic/qrcode/index.ux` | `<qrcode>` 二维码（矢量） |
| `basic/span/index.ux` | `<span>` 行内文本 |
| `basic/text/index.ux` | `<text>` 文本（含字号/颜色/对齐属性） |

### container/（5）容器布局
| 文件 | 组件 |
|---|---|
| `container/div/index.ux` | `<div>` 基础容器 |
| `container/list/index.ux` | `<list>` 长列表（**列表页必抄**） |
| `container/scroll/index.ux` | `<scroll>` 滚动容器 |
| `container/stack/index.ux` | `<stack>` 层叠（叠加定位） |
| `container/swiper/index.ux` | `<swiper>` 轮播/左右滑动（**首页左右滑动切日期可参考**） |

### form/（4）表单控件 ⭐
| 文件 | 组件 | 关键属性 |
|---|---|---|
| `form/input/index.ux` | `<input>` 输入框 | 文本输入 |
| `form/picker/index.ux` | `<picker>` 滚动选择器 | **手环上选择类交互首选** |
| `form/slider/index.ux` | `<slider>` 滑块 | 音量/进度类 |
| `form/switch/index.ux` | `<switch>` 开关 | 已验证：支持 `thumb-color` / `track-color` 自定义色（示例给了红/绿/蓝三组） |

### general/（7）通用样式与行为
| 文件 | 演示 |
|---|---|
| `general/animation-style/index.ux` | 动画样式（transition/animation） |
| `general/background-img/index.ux` | 背景图写法 |
| `general/color/index.ux` | 颜色写法（hex/rgb/rgba 等） |
| `general/events/index.ux` | 事件绑定（onclick/onchange/ontouch…） |
| `general/methods/index.ux` | 组件方法调用 |
| `general/properties/index.ux` | 通用属性 |
| `general/style/index.ux` | 样式写法总览 |

---

## 五、`src/framework/` — 框架特性示例（20）

### template/（8）模板语法
| 文件 | 演示 |
|---|---|
| `template/if/index.ux` | `if/elif/else` 条件渲染 |
| `template/for/index.ux` | `for` 列表渲染 + `tid` 唯一键（性能优化要点） |
| `template/computed/index.ux` | computed 计算属性 |
| `template/events/index.ux` | 自定义事件 `$emit` / 监听 |
| `template/props/index.ux` + `props/child.ux` | ⭐ **父子组件 props 传递完整对**（父传子 data、子回传事件） |
| `template/component/index.ux` + `component/counter.ux` | ⭐ **最小可复用组件范例**（含计数器组件，可对照改造成本项目组件） |

### script/（3）脚本与生命周期
| 文件 | 演示 |
|---|---|
| `script/lifecycle/index.ux` | 页面/应用生命周期钩子（onInit/onReady/onShow/onHide/onDestroy…） |
| `script/page-data/index.ux` | 页面数据定义（private/public 数据域） |
| `script/global-data-method/index.ux` | 全局数据与方法（`global.xxx`，fistPower/calendar 项目里也在用这招） |

### style/（2）样式专题
| 文件 | 演示 |
|---|---|
| `style/page-style/index.ux` | 页面级样式写法 |
| `style/media-query/index.ux` | ⭐ **媒体查询四类用法**：`shape`（屏幕形状）、`and` 组合、`or` 查询、标题栏跨屏适配 —— ⚠️ 见下方「本项目使用注意」 |

### other/（7）其它特性
| 文件 | 演示 |
|---|---|
| `other/i18n/index.ux` | 国际化取词 |
| `other/hap-schema/index.ux` | hap schema 跳转（如跳系统页） |
| `other/launch-mode/index.ux` | 启动模式 |
| `other/launch-mode-target/index.ux` | singleTask 启动模式目标页 |
| `other/dynamic-component/index.ux` + `part-red/green/blue.ux` | ⭐ **动态组件**（运行时切换子组件） |

---

## 六、⚠️ 本项目使用注意（与 Ev课程表既有铁律的冲突）

抄 vela-sample 前必读 —— 以下三处**以项目铁律为准，不得照抄**：

| 官方示例做法 | 本项目铁律 | 正确做法 |
|---|---|---|
| `style/media-query/index.ux` 用 `@media (shape: pill-shaped)` 适配胶囊屏 | `project_rules.md` §10.3 铁律 2：**禁止 `(shape: pill-shaped)`**（手环9 命中即黑屏重启） | 走项目「触底自适应」：base = 手环9(160px) + `@media (width>=200px)` + `(width>=400px)` + 仅保留 `@media (shape: circle)` |
| 图标全用 png（`Common/arrow-*.png` 等） | 总纲 §3.14：图标**只能用 Lucide** | 图标走 Lucide SVG + 运行时 tint |
| 组件示例可能用 `lines:` / `text-overflow: ellipsis` | §10.3 铁律 3/4 + §6：**全局禁止**（已知崩溃触发属性） | 用颜色/图标/位置变化替代截断 |

> 结论：**组件结构、交互逻辑、API 用法照抄；自适应实现、图标来源、文本处理服从项目铁律。**

---

## 七、最优先抄的 8 个文件

1. `component/container/list/index.ux` — 长列表（课表/设置列表基础）
2. `component/container/swiper/index.ux` — 左右滑动（首页切日期）
3. `component/form/picker/index.ux` — 滚动选择（时间/周次选择）
4. `component/form/switch/index.ux` — 开关（含自定义色）
5. `interface/basic/device/index.ux` — 设备信息 / 设备标识
6. `template/props/index.ux` + `props/child.ux` — 组件间通信范式
7. `framework/script/global-data-method/index.ux` — 全局数据（本项目已在用）
8. `style/comm.css` — 全局样式基座
