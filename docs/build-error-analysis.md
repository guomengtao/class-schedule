# Build Error Analysis: `App file does not exist` / `pages/index/index` not found

## Error Summary

```
❌ [toolkit]: App file does not exist
❌ [toolkit]: webpack error:
 1. Compilation failed: please confirm that the file path pages/index/index configured in manifest.json exists
Error: afterCompile: Compile javascript project error: Error
```

## Root Cause

The root cause is that the **temporary build directory (`.temp_class/`) is missing**, causing the webpack compilation step in `afterCompile` to fail when it tries to resolve source file entries.

### Current State (Confirmed)

| Path | Status |
|------|--------|
| `src/pages/index/index.ux` | ✅ Exists |
| `src/app.ux` | ✅ Exists |
| `build/` | ✅ Exists (from first successful build) |
| `../.temp_class/` | ❌ **Does NOT exist** |

---

## Detailed Build Pipeline Analysis

### Architecture Overview

The `aiot-toolkit` build system uses a **temporary project directory** pattern. All compilation happens in `.temp_class/`, and results are migrated back to the source project.

```
Project Root (class/)
├── src/                  ← Source files (.ux)
├── build/                ← Webpack output (migrated from .temp_class)
├── dist/                 ← RPK output (migrated from .temp_class)
└── ../.temp_class/       ← Temporary build directory (MISSING!)
    ├── src/              ← Copied source files
    ├── build/            ← Webpack output (before migration)
    ├── dist/             ← RPK output (before migration)
    └── node_modules/     ← Symlink to original node_modules
```

### Build Pipeline Steps

The build process is orchestrated by `FileLane` (`node_modules/file-lane/lib/FileLane.js`) and consists of the following lifecycle hooks:

#### 1. `beforeWorks` (called once at `start()`)

```javascript
// UxConfig.js
beforeWorks = [UxBeforeWorks.cleanOutput]

// UxBeforeWorks.js
static async cleanOutput(context) {
    const outputPath = FileLaneUtil.getOutputPath(context);
    // outputPath = join(projectPath, '../.temp_class')
    FileUtil.del(outputPath);  // ⚠️ Deletes .temp_class/ entirely!
}
```

This deletes the `.temp_class/` directory at the start of every fresh build.

#### 2. File Compilation (`buildFile`)

Source `.ux` files are compiled and written to `.temp_class/src/`:

```javascript
// FileLane.js - writeFiles()
const buildPath = FileLaneUtil.getOutputPath(this.context);
// = join(projectPath, '../.temp_class') = '.temp_class/'
FileUtil.mkdirSync(buildPath);  // Creates .temp_class/ if needed
// Writes compiled files to .temp_class/src/...
```

#### 3. `beforeCompile` (called in `build()`)

```javascript
// UxConfig.js
beforeCompile = [
    validateManifest,
    validateSitemap,
    clean,          // Resets caches, does NOT delete files
    getEntries,
    getGlobalVar
]
```

#### 4. `afterCompile` (called in `build()`) — **Where the error occurs**

```javascript
// UxConfig.js - AfterCompile hooks in order:
afterCompile = [
    writeGitIgnore,       // ← "afterCompile: undefined" (no workerDescribe)
    symlinkNodeModule,    // ← "Create a soft link to the node_modules folder"
    compileJavascript,    // ← "Compile javascript project" ❌ FAILS HERE
    copyResource,
    compressResource,
    jsc,
    protobuf,
    compileLiteCard,
    toRpk,                // ← "Package the project into an RPK file"
    generateDiff,
    moveBackResult,       // ← "Migrate temporary project"
    resourceCheck
]
```

### The Failing Step: `compileJavascript` (Webpack)

```javascript
// UxAfterCompile.js
static compileJavascript = async params => {
    return new JavascriptCompiler(context, onLog).compile({
        projectPath: join(context.projectPath, context.output),
        // = join('class/', '../.temp_class') = '.temp_class/'
        mode: 'development',
        ...JavascriptDefaultCompileOption,  // { sourceRoot: './src', ... }
        ...compilerOption
    })
}
```

Webpack is configured to compile from `.temp_class/src/`:

```javascript
// VelaWebpackConfigurator.js
createEntry() {
    const { projectPath, sourceRoot } = this.param;
    // projectPath = '.temp_class/'
    // sourceRoot = './src'
    const config = readJSONSync(join(projectPath, sourceRoot, 'manifest.json'));
    // Reads: .temp_class/src/manifest.json
    return UxCompileUtil.resolveEntries(
        config,
        resolve(projectPath, sourceRoot),  // codeDir = '.temp_class/src/'
        projectPath
    );
}
```

### Entry Resolution: `resolveEntries` (Where the error is thrown)

```javascript
// UxCompileUtil.js
static resolveEntries(config, codeDir, projectPath) {
    // Step 1: Find app file
    const appFile = this.resolveFile(join(codeDir, 'app'));
    // Looks for: .temp_class/src/app.ux or .temp_class/src/app.hml
    if (!existsSync(appFile)) {
        throw `App file does not exist`;  // ❌ ERROR 1
    }

    // Step 2: Find page files from manifest.json router config
    Object.keys(pages).forEach(routePath => {
        const entryKey = join(routePath, conf.component);
        // entryKey = 'pages/index/index'
        const filePath = this.resolveFile(join(codeDir, entryKey));
        // Looks for: .temp_class/src/pages/index/index.ux or .hml
        if (!filePath) {
            throw `Compilation failed: please confirm that the file path
                   ${entryKey} configured in manifest.json exists`;  // ❌ ERROR 2
        }
    });
}
```

