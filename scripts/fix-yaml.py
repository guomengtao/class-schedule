"""Fix mkdocs.yml after sed damage.

Damage: sed 's/:\([^ ]\)/: \1/g' added spaces after all colons that weren't
followed by a space. This broke:
  - URLs: https: //  -> https://
  - CSS: (prefers-color-scheme:  light) -> (prefers-color-scheme: light)
  - YAML keys that already had proper space (doubled it or broke context)

Strategy: only lines that look like nav entries (indented with spaces + leading dash)
and contain a path (end with .md) need the ': ' fix applied to their value.
For all other lines, this sed was a no-op or harmful, and we reverse the damage.
"""

import re

path = '/Users/Banner/Documents/guomengtao/ev/class-schedule/mkdocs.yml'

with open(path, 'r') as f:
    lines = f.readlines()

fixed = []
for line in lines:
    # Detect nav entries: line starts with spaces, then '- ', then title, then ': path.md'
    # After the bad sed, they became '- title:path.md' or '- title: path.md' (double space)
    # The first edit (: docs/ -> :) produced '- title:path.md'
    # Then sed added space: '- title: path.md' (single space, correct!)

    stripped = line.rstrip('\n')
    
    if stripped.strip().startswith('#') or stripped.strip() == '':
        fixed.append(line)
        continue

    # Count leading spaces
    leading = len(line) - len(line.lstrip(' '))
    content = line.lstrip(' ')
    
    # Fix URL damage: https: // -> https://
    if 'https: //' in content:
        content = content.replace('https: //', 'https://')
    
    # Fix double-space after colon: ':  ' -> ': ' (but not for YAML list indicators)
    # Pattern: colon followed by 2+ spaces, reduce to 1 space
    if ':  ' in content and not content.startswith('- '):
        content = re.sub(r':  +', ': ', content)
    
    # Fix missing space after colon in quoted values: 'icon: material/xxx'
    # After bad edit, some might have lost space. Check if this is a YAML key:value
    # where value doesn't start with space but is not in a nav entry context
    
    fixed.append(' ' * leading + content + '\n')

# Now handle the nav entry path fix: remove docs/ prefix from paths
# Pattern: "- 标题: path.md" - remove docs/ prefix from path
result = ''.join(fixed)

# Fix the original issue: remove docs/ prefix from nav entries
# Only on lines that are nav entries with a .md path
# Pattern: (spaces)- title: docs/xxx.md -> (spaces)- title: xxx.md
result = re.sub(r'^( +- [^:]+: )docs/(.+\.md)$', r'\1\2', result, flags=re.MULTILINE)

# Also fix bare docs/ references (without title): (spaces)- docs/xxx.md -> (spaces)- xxx.md
result = re.sub(r'^( +- )docs/(.+\.md)$', r'\1\2', result, flags=re.MULTILINE)

with open(path, 'w') as f:
    f.write(result)

print("Fixed mkdocs.yml")

# Validate
import yaml
with open(path) as f:
    yaml.safe_load(f)
print("YAML validation: OK")