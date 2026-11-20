# 变更日志

## [4.3.2] - 2026-11-20 19:34
### 优化
- 原生模块白名单提示措辞与 `desktop-builder` 统一:改为绿色 `原生模块[<包名>, ...]无条件加入allowScripts白名单`,
  多个模块合并为一行、逗号分隔;`mergeNativeAllowScripts` 行为不变,仍无条件并入;

## [4.3.1] - 2026-11-20 11:50
### 修复
- `test` 命令在 Windows 上首次运行常报「Metro 30 秒内未就绪」:此前用 `spawnCmdAsync('npx', ['react-native', 'start'])` 后台拉起 Metro,`npx` 经 `cmd.exe` 运行时,清理旧 Metro 的 Ctrl+C 偶发被新批处理接收,`cmd.exe` 弹出「终止批处理操作吗(Y/N)?」且无 stdin 应答而永久挂起,导致 Metro 起不来、30 秒超时回落本地 bundle,且不再出现后台窗口;
- 改用 `cmd.exe /c start "" /b npx react-native start` 并加 `windowsHide: true`,`/b` 使子进程忽略 Ctrl+C、不新建窗口,一处同时消除「Y/N 挂死」与「窗口消失」;连跑两次验证首次即「✓ Metro 已就绪(后台常驻,支持热更新)」,第二次正确复用常驻 Metro;

## [4.3.0] - 2026-11-20 10:43
### 更新
- 编译支持 node v24.19.0 并设置为默认;

***!!! 注意***: 1. Node.js 24 的官方头文件依赖 C++20 特性; 2. ios端还是只能用v18.20.4;