# 变更日志
## [4.2.3] - 2026-11-13 22:06
### 升级注意事项
- `engines.node` 由 `>= 18` 收紧为 `>=22.12.0`,与作用域内其它包统一;在 Node 18 / 20 上安装会直接失败;
- **该要求只约束开发机**(驱动构建的 Node),与移动端运行时无关;Android / iOS 运行时由
  `@flun/nodejs-mobile-react-native` 的 `prebuiltAssets.version` 决定,当前支持 Node.js v18;

### 文档
- README「安装前准备」与「Android / iOS 差异」两节补充 `engines.node` 只约束开发机、移动端运行时支持 v18 的说明,
  避免把该字段误解为"不能编译以 Node 18 为运行时的移动版本";
## [4.2.2] - 2026-11-13 21:29
### 修复
- 图标处理依赖由 `jimp` 换为 `sharp`;`jimp@1.6.1` 依赖的 `pngjs@7.0.0` 在 `lib/sync-inflate.js` 用
  `zlib.Inflate.call(this, opts)` 继承内置类,而现代 Node 中 `zlib.Inflate` 已是严格 class,只能用 `new` 调用,
  导致 `test` / `build` 在 `[2/11]` 阶段抛 `Class constructor Inflate cannot be invoked without 'new'`;
  影响 `android.icon` 与 `ios.icon` 的自定义图标处理,未配置图标时不加载 sharp;

### 优化
- `sharp` 仍按需动态导入,仅在配置了自定义图标时才加载,未配置图标时保持模板默认图标;

## [4.2.1] - 2026-11-13 20:22
### 优化
- 整体细节优化;