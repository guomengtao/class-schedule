#!/usr/bin/env python3
"""Replace all .back-btn and .expand-arrow CSS with PNG versions, and
add iconTheme JS support to all remaining unconverted pages."""
import re, os

PROJECT_ROOT = '/Users/Banner/Documents/guomengtao/tom/class/class'
PAGES = os.path.join(PROJECT_ROOT, 'src', 'pages')

log = []

def p(msg):
    log.append(msg)

# List of pages to process (those that still have text-based icons)
# These are all pages found by the grep search
pages_to_fix = [
    'reset-data/reset-data.ux',
    'vibration-lab-v2/vibration-lab-v2.ux',
    'course-manager-v2/course-manager-v2.ux',
    'pinned-pages/pinned-pages.ux',
    'bs-demo1/bs-demo1.ux',
    'template-picker/template-picker.ux',
    'qrcode-generator/qrcode-generator.ux',
    'test-area-v2/test-area-v2.ux',
    'course-manager/course-manager.ux',
    'black-screen-check/black-screen-check.ux',
    'chinese-input/chinese-input.ux',
    'countdown-manage/countdown-manage.ux',
    'device-info/device-info.ux',
    'vibration-lab/vibration-lab.ux',
    'activation/activation.ux',
    'schedule-qrcode/schedule-qrcode.ux',
    'backup-restore/backup-restore.ux',
    'bs-demo2/bs-demo2.ux',
    'bs-demo5/bs-demo5.ux',
    'homepage-settings/homepage-settings.ux',
    'bs-demo3/bs-demo3.ux',
    'donate/donate.ux',
    'bs-demo4/bs-demo4.ux',
    'statistics/statistics.ux',
    'add-course/add-course.ux',
    'lab-edit-course/lab-edit-course.ux',
    'lab-add-course/lab-add-course.ux',
    'week-view/week-view.ux',
    'header-demo1/header-demo1.ux',
    'header-demo2/header-demo2.ux',
    'detail/detail.ux',
    'settings/settings.ux',
    'schedule-manager/schedule-manager.ux',
    'custom-content-edit/custom-content-edit.ux',
]

def add_js_support(s, name):
    """Add iconTheme + updateIconSrc if not present."""
    if 'updateIconSrc' in s:
        return s
    
    # Add iconTheme to data/private
    if 'private:' in s:
        s = s.replace('private: {', 'private: {\n    iconTheme: "dark",', 1)
    elif 'data:' in s:
        s = s.replace('data: {', 'data: {\n    iconTheme: "dark",', 1)
    
    # Add updateIconSrc function
    uf = ',\n\n  updateIconSrc: function(themeName) {\n    this.iconTheme = (themeName === "light" || themeName === "warm") ? "light" : "dark"\n  }'
    
    # Find the last function before closing } of export default
    # Insert before the last closing }
    if 'updateIconSrc' not in s:
        # Insert before the last } at the same level (export default closing)
        # Look for the pattern: function/method definition followed by closing }
        s = re.sub(
            r'(\n  (?:onDestroy|onHide|goBack|pinToHome|loadData|updateClock|check\w+)\([^)]*\)\s*\{[^}]*\})\n}',
            r'\1' + uf + r'\n}',
            s
        )
    
    # Update store.getTheme to pass themeName
    s = re.sub(
        r'(store\.getTheme\(function\(t)\)',
        r'\1, themeName)',
        s
    )
    
    # Add updateIconSrc call inside getTheme callback
    # Pattern: store.getTheme(function(t, themeName) {\n      self.theme = t\n    })
    s = re.sub(
        r'(store\.getTheme\(function\(t, themeName\)\s*\{\s*\n\s*self\.theme = t)',
        r'\1\n      self.updateIconSrc(themeName)',
        s
    )
    
    return s

