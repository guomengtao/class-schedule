#!/usr/bin/env python3
"""Add iconTheme JS + CSS to all pages that have iconTheme template references."""
import re, os, sys

SRC = '/Users/Banner/Documents/guomengtao/tom/class/class/src/pages'

PAGES = [
    'reset-data', 'vibration-lab-v2', 'course-manager-v2', 'pinned-pages',
    'bs-demo1', 'template-picker', 'test-area-v2', 'course-manager',
    'black-screen-check', 'chinese-input', 'countdown-manage', 'device-info',
    'schedule-qrcode', 'backup-restore', 'bs-demo2', 'bs-demo5',
    'statistics', 'donate', 'qrcode-generator', 'activation',
    'vibration-lab', 'homepage-settings', 'bs-demo3', 'bs-demo4',
    'add-course', 'week-view', 'lab-edit-course', 'header-demo1', 'header-demo2',
    'detail',
]

LOG = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'conv_log.txt'), 'w')

def log(msg):
    LOG.write(msg + '\n')
    LOG.flush()

def add_js_support(content, page_name):
    if 'updateIconSrc' in content:
        log(f'  {page_name}: updateIconSrc already exists, skipping JS')
        return content
    
    # Add iconTheme to private/data
    if 'private:' in content:
        content = re.sub(r'(private:\s*\{)', r'\1\n    iconTheme: "dark",', content, count=1)
    elif 'data:' in content:
        content = re.sub(r'(data:\s*\{)', r'\1\n    iconTheme: "dark",', content, count=1)
    
    # Update getTheme to accept themeName
    content = re.sub(
        r'(store\.getTheme\(function\(t\))',
        r'\1, themeName',
        content
    )
    
    # Add updateIconSrc call after self.theme = t
    content = re.sub(
        r'(self\.theme\s*=\s*t)\s*\n',
        r'\1\n        self.updateIconSrc(themeName)\n',
        content
    )
    
    # Add updateIconSrc function
    update_func = '''  updateIconSrc: function(themeName) {
    this.iconTheme = (themeName === "light" || themeName === "warm") ? "light" : "dark"
  }'''
    
    # Insert before the last function or onDestroy
    if 'onDestroy' in content:
        # Check if already has a comma before insert
        idx = content.rfind('onDestroy')
        # Find previous function end
        prev_func_end = content.rfind('},', 0, idx)
        if prev_func_end == -1:
            prev_func_end = content.rfind('}\n', 0, idx)
        if prev_func_end > 0:
            content = content[:prev_func_end+1] + ',\n\n' + update_func + '\n' + content[prev_func_end+1:]
    else:
        # Insert before } that closes export default
        last_brace = content.rfind('\n}')
        if last_brace > 0:
            content = content[:last_brace] + ',\n\n' + update_func + '\n' + content[last_brace:]
    
    return content

def add_css_support(content, page_name):
    suffix_map = {
        'back-btn': '-wrapper',
        'wv-back': '-wrapper', 
        'header-back': '-wrapper',
    }
    
    for old_class, wrapper_suffix in suffix_map.items():
        # Check if CSS already uses wrapper class
        if old_class + wrapper_suffix in content:
            log(f'  {page_name}: CSS already has {old_class}{wrapper_suffix}')
            continue
            
        # Replace .back-btn { ... } style blocks with wrapper + icon styles
        # Also find media queries with .back-btn
        # We'll add new styles after each old-style occurrence
        
    # Simple approach: add wrapper+icon styles after existing .back-btn styles
    # We'll append generic styles at the end of <style>
    
    new_css = '''
.back-btn-wrapper { width: 48px; height: 40px; border-radius: 8px; justify-content: center; align-items: center; }
.back-btn-icon { width: 24px; height: 24px; }
.wv-back-wrapper { width: 52px; height: 44px; border-radius: 8px; justify-content: center; align-items: center; }
.wv-back-icon { width: 24px; height: 24px; }
.header-back-wrapper { width: 48px; height: 40px; border-radius: 8px; justify-content: center; align-items: center; }
.header-back-icon { width: 24px; height: 24px; }'''
    
    # Insert before </style>
    if '</style>' in content:
        content = content.replace('</style>', new_css + '\n</style>')
    
    return content

STATS = {'js_ok': 0, 'js_skip': 0, 'css_ok': 0, 'error': 0}

for name in PAGES:
    path = os.path.join(SRC, name, name + '.ux')
    if not os.path.exists(path):
        log(f'{name}: FILE NOT FOUND')
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        orig = f.read()
    
    try:
        modified = add_js_support(orig, name)
        modified = add_css_support(modified, name)
        
        if modified != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(modified)
            log(f'{name}: OK')
            STATS['js_ok'] += 1
        else:
            log(f'{name}: NO CHANGES')
    except Exception as e:
        log(f'{name}: ERROR {e}')
        STATS['error'] += 1

log(f'\nSUMMARY: {STATS}')
LOG.close()
print('DONE')