#!/usr/bin/env python3
"""Batch convert text icons to PNG - all changes logged to file."""
import re, os, sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(PROJECT_ROOT, 'src', 'pages')
LOGFILE = os.path.join(PROJECT_ROOT, 'scripts', 'convert_log.txt')

log_lines = []

def log(msg):
    log_lines.append(msg)
    print(msg)

def rel_icons(fp):
    d = os.path.relpath(os.path.join(PROJECT_ROOT, 'src', 'common', 'icons'), os.path.dirname(fp))
    return d

def has_icon_theme(s):
    return 'updateIconSrc' in s or 'iconTheme' in s

def add_icon_theme_js(s):
    if has_icon_theme(s):
        return s
    # add data field
    if 'data:' in s:
        s = s.replace('data: {', 'data: {\n    iconTheme: "dark",', 1)
    else:
        if '<script>' in s:
            s = s.replace('<script>', '<script>\n  data: {\n    iconTheme: "dark",\n  },', 1)
    
    # add updateIconSrc if not present
    if 'updateIconSrc' not in s:
        uf = '\n  updateIconSrc: function(themeName) {\n    this.iconTheme = (themeName === "light" || themeName === "warm") ? "light" : "dark"\n  },'
        # try to insert before onInit
        s = re.sub(r'(\n\s*(onInit|onShow)\s*[:(])', uf + r'\n\1', s, count=1)
    
    # add theme init
    if 'store.getTheme' not in s and 'var self' not in s:
        s = re.sub(
            r'(onInit\s*[:(][^)]*\)\s*\{)',
            r'\1\n      var self = this\n      store.getTheme(function(t, themeName) {\n        self.theme = t\n        self.updateIconSrc(themeName)\n      })',
            s
        )
        s = re.sub(
            r'(onShow\s*[:(][^)]*\)\s*\{)',
            r'\1\n      var self = this\n      store.getTheme(function(t, themeName) {\n        self.updateIconSrc(themeName)\n      })',
            s
        )
    return s

