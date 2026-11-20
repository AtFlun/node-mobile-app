# 变更日志

## [4.3.1] - 2026-11-20 11:50
### 修复
- `test` 命令在 Windows 上首次运行常报「Metro 30 秒内未就绪」:此前用 `spawnCmdAsync('npx', ['react-native', 'start'])` 后台拉起 Metro,`npx` 经 `cmd.exe` 运行时,清理旧 Metro 的 Ctrl+C 偶发被新批处理接收,`cmd.exe` 弹出「终止批处理操作吗(Y/N)?」且无 stdin 应答而永久挂起,导致 Metro 起不来、30 秒超时回落本地 bundle,且不再出现后台窗口;
- 改用 `cmd.exe /c start "" /b npx react-native start` 并加 `windowsHide: true`,`/b` 使子进程忽略 Ctrl+C、不新建窗口,一处同时消除「Y/N 挂死」与「窗口消失」;连跑两次验证首次即「✓ Metro 已就绪(后台常驻,支持热更新)」,第二次正确复用常驻 Metro;

## [4.3.0] - 2026-11-20 10:43
### 更新
- 编译支持 node v24.19.0 并设置为默认;

***!!! 注意***: 1. Node.js 24 的官方头文件依赖 C++20 特性; 2. ios端还是只能用v18.20.4;

## [4.2.5] - 2026-11-19 11:26
### 修复
- 编译原生模块前自动放行其安装脚本:新增 `mergeNativeAllowScripts`,`[5/11]` 在 `npm install` 完成后、
  `npm rebuild` 之前,扫描用户项目 `node_modules` 中带 `binding.gyp` 的包,并入
  `nodejs-assets/nodejs-project/package.json` 的 `allowScripts`;此前白名单只取自 `mobileAppConfig.js`,
  未声明的原生模块(如 `bufferutil`)其 install 脚本会被 npm 拦截,`npm rebuild` 静默跳过编译,
  最终报「以下原生模块编译后缺少 .node」;
- 仅在确有新增时回写该 `package.json`,并打印「自动允许安装脚本: <包名>」;已在配置中声明的包不重复改写;