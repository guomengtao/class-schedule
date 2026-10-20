// 固定科目配色表（多彩课表 / 科目色卡共用）
// 2026-10-20 抽出共享：此前两份配色各写一份（#3 内联在 subject-color.ux、#5 用 PALETTE 按插入顺序取色），
// 切天/重载后会漂移。抽出后按科目名稳定取色，跨天、跨页同色。
//
// 约束：
//   1) 只做「科目名 → 固定色」的映射，不改调用方结构；
//   2) 未匹配科目走 FALLBACK（#7f8c8d），**禁止按插入顺序兜底**（那会随科目出现顺序变色）；
//   3) 命中用子串匹配（"体育课" → "体育"），顺序越靠前优先级越高。

var SUBJECT_COLORS = {
  "语文": "#e74c3c",
  "数学": "#3498db",
  "英语": "#9b59b6",
  "物理": "#1abc9c",
  "化学": "#f39c12",
  "生物": "#27ae60",
  "历史": "#d35400",
  "地理": "#16a085",
  "政治": "#c0392b",
  "体育": "#2ecc71",
  "音乐": "#e84393",
  "美术": "#fd79a8",
  "信息": "#0984e3",
  "通用": "#7f8c8d"
};

var FALLBACK_COLOR = "#7f8c8d";

// 子串匹配：科目名包含 key 即返回对应色；命中顺序即定义顺序
var MATCH_ORDER = Object.keys(SUBJECT_COLORS);

function getSubjectColor(name) {
  if (!name) return FALLBACK_COLOR;
  for (var i = 0; i < MATCH_ORDER.length; i++) {
    if (name.indexOf(MATCH_ORDER[i]) >= 0) return SUBJECT_COLORS[MATCH_ORDER[i]];
  }
  return FALLBACK_COLOR;
}

module.exports = {
  SUBJECT_COLORS: SUBJECT_COLORS,
  FALLBACK_COLOR: FALLBACK_COLOR,
  getSubjectColor: getSubjectColor
};
