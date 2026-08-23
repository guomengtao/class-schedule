# 打包自动递增版本号功能

## 概述

每次执行 `npm run build` 或 `npm run release` 时，自动将版本号最小位（patch）递增 1，同时更新 `versionCode`，确保每次打包发布都有唯一版本号。

## 涉及文件

| 文件 | 作用 |
|------|------|
| [scripts/bump-version.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/bump-version.js) | 版本递增执行脚本 |
| [package.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/package.json) | 注册 npm 生命周期钩子 |
| [src/manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) | 快应用包版本号，被递增的目标文件 |
| [src/data/version.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/version.js) | 应用内显示的版本号，同步递增 |
| [src/pages/settings/settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) | 设置页面底部展示版本号 |

## 使用方式

### 自动递增（推荐）

```bash
npm run build      # 先递增版本号 → 再执行 aiot build
npm run release    # 先递增版本号 → 再执行 aiot release
```

### 手动递增（不打包）

```bash
npm run bump       # 仅递增版本号，不执行打包
```

## 版本号规则

| 版本格式 | 示例 | 递增规则 |
|----------|------|----------|
| `versionName` | `1.2.0` → `1.2.1` → `1.2.2` | 仅递增 patch 位（第三位） |
| `versionCode` | `43` → `44` → `45` | 每次 +1 |

如需升级大版本（major）或功能版本（minor），手动修改 `manifest.json` 中的 `versionName` 即可，后续打包自动在对应版本基础上递增。

## 实现原理

### npm 生命周期钩子

npm 支持 `pre` 前缀脚本自动执行：

```
npm run build
  └─ 自动执行 prebuild → node scripts/bump-version.js  (版本递增)
  └─ 然后执行 build → aiot build                        (打包)
```

`package.json` 中的配置：

```json
{
  "scripts": {
    "bump": "node scripts/bump-version.js",
    "prebuild": "node scripts/bump-version.js",
    "build": "aiot build",
    "prerelease": "node scripts/bump-version.js",
    "release": "aiot release"
  }
}
```

### bump-version.js 执行流程

```
1. 读取 src/manifest.json
2. 解析 versionName "1.2.0" → { major: 1, minor: 2, patch: 0 }
3. patch + 1 → "1.2.1"
4. versionCode + 1 → 44
5. 写回 src/manifest.json
6. 同步写入 src/data/version.js
7. 打印变更日志
```

### 数据流向

```
manifest.json (versionName: "1.2.0", versionCode: 43)
        │
        ▼
bump-version.js (递增)
        │
        ├──▶ manifest.json (versionName: "1.2.1", versionCode: 44)
        │
        └──▶ version.js (versionName: "1.2.1", versionCode: 44)
                     │
                     ▼
              settings.ux (页面显示 v1.2.1)
```

## 开发注意事项

- **不要手动修改 `version.js`**，它的内容由 `bump-version.js` 自动同步，手动修改会在下次打包时被覆盖
- **大版本号升级**：如需从 `1.2.x` 升到 `1.3.0`，手动修改 `manifest.json` 的 `versionName` 为 `1.3.0`，后续打包继续在 `1.3.x` 上递增
- **CI/CD 环境**：`npm run release` 同样会自动递增，每次发布版本号唯一
- **回退版本**：Git 回退代码后，`manifest.json` 和 `version.js` 一同回退，版本号与代码一致