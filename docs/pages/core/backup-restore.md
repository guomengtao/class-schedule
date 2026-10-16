# 数据备份

> 路由：`pages/backup-restore` ｜ 源码：`src/pages/backup-restore/backup-restore.ux`（约 600 行）

## 1. 页面职责

本地备份与恢复：创建备份快照、列出备份、按备份回滚、删除备份。是用户误操作后的最后一道防线。

## 2. 界面结构

- 备份列表：backupList
- 创建：createBackup
- 恢复：restoreBackup（confirmRestoreBackup 二次确认）
- 删除：deleteBackup（confirmDeleteBackup 二次确认）
- 弹窗：dialogAction / dismissDialog / dialogType
- 结果反馈：resultMessage

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `createBackup` | 生成一份备份快照并落库 |
| `loadBackupList / saveBackupList` | 备份索引读写 |
| `restoreBackup` | 按索引恢复数据 |
| `deleteBackup` | 删除指定备份 |
| `confirmRestoreBackup / confirmDeleteBackup` | 危险操作二次确认 |
| `dialogAction / dismissDialog` | 弹窗交互 |
| `updateIconSrc` | 图标资源适配 |

## 4. 主要数据字段

- `backupList`
- `restoreIndex`
- `restoreName`
- `deleteIndex`
- `deleteName`
- `dialogType`
- `resultMessage`

## 5. 注意事项

- 恢复是覆盖写：恢复前要提示「当前数据将被替换」
- 备份数据本身也要防丢——仅存本地时，清应用数据即失效
