#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修掉胶囊屏解锁弹窗的两处内容缺陷（2026-09-27 实测）：

1. 「✓ 数据备份与恢复」被截断成「✓ 数据备份与…」
   原因：卡片内宽 = 160 − 2×10(padding) = 140px，「✓ 」占约 36px，余 104px 只够 5.7 字
   修法：benefit-item 字号 18→17px、卡片左右 padding 10→8px ⇒ 内宽 144px，文本约 136px，留 8px 余量
2. 说明文字末字被吃掉（如「一次性解锁，永久使用全部高级功能」少了「功能」）
   原因：.modal-desc 上写了 `lines: 2`，而 17 字按约 7 字/行需要 3 行
   修法：.modal-desc 统一 `lines: 4`（约 32 字容量，覆盖现有最长文案 27 字）

只改胶囊屏 @media 块内的规则，其它屏型不动。
"""
import re

FILES = [
    'src/pages/homepage-settings/homepage-settings.ux',
    'src/pages/backup-restore/backup-restore.ux',
    'src/pages/reset-data/reset-data.ux',
    'src/pages/schedule-manager/schedule-manager.ux',
    'src/pages/settings/settings.ux',
    'src/components/premium-overlay.ux',
]

CAPSULE = re.compile(r'@media\s*\(shape:\s*capsule\)\s*,\s*\(shape:\s*pill-shaped\)\s*\{')


def capsule_spans(css):
    spans = []
    for m in CAPSULE.finditer(css):
        i = m.end() - 1
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


def set_prop(body, prop, value):
    """在规则体里设置某属性（存在则替换，不存在则在末尾插入）"""
    pat = re.compile(r'(\n\s*)' + prop + r':\s*[^;]+;')
    if pat.search(body):
        return pat.sub(lambda m: m.group(1) + prop + ': ' + value + ';', body, count=1)
    return body.rstrip() + '\n    ' + prop + ': ' + value + ';' + '\n  '


def fix(block, stats, name):
    # 1) .benefit-item 字号/行高
    def f_item(m):
        body = set_prop(m.group(2), 'font-size', '17px')
        body = set_prop(body, 'line-height', '24px')
        if body != m.group(2):
            stats.append(name + ': .benefit-item → 17px/24px')
        return m.group(1) + body + m.group(3)

    block = re.sub(r'(\.benefit-item\s*\{)([^}]*)(\})', f_item, block)

    # 2) .modal-card 左右 padding 收紧到 8px
    def f_card(m):
        body = m.group(2)
        new = re.sub(r'padding:\s*14px 10px;', 'padding: 14px 8px;', body)
        if new != body:
            stats.append(name + ': .modal-card padding → 14px 8px')
        return m.group(1) + new + m.group(3)

    block = re.sub(r'(\.modal-card\s*\{)([^}]*)(\})', f_card, block)

    # 3) .modal-desc 允许 4 行
    def f_desc(m):
        body = set_prop(m.group(2), 'lines', '4')
        if body != m.group(2):
            stats.append(name + ': .modal-desc lines → 4')
        return m.group(1) + body + m.group(3)

    block = re.sub(r'(\.modal-desc\s*\{)([^}]*)(\})', f_desc, block)
    return block


total = []
for f in FILES:
    src = open(f, encoding='utf-8').read()
    out = src
    for start, end in reversed(capsule_spans(src)):
        stats = []
        fixed = fix(out[start:end], stats, f.split('/')[-1])
        out = out[:start] + fixed + out[end:]
        total += stats
    if out != src:
        open(f, 'w', encoding='utf-8').write(out)

print('共修改 %d 处：' % len(total))
for line in total:
    print('  -', line)
