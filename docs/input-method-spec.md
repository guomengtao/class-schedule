# 输入法规范

## 核心原则

**整个项目只有一个中文输入页面**，所有需要中文输入的页面统一跳转到该页面进行输入或编辑，确认后返回原页面获取结果。

## 为什么只有一个页面？

| 问题 | 说明 |
|------|------|
| **包体积** | 每个页面内嵌 `InputMethod` 组件会重复引入键盘资源，多个页面内嵌会使 rpk 体积显著增大 |
| **维护成本** | 多处修改输入逻辑时容易遗漏，集中管理更易维护 |
| **体验一致** | 统一入口保证所有输入场景的交互体验一致 |

## 输入页面

- **路径**: `/pages/chinese-input`
- **职责**: 唯一的全局输入页面，不内嵌到任何其他页面中

## 调用方接入规范

### 步骤 1：设置参数

调用方在跳转前，通过 `@system.storage` 写入以下参数：

| 存储 Key | 类型 | 必填 | 说明 |
|----------|------|------|------|
| `chinese_input_title` | string | 是 | 页面标题，如 "添加课程"、"编辑名称" |
| `chinese_input_placeholder` | string | 否 | 输入框占位文字，默认 "请输入" |
| `chinese_input_value` | string | 否 | 初始值（编辑场景传入已有文本） |
| `chinese_input_maxlen` | string | 否 | 最大字数限制，默认 "10" |
| `chinese_input_return_key` | string | 是 | 返回时结果的存储 key，调用方用同一个 key 读取结果 |

### 步骤 2：跳转

```javascript
router.push({ uri: "/pages/chinese-input" })
```

### 步骤 3：读取结果

调用方在 `onShow` 中读取结果：

```javascript
onShow() {
  var self = this
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",   // 和步骤1设置的 return_key 一致
    success: function(data) {
      if (data !== undefined && data !== null && data !== "") {
        // 处理输入结果
        self.someField = data
        // 清理存储
        storage.delete({ key: "chinese_input_result", fail: function() {} })
      }
    },
    fail: function() {}
  })
}
```

## 示例

### 添加课程名称

```javascript
startAdd() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "添加课程" })
  storage.set({ key: "chinese_input_placeholder", value: "输入课程名称" })
  storage.set({ key: "chinese_input_value", value: "" })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
}
```

### 重命名课程

```javascript
startRename(index) {
  var item = this.list[index]
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "重命名" })
  storage.set({ key: "chinese_input_placeholder", value: "输入新名称" })
  storage.set({ key: "chinese_input_value", value: item.name })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
}
```

## 禁止事项

- **禁止**在任何其他页面中内嵌 `InputMethod` 组件或自行实现键盘
- **禁止**创建第二个中文输入页面
- **禁止**直接在页面中使用 `input` 标签做中文输入（快应用 `input` 组件中文支持不稳定）

## 参考实现

- 输入页面: [chinese-input.ux](../src/pages/chinese-input/chinese-input.ux)
- 调用方参考: 各页面中的 `onShow` 读取 `chinese_input_result` 逻辑