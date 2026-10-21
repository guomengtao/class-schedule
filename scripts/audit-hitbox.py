#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI 尺度三维审计（规则 §八 / trae-global-rules.md 8.3）

三维度：
  1. 字号  font-size < 18px            —— 硬指标，可判定，退出码 1
  2. 热区  可点元素宽或高 < 44px        —— 硬指标，可判定，退出码 1
  3. 余量  定宽子元素合计 > 168px 的横向行 —— 仅出复核清单，不判定

维度 3 为什么只做清单：flex-shrink 会压缩定宽子元素，静态解析分不出「真溢出」
与「被压缩」，实测 4 处命中全为等分/居中行假阳性（detail 的 7×48 七日条、
activation 的 3×75 键盘行）。**留白这一维无法静态验收，只能靠运行时截图人工看**，
详见 trae-global-rules.md §8.5。

用法:
  python3 scripts/audit-hitbox.py                # 三维全跑
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


def main():
    pages = json.load(open(MANIFEST, encoding='utf-8'))['router']['pages']
    do = lambda k: ONLY in (None, k)
    hard_bad = 0
    soft_n = 0
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

    print('\n硬指标：%d 处不达标（字号<%dpx 或 热区<%dpx）' % (hard_bad, MIN_FONT, MIN_HIT))
    if do('width'):
        covered = (100.0 * computed / rows) if rows else 0.0
        print('复核清单：%d 个页面存在「定宽子元素合计 > %dpx」的横向行'
              '　覆盖率 %d/%d 行 = %.0f%%' % (soft_n, AVAIL, computed, rows, covered))
        print('  ⚠️ 该维度不作判定：flex-shrink 会压缩定宽子元素，'
              '静态解析分不出「真溢出」与「被压缩」。留白须靠运行时截图人工验收。')
    sys.exit(1 if hard_bad else 0)


if __name__ == '__main__':
    main()
