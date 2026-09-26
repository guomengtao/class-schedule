// ============================================================
// 默认设置集中配置表
// ============================================================
// 设计目标：把所有「默认开关 / 默认风格 / 默认行为」收敛到这一张表，
// 页面与 store.js 都从这里取值，不再各处硬编码。
// 详见 docs/新老用户默认设置集中管理方案.md
//
// policy 三档语义：
//   keep   永不改动 —— 用户个性化数据 / 主题 / 字号 / 昵称 / 钉首页
//   soft   用户没亲手改过 → 应用新默认值；改过 → 保留用户值
//   force  无条件覆盖为新默认值（仅用于修 bug / 统一策略）
//
// 其它字段：
//   since      该条默认值的「生效版本号」。与 app_state.defaultsVersion 比较，
//              只有 since > defaultsVersion 的条目才会被应用。
//              修改某条默认值时必须把它 +1（并同步 CURRENT_VERSION +1），
//              这样才构成一次「恰好执行一次」的声明式迁移。
//   dynamic    值是随机/动态生成的（昵称、自定义文案），不参与新旧值比较，
//              只在缺失时生成一次并固化。
//   lazy       懒读型：读取时兜底即可，不需要迁移写盘
//              （如 holidayReminderEnabled_{i}，运行时读不到就用默认值）。
//   dynamicKey key 形如 xxx_{i}，按课程表索引展开，不参与迁移写盘。
//
// ⚠️ 当前为阶段 1：所有条目 policy 一律为 keep —— 只建立机制与状态记录，
//    不改变任何用户可见行为。确认状态记录正常后，再逐条按需切到 soft / force。
//
// ⚠️ 已知矛盾（阶段 1 如实记录现状，未擅自修改）：
//    homepage.showTime / showPinnedBar 在 store.js 的兜底对象里是 false，
//    而 index.ux、homepage-settings.ux 的页面初值写的是 true，
//    且 index.ux 用 `settings.showTime !== false` 判断（undefined 视为 true）。
//    即同一个开关有 3 种语义。此处记录的是 store.js 的兜底值（新用户实际可见的
//    初始体验），统一决策留待阶段 2。

// 应等于 ITEMS 中最大的 since。修改任何默认值时必须一起 +1。
var CURRENT_VERSION = 1

