# 变更日志

## [4.2.1] - 2026-11-13 20:22
### 优化
- 整体细节优化;

## [4.2.0] - 2026-11-09 15:33
### 新增
- 新增 `android.gradleDistributionUrl` 配置项,可指定 Gradle 发行版的完整下载地址;未配置时按腾讯、阿里、
  官方顺序探测,三者均不可达则回落官方并警告;已配置时直接使用,失败不回退,并提示可改回 null 或换可达地址;
- 新增 `android.mavenRepositories` 配置项,可自定义 Maven 仓库数组,同时替换 `settings.gradle` 与根
  `build.gradle` 的仓库列表;未配置时保持模板默认(阿里云 public/google/gradle-plugin + 官方 google/mavenCentral);
### 优化
- 导出函数统一改为独立 `const` 声明并按字母序集中导出,未导出内容仍用逗号链;导出项补全标准 JSDoc;
- 各文件 import 统一为第三方包在前、相对路径在后、各自字母序,花括号内名字按大小写不敏感字母序;
- 删除无调用方的 `readInstallState`,移除 `ensureInstallable` 未使用的 `buildDir` 参数;
- 模板 `App.tsx`、`.prettierrc.js`、`babel.config.js`、`eslint.config.js`、`metro.config.js` 改为
  `const` 声明加末尾导出;

## [4.1.2] - 2026-11-07 22:27
### 修复
- 修复 Android 构建长时间卡在 Gradle 下载的问题;模板 `gradle-wrapper.properties` 的 `distributionUrl`
  由 `services.gradle.org` 改为腾讯云镜像,中国直连官方源常超时且不报错;
- 修复 `--debug` 下 Gradle 进度条被拆成大量点与数字的问题;调试模式编译改为 `stdio: 'inherit'`,
  让进度条直连终端刷新,不再经管道逐块拆分;