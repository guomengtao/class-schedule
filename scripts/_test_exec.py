import subprocess, sys
r = subprocess.run([sys.executable, '-c', 'print("OK")'], capture_output=True, text=True)
with open('/Users/Banner/Documents/guomengtao/tom/class/class/scripts/_exec_test.txt', 'w') as f:
    f.write(f'stdout:{r.stdout}|stderr:{r.stderr}|rc:{r.returncode}')