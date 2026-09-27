import glob, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

files = glob.glob('src/pages/*/*.ux')
modified = []

for f in files:
    with open(f, 'r') as fh:
        lines = fh.readlines()
    
    in_capsule = False
    brace_depth = 0
    changed = False
    
    for i, line in enumerate(lines):
        if '@media (shape: capsule' in line:
            in_capsule = True
            brace_depth = 0
            continue
        
        if in_capsule:
            opens = line.count('{')
            closes = line.count('}')
            brace_depth += opens - closes
            
            if 'padding:' in line and '44px' in line:
                stripped = line.strip()
                try:
                    val_part = stripped.split('padding:')[1].split(';')[0].strip()
                    parts = val_part.split()
                    if len(parts) >= 4 and parts[0] == '44px':
                        indent = len(line) - len(line.lstrip())
                        new_line = ' ' * indent + 'padding: 120px ' + parts[1] + ' 120px ' + parts[3] + ';\n'
                        lines[i] = new_line
                        changed = True
                except:
                    pass
            
            if brace_depth <= 0 and closes > 0:
                in_capsule = False
    
    if changed:
        with open(f, 'w') as fh:
            fh.writelines(lines)
        modified.append(os.path.basename(f))

print('Modified: ' + str(len(modified)))
for m in modified:
    print('  ' + m)