#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI 尺度三维审计（规则 §八 / trae-global-rules.md 8.3）

三维度：
  1. 字号  font-size < 18px            —— 硬指标，可判定，退出码 1
  2. 热区  可点元素宽或高 < 44px        —— 硬指标，可判定，退出码 1
  3. 余量  定宽子元素合计 > 168px 的横向行 —— 仅出复核清单，不判定
  4. 留白  行高比 < 1.35 的正文类 / 条目间距 < 8px —— 可判定（间距不会被子元素压缩）

维度 3 为什么只做清单：flex-shrink 会压缩定宽子元素，静态解析分不出「真溢出」
与「被压缩」，实测 4 处命中全为等分/居中行假阳性（detail 的 7×48 七日条、
activation 的 3×75 键盘行）。**留白这一维无法静态验收，只能靠运行时截图人工看**，
详见 trae-global-rules.md §8.5。

用法:
  python3 scripts/audit-hitbox.py                # 全跑（留白只报不拦）
  python3 scripts/audit-hitbox.py --strict       # 留白也计入退出码（防回归，建议提交前跑）
  python3 scripts/audit-hitbox.py --only width   # 只跑某一维（font|hitbox|width）
  python3 scripts/audit-hitbox.py --min 44 --min-font 18 --avail 168

豁免: 表盘页 watch-face-*（小字号是设计意图，不是拥挤）
注意: 必须跳过 @media 块 —— 媒体查询是特定屏型的增量覆盖，拿来判主档会误报
      （2026-10-21 首页 .day-nav-circle 主档 44 / 小屏档 36 踩过）。