The `resolveFile` method only looks for `.ux` and `.hml` extensions:

```javascript
static getExtensionList() {
    return ['.ux', '.hml'];  // Does NOT look for .js files!
}
```

### The `moveBackResult` Step (After successful build)

```javascript
// UxAfterCompile.js
static moveBackResult = async params => {
    const { projectPath } = compilerOption;  // = '.temp_class/'
    const { projectPath: orgProjectPath } = context;  // = 'class/'

    // Move build/ from temp to original
    moveSync(join(projectPath, './build'), join(orgProjectPath, './build'));
    // Move dist/ from temp to original
    moveSync(join(projectPath, './dist'), join(orgProjectPath, './dist'));

    // After this, .temp_class/ still has:
    //   - src/         (compiled source files)
    //   - node_modules (symlink)
}
```

### The `afterWorks` Step (Process exit cleanup)

```javascript
// UxConfig.js
afterWorks = [UxAfterWorks.cleanOutput]

// This deletes .temp_class/ entirely when the process exits
```

---

## Why the First Build Succeeds but Subsequent Builds Fail

### First Build (Full Build)

```
start() → beforeWorks (delete .temp_class/)
        → build()
          → beforeCompile
          → buildFile() × N (compile ALL .ux files → write to .temp_class/src/)
          → afterCompile
            → compileJavascript ✅ (finds all files in .temp_class/src/)
            → toRpk ✅
            → moveBackResult ✅ (moves build/ and dist/ back to project)
            → .temp_class/ now has src/ + node_modules/ only
```

### Subsequent Build (Watch Mode Incremental)

```
watch() → onChange()
        → build()
          → beforeCompile (does NOT clean .temp_class/)
          → buildFile() × 1 (compile ONLY the changed file)
          → afterCompile
            → compileJavascript ❌
              → resolveEntries() looks for files in .temp_class/src/
              → .temp_class/ DOES NOT EXIST → ERROR!
```

### Why `.temp_class/` is Missing

The `.temp_class/` directory was deleted by one of these scenarios:

1. **Process restart**: When the user stops (`Ctrl+C`) and restarts the build, `beforeWorks.cleanOutput` deletes `.temp_class/` at the start of the new process.

2. **Process exit**: The `afterWorks.cleanOutput` hook (called on `SIGINT`/`beforeExit`) deletes `.temp_class/` when the process exits.

3. **Manual cleanup**: The user or a script may have deleted the directory.

After the directory is deleted, any watch-mode incremental build will fail because webpack expects to find ALL source files in `.temp_class/src/`, not just the changed file.

---

## The Watch Mode Incremental Build Problem

In watch mode, only the **changed file** is compiled and written to `.temp_class/src/`. But webpack needs **all** source files to be present in `.temp_class/src/` to resolve the full dependency graph.

The design assumes that `.temp_class/src/` persists across watch-mode rebuilds, holding all files from the initial full build. When `.temp_class/` is deleted, this assumption is broken.

---

## Solution

### Immediate Fix

```bash
# 1. Stop the current watch process (Ctrl+C)

# 2. Clean up stale build artifacts
cd /Users/Banner/Documents/guomengtao/tom/class/class
rm -rf build dist .temp_class

# 3. Rebuild (this will create a fresh .temp_class/ and do a full build)
npm run build:dev
# or
npm start
```

### Prevention

- **Do not manually delete** the `.temp_class/` directory while the watch process is running.
- If you need to restart the build, always do a **full clean rebuild** (delete `build/`, `dist/`, and `.temp_class/` before restarting).
- Consider adding a cleanup script to `package.json`:

```json
{
  "scripts": {
    "clean": "rm -rf build dist .temp_class",
    "build:dev": "npm run clean && aiot build",
    "start": "npm run clean && aiot start --watch"
  }
}
```

---

## Key Files Reference

| File | Role |
|------|------|
| `node_modules/file-lane/lib/FileLane.js` | Build orchestrator, manages lifecycle hooks |
| `node_modules/@aiot-toolkit/aiotpack/lib/config/UxConfig.js` | Defines build hooks (beforeWorks, beforeCompile, afterCompile, afterWorks) |
| `node_modules/@aiot-toolkit/aiotpack/lib/beforeWorks/ux/UxBeforeWorks.js` | `cleanOutput` — deletes `.temp_class/` at build start |
| `node_modules/@aiot-toolkit/aiotpack/lib/afterCompile/ux/UxAfterCompile.js` | `compileJavascript`, `moveBackResult`, `symlinkNodeModule` |
| `node_modules/@aiot-toolkit/aiotpack/lib/compiler/javascript/vela/utils/UxCompileUtil.js` | `resolveEntries` — throws the error when files not found |
| `node_modules/@aiot-toolkit/aiotpack/lib/compiler/javascript/vela/VelaWebpackConfigurator.js` | `createEntry` — generates webpack entry points from manifest.json |
| `node_modules/aiot-toolkit/lib/builder/UxBuilderBase.js` | `getCompilerOption` — sets `projectPath` to `.temp_class/` |
| `src/manifest.json` | Defines router entries (pages/index, pages/detail, etc.) |
| `src/pages/index/index.ux` | The entry page file that webpack is looking for |