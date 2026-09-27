#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把「胶囊屏弹窗几何」在所有定义处统一成同一组值，从根上消除"级联顺序决定结果"的不确定性。

背景（2026-09-27 实测）：
  同一文件里存在两个 capsule @media 块（原有的 + 后追加的），两处都写了
  `.overlay-modal { padding }` / `.modal-card { width }`，实测**谁生效并不稳定**
  （settings 用了旧 90%，backup-restore 用了新 100%）→ 唯一稳的办法是"所有定义写成同一个值"。

统一后的几何（与屏幕宽度无关，天然左右等距）：
  遮罩左右 padding = 16px；卡片 width = 100%（不用百分比、不用 max-width）
  ⇒ 左 = 16；卡片宽 = 100%（= 屏宽 − 32）；右 = 屏宽 − 16 − (屏宽 − 32) = 16 ✅
"""
import re
import sys

FILES = [
    'src/pages/settings/settings.ux',
    'src/pages/backup-restore/backup-restore.ux',
    'src/pages/homepage-settings/homepage-settings.ux',
    'src/pages/schedule-manager/schedule-manager.ux',
    'src/pages/reset-data/reset-data.ux',
    'src/components/premium-overlay.ux',
    'src/components/unlock-dialog.ux',
]

CAPSULE = re.compile(r'@media\s*\(shape:\s*capsule\)\s*,\s*\(shape:\s*pill-shaped\)\s*\{')

PAD_TARGET = '40px 16px;'


def capsule_spans(css):
    """返回每个 capsule @media 块的 (start, end) 字符区间（含花括号内容）"""
    spans = []
    for m in CAPSULE.finditer(css):
        i = m.end() - 1          # '{' 位置
        depth = 0
        for j in range(i, len(css)):
            if css[j] == '{':
                depth += 1
            elif css[j] == '}':
                depth -= 1
                if depth == 0:
                    spans.append((i + 1, j))
                    break
    return spans


def fix_block(block, stats, name):
    # 1) .overlay-modal / .dialog-overlay 的 padding → 统一 40px 16px
    def fix_pad(m):
        sel, body, tail = m.group(1), m.group(2), m.group(3)
        if 'padding:' in body:
            new = re.sub(r'padding:\s*[^;]+;', 'padding: ' + PAD_TARGET, body)
        else:
            new = body.rstrip() + '\n    padding: ' + PAD_TARGET + '\n  '
        if new != body:
            stats.append(f"{name}: {sel.strip()} padding -> {PAD_TARGET}")
        return sel + new + tail

    block = re.sub(
        r'(\.(?:overlay-modal|dialog-overlay)\s*\{)([^}]*)(\})', fix_pad, block
    )

    # 2) .modal-card / .dialog-card 的 width → 100%（并删掉 max-width）
    def fix_w(m):
        sel, body, tail = m.group(1), m.group(2), m.group(3)
        new = re.sub(r'width:\s*[^;]+;', 'width: 100%;', body)
        new = re.sub(r'\n\s*max-width:\s*[^;]+;', '', new)
        if new != body:
            stats.append(f"{name}: {sel.strip()} width -> 100% (max-width removed)")
        return sel + new + tail

    block = re.sub(r'(\.(?:modal-card|dialog-card)\s*\{)([^}]*)(\})', fix_w, block)
    return block


total = []
for f in FILES:
    try:
        src = open(f, encoding='utf-8').read()
    except FileNotFoundError:
        print('跳过（不存在）:', f)
        continue
    spans = capsule_spans(src)
    if not spans:
        print('警告：%s 没有 capsule 块' % f)
        continue
    out = src
    # 从后往前改，避免偏移
    for start, end in reversed(spans):
        stats = []
        fixed = fix_block(out[start:end], stats, f.split('/')[-1])
        out = out[:start] + fixed + out[end:]
        total += stats
    if out != src:
        open(f, 'w', encoding='utf-8').write(out)

print('共修改 %d 处声明：' % len(total))
for line in total:
    print('  -', line)
