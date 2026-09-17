import subprocess
import os

jsc_path = "/Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/jsc/lib/jsc/darwin_aiotjsc"
output_file = "/Users/Banner/Documents/guomengtao/tom/class/class/_jsc_py_result.txt"
lines = []

lines.append("JSC exists: " + str(os.path.exists(jsc_path)))

if os.path.exists(jsc_path):
    st = os.stat(jsc_path)
    lines.append("JSC size: " + str(st.st_size))
    
    # Test 1: direct execution
    try:
        result = subprocess.run([jsc_path, "--help"], capture_output=True, text=True, timeout=10)
        lines.append("Direct exec exit: " + str(result.returncode))
        lines.append("Direct stdout: " + result.stdout[:200])
        lines.append("Direct stderr: " + result.stderr[:200])
    except Exception as e:
        lines.append("Direct exec error: " + str(e))
    
    # Test 2: with arch -x86_64
    try:
        result = subprocess.run(["arch", "-x86_64", jsc_path, "--help"], capture_output=True, text=True, timeout=10)
        lines.append("arch exec exit: " + str(result.returncode))
        lines.append("arch stdout: " + result.stdout[:200])
        lines.append("arch stderr: " + result.stderr[:200])
    except Exception as e:
        lines.append("arch exec error: " + str(e))

with open(output_file, "w") as f:
    f.write("\n".join(lines))

print("DONE")