# 变更日志

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

## [4.2.4] - 2026-11-14 09:29
### 适配
- 适配 npm 12:该版本起不再把未知 CLI flag 透传为 `npm_config_*` 环境变量,而是直接报
  `EUNKNOWNCONFIG Unknown cli flag: --build-from-source`;`src/install.js` 中
  `npm rebuild --build-from-source` 改为环境变量 `npm_config_build_from_source: 'true'`,强制从源码编译的行为不变;
- 适配 Node.js 预发布版本:`@react-native-community/cli/build/bin.js` 用
  `semver.satisfies(process.version, '>=18')` 做版本门,预发布版本(如 `v27.0.0-alpha`)按 semver 规则不满足稳定区间,
  CLI 仅向 stderr 打一行提示就退出,stdout 为空,导致 Gradle 的 `generateAutolinkingPackageList` 读到 0 字节
  `autolinking.json` 后报错;

### 修复
- 新增 `scripts/generate-autolinking.js`,直接调用 `@react-native-community/cli-config` 的编程 API 生成
  autolinking 配置,绕开上述版本门;`template/android/settings.gradle` 改为
  `autolinkLibrariesFromCommand(['node', autolinkScript])` 指向该脚本,不再走 `npx`;
- 图标处理依赖由 `jimp` 换为 `sharp`;`jimp@1.6.1` 依赖的 `pngjs@7.0.0` 在 `lib/sync-inflate.js` 用
  `zlib.Inflate.call(this, opts)` 做 ES5 式继承,现代 Node 中 `zlib.Inflate` 是严格 class,只能 `new`,
  导致 `test` / `build` 在 `[2/11]` 抛 `Class constructor Inflate cannot be invoked without 'new'`;
- `sharp` 按需动态导入,仅在配置了自定义图标时才加载;未配置图标时保持模板默认图标;