def process_file(fp):
    s = open(fp, encoding='utf-8').read()
    orig = s
    name = os.path.splitext(os.path.basename(fp))[0]
    ip = rel_icons(fp)
    changed = False
    
    # --- BACK TEXT ---
    # <text class="back-btn" onclick="goBack" style="...">◀</text>
    p = r'<text class="back-btn" onclick="goBack" style="([^"]*)">◀</text>'
    if re.search(p, s):
        def r1(m):
            st = m.group(1)
            bgm = re.search(r'background-color:\s*(\{\{[^}]+\}\})', st)
            bg = bgm.group(1) if bgm else '{{ theme.card }}'
            return f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {bg}">\n        <image class="back-btn-icon" src="{ip}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>'
        s, n = re.subn(p, r1, s)
        if n: log(f'  [{name}] back text: {n}'); changed = True
    
    # --- BACK INPUT ---
    # <input class="back-btn" type="button" value="◀" .../>
    p2 = r'<input\s+class="back-btn"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    if re.search(p2, s):
        s, n = re.subn(p2, f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{ip}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>', s)
        if n: log(f'  [{name}] back input: {n}'); changed = True
    
    # --- HEADER BACK ---
    p3 = r'<input\s+class="header-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    if re.search(p3, s):
        s, n = re.subn(p3, f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{ip}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>', s)
        if n: log(f'  [{name}] header-back: {n}'); changed = True
    
    # --- WV-BACK ---
    p4 = r'<input\s+class="wv-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    if re.search(p4, s):
        s, n = re.subn(p4, f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{ip}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>', s)
        if n: log(f'  [{name}] wv-back: {n}'); changed = True
    
    # --- SWIPE ARROWS ---
    p5 = r'<input\s+class="swipe-arrow"\s+type="button"\s+value="◀"\s+onclick="swipePrev"[^>]*/?>'
    if re.search(p5, s):
        s, n = re.subn(p5, f'<image class="swipe-arrow-left" src="{ip}/{{{{ iconTheme }}}}/icon_arrow_left.png" onclick="swipePrev"></image>', s)
        if n: log(f'  [{name}] swipe-left: {n}'); changed = True
    
    p6 = r'<input\s+class="swipe-arrow"\s+type="button"\s+value="▶"\s+onclick="swipeNext"[^>]*/?>'
    if re.search(p6, s):
        s, n = re.subn(p6, f'<image class="swipe-arrow-right" src="{ip}/{{{{ iconTheme }}}}/icon_arrow_right.png" onclick="swipeNext"></image>', s)
        if n: log(f'  [{name}] swipe-right: {n}'); changed = True
    
    # --- ARROW BTN (lab-edit-course, lab-add-course) ---
    p7a = r'<input\s+class="arrow-btn"\s+type="button"\s+value="◀"\s+onclick="swipePrev"[^>]*/?>'
    if re.search(p7a, s):
        s, n = re.subn(p7a, f'<image class="swipe-arrow-left" src="{ip}/{{{{ iconTheme }}}}/icon_arrow_left.png" onclick="swipePrev"></image>', s)
        if n: log(f'  [{name}] arrow-btn left: {n}'); changed = True
    
    p7b = r'<input\s+class="arrow-btn"\s+type="button"\s+value="▶"\s+onclick="swipeNext"[^>]*/?>'
    if re.search(p7b, s):
        s, n = re.subn(p7b, f'<image class="swipe-arrow-right" src="{ip}/{{{{ iconTheme }}}}/icon_arrow_right.png" onclick="swipeNext"></image>', s)
        if n: log(f'  [{name}] arrow-btn right: {n}'); changed = True
    
    # --- CHEVRON › ---
    cp = r'<text class="(arrow|card-arrow|input-arrow)" style="([^"]*)">\s*›\s*</text>'
    def cr(m):
        cls = m.group(1)
        st = m.group(2)
        return f'<image class="{cls}-img" src="{ip}/{{{{ iconTheme }}}}/icon_chevron_right.png" style="{st}"></image>'
    if re.search(cp, s):
        s, n = re.subn(cp, cr, s)
        if n: log(f'  [{name}] chevron: {n}'); changed = True
    
    # --- CHEVRON DOWN v (static) ---
    cpv = r'<text class="(arrow)" style="([^"]*)">\s*v\s*</text>'
    def cvr(m):
        cls = m.group(1)
        st = m.group(2)
        return f'<image class="{cls}-img" src="{ip}/{{{{ iconTheme }}}}/icon_chevron_down.png" style="{st}"></image>'
    if re.search(cpv, s):
        s, n = re.subn(cpv, cvr, s)
        if n: log(f'  [{name}] chevron-down: {n}'); changed = True
    
    # --- EXPAND ▼ static ---
    ept = r'<text class="(step-arrow)"[^>]*><text>▼</text></text>'
    if re.search(ept, s):
        s = re.sub(ept, f'<image class="step-arrow-img" src="{ip}/{{{{ iconTheme }}}}/icon_chevron_down.png"></image>', s)
        log(f'  [{name}] step-arrow: replaced'); changed = True
    
    # --- EXPAND ▲▼ (ternary) ---
    # First, find <text class="expand-arrow" ...>{{ expanded ? '▲' : '▼' }}</text>
    expt = r'<text class="(expand-arrow|item-arrow)"[^>]*>\{\{\s*(\w+)\s*\?\s*[\'"]▲[\'"]\s*:\s*[\'"]▼[\'"]\s*\}\}</text>'
    def exr(m):
        cls = m.group(1)
        var = m.group(2)
        return f'<image class="{cls}-img" src="{ip}/{{{{ iconTheme }}}}/{{{{ {var} ? "icon_chevron_up.png" : "icon_chevron_down.png" }}}}"></image>'
    if re.search(expt, s):
        s, n = re.subn(expt, exr, s)
        if n: log(f'  [{name}] expand-ternary: {n}'); changed = True
    
    # --- SWAP ⇄ ---
    swp = r'<text class="week-text" style="([^"]*)">⇄\s+(\{\{[^}]+\}\})</text>'
    def swr(m):
        st = m.group(1)
        nm = m.group(2)
        return f'<image class="week-swap-icon" src="{ip}/{{{{ iconTheme }}}}/icon_swap.png"></image>\n        <text class="week-text" style="{st}">{nm}</text>'
    if re.search(swp, s):
        s, n = re.subn(swp, swr, s)
        if n: log(f'  [{name}] swap: {n}'); changed = True
    
    # --- CSS: .back-btn → .back-btn-wrapper + .back-btn-icon ---
    cssb = r'\.back-btn\s*\{[^}]*\}'
    if re.search(cssb, s):
        s = re.sub(cssb, '.back-btn-wrapper {\n  width: 48px;\n  height: 40px;\n  border-radius: 8px;\n  justify-content: center;\n  align-items: center;\n}\n.back-btn-icon {\n  width: 24px;\n  height: 24px;\n}', s)
        log(f'  [{name}] CSS .back-btn replaced'); changed = True
    
    # --- CSS: .swipe-arrow → .swipe-arrow-left + .swipe-arrow-right ---
    csss = r'\.swipe-arrow\s*\{[^}]*\}'
    if re.search(csss, s):
        s = re.sub(csss, '.swipe-arrow-left {\n  width: 32px;\n  height: 32px;\n}\n.swipe-arrow-right {\n  width: 32px;\n  height: 32px;\n}', s)
        log(f'  [{name}] CSS .swipe-arrow replaced'); changed = True
    
    # --- CSS: .arrow-btn → same ---
    cssab = r'\.arrow-btn\s*\{[^}]*\}'
    if re.search(cssab, s):
        s = re.sub(cssab, '.swipe-arrow-left {\n  width: 32px;\n  height: 32px;\n}\n.swipe-arrow-right {\n  width: 32px;\n  height: 32px;\n}', s)
        log(f'  [{name}] CSS .arrow-btn replaced'); changed = True
    
    # --- CSS: .arrow → .arrow-img ---
    cssa = r'\.arrow\s*\{[^}]*\}'
    if re.search(cssa, s):
        s = re.sub(cssa, '.arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}', s)
        log(f'  [{name}] CSS .arrow replaced'); changed = True
    
    if changed:
        s = add_icon_theme_js(s)
        open(fp, 'w', encoding='utf-8').write(s)
    
    return changed

def main():
    log('=== Batch Icon Conversion ===')
    pages = []
    for root, dirs, files in os.walk(PAGES_DIR):
        for f in files:
            if f.endswith('.ux') and f not in ('index.ux',):
                pages.append(os.path.join(root, f))
    
    total = 0
    for fp in sorted(pages):
        if process_file(fp):
            total += 1
    
    log(f'\nTotal pages converted: {total}')
    log('Done!')
    with open(LOGFILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(log_lines))

if __name__ == '__main__':
    main()