var ITEMS = [
  // ---------- 首页设置（homepage_settings 对象，字段级） ----------
  { id: "homepage.showQuickAdd",      key: "homepage_settings", field: "showQuickAdd",      value: true,  policy: "keep", since: 1, desc: "首页-快速添加栏是否显示" },
  { id: "homepage.showTime",          key: "homepage_settings", field: "showTime",          value: false, policy: "keep", since: 1, desc: "首页-时钟是否显示" },
  { id: "homepage.showPinnedBar",     key: "homepage_settings", field: "showPinnedBar",     value: false, policy: "keep", since: 1, desc: "首页-钉首页栏是否显示" },
  { id: "homepage.showCustomContent", key: "homepage_settings", field: "showCustomContent", value: false, policy: "keep", since: 1, desc: "首页-自定义内容栏是否显示" },
  { id: "homepage.showStatusBar",     key: "homepage_settings", field: "showStatusBar",     value: true,  policy: "keep", since: 1, desc: "首页-课程提醒条是否显示" },
  { id: "homepage.showDayNavZong",    key: "homepage_settings", field: "showDayNavZong",    value: true,  policy: "keep", since: 1, desc: "首页-总课程导航" },
  { id: "homepage.showDayNavJin",     key: "homepage_settings", field: "showDayNavJin",     value: true,  policy: "keep", since: 1, desc: "首页-今日导航" },
  { id: "homepage.showDayNavMing",    key: "homepage_settings", field: "showDayNavMing",    value: true,  policy: "keep", since: 1, desc: "首页-明日导航" },
  { id: "homepage.showLabSection",    key: "homepage_settings", field: "showLabSection",    value: false, policy: "keep", since: 1, desc: "首页-实验室区块是否显示" },
  { id: "homepage.timeFormat",        key: "homepage_settings", field: "timeFormat",        value: { year: false, month: false, day: false, hour: true, minute: true, second: false }, policy: "keep", since: 1, desc: "首页-时钟显示单位" },

  // ---------- 主题与外观（用户主观选择，禁止重置） ----------
  { id: "appearance.theme",           key: "appTheme",          value: "blue",         policy: "keep", since: 1, desc: "主题风格（禁止重置）" },
  { id: "appearance.fontSize",        key: "baseFontSize",      value: 48,             policy: "keep", since: 1, desc: "首页课程字号（禁止重置）" },
  { id: "appearance.homepageTpl",     key: "homepage_template", value: "default",      policy: "keep", since: 1, desc: "首页模板（禁止重置）" },
  { id: "appearance.weekviewTpl",     key: "weekview_template", value: "minimal-char", policy: "keep", since: 1, desc: "周视图模板（禁止重置）" },
  { id: "appearance.hideWeekend",     key: "hideWeekend",       value: true,           policy: "keep", since: 1, desc: "是否隐藏周末" },

  // ---------- 功能开关 ----------
  { id: "remind.enabled",             key: "remindSettings",    field: "enabled", value: true, policy: "keep", since: 1, desc: "上课提醒总开关" },
  { id: "remind.minutes",             key: "remindSettings",    field: "minutes", value: 5,    policy: "keep", since: 1, desc: "提前提醒分钟数" },
  { id: "vibration.style",            key: "vibrationStyle",    value: "short",        policy: "keep", since: 1, desc: "震动样式" },
  { id: "defaultHomepage",            key: "defaultHomepage",   value: { targetPage: "index", autoSeconds: 3 }, policy: "keep", since: 1, desc: "开机默认进入页面" },
  { id: "backgroundRunning",          key: "background_running_config", value: { enabled: false }, policy: "keep", since: 1, desc: "后台运行配置" },

  // 每张课程表的假期提醒：懒读型，读不到即用默认值。
  // 「新建课程表默认开启」即由此保证 —— 新建时 storage 里没有该 key，自然落到默认值。
  // since 保持 1：本项靠读取兜底生效，不依赖迁移写盘。
  { id: "holiday.perSchedule",        key: "holidayReminderEnabled_{i}", value: true, policy: "keep", since: 1,
    lazy: true, dynamicKey: true, desc: "每张课程表的假期提醒（新建课程表默认开启）" },

  // ---------- 个性化数据（绝对禁止重置） ----------
  { id: "profile.nickname",           key: "userNickname",      policy: "keep", since: 1, dynamic: true, desc: "用户昵称（随机生成后固化，禁止重置）" },
  { id: "homepage.customContent",     key: "homepage_settings", field: "customContent", policy: "keep", since: 1, dynamic: true, desc: "自定义文案（随机生成后固化）" },
  { id: "pinned.pages",               key: "pinned_pages",      value: [], policy: "keep", since: 1, desc: "钉首页列表（禁止重置）" },

  // ---------- 数据层（登记在此仅为「一处可查」，不作为开关迁移） ----------
  { id: "data.scheduleNames",         key: "scheduleNames",         value: ["课程表1"], policy: "keep", since: 1, desc: "课程表名称列表" },
  { id: "data.currentScheduleIndex",  key: "currentScheduleIndex",  value: 0,           policy: "keep", since: 1, desc: "当前选中的课程表索引" }
]

function findItem(id) {
  for (var i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].id === id) return ITEMS[i]
  }
  return null
}

// 对象/数组型默认值必须返回副本 —— 调用方（页面）会就地修改自己拿到的对象，
// 若直接返回表内引用，用户点一下开关就会污染这张配置表全局生效。
function cloneValue(v) {
  if (v === null || v === undefined) return v
  if (typeof v !== "object") return v
  try {
    return JSON.parse(JSON.stringify(v))
  } catch (e) {
    return v
  }
}

// 取某条目的默认值（对象/数组自动返回副本）
function get(id) {
  var it = findItem(id)
  if (!it) return undefined
  return cloneValue(it.value)
}

// 取某个 storage key 下的全部条目
function itemsForKey(key) {
  var out = []
  for (var i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].key === key) out.push(ITEMS[i])
  }
  return out
}

// 构建某个对象型配置的默认值对象（不含 dynamic 字段 —— 那类值需由调用方随机生成）
function buildObjectDefaults(key) {
  var items = itemsForKey(key)
  var obj = {}
  for (var i = 0; i < items.length; i++) {
    var it = items[i]
    if (it.field !== undefined && !it.dynamic) {
      obj[it.field] = cloneValue(it.value)
    }
  }
  return obj
}

module.exports = {
  CURRENT_VERSION: CURRENT_VERSION,
  ITEMS: ITEMS,
  findItem: findItem,
  get: get,
  itemsForKey: itemsForKey,
  buildObjectDefaults: buildObjectDefaults
}
