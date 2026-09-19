#!/usr/bin/env python3
"""Batch convert text-based icon symbols to PNG dual-image pattern across all pages."""
import re
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(PROJECT_ROOT, 'src', 'pages')

stats = {'back_text': 0, 'back_input': 0, 'swipe': 0, 'chevron': 0,
         'expand': 0, 'swap': 0, 'other': 0}

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def relative_icons_path(page_path):
    """Calculate relative path from page to common/icons/"""
    page_dir = os.path.dirname(page_path)
    rel = os.path.relpath(os.path.join(PROJECT_ROOT, 'src', 'common', 'icons'), page_dir)
    return rel

def has_icon_theme_support(content):
    return 'updateIconSrc' in content or 'iconTheme' in content

def add_icon_theme_js(content, page_name):
    """Add iconTheme data + updateIconSrc + theme init to script section."""
    if has_icon_theme_support(content):
        return content

    # Add data field
    if 'data:' in content:
        # Insert after 'data: {' line
        content = re.sub(
            r'(data:\s*\{)',
            r'\1\n    iconTheme: "dark",',
            content
        )
    else:
        # Look for <script> section and add data
        content = re.sub(
            r'(<script>)',
            r'\1\n  data: {\n    iconTheme: "dark",\n  },',
            content
        )

    # Add updateIconSrc function
    update_func = '''
  updateIconSrc: function(themeName) {
    this.iconTheme = (themeName === "light" || themeName === "warm") ? "light" : "dark"
  },'''

    # Find the last function or closing of the export default block to insert before
    # Insert before the last closing } or after onInit/onShow
    if 'updateIconSrc' not in content:
        # Insert after onInit block or before methods end
        if 'onInit()' in content or 'onInit:' in content:
            # Try to insert after onInit function
            content = re.sub(
                r'(onInit[^(]*\([^)]*\)\s*\{[^}]*\})',
                r'\1' + update_func,
                content
            )
        elif 'onShow()' in content or 'onShow:' in content:
            content = re.sub(
                r'(onShow[^(]*\([^)]*\)\s*\{[^}]*\})',
                r'\1' + update_func,
                content
            )
        else:
            # Insert at start of methods if none found
            content = re.sub(
                r'(},\s*\n\s*(onInit|onShow|export\s+default))',
                update_func + r'\n  \2',
                content
            )

    # Add theme initialization in onInit and onShow
    if 'store.getTheme' not in content:
        # Find onInit and add theme loading
        init_pattern = r'(onInit\s*[:(][^)]*\)\s*\{)'
        if re.search(init_pattern, content):
            content = re.sub(
                init_pattern,
                r'\1\n      var self = this\n      store.getTheme(function(t, themeName) {\n        self.theme = t\n        self.updateIconSrc(themeName)\n      })',
                content
            )
        
        show_pattern = r'(onShow\s*[:(][^)]*\)\s*\{)'
        if re.search(show_pattern, content):
            content = re.sub(
                show_pattern,
                r'\1\n      var self = this\n      store.getTheme(function(t, themeName) {\n        self.updateIconSrc(themeName)\n      })',
                content
            )

    return content

