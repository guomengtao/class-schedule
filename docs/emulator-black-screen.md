# 模拟器启动黑屏排查记录

> **重要提示**：很多时候"黑屏"**不是代码问题**，而是**模拟器的启动 / 部署环节**出了问题。
> 排查时先把"模拟器环节"过一遍，再去看代码。本文记录一次完整排查过程与解法。

---

## 一、现象

- 构建成功、RPK 已推送到模拟器，部署日志正常。
- 但模拟器屏幕**持续纯黑**，App 界面始终不出现。
- 通过 gRPC 截屏，得到一张纯色黑图（PNG 仅约 1.3 KB，说明无任何内容差异）。

## 二、核心结论

**黑屏 = App 进程没有跑起来**，不是 UI/渲染层的问题。

判断依据（三条关键证据）：

1. **截屏是纯黑图**：`emulator-eye.js` 截出的图 1,373 字节，为纯色图，屏幕无内容。
2. **设备进程列表里没有 vapp / quickapp 进程**：`adb shell ps` 只有 Vela 系统守护进程（`Idle_Task`、`miwear_activity_service`、`mediad`、`adbd` 等），没有 App 进程。
3. **RPK 已部署成功但没启动成功**：`/data/quickapp/app/com.application.watch.classschedule/` 目录存在，说明"推送+解压"是好的；问题出在"启动"这一步。

## 三、根因

部署工具最后一步的启动命令是：

```bash
adb -s emulator-5558 shell vapp --jsdebugger=10.0.2.15:101 app/com.application.watch.classschedule &
```

存在**两个致命点**：

| 问题 | 说明 |
|------|------|
| **`&` 后台运行 + adb 会话断开 → 进程被杀** | Vela 的 nsh 里用 `&` 起的子进程，不会在 adb 连接断开后存活。部署工具自动跑完启动命令后 adb 退出，进程被 SIGHUP 杀掉 → 屏幕空着。 |
| **`--jsdebugger` 让 App 等调试器连接** | debug 模式下 `--jsdebugger` 会要求 App 等待调试器连到 hostfwd 映射的 `127.0.0.1:10057`。如果没有东西连接该端口，App 会卡在黑屏等待界面。 |

## 四、解决方式

在 **Mac 宿主侧**以后台、**不带 `--jsdebugger`** 的方式启动，让进程脱离 adb 会话存活：

```bash
adb -s emulator-5558 shell vapp app/com.application.watch.classschedule
```

要点：

- **去掉 `--jsdebugger`**：避免 App 等调试器造成黑屏（`--jsdebugger` 只在断点调试时才用）。
- **后台化放在宿主侧**，而不是在设备 nsh 里用 `&`：避免 adb 会话断开时进程被杀。
- **复查进程**确认 App 起来了：

```bash
adb -s emulator-5558 shell ps
# 应能看到：vapp app/com.application.watch.classschedule
#           以及 com.application.watch.classsche...（工作线程）
```

- **截屏确认画面出来**：

```bash
node scripts/emulator-eye.js shot 8558 /tmp/after-launch.png
open /tmp/after-launch.png
```

- **判断是否黑屏的小技巧**：看 PNG 文件大小。

  ```
  纯黑图（无内容）：  约 1.3 KB
  有内容的正常图：    明显更大（实测 13.9 KB）
  ```

## 五、命令速查

```bash
# 查看模拟器 / App 进程
adb -s emulator-5558 shell ps

# 宿主席后台启动（黑屏修复方案）
adb -s emulator-5558 shell vapp app/com.application.watch.classschedule

# 截屏（8558 为 emulator-5558 的 gRPC 端口 = console 端口 + 3000）
node scripts/emulator-eye.js shot 8558 /tmp/after-launch.png
open /tmp/after-launch.png
```

## 六、其他排查要点

- **模拟器要分清**：项目常用的开发模拟器是 `emulator-5554`（gRPC 8554）；本次部署到了 `emulator-5558`（gRPC 8558）。截图/脚本若按默认 8554 走，会查错模拟器。
- **清理残留**：`/data/quickapp/app/com.application.watch.classschedule.stale/` 是上次运行残留目录，可清理避免干扰。
- **Vela nsh 命令有限**：`killall` 不存在（用 `kill <pid>`）、`rm` 对部分路径会失败；`cd` 连接多条命令时 nsh 报 "too many arguments"，尽量用绝对路径单条执行。

## 六·五、启动命令的来源（why 有 `--jsdebugger` + `&`）

从模拟器插件二进制里抽出的 `startApp` 源码实物，可以 100% 确认黑屏两个元凶**都来自模拟器插件自身**，而不是本项目：

```js
async startApp(e, r = !1) {           //  r：是否"调试会话"
  let n = `adb -s ${this.sn} shell vapp app/${e} &`;   // ① 永远带 &（后台）
  r && (n = `adb -s ${this.sn} shell vapp --jsdebugger=10.0.2.15:101 app/${e} &`); // ② 仅调试会话才加 --jsdebugger
  this.logger(`Excuting: ${n}`);
  sM.execAdbCmd(n, {stdio: "ignore", encoding: "utf-8"});
}
```

要点：

- **启动命令在 IDE 模拟器插件的 `dist/emulator/index.js` 里生成**，不在本项目的 `package.json` / 构建脚本里。`package.json` 里的 `start/build/release` 只负责**构建产物**，管不到**启动命令**。
- **`--jsdebugger` 由 "r 参数" 控制**，该参数是 IDE 会话在**调试（Debug）模式**下才传 `true`。因此**这个开关无法通过本项目的构建配置关掉**——它由 IDE 端的运行/调试会话类型决定。
- **`&` 后台 + `{stdio:"ignore"}`**：插件永远用 `&` 把进程扔在设备 nsh 后台，adb 会话一断进程就被 SIGHUP 杀。这也是必须自己用宿主侧重启兜底的原因。

结论：想彻底免修 bug 有两个现实手段：

1. **用 IDE 的「运行」而非「调试」来启动**（避免 r=true → 无 `--jsdebugger`）；
2. **靠第四节宿主侧兜底重启**——这是本项目 100% 可控、不依赖 IDE 状态的做法，推荐默认用。

## 七、沉淀：以后遇到黑屏，先按这个顺序查

1. `adb devices` 确认模拟器在线、端口正确。
2. `adb -s <device> shell ps` 看 **vapp / quickapp 是否在跑**。
   - 没在跑 → 启动/存活问题（后台方式 + 去 debugger）。
   - 在跑但黑屏 → 才可能是代码/渲染问题，再查 UI。
3. `emulator-eye.js shot <port> out.png` 截屏 + 看文件大小判断是否纯黑。
4. 确认部署产物是否正确解压到 `/data/quickapp/app/<包名>/`。