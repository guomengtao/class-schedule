import os
import re

BASE = '/Users/Banner/Documents/guomengtao/tom/class/class'

def get_capsule_block(content):
    m = re.search(r'@media[^{]*(?:capsule|pill)[^{]*\{', content, re.IGNORECASE)
    if not m:
        return None
    
    brace_open = m.end() - 1
    depth = 1
    pos = brace_open + 1
    while pos < len(content) and depth > 0:
        if content[pos] == '{':
            depth += 1
        elif content[pos] == '}':
            depth -= 1
        pos += 1
    
    return content[brace_open+1:pos-1]


def find_root_class(content):
    """Find the main page container class and its padding from default styles"""
    # Look for common page wrapper classes
    m = re.search(r'\.(\w*(?:page|root|container)[\w-]*)\s*\{[^}]*?padding:\s*(\d+px\s+\d+px\s+\d+px\s+\d+px)', content)
    if m:
        return m.group(1), m.group(2)
    return None, None


pages_dir = os.path.join(BASE, 'src/pages')
results = []

for name in sorted(os.listdir(pages_dir)):
    fp = os.path.join(pages_dir, name, f'{name}.ux')
    if not os.path.exists(fp):
        continue
    
    with open(fp) as fh:
        content = fh.read()
    
    capsule = get_capsule_block(content)
    if not capsule:
        results.append((name, 'NO_CAPSULE_MEDIA', '', ''))
        continue
    
    # Check if capsule block overrides padding on any page-like class
    has_padding_override = bool(re.search(r'\bpadding:\s*120px', capsule))
    has_any_padding = bool(re.search(r'\bpadding:\s*\d+px', capsule))
    
    root_class, default_padding = find_root_class(content)
    
    if has_padding_override:
        status = 'OK_120PX'
    elif has_any_padding:
        status = f'PARTIAL_HAS_PAD'
    else:
        status = 'NO_PADDING_OVERRIDE'
    
    results.append((name, status, root_class or '?', default_padding or '?'))

with open(os.path.join(BASE, 'capsule_audit.txt'), 'w') as f:
    f.write(f"{'Page':<30} {'Status':<25} {'RootClass':<20} {'DefaultPadding':<25}\n")
    f.write('-' * 100 + '\n')
    for name, status, rclass, dpad in results:
        f.write(f"{name:<30} {status:<25} {rclass:<20} {dpad:<25}\n")

# Print summary
ok = sum(1 for _,s,_,_ in results if s == 'OK_120PX')
no_pad = sum(1 for _,s,_,_ in results if s == 'NO_PADDING_OVERRIDE')
partial = sum(1 for _,s,_,_ in results if s == 'PARTIAL_HAS_PAD')
no_media = sum(1 for _,s,_,_ in results if s == 'NO_CAPSULE_MEDIA')
print(f"Audit complete: {ok} OK, {no_pad} no_pad, {partial} partial, {no_media} no_media")