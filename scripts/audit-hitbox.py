#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""热区审计：找出可点击元素里热区任一维度 < 44px 的（规则 §8.3）
用法: python3 scripts/audit-hitbox.py [--min 44]
输出: 按页面分组，列出「类名(宽x高)」。空输出 = 合格。
注意: 表盘页（watch-face-*）豁免；整个卡片可点的容器（宽高均 >44 或只有 padding）不报。
"""
import json, os, re, sys

MIN = 44
for i, a in enumerate(sys.argv):
    if a == '--min' and i + 1 < len(sys.argv):
        MIN = int(sys.argv[i + 1])

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'src/manifest.json')
EXEMPT = lambda p: p.startswith('watch-face')


def num(pat, body):
    m = re.search(pat, body)
    return int(m.group(1)) if m else None


def strip_media(s):
    """去掉 @media 块：媒体查询是特定屏型的增量覆盖，不该拿来判主档是否达标。
    不去掉会把「主档 44 / 小屏档 36」误报成不达标（2026-10-21 首页切天钮踩过）。"""
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


def scan(path):
    src = strip_media(open(path, encoding='utf-8').read())
    # class -> (w, h, has_padding)
    box = {}
    for m in re.finditer(r'\.([\w-]+)\s*\{([^}]*)\}', src):
        c, b = m.group(1), m.group(2)
        box[c] = (
            num(r'(?<!-)width:\s*(\d+)px', b),
            num(r'(?<!-)height:\s*(\d+)px', b),
            'padding' in b,
        )
    hits = set()
    for m in re.finditer(r'<[a-z-]+[^>]*?onclick="[^"]*"[^>]*?>', src, re.S):
        tag = m.group(0)
        cm = re.search(r'class="([^"]*)"', tag)
        if not cm:
            continue
        for c in cm.group(1).split():
            if c.startswith('{') or c not in box:
                continue
            w, h, pad = box[c]
            # 未设尺寸的容器（靠内容或 flex 撑开）不判
            if w is None and h is None:
                continue
            if (w is not None and w < MIN) or (h is not None and h < MIN):
                hits.add('%s(%sx%s)' % (c, w if w else 'auto', h if h else 'auto'))
    return sorted(hits)


def main():
    pages = json.load(open(MANIFEST, encoding='utf-8'))['router']['pages']
    bad = 0
    for p in pages:
        name = p.split('/')[-1]
        if EXEMPT(name):
            continue
        f = os.path.join(ROOT, 'src', p, name + '.ux')
        if not os.path.isfile(f):
            continue
        hits = scan(f)
        if hits:
            bad += 1
            print('%-32s %s' % (name, ', '.join(hits)))
    print('\n合计 %d 个页面热区 < %dpx' % (bad, MIN))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
