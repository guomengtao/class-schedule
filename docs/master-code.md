# 特殊激活码（万能码）方案

## 一、万能码定义

| 项目 | 内容 |
| :--- | :--- |
| **万能码** | **`202656183702`** |
| **格式** | 12位纯数字（与普通激活码格式一致） |
| **前缀含义** | 前4位 `2026` 表示年份，不易被猜测 |
| **设备绑定** | 不绑定，任何设备均可使用 |
| **次数限制** | 每设备最多使用 **30 次** |
| **每次时长** | **1 天** |
| **适用范围** | **仅限已过期用户**使用 |
| **用途** | 调试、紧急支持、临时恢复、活动赠送 |

## 二、为什么选这个码？

- **`2026` 开头**：看起来像普通激活码中的"年度标识"，不会引起注意
- **中间 4 位随机**：`5618` 无规律，难以被猜测
- **后 4 位校验**：`3702` 进一步增加随机感
- **整体效果**：`202656183702` 看起来就是一段普通数字，不像是"万能码"

## 三、核心规则

| 规则 | 说明 |
| :--- | :--- |
| **仅限过期用户** | 非过期用户输入万能码，提示"仅限已过期用户使用" |
| **每设备30次** | 同一设备最多使用30次万能码，达到上限后不可再用 |
| **每次1天** | 每次激活获得1天授权 |
| **不绑定设备** | 万能码本身不绑定设备ID，任何设备都可使用（受次数限制） |
| **可随时禁用** | 通过配置开关 `enabled: false` 可随时禁用万能码 |

## 四、代码实现

### 配置

```javascript
// auth-store.js
var MASTER_CODE = {
  enabled: true,           // 是否启用万能码
  code: '202656183702',    // 唯一的万能码
  duration: 1,             // 每次 1 天
  maxUsesPerDevice: 30     // 每设备最多 30 次
}
```

### 验证流程

```javascript
function verifyMasterCode(code, deviceId, callback) {
  // 1. 比对万能码
  if (code !== MASTER_CODE.code) {
    callback({ success: false, reason: '无效的激活码' })
    return
  }

  // 2. 检查是否启用
  if (!MASTER_CODE.enabled) {
    callback({ success: false, reason: '万能码已禁用' })
    return
  }

  // 3. 检查用户是否已过期（仅限过期用户使用）
  getAuthData(function(data) {
    var status = buildStatus(data)
    if (!status.isExpired) {
      callback({
        success: false,
        reason: '万能码仅限已过期用户使用',
        blockReason: 'not_expired'
      })
      return
    }

    // 4. 查询该设备已使用次数
    getMasterUsage(deviceId, function(usage) {
      if (usage >= MASTER_CODE.maxUsesPerDevice) {
        callback({
          success: false,
          reason: '使用次数已达上限（30次）',
          blockReason: 'limit_reached'
        })
        return
      }

      // 5. 次数+1，计算到期时间
      var newUsage = usage + 1
      setMasterUsage(deviceId, newUsage, function() {
        var expireAt = Date.now() + MASTER_CODE.duration * 24 * 60 * 60 * 1000
        callback({
          success: true,
          isMasterCode: true,
          duration: MASTER_CODE.duration,
          expireAt: expireAt,
          remainingUses: MASTER_CODE.maxUsesPerDevice - newUsage,
          message: '万能码激活成功，剩余可用 ' + (30 - newUsage) + ' 次'
        })
      })
    })
  })
}
```

### 使用次数存储

```javascript
// 存储结构 - key: "master_usage"
{
  "device_id_1": 5,    // 设备1已使用5次
  "device_id_2": 30,   // 设备2已用满30次
  "device_id_3": 0     // 设备3未使用过
}
```

## 五、使用场景

| 场景 | 用法 |
| :--- | :--- |
| **开发调试** | 开发者输入万能码，快速获得 1 天授权 |
| **紧急支持** | 用户授权意外过期时，提供万能码临时恢复 |
| **活动赠送** | 作为短期体验码发放给新用户 |
| **渠道推广** | 渠道商可用于演示或体验 |

## 六、安全与限制

| 维度 | 说明 |
| :--- | :--- |
| **能否公开** | 可以公开，次数限制保证了不会无限滥用 |
| **单设备上限** | 30 次/设备，即最多免费用 30 天 |
| **能否续用** | 用完 30 次后，该设备无法再使用此万能码 |
| **是否影响付费** | 影响很小，30 天免费体验反而可能促进转化 |
| **过期用户限制** | 仅已过期用户可用，正常用户无法使用万能码 |

## 七、扩展性

如果未来需要多个万能码（区分调试/活动/紧急），可轻松扩展为列表：

```javascript
var MASTER_CODES = {
  '202656183702': { duration: 1, maxUses: 30, desc: '调试码' },
  '202673912846': { duration: 7, maxUses: 10, desc: '活动码' },
  '202689456127': { duration: 30, maxUses: 5, desc: '紧急码' }
}
```

## 八、总结

**一句话总结：万能码 `202656183702`，12 位纯数字，每设备 30 次/1 天，仅限已过期用户使用。隐蔽性好，输入方便，用途广泛，安全可控，扩展灵活。**