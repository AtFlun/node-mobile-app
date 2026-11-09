import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const merge = (def, user) => {
  const out = { ...def };
  for (const k of Object.keys(user)) {
    if (user[k] && typeof user[k] === 'object' && !Array.isArray(user[k])) out[k] = merge(def[k] || {}, user[k]);
    else if (user[k] !== undefined && user[k] !== null) out[k] = user[k];
  }
  return out;
};
/**
 * 默认配置对象,用户未提供的字段使用此处默认值
 * >查看定义:@see {@link DEFAULT_CONFIG}
 */
const DEFAULT_CONFIG = {
  serverPath: './server.js',
  appName: null,
  outputDir: null,
  appId: 'com.example.app',
  versionCode: 1,
  versionName: '1.0.0',
  webview: {
    showLoading: true,
    loadingText: '正在启动服务...',
    enableJavaScript: true,
    enableDomStorage: true,
    allowFileAccess: true,
    mixedContentMode: 'always',
    backgroundColor: '#ffffff',
    allowSelfSignedCert: false,
  },
  android: {
    sdkPath: null,
    adbPath: null,
    minSdkVersion: 29,
    targetSdkVersion: 36,
    compileSdkVersion: 37,
    buildToolsVersion: '37.0.0',
    gradleDistributionUrl: null,
    abiFilters: ['arm64-v8a'],
    icon: './build/icon.png',
    usesCleartextTraffic: true,
    permissions: [],
    signing: {},
  },
  ios: {
    deploymentTarget: '15.1',
    icon: './build/icon.png',
    signing: {},
  },
  advanced: {
    keepAlive: true,
    heartbeatInterval: 5000,
  },
  keepFiles: [],
  extraRnDependencies: [],
  excludeFiles: [
    '.git/', '.vscode/', '.idea/', '.vs/',
    'node_modules/', 'sessions/', 'users.json', '.env',
    '*.log', '*.md', '*.tgz', '*.bak', '.backup*', 'dist/', 'out/', 'build/', 'tests/',
    'node-mobile-app-build/', 'nodejs-assets/',
  ],
  optimize: {
    enabled: true,
    exclude: [],
  },
  allowScripts: {
    'node': true,
  }
};

/**
 * 读取用户项目根的 mobileAppConfig.js,与默认配置深度合并
 * >查看定义:@see {@link loadConfig}
 * @param {string} userProjectDir 用户项目目录
 * @returns {Promise<object>} 合并后的配置对象
 */
const loadConfig = async userProjectDir => {
  for (const name of ['mobileAppConfig.js', 'mobileAppConfig.mjs', 'mobileAppConfig.cjs']) {
    const p = path.join(userProjectDir, name);
    if (fs.existsSync(p)) {
      console.log(chalk.gray('  读取配置: ' + name));
      const mod = await import(pathToFileURL(p).href);
      return merge(DEFAULT_CONFIG, mod.default || mod);
    }
  }
  console.log(chalk.yellow('未找到 mobileAppConfig.js,使用默认配置'));
  return DEFAULT_CONFIG;
};

/**
 * 定位 Android SDK 路径:配置 > 环境变量 > 默认路径
 * >查看定义:@see {@link resolveSdkPath}
 * @param {object} config 用户配置
 * @returns {string|null} SDK 绝对路径,未找到时返回 null
 */
const resolveSdkPath = config => {
  if (config.android && config.android.sdkPath) return config.android.sdkPath;
  for (const env of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
    const base = process.env[env];
    if (base && fs.existsSync(base)) return base;
  }
  const localAppData = process.env.LOCALAPPDATA || '', home = process.env.USERPROFILE || process.env.HOME || '',
    candidates = [path.join(localAppData, 'Android', 'Sdk'), path.join(home, 'Library', 'Android', 'sdk'),
    path.join(home, 'Android', 'Sdk')];

  for (const c of candidates) if (c && fs.existsSync(path.join(c, 'platform-tools'))) return c;
  return null;
};

/**
 * 校验配置必填项与格式,失败时打印错误并抛出异常
 * >查看定义:@see {@link validateConfig}
 * @param {object} config 用户配置
 * @param {string} userProjectDir 用户项目目录
 * @returns {void}
 */
const validateConfig = (config, userProjectDir) => {
  const errors = [], entry = path.join(userProjectDir, config.serverPath);
  if (!fs.existsSync(entry)) errors.push('serverPath 不存在: ' + config.serverPath);

  const pkg = path.join(userProjectDir, 'package.json');
  if (!fs.existsSync(pkg)) errors.push('用户项目缺少 package.json');
  // 极简防呆:至少 2 段、每段非空、只含 [a-zA-Z0-9_-],不允许首尾点或连续点
  // 具体平台是否合法交给 Gradle / Xcode 报错(Android 不允许 -,iOS 允许)
  if (typeof config.appId !== 'string' || !/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(config.appId))
    errors.push('appId 格式不合法(需反向域名格式,如 com.example.app): ' + config.appId);
  if (!Number.isInteger(config.versionCode) || config.versionCode < 1) errors.push('versionCode 必须是正整数');
  if (!config.android.abiFilters?.length) errors.push('android.abiFilters 不能为空');
  if (config.android.gradleDistributionUrl && !/^https?:\/\/.+\.zip$/.test(config.android.gradleDistributionUrl))
    errors.push('android.gradleDistributionUrl 必须是 http(s) 且以 .zip 结尾: ' + config.android.gradleDistributionUrl);
  if (config.android.mavenRepositories !== null && !Array.isArray(config.android.mavenRepositories))
    errors.push('android.mavenRepositories 必须是数组或 null');
  else if (Array.isArray(config.android.mavenRepositories)) {
    const bad = config.android.mavenRepositories.filter(u => typeof u !== 'string' || !/^https?:\/\//.test(u));
    if (bad.length) errors.push('android.mavenRepositories 存在非 http(s) 地址: ' + bad.join(', '));
  }
  if (errors.length) {
    errors.forEach(e => console.error(chalk.red('  - ' + e)));
    throw new Error('配置校验失败');
  }
  console.log(chalk.green('    ✓ 配置校验通过'));
};

export { DEFAULT_CONFIG, loadConfig, resolveSdkPath, validateConfig };