def convert_back_text_button(content):
    """Convert <text class="back-btn" ...>◀</text> to div+image pattern."""
    pattern = r'<text class="back-btn" onclick="goBack" style="([^"]*)">◀</text>'
    def replacer(m):
        style = m.group(1)
        # Extract background-color from style
        bg_match = re.search(r'background-color:\s*(\{\{[^}]+\}\})', style)
        bg = bg_match.group(1) if bg_match else '{{ theme.card }}'
        return f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {bg}">\n        <image class="back-btn-icon" src="{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>'
    
    new_content, count = re.subn(pattern, replacer, content)
    if count:
        stats['back_text'] += count
    return new_content

def convert_back_input_button(content, page_path):
    """Convert <input class="back-btn" type="button" value="◀" ...> to div+image pattern."""
    icons_path = relative_icons_path(page_path)
    
    # Pattern for back-btn input
    pattern = r'<input\s+class="back-btn"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    repl = f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{icons_path}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>'
    
    new_content, count = re.subn(pattern, repl, content)
    if count:
        stats['back_input'] += count
    return new_content

def convert_header_back(content, page_path):
    """Convert <input class="header-back" ... value="◀" ...>"""
    icons_path = relative_icons_path(page_path)
    
    pattern = r'<input\s+class="header-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    repl = f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{icons_path}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>'
    
    new_content, count = re.subn(pattern, repl, content)
    if count:
        stats['back_input'] += count
    return new_content

def convert_wv_back(content, page_path):
    """Convert <input class="wv-back" ... value="◀" ...>"""
    icons_path = relative_icons_path(page_path)
    
    pattern = r'<input\s+class="wv-back"\s+type="button"\s+value="◀"\s+onclick="goBack"[^>]*/?>'
    repl = f'<div class="back-btn-wrapper" onclick="goBack" style="background-color: {{{{ theme.card }}}}">\n        <image class="back-btn-icon" src="{icons_path}/{{{{ iconTheme }}}}/icon_back.png"></image>\n      </div>'
    
    new_content, count = re.subn(pattern, repl, content)
    if count:
        stats['back_input'] += count
    return new_content

def convert_swipe_arrows(content, page_path):
    """Convert ◀ and ▶ swipe arrow buttons."""
    icons_path = relative_icons_path(page_path)
    
    # swipe left arrow
    pattern_l = r'<input\s+class="(?:swipe-arrow|arrow-btn)"\s+type="button"\s+value="◀"\s+onclick="swipePrev"[^>]*/?>'
    repl_l = f'<image class="swipe-arrow-img" src="{icons_path}/{{{{ iconTheme }}}}/icon_arrow_left.png" onclick="swipePrev"></image>'
    new_content, count_l = re.subn(pattern_l, repl_l, content)
    
    # swipe right arrow
    pattern_r = r'<input\s+class="(?:swipe-arrow|arrow-btn)"\s+type="button"\s+value="▶"\s+onclick="swipeNext"[^>]*/?>'
    repl_r = f'<image class="swipe-arrow-img" src="{icons_path}/{{{{ iconTheme }}}}/icon_arrow_right.png" onclick="swipeNext"></image>'
    new_content, count_r = re.subn(pattern_r, repl_r, new_content)
    
    if count_l or count_r:
        stats['swipe'] += count_l + count_r
    return new_content

def convert_schedule_swap(content, page_path):
    """Convert ⇄ schedule switcher."""
    icons_path = relative_icons_path(page_path)
    
    # week-view: <text class="week-text" ...>⇄ {{ scheduleName }}</text>
    pattern = r'<text class="week-text" style="([^"]*)">⇄\s*(\{\{[^}]+\}\})</text>'
    def replacer(m):
        style = m.group(1)
        name = m.group(2)
        return f'<image class="week-swap-icon" src="{icons_path}/{{{{ iconTheme }}}}/icon_swap.png"></image>\n        <text class="week-text" style="{style}">{name}</text>'
    
    new_content, count = re.subn(pattern, replacer, content)
    if count:
        stats['swap'] += count
    return new_content

def convert_chevron_arrows(content, page_path):
    """Convert › right chevron text to icon_chevron_right.png."""
    icons_path = relative_icons_path(page_path)
    
    # Pattern: <text class="arrow" ...>›</text> or <text class="card-arrow" ...>›</text>
    # Also: <text class="input-arrow" ...>›</text>
    pattern = r'<text class="(arrow|card-arrow|input-arrow)" style="([^"]*)">\s*›\s*</text>'
    def replacer(m):
        cls = m.group(1)
        style = m.group(2)
        return f'<image class="{cls}-img" src="{icons_path}/{{{{ iconTheme }}}}/icon_chevron_right.png" style="{style}"></image>'
    
    new_content, count = re.subn(pattern, replacer, content)
    if count:
        stats['chevron'] += count
    return new_content

def convert_expand_arrows(content, page_path):
    """Convert ▲/▼ expand/collapse text to chevron icons."""
    icons_path = relative_icons_path(page_path)
    
    # Dynamic: {{ expanded ? '▲' : '▼' }}
    pattern = r'\{\{\s*(\w+)\s*\?\s*[\'"]▲[\'"]\s*:\s*[\'"]▼[\'"]\s*\}\}'
    def replacer(m):
        var = m.group(1)
        return f'{{{{ {var} ? "icon_chevron_up.png" : "icon_chevron_down.png" }}}}'
    
    matches = re.findall(pattern, content)
    if matches:
        # Check if it's inside an <image> tag or needs wrapping
        # If inside <text class="expand-arrow" ...>{{ expanded ? '▲' : '▼' }}</text>
        # Replace with <image class="expand-arrow-img" src=".../{{ iconTheme }}/{{ expanded ? 'icon_chevron_up.png' : 'icon_chevron_down.png' }}">
        
        text_pattern = r'<text class="(expand-arrow|item-arrow)"[^>]*>\{\{\s*(\w+)\s*\?\s*[\'"]▲[\'"]\s*:\s*[\'"]▼[\'"]\s*\}\}</text>'
        def text_replacer(m):
            cls = m.group(1)
            var = m.group(2)
            return f'<image class="{cls}-img" src="{icons_path}/{{{{ iconTheme }}}}/{{{{ {var} ? "icon_chevron_up.png" : "icon_chevron_down.png" }}}}"></image>'
        
        new_content, count = re.subn(text_pattern, text_replacer, content)
        if count:
            stats['expand'] += count
        return new_content
    return content

def convert_css_back_btn(content):
    """Convert .back-btn CSS to .back-btn-wrapper + .back-btn-icon."""
    # Replace .back-btn { ... } with .back-btn-wrapper + .back-btn-icon
    pattern = r'\.back-btn\s*\{([^}]*)\}'
    def replacer(m):
        body = m.group(1)
        # Extract width and height
        w_match = re.search(r'width:\s*(\d+px)', body)
        h_match = re.search(r'height:\s*(\d+px)', body)
        w = w_match.group(1) if w_match else '48px'
        h = h_match.group(1) if h_match else '40px'
        
        return f'.back-btn-wrapper {{\n  width: {w};\n  height: {h};\n  border-radius: 8px;\n  justify-content: center;\n  align-items: center;\n}}\n.back-btn-icon {{\n  width: 24px;\n  height: 24px;\n}}'
    
    new_content, count = re.subn(pattern, replacer, content)
    return new_content

def convert_css_swipe_arrows(content):
    """Convert .swipe-arrow / .arrow-btn CSS to image-based."""
    # Replace .swipe-arrow CSS
    content = re.sub(
        r'\.swipe-arrow\s*\{([^}]*)\}',
        r'.swipe-arrow-img {\n  width: 32px;\n  height: 32px;\n}',
        content
    )
    # Replace .arrow-btn CSS
    content = re.sub(
        r'\.arrow-btn\s*\{([^}]*)\}',
        r'.swipe-arrow-img {\n  width: 32px;\n  height: 32px;\n}',
        content
    )
    return content

def convert_css_chevron_arrows(content):
    """Convert .arrow / .card-arrow CSS to image-based."""
    content = re.sub(
        r'\.arrow\s*\{([^}]*)\}',
        r'.arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        content
    )
    content = re.sub(
        r'\.card-arrow\s*\{([^}]*)\}',
        r'.card-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        content
    )
    content = re.sub(
        r'\.input-arrow\s*\{([^}]*)\}',
        r'.input-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        content
    )
    return content

def convert_css_expand_arrows(content):
    """Convert .expand-arrow / .item-arrow CSS to image-based."""
    content = re.sub(
        r'\.expand-arrow\s*\{([^}]*)\}',
        r'.expand-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        content
    )
    content = re.sub(
        r'\.item-arrow\s*\{([^}]*)\}',
        r'.item-arrow-img {\n  width: 16px;\n  height: 16px;\n  margin-left: 4px;\n}',
        content
    )
    return content

def process_page(filepath):
    """Process a single page file."""
    content = read_file(filepath)
    original = content
    page_path = filepath
    
    # Template conversions
    content = convert_back_text_button(content)
    content = convert_back_input_button(content, page_path)
    content = convert_header_back(content, page_path)
    content = convert_wv_back(content, page_path)
    content = convert_swipe_arrows(content, page_path)
    content = convert_schedule_swap(content, page_path)
    content = convert_chevron_arrows(content, page_path)
    content = convert_expand_arrows(content, page_path)
    
    # CSS conversions
    content = convert_css_back_btn(content)
    content = convert_css_swipe_arrows(content)
    content = convert_css_chevron_arrows(content)
    content = convert_css_expand_arrows(content)
    
    # JS: Add iconTheme support if any template changes were made
    if content != original:
        page_name = os.path.splitext(os.path.basename(filepath))[0]
        content = add_icon_theme_js(content, page_name)
        
        # Fix relative icon paths - replace {{ iconTheme }} with the full pattern
        # The template uses {{ iconTheme }} but needs ../../common/icons/ prefix
        # This was already handled in the replacement functions above using relative_icons_path()
        
        write_file(filepath, content)
        return True
    return False

def main():
    """Process all pages."""
    pages = []
    for root, dirs, files in os.walk(PAGES_DIR):
        for f in files:
            if f.endswith('.ux'):
                pages.append(os.path.join(root, f))
    
    converted = 0
    for page in sorted(pages):
        rel = os.path.relpath(page, PROJECT_ROOT)
        if process_page(page):
            converted += 1
            print(f'  Converted: {rel}')
        else:
            pass  # No changes needed
    
    print(f'\n--- Summary ---')
    print(f'Pages converted: {converted}')
    print(f'Back text buttons: {stats["back_text"]}')
    print(f'Back input buttons: {stats["back_input"]}')
    print(f'Swipe arrows: {stats["swipe"]}')
    print(f'Chevron arrows: {stats["chevron"]}')
    print(f'Expand arrows: {stats["expand"]}')
    print(f'Schedule swap: {stats["swap"]}')
    total = sum(stats.values())
    print(f'Total icon instances: {total}')
    print('Done!')

if __name__ == '__main__':
    main()