def process_page(rel_path):
    fp = os.path.join(PAGES, rel_path)
    if not os.path.exists(fp):
        p(f'MISSING: {rel_path}')
        return
    
    s = open(fp, encoding='utf-8').read()
    orig = s
    name = rel_path.split('/')[-1].replace('.ux', '')
    
    # Calculate relative path to common/icons
    depth = rel_path.count('/')
    prefix = '/'.join(['..'] * depth) + '/common/icons'
    
    # --- Replace back-btn text ---
    s = re.sub(
        r'<text class="back-btn" onclick="goBack" style="[^"]*">◀</text>',
        f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{prefix}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>',
        s
    )
    
    # --- Replace back-btn input ---
    s = re.sub(
        r'<input\s+class="back-btn"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>',
        f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{prefix}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>',
        s
    )
    
    # --- Replace header-back input ---
    s = re.sub(
        r'<input\s+class="header-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>',
        f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{prefix}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>',
        s
    )
    
    # --- Replace wv-back input ---
    s = re.sub(
        r'<input\s+class="wv-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>',
        f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{prefix}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>',
        s
    )
    
    # --- Replace swipe arrows ---
    s = re.sub(
        r'<input\s+class="swipe-arrow"\s+type="button"\s+value="◀"\s+onclick="swipePrev"[^>]*/?>',
        f'<image class="swipe-arrow-left" src="{prefix}/{{{{ iconTheme }}}}/icon_arrow_left.png" onclick="swipePrev"></image>',
        s
    )
    s = re.sub(
        r'<input\s+class="swipe-arrow"\s+type="button"\s+value="▶"\s+onclick="swipeNext"[^>]*/?>',
        f'<image class="swipe-arrow-right" src="{prefix}/{{{{ iconTheme }}}}/icon_arrow_right.png" onclick="swipeNext"></image>',
        s
    )
    
    # --- Replace arrow-btn (lab-edit-course, lab-add-course) ---
    s = re.sub(
        r'<input\s+class="arrow-btn"\s+type="button"\s+value="◀"\s+onclick="swipePrev"[^>]*/?>',
        f'<image class="swipe-arrow-left" src="{prefix}/{{{{ iconTheme }}}}/icon_arrow_left.png" onclick="swipePrev"></image>',
        s
    )
    s = re.sub(
        r'<input\s+class="arrow-btn"\s+type="button"\s+value="▶"\s+onclick="swipeNext"[^>]*/?>',
        f'<image class="swipe-arrow-right" src="{prefix}/{{{{ iconTheme }}}}/icon_arrow_right.png" onclick="swipeNext"></image>',
        s
    )
    
    # --- Replace chevron › ---
    s = re.sub(
        r'<text class="(arrow|card-arrow|input-arrow)" style="[^"]*">\s*›\s*</text>',
        f'<image class="\\1-img" src="{prefix}/{{{{ iconTheme }}}}/icon_chevron_right.png"></image>',
        s
    )
    
    # --- Replace chevron v ---
    s = re.sub(
        r'<text class="arrow" style="[^"]*">\s*v\s*</text>',
        f'<image class="arrow-img" src="{prefix}/{{{{ iconTheme }}}}/icon_chevron_down.png"></image>',
        s
    )
    
    # --- Replace dynamic chevron v/› ---
    s = re.sub(
        r'<text class="arrow" style="[^"]*">\{\{\s*(\w+)\s*\?\s*[\'"]\'?v\'?[\'"]\s*:\s*[\'"]\'?›\'?[\'"]\s*\}\}</text>',
        f'<image class="arrow-img" src="{prefix}/{{{{ iconTheme }}}}/{{{{ \\1 ? "icon_chevron_down.png" : "icon_chevron_right.png" }}}}"></image>',
        s
    )
    
    # --- Replace expand arrow ternary ---
    s = re.sub(
        r'<text class="(expand-arrow|item-arrow)"[^>]*>\{\{\s*(\w+)\s*\?\s*[\'"]▲[\'"]\s*:\s*[\'"]▼[\'"]\s*\}\}</text>',
        f'<image class="\\1-img" src="{prefix}/{{{{ iconTheme }}}}/{{{{ \\2 ? "icon_chevron_up.png" : "icon_chevron_down.png" }}}}"></image>',
        s
    )
    
    # --- Replace ▼ step arrows ---
    s = re.sub(
        r'<div class="step-arrow"[^>]*><text>▼</text></div>',
        f'<image class="step-arrow-img" src="{prefix}/{{{{ iconTheme }}}}/icon_chevron_down.png"></image>',
        s
    )
    
    # --- Replace ⇄ swap ---
    s = re.sub(
        r'<text class="week-text" style="([^"]*)">⇄\s+(\{\{[^}]+\}\})</text>',
        f'<image class="week-swap-icon" src="{prefix}/{{{{ iconTheme }}}}/icon_swap.png"></image>\n        <text class="week-text" style="\\1">\\2</text>',
        s
    )
    
    # === CSS REPLACEMENTS ===
    
    # .back-btn CSS -> .back-btn-wrapper + .back-btn-icon
    s = re.sub(
        r'\.back-btn\s*\{[^}]*\}',
        '.back-btn-wrapper {\n  width: 48px;\n  height: 40px;\n  border-radius: 8px;\n  justify-content: center;\n  align-items: center;\n  flex-shrink: 0;\n}\n.back-btn-icon {\n  width: 24px;\n  height: 24px;\n}',
        s
    )
    
    # .header-back CSS
    s = re.sub(
        r'\.header-back\s*\{[^}]*\}',
        '.back-btn-wrapper {\n  width: 48px;\n  height: 40px;\n  border-radius: 8px;\n  justify-content: center;\n  align-items: center;\n  flex-shrink: 0;\n}\n.back-btn-icon {\n  width: 24px;\n  height: 24px;\n}',
        s
    )
    
    # .wv-back CSS
    s = re.sub(
        r'\.wv-back\s*\{[^}]*\}',
        '.back-btn-wrapper {\n  width: 48px;\n  height: 40px;\n  border-radius: 8px;\n  justify-content: center;\n  align-items: center;\n  flex-shrink: 0;\n}\n.back-btn-icon {\n  width: 24px;\n  height: 24px;\n}',
        s
    )
    
    # .swipe-arrow CSS
    s = re.sub(
        r'\.swipe-arrow\s*\{[^}]*\}',
        '.swipe-arrow-left {\n  width: 32px;\n  height: 32px;\n}\n.swipe-arrow-right {\n  width: 32px;\n  height: 32px;\n}',
        s
    )
    
    # .arrow-btn CSS
    s = re.sub(
        r'\.arrow-btn\s*\{[^}]*\}',
        '.swipe-arrow-left {\n  width: 32px;\n  height: 32px;\n}\n.swipe-arrow-right {\n  width: 32px;\n  height: 32px;\n}',
        s
    )
    
    # .arrow CSS
    s = re.sub(
        r'\.arrow\s*\{[^}]*\}',
        '.arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        s
    )
    
    # .card-arrow CSS
    s = re.sub(
        r'\.card-arrow\s*\{[^}]*\}',
        '.card-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 8px;\n}',
        s
    )
    
    # .input-arrow CSS
    s = re.sub(
        r'\.input-arrow\s*\{[^}]*\}',
        '.input-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 8px;\n}',
        s
    )
    
    # .expand-arrow CSS
    s = re.sub(
        r'\.expand-arrow\s*\{[^}]*\}',
        '.expand-arrow-img {\n  width: 20px;\n  height: 20px;\n  margin-left: 8px;\n}',
        s
    )
    
    # .item-arrow CSS
    s = re.sub(
        r'\.item-arrow\s*\{[^}]*\}',
        '.item-arrow-img {\n  width: 20px;\n  height: 20px;\n  margin-left: 8px;\n}',
        s
    )
    
    # .step-arrow CSS
    s = re.sub(
        r'\.step-arrow\s*\{[^}]*\}',
        '.step-arrow-img {\n  width: 16px;\n  height: 16px;\n}',
        s
    )
    
    if s != orig:
        s = add_js_support(s, name)
        open(fp, 'w', encoding='utf-8').write(s)
        p(f'CONVERTED: {rel_path}')
        return True
    else:
        p(f'NO CHANGE: {rel_path}')
        return False

def main():
    p('=== Comprehensive Icon Conversion ===')
    converted = 0
    for pg in pages_to_fix:
        if process_page(pg):
            converted += 1
    p(f'\nTotal: {converted} pages converted')
    p('Done!')

if __name__ == '__main__':
    main()

with open(os.path.join(PROJECT_ROOT, 'scripts', 'conv_log.txt'), 'w') as f:
    f.write('\n'.join(log))