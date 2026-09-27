import os
import re
import glob

BASE = '/Users/Banner/Documents/guomengtao/tom/class/class'

def fix_capsule_padding(content):
    idx = 0
    changes = 0
    
    while True:
        m = re.search(r'@media[^{]*(?:capsule|pill)[^{]*\{', content[idx:], re.IGNORECASE)
        if not m:
            break
        
        brace_open = idx + m.end() - 1
        depth = 1
        pos = brace_open + 1
        
        while pos < len(content) and depth > 0:
            if content[pos] == '{':
                depth += 1
            elif content[pos] == '}':
                depth -= 1
            pos += 1
        
        block_start = brace_open + 1
        block_end = pos - 1
        block = content[block_start:block_end]
        original_block = block
        
        # padding: 44px 10px 12px 10px  ->  padding: 120px 10px 120px 10px
        # padding: 44px 10px 44px 10px ->  padding: 120px 10px 120px 10px
        def fix_padding_rule(match):
            full = match.group(0)
            # Split: padding: TOP RIGHT BOTTOM LEFT ;
            nums = re.findall(r'(\d+px)', full)
            if len(nums) >= 4:
                nums[0] = '120px'
                nums[2] = '120px'
                return f'padding: {nums[0]} {nums[1]} {nums[2]} {nums[3]};'
            elif len(nums) == 3:
                nums[0] = '120px'
                nums[2] = '120px'
                return f'padding: {nums[0]} {nums[1]} {nums[2]};'
            else:
                return re.sub(r'44px', '120px', full)
        
        block = re.sub(r'\bpadding:\s*44px\s+\d+px\s+\d+px\s+\d+px\s*;', fix_padding_rule, block)
        block = re.sub(r'\bpadding:\s*44px\s+\d+px\s+\d+px\s*;', fix_padding_rule, block)
        
        # Also fix standalone padding-top / padding-bottom
        block = re.sub(r'(\bpadding-top:\s*)44px(\s*;)', r'\g<1>120px\2', block)
        block = re.sub(r'(\bpadding-bottom:\s*)44px(\s*;)', r'\g<1>120px\2', block)
        
        if block != original_block:
            content = content[:block_start] + block + content[block_end:]
            changes += 1
        
        idx = pos
    
    return content, changes


def main():
    pages = sorted([d for d in os.listdir(os.path.join(BASE, 'src/pages')) 
                    if os.path.isdir(os.path.join(BASE, 'src/pages', d))])
    
    total_changes = 0
    modified_files = []
    
    for name in pages:
        fp = os.path.join(BASE, 'src/pages', name, f'{name}.ux')
        if not os.path.exists(fp):
            continue
        
        with open(fp, 'r') as fh:
            content = fh.read()
        
        new_content, changes = fix_capsule_padding(content)
        
        if changes > 0:
            with open(fp, 'w') as fh:
                fh.write(new_content)
            modified_files.append(name)
            total_changes += changes
    
    with open(os.path.join(BASE, 'fix_result.txt'), 'w') as out:
        out.write(f"Pages scanned: {len(pages)}\n")
        out.write(f"Files modified: {len(modified_files)}\n")
        out.write(f"Total rule changes: {total_changes}\n\n")
        for m in modified_files:
            out.write(f"  - {m}\n")
    
    print(f"Done: {len(modified_files)} files modified, {total_changes} rules changed")
    for m in modified_files:
        print(f"  - {m}")


if __name__ == '__main__':
    main()