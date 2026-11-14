import { loadConfigAsync } from '@react-native-community/cli-config';

/**
 * 只保留含有效 platforms 的依赖;与 `@react-native-community/cli config` 的输出一致
 * @param {object} config CLI 配置对象
 * @returns {object} 过滤后的配置
 */
const filterConfig = config => {
    const dependencies = {};
    for (const [name, dep] of Object.entries(config.dependencies)) {
      const keys = Object.keys(dep.platforms || {});
      if (keys.some(k => Boolean(dep.platforms[k]))) dependencies[name] = dep;
    }
    return { ...config, dependencies };
  },
  /**
   * 直接调用 CLI 编程 API 输出 autolinking 配置 JSON;
   * 绕过 `@react-native-community/cli/build/bin.js` 的 Node 版本门,该门不把预发布版本视为满足 `>=18`;
   * @returns {Promise<void>}
   */
  main = async () => {
    const config = await loadConfigAsync({});
    process.stdout.write(JSON.stringify(filterConfig(config), null, 2));
  };

main().catch(err => {
  process.stderr.write((err && err.stack) || String(err)), process.exit(1);
});