"""
import json, os, re, sys

MIN_HIT = 44
MIN_FONT = 18
AVAIL = 168          # 卡片内可用横向宽度基准（192 屏 - 卡 padding）
EDGE = 4             # 余量小于此值视为「贴边」
ONLY = None
STRICT = False

args = sys.argv[1:]
for i, a in enumerate(args):
    nxt = args[i + 1] if i + 1 < len(args) else None
    if a == '--min' and nxt:
        MIN_HIT = int(nxt)
    elif a == '--min-font' and nxt:
        MIN_FONT = int(nxt)
    elif a == '--avail' and nxt:
        AVAIL = int(nxt)
    elif a == '--only' and nxt:
        ONLY = nxt
    elif a == '--strict':
        STRICT = True

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'src/manifest.json')
EXEMPT = lambda p: p.startswith('watch-face')


def strip_media(s):
    """去掉 @media 块，避免小屏档覆盖值污染主档判定。"""
    res, i, n = [], 0, len(s)
    while i < n:
        if s.startswith('@media', i):
            j = s.find('{', i)
            if j < 0:
                break
            depth, k = 1, j + 1
            while k < n and depth > 0:
                if s[k] == '{':
                    depth += 1
                elif s[k] == '}':
                    depth -= 1
                k += 1
            i = k
        else:
            res.append(s[i])
            i += 1
    return ''.join(res)


def num(pat, body):
    m = re.search(pat, body)
    return int(m.group(1)) if m else None


def parse_css(src):
    """class -> {w, h, pad, font, row}"""
    box = {}
    for m in re.finditer(r'\.([\w-]+)\s*\{([^}]*)\}', src):
        c, b = m.group(1), m.group(2)
        box[c] = {
            'w': num(r'(?<!-)width:\s*(\d+)px', b),
            'h': num(r'(?<!-)height:\s*(\d+)px', b),
            'pad': 'padding' in b,
            'font': num(r'font-size:\s*(\d+)px', b),
            'lh': num(r'line-height:\s*(\d+)px', b),
            'mb': num(r'margin-bottom:\s*(\d+)px', b),
            'row': 'flex-direction:row' in b.replace(' ', ''),
        }
    return box


# ---------- 1. 字号 ----------
def scan_font(src, box):
    hits = set()
    for c, v in box.items():
        if v['font'] is not None and v['font'] < MIN_FONT:
            hits.add('.%s(%dpx)' % (c, v['font']))
    return sorted(hits)


# ---------- 2. 热区 ----------
def scan_hitbox(src, box):
    hits = set()
    for m in re.finditer(r'<[a-z-]+[^>]*?onclick="[^"]*"[^>]*?>', src, re.S):
        cm = re.search(r'class="([^"]*)"', m.group(0))
        if not cm:
            continue
        for c in cm.group(1).split():
            if c.startswith('{') or c not in box:
                continue
            w, h = box[c]['w'], box[c]['h']
            if w is None and h is None:
                continue      # 靠内容/flex 撑开的容器不判
            if (w is not None and w < MIN_HIT) or (h is not None and h < MIN_HIT):
                hits.add('%s(%sx%s)' % (c, w if w else 'auto', h if h else 'auto'))
    return sorted(hits)


# ---------- 3. 横向余量 ----------
SELF_CLOSING = {'image', 'input', 'switch', 'slider', 'progress', 'image'}


def parse_tree(html):
    root = {'tag': 'root', 'cls': [], 'children': []}
    stack = [root]
    for m in re.finditer(r'<(/?)([a-zA-Z-]+)([^>]*?)(/?)>', html):
        closing, tag, attrs, selfc = m.groups()
        if closing:
            if len(stack) > 1:
                stack.pop()
            continue
        cm = re.search(r'class="([^"]*)"', attrs)
        cls = cm.group(1).split() if cm else []
        sm = re.search(r'style="([^"]*)"', attrs)
        node = {'tag': tag, 'cls': cls, 'style': sm.group(1) if sm else '', 'children': []}
        stack[-1]['children'].append(node)
        if not selfc and tag not in SELF_CLOSING:
            stack.append(node)
    return root


def node_w(node, box):
    """元素宽度：class 定宽，其次 inline style 里 width: Npx。解析不出返回 None。"""
    for c in node['cls']:
        if c in box and box[c]['w']:
            return box[c]['w']
    m = re.search(r'(?<!-)width:\s*(\d+)px', node.get('style', ''))
    return int(m.group(1)) if m else None


def walk(node, box, out, stat):
    cset = node['cls']
    if any(box.get(c, {}).get('row') for c in cset) and len(node['children']) >= 2:
        stat['rows'] += 1
        ws = [node_w(ch, box) for ch in node['children']]
        if all(w for w in ws):
            stat['computed'] += 1
            total = sum(ws)
            # 只列「定宽合计 > 可用宽」的行。注意：flex-shrink 会压缩，
            # 静态解析无法判断真溢出还是被压缩，故仅作人工复核清单、不判定达标。
            if total > AVAIL:
                out.append('%s [%s] 合计 %dpx / 可用 %dpx，余 %dpx'
                           % ('.'.join(cset) or node['tag'], '+'.join(str(w) for w in ws),
                              total, AVAIL, AVAIL - total))
    for ch in node['children']:
        walk(ch, box, out, stat)


def scan_width(src, box):
    out, stat = [], {'rows': 0, 'computed': 0}
    walk(parse_tree(src), box, out, stat)
    return sorted(set(out)), stat


# ---------- 4. 留白（行高比 + 条目间距）----------
# 这两项与维度 3 不同：line-height / margin 是父容器的显式值，不会被 flex-shrink
# 压缩，所以可以判定。行高比只判「可能多行的正文类」——单行标题 1.33 倍不算拥挤。
BODY = re.compile(r'(?:desc|sub|tip|hint|content|note|msg|info|bubble)$')
# 条目堆叠类：以 item/card 结尾。网格/键盘/自定义行（grid|keypad|wv-|week-|color|dot|tpl）
# 内部行距 4–6px 是紧凑布局的合理值，不算「卡片挨着卡片」。
ITEM = re.compile(r'(?:item|card)$')
GRIDISH = re.compile(r'grid|keypad|key-|wv-|week-|color|dot|tpl|cell')
# 行高比两档：<1.20 行高比字号还小，文字必然挤在一起，无条件报；
# 1.20–1.35 只报「可能多行」的正文类——单行按钮文字 1.30 倍配 44px 盒子是正常的，
# 一刀切到 1.35 会产生 27 页噪音（2026-10-21 实测），把真问题淹掉。
LH_HARD = 1.20
LH_SOFT = 1.35
MIN_ITEM_GAP = 8
# 展示型大字（≥40px，如倒计时天数 96px、进度百分比 56px）行高比字号小是
# 卡内垂直居中的常规做法，判它只会逼人改坏布局。按字号判定，不按类名。
BIGNUM = 40
# 符号类（箭头 / 图标字形）不是文字段落，行高比无意义，豁免。
ICONISH = re.compile(r'(?:arrow|icon|caret|chevron|glyph|plus|minus)$')


def scan_space(src, box):
    lh_hits, gap_hits = set(), set()
    for c, v in box.items():
        fs, lh = v['font'], v['lh']
        if fs and lh and not GRIDISH.search(c) and not ICONISH.search(c) and fs < BIGNUM:
            ratio = lh / fs
            if ratio < LH_HARD or (ratio < LH_SOFT and BODY.search(c)):
                lh_hits.add('.%s(%.2f倍 %d/%d)' % (c, ratio, lh, fs))
        if ITEM.search(c) and not GRIDISH.search(c):
            gap = v['mb']
            if gap is not None and gap < MIN_ITEM_GAP:
                gap_hits.add('.%s(%dpx)' % (c, gap))
    return sorted(lh_hits), sorted(gap_hits)


def main():
    pages = json.load(open(MANIFEST, encoding='utf-8'))['router']['pages']
    do = lambda k: ONLY in (None, k)
    hard_bad = 0
    soft_n = 0
    space_bad = 0
    rows = computed = 0
    for p in pages:
        name = p.split('/')[-1]
        if EXEMPT(name):
            continue
        f = os.path.join(ROOT, 'src', p, name + '.ux')
        if not os.path.isfile(f):
            continue
        raw = open(f, encoding='utf-8').read()
        src = strip_media(raw)
        box = parse_css(src)

        if do('font'):
            h = scan_font(src, box)
            if h:
                hard_bad += 1
                print('[字号] %-28s %s' % (name, ', '.join(h)))
        if do('hitbox'):
            h = scan_hitbox(src, box)
            if h:
                hard_bad += 1
                print('[热区] %-28s %s' % (name, ', '.join(h)))
        if do('width'):
            h, st = scan_width(src, box)
            rows += st['rows']
            computed += st['computed']
            if h:
                soft_n += 1
                print('[余量] %-28s %s' % (name, ' | '.join(h)))
        if do('space'):
            lh, gp = scan_space(src, box)
            if lh or gp:
                space_bad += 1
                msg = []
                if lh:
                    msg.append('行高 ' + ', '.join(lh))
                if gp:
                    msg.append('条目间距 ' + ', '.join(gp))
                print('[留白] %-28s %s' % (name, ' ; '.join(msg)))

    print('\n硬指标（门禁）：%d 处不达标（字号<%dpx 或 热区<%dpx）' % (hard_bad, MIN_FONT, MIN_HIT))
    if do('space'):
        print('留白（改善项，不拦提交）：%d 个页面有行高<%.2f倍 或 条目间距<%dpx'
              % (space_bad, LH_SOFT, MIN_ITEM_GAP))
    if do('width'):
        covered = (100.0 * computed / rows) if rows else 0.0
        print('复核清单：%d 个页面存在「定宽子元素合计 > %dpx」的横向行'
              '　覆盖率 %d/%d 行 = %.0f%%' % (soft_n, AVAIL, computed, rows, covered))
        print('  ⚠️ 该维度不作判定：flex-shrink 会压缩定宽子元素，'
              '静态解析分不出「真溢出」与「被压缩」。留白须靠运行时截图人工验收。')
    sys.exit(1 if (hard_bad or (STRICT and space_bad)) else 0)


if __name__ == '__main__':
    main()
