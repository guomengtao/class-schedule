# -*- coding: utf-8 -*-
"""胶囊屏「固定宽度溢出」体检（零依赖，只读源码，不改任何文件）

用途：在不装机、不看画面的前提下，先扫出"在 192px 胶囊屏上必然溢出/变形"的候选元素，
     再用模拟器截图（见 docs/Vela模拟器使用指南与测试有效性分析.md）复核。

用法：
    python3 scripts/audit-capsule-width.py [屏幕宽，默认 192]

检查项：
    1) 每个 .ux 的 @media (shape: capsule|pill-shaped) 块内：
       由 .page 的水平 padding 推出内容宽度 → 找出 width / min-width 超过内容宽度的类（必然溢出）
    2) 全局找出 >=200px 的固定 width（胶囊屏用不上的规格）——**必须人工复核**，
       因为很多会落在 @media (shape: circle|rect) 块里，或被胶囊屏块覆盖（历史假阳性见
       docs/胶囊屏页面显示问题体检（模拟器截图）.md 第五节）
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
SCREEN_W = float(sys.argv[1]) if len(sys.argv) > 1 else 192.0

CAPSULE_HEAD = re.compile(
    r'@media\s*\(shape:\s*(?:capsule|pill-shaped)\)\s*,\s*\(shape:\s*(?:capsule|pill-shaped)\)\s*\{'
    r'|@media\s*\(shape:\s*(?:capsule|pill-shaped)\)\s*\{'
)


def css_blocks(css, head_re):
    """取出 head_re 匹配到的每个 @media 块的内部文本（用大括号配平，够用且无依赖）"""
    out = []
    for m in head_re.finditer(css):
        i = m.end() - 1
        depth = 0
        for j in range(i, len(css)):
            if css[j] == '{':
                depth += 1
            elif css[j] == '}':
                depth -= 1
                if depth == 0:
                    out.append(css[i + 1:j])
                    break
    return out


def rules(block):
    """块内 (选择器, 声明) 列表"""
    return [(m.group(1).strip(), m.group(2))
            for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', block)]


def px(value):
    m = re.match(r'^\s*(-?\d+(?:\.\d+)?)px\s*$', value or '')
    return float(m.group(1)) if m else None


def dump(rel, sel, prop, raw, content):
    print('  %-50s %-26s %-16s 内容宽=%.0f' % (rel, sel[:26], '%s: %s' % (prop, raw.strip()), content))


def main():
    findings = []
    globals_wide = {}
    n = 0
    for dirpath, _dirs, files in os.walk(ROOT):
        for name in sorted(files):
            if not name.endswith('.ux'):
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, os.path.dirname(os.path.dirname(path)))
            src = open(path, encoding='utf-8').read()
            style = src.split('<style>')[-1]
            n += 1

            for blk in css_blocks(style, CAPSULE_HEAD):
                rs = rules(blk)
                hpad = 0.0
                for sel, decl in rs:
                    if 'page' not in sel:
                        continue
                    m = re.search(r'padding:\s*([^;]+)', decl)
                    if not m:
                        continue
                    parts = m.group(1).split()
                    vals = [px(p) or 0.0 for p in parts]
                    if len(vals) == 1:
                        hpad = vals[0] * 2
                    elif len(vals) == 2:
                        hpad = vals[1] * 2
                    elif len(vals) == 4:
                        hpad = vals[1] + vals[3]
                content = SCREEN_W - hpad
                for sel, decl in rs:
                    for prop in ('width', 'min-width'):
                        m = re.search(prop + r':\s*([^;]+)', decl)
                        if m:
                            v = px(m.group(1))
                            if v and v > content:
                                findings.append((rel, sel, prop, m.group(1), content))

            for m in re.finditer(r'width:\s*(\d{3,})px', style):
                v = int(m.group(1))
                if v >= 200:
                    globals_wide.setdefault((rel, v), 0)
                    globals_wide[(rel, v)] += 1

    print('屏幕宽 = %.0fpx，扫描 %d 个 .ux' % (SCREEN_W, n))
    print('--- 胶囊屏块内「width/min-width > 内容宽度」（必然溢出）---')
    if findings:
        for rel, sel, prop, raw, content in findings:
            dump(rel, sel, prop, raw, content)
    else:
        print('  （无）')
    print('--- 全局 >=200px 固定宽度（需人工复核所属媒体查询/是否被覆盖）---')
    if globals_wide:
        for (rel, v), cnt in sorted(globals_wide.items()):
            print('  %-50s width: %dpx%s' % (rel, v, '' if cnt == 1 else '  ×%d' % cnt))
    else:
        print('  （无）')


if __name__ == '__main__':
    main()
