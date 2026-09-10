import os, base64

src = '/tmp/Vela_input_method/components/InputMethod/assets/t9'
dst = '/Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/assets/t9'
result = []

try:
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        with open(os.path.join(src, f), 'rb') as fh:
            data = fh.read()
        with open(os.path.join(dst, f), 'wb') as fh:
            fh.write(data)
        result.append(f'{f}: {len(data)} bytes')
    with open(os.path.join(dst, '_files.txt'), 'w') as fh:
        fh.write('\n'.join(result))
    print('OK: ' + '; '.join(result))
except Exception as e:
    print(f'FAIL: {e}')