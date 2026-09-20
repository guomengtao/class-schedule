# VSCode Terminal Fix Guide

## Symptom
All terminals display the same cached output, new commands are not executed, exit code is always 0.

## Cause
Shell process is stuck, PTY file descriptor leaked, new terminals reuse zombie sessions.

## Immediate Fix (pick one)

### Method 1: Kill residual shell processes (most effective)
Open system Terminal.app, execute:
```bash
pkill -f "trae.*zsh" ; pkill -f "code.*zsh"
```
Then close and reopen the IDE.

### Method 2: Inside IDE
```
Ctrl + Shift + P → Terminal: Kill All Terminals
Ctrl + Shift + P → Developer: Reload Window
```

## Prevention
- Close terminals that have been idle for a long time.
- Run cleanup once before starting work each day.
- Use Reload Window when interactive commands do not exit cleanly.