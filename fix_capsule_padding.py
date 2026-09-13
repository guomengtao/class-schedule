import glob
import re

files = glob.glob('src/pages/*/*.ux')
modified = []

for f in files:
    with open(f, 'r') as fh:
        lines = fh.readlines()
    
    in_capsule_media = False
    brace_depth = 0
    new_lines = []
    changed = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        if '@media (shape: capsule' in line or '@media (shape: pill-shaped' in line:
            combined = line
            j = i + 1
            while j < len(lines) and '{' not in combined and '@media' not in combined.split('{')[0]:
                combined += lines[j]
                j += 1
            in_capsule_media = True
            brace_depth = combined.count('{') - combined.count('}')
            new_lines.append(combined)
            i = j
            continue
        
        if in_capsule_media:
            brace_depth += line.count('{') - line.count('}')
            
            if 'padding:' in line and '44px' in line and brace_depth >= 1:
                new_line = re.sub(
                    r'padding:\s*44px\s+(\d+px)\s+(\d+px)\s+(\d+px)\s*;',
                    r'padding: 120px \1 120px \3;',
                    line
                )
                if new_line != line:
                    new_lines.append(new_line)
                    changed = True
                    i += 1
                    continue
            
            if brace_depth <= 0:
                in_capsule_media = False
        
        new_lines.append(line)
        i += 1
    
    if changed:
        with open(f, 'w') as fh:
            fh.writelines(new_lines)
        modified.append(f)

print(f'Modified {len(modified)} files:')
for m in modified:
    print(f'  {m}')