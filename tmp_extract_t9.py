import sys
with open('/tmp/Vela_input_method/components/InputMethod/InputMethod.ux') as f:
    lines = f.readlines()

# Find t9 data definition
for i, l in enumerate(lines):
    if l.strip().startswith('t9:'):
        print(f"=== t9 data starts at line {i+1} ===")
        for j in range(i-1, min(i+20, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        break

print("\n\n=== keyboardtype references ===")
for i, l in enumerate(lines):
    if 'keyboardtype' in l:
        print(f'{i+1}: {l}', end='')

print("\n\n=== T9 template sections ===")
for i, l in enumerate(lines):
    if 'T9' in l and ('keyboardtype' in lines[i-1] if i>0 else False):
        pass
    if "'T9'" in l or '"T9"' in l:
        # Print surrounding context - T9 conditional blocks
        start = max(0, i-5)
        end = min(len(lines), i+15)
        print(f"\n--- context around line {i+1} ---")
        for j in range(start, end):
            marker = ">>>" if j == i else "   "
            print(f'{marker} {j+1}: {lines[j]}', end='')

print("\n\n=== all template sections with keyboardtype check ===")
for i, l in enumerate(lines):
    if 'keyboardtype' in l and ('===' in l or '==' in l):
        print(f'\n--- conditional at line {i+1} ---')
        for j in range(i, min(len(lines), i+80)):
            print(f'{j+1}: {lines[j]}', end='')
            if j > i and ('</div>' in lines[j] or 'keyboardtype' in lines[j]):
                pass