# 脚本使用说明

所有脚本在项目根目录下运行（`class/` 目录）。

---

## 构建与发布

### `npm run release` — 发布正式版

```bash
npm run release
```

- 自动 bump 版本号 + 构建 + 签名 + 打包
- 输出 `.rpk` 文件到 `dist/` 目录

### `npm run build` — 仅构建

```bash
npm run build
```

- 自动 bump 版本号，然后执行 `aiot build`

### `npm run build:dev` — 开发构建

```bash
npm run build:dev
```

- 不 bump 版本号，直接 `aiot build`

### `npm run start` — 开发模式（watch）

```bash
npm run start
```

- 清理 + `aiot start --watch`，文件变动自动重新构建

### `node scripts/build.js` — 底层构建

```bash
node scripts/build.js
```

- 直接调用 `aiot build`，可传额外参数

### `node scripts/bump-version.js` — 版本号自增

```bash
node scripts/bump-version.js
```

- 自动递增 `manifest.json` 的 patch 版本号（如 `1.4.5` → `1.4.6`）
- 同步更新 `src/data/version.js`

### `node scripts/build-log.js` — 构建日志

```bash
node scripts/build-log.js
```

- 执行构建并将完整输出写入项目根目录 `build.log`

### `node scripts/run_build.js` — 构建结果

```bash
node scripts/run_build.js
```

- 执行构建并将结果写入 `build_result.txt`

---

## 授权管理

### `node scripts/manage-auth.js` — 授权模式切换（推荐）

```bash
node scripts/manage-auth.js permanent    永久激活（所有高级功能解锁）
node scripts/manage-auth.js standard     标准版（免费版）
node scripts/manage-auth.js months:3     激活 3 个月
node scripts/manage-auth.js months:6     激活 6 个月
node scripts/manage-auth.js expire       设为已过期
node scripts/manage-auth.js reset        恢复正常（从设备存储读取）
node scripts/manage-auth.js show         查看当前状态
```

> 修改 `src/data/auth-store.js` 中的 `FORCE_AUTH_MODE`，生效后需重新发布。

### `node scripts/set-auth.js` — 生成授权数据

```bash
node scripts/set-auth.js permanent               永久激活数据
node scripts/set-auth.js months 6                6 个月授权数据
node scripts/set-auth.js days 30                 30 天授权数据
node scripts/set-auth.js standard                标准版数据
node scripts/set-auth.js expired                 过期数据
node scripts/set-auth.js trial                   试用期数据
node scripts/set-auth.js clear-codes             清除所有激活码
node scripts/set-auth.js clear-all               清除所有授权数据
node scripts/set-auth.js show                    查看当前数据
```

> 输出 JSON 格式的授权数据，可手动写入 `storage-data.json`。

### `./scripts/switch-auth.sh` — 切换页面测试标志

```bash
./scripts/switch-auth.sh premium     模拟已激活（遮罩隐藏）
./scripts/switch-auth.sh standard    标准版（遮罩显示）
./scripts/switch-auth.sh reset       恢复正常
```

> 修改 `src/pages/check-demo/check-demo.ux` 中的测试标志。

---

## 数据检查与调试

### `node scripts/check-storage.js` — 检查存储引用

```bash
node scripts/check-storage.js                      查看所有表的存储引用
node scripts/check-storage.js --table allCourses    只看课程数据
node scripts/check-storage.js --count 10           指定显示条数
```

### `node scripts/check-and-insert-course.js` — 检查并插入课程

```bash
node scripts/check-and-insert-course.js
```

- 校验 `storage-data.json` 中的课程数据
- 插入一条随机课程到默认课表

### `node scripts/check-pinned.js` — 钉首页数据检查

```bash
node scripts/check-pinned.js
```

- 扫描所有 `.ux` 文件中 `pinToHome` 的调用
- 检查钉首页相关数据是否完整

### `node scripts/white-screen-check.js` — 白屏检测

```bash
node scripts/white-screen-check.js            常规检查
node scripts/white-screen-check.js --verbose  详细输出
```

- 静态分析首页的潜在白屏原因：CSS 布局、JS 初始化、模板条件、路由配置、存储数据、主题可见性等

---

## 环境检查

### `node scripts/check_env.js` — 环境信息

```bash
node scripts/check_env.js
```

- 输出 Node.js 版本、npm 版本、路径信息
- 结果写入 `scripts/env_check_result.txt`

---

## 资源生成

### `python scripts/generate-logo.py` — 生成 Logo

```bash
python scripts/generate-logo.py
```

- 生成 512x512 的 PNG Logo 到 `src/logo.png`
- 需要 Python + Pillow 库

---

## 数据参考

### `scripts/data-keys.json`

定义了 `@system.storage` 中使用的所有存储 key 及其数据结构，包括：

| Key | 说明 |
|-----|------|
| `allCourses` | 所有课程数据 |
| `currentScheduleIndex` | 当前课表索引 |
| `scheduleNames` | 课表名称列表 |
| `course_preset_list` | 课程预设 |
| `homepage_settings` | 首页设置 |
| `theme` | 主题配色 |
| `baseFontSize` | 用户选择的字体大小 (28/36/48/62/76) |
| `premium_unlocked` | 高级版解锁状态 |
| `auth_data` | 授权数据 |
| `hideWeekend` | 隐藏周末 |
| `remindSettings` | 提醒设置 |
| `nickname` | 昵称 |
| `pinned_pages` | 钉首页列表 |
| `backup_list` | 备份列表 |
| `used_codes` | 已使用的激活码 |
| `used_redeem` | 已使用的兑换码 |

---

## 快速参考

| 场景 | 命令 |
|------|------|
| 发布正式版 | `npm run release` |
| 激活永久版 | `node scripts/manage-auth.js permanent` |
| 切回标准版 | `node scripts/manage-auth.js standard` |
| 查看授权状态 | `node scripts/manage-auth.js show` |
| 检查存储数据 | `node scripts/check-storage.js` |
| 白屏排查 | `node scripts/white-screen-check.js` |
| 检查环境 | `node scripts/check_env.js` |