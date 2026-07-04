import subprocess
import re
import sys

def run_build():
    result = subprocess.run(['npm', 'run', 'build'], capture_output=True, text=True)
    if result.returncode == 0:
        return None
    return result.stdout + result.stderr

def fix_line(line_num, out):
    with open('src/App.tsx', 'r') as f:
        lines = f.readlines()
    
    line = lines[line_num-1]
    
    if "''fline" in line:
        line = line.replace("''fline", "'Offline")
    elif "''t" in line:
        line = line.replace("''t", "'t")
    elif "''r" in line:
        line = line.replace("''r", "'r")
    else:
        print("UNHANDLED:", line)
        return False
        
    lines[line_num-1] = line
    with open('src/App.tsx', 'w') as f:
        f.writelines(lines)
    return True

out = run_build()
if not out:
    print("Success!")
    sys.exit(0)

match = re.search(r'file: /app/applet/src/App\.tsx:(\d+):(\d+)', out)
if match:
    line_num = int(match.group(1))
    fix_line(line_num, out)
else:
    print(out)
