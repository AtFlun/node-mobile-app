import chalk from 'chalk';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 把单个参数转成适合 Windows cmd.exe 的形式:含空白或 shell 元字符时加双引号;
const quoteShellArg = (s) => {
  const str = String(s);
  if (str === '') return '""';
  return /[\s"&|<>^()]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
},
  /**
   * 统一的子进程启动:
   * - Windows:.cmd / .bat 需经 shell;把命令与参数拼成单字符串,
   *   避免 spawnSync(bin, args, { shell: true }) 触发 DEP0190;
   * - 其它平台:不用 shell,参数交由 Node 转义;
   */
  spawnCmd = (bin, args, baseOpts = {}) => {
    if (process.platform === 'win32') {
      const cmd = [bin, ...args].map(quoteShellArg).join(' ');
      return spawnSync(cmd, { ...baseOpts, shell: true });
    }
    return spawnSync(bin, args, { ...baseOpts, shell: false });
  };

/**
 * 生成 ESLint flat config 源码,替代 @react-native/eslint-config/flat
 * >查看定义:@see {@link buildEslintConfigSource}
 * @returns {string} ESLint 配置源码
 */
const buildEslintConfigSource = () => `import js from '@eslint/js';
  import reactPlugin from '@eslint-react/eslint-plugin';
  import tsParser from '@typescript-eslint/parser';
  import tsPlugin from '@typescript-eslint/eslint-plugin';
  import chalk from 'chalk';
  import reactHooks from 'eslint-plugin-react-hooks';
  import prettier from 'eslint-config-prettier';

  export default [
    js.configs.recommended,
    {
      files: ['**/*.{js,jsx,ts,tsx}'],
      languageOptions: {parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' }},
      plugins: { ...reactPlugin.configs.recommended.plugins, 'react-hooks': reactHooks },
      settings: { ...reactPlugin.configs.recommended.settings },
      rules: { ...reactPlugin.configs.recommended.rules, ...reactHooks.configs.recommended.rules }
    },
    { files: ['**/*.{ts,tsx}'], plugins: { '@typescript-eslint': tsPlugin }, rules: tsPlugin.configs.recommended.rules },
    prettier];`;

/**
 * 递归复制目录,exclude 支持 'node_modules/', '*.log', '.git/'
 * >查看定义:@see {@link copyDir}
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 * @param {string[]} [exclude] 排除模式列表
 * @returns {void}
 */
const copyDir = (src, dest, exclude = []) => {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const name = entry.name;
    if (isExcluded(name, exclude)) continue;
    const s = path.join(src, name), d = path.join(dest, name);
    if (entry.isDirectory()) copyDir(s, d, exclude);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
};

/**
 * 大小和 mtime 都一致才跳过复制,否则复制
 * >查看定义:@see {@link copyFileIfChanged}
 * @param {string} src 源文件
 * @param {string} dst 目标文件
 * @returns {boolean} 是否执行了复制
 */
const copyFileIfChanged = (src, dst) => {
  if (fs.existsSync(dst)) {
    try {
      const s = fs.statSync(src), d = fs.statSync(dst);
      if (s.size === d.size && Math.floor(s.mtimeMs) <= Math.floor(d.mtimeMs)) return false;
    } catch { /* 出错就复制 */ }
  }
  fs.copyFileSync(src, dst);
  return true;
};

/**
 * 目录不存在则递归创建
 * >查看定义:@see {@link ensureDir}
 * @param {string} dir 目录路径
 * @returns {void}
 */
const ensureDir = dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * 确保待装包可覆盖安装:标志不一致或变体不符时卸载已装包
 * >查看定义:@see {@link ensureInstallable}
 * @param {string} adb adb 路径
 * @param {string} appId 包名
 * @param {string} want 待装变体(debug 或 release)
 * @param {string} [serial] 设备序列号
 * @returns {void}
 */
const ensureInstallable = (adb, appId, want, serial) => {
  const installed = getInstalledVariant(adb, appId, serial);
  if (installed && installed !== want) {
    console.log(chalk.yellow(`  已安装 ${installed} 包与待装 ${want} 包签名不同,先卸载`));
    spawnCmd(adb, [...(serial ? ['-s', serial] : []), 'uninstall', appId], { encoding: 'utf-8' });
  }
};

/**
 * 定位 adb:配置 > 环境变量 > 默认路径 > PATH
 * >查看定义:@see {@link findAdb}
 * @param {object} config 用户配置
 * @returns {string} adb 路径
 */
const findAdb = config => {
  // 1. 用户显式配置的路径优先
  const configured = config?.android?.adbPath;
  if (configured) {
    if (fs.existsSync(configured)) return configured;
    console.warn(chalk.yellow('⚠️  config.android.adbPath 不存在,回退到自动查找: ' + configured));
  }
  // 2. 环境变量 ANDROID_HOME / ANDROID_SDK_ROOT
  for (const env of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
    const base = process.env[env];
    if (base) {
      const p = path.join(base, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
      if (fs.existsSync(p)) return p;
    }
  }
  // 3. 默认路径猜测(Windows / macOS / Linux)
  const home = process.env.USERPROFILE || process.env.HOME || '', localAppData = process.env.LOCALAPPDATA || '',
    candidates = [
      path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
      path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
      path.join(home, 'Android', 'Sdk', 'platform-tools', 'adb')
    ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return 'adb';
};

/**
 * 定位 hermesc(Hermes 编译器,用于把 JS bundle 编成字节码)
 * >查看定义:@see {@link findHermesc}
 * @param {string} userProjectDir 用户项目目录
 * @returns {string|null} hermesc 路径,未找到返回 null
 */
const findHermesc = userProjectDir => {
  const base = path.join(userProjectDir, 'node_modules', 'hermes-compiler', 'hermesc'), platform = process.platform;
  let sub;
  if (platform === 'win32') sub = ['win64-bin', 'hermesc.exe'];
  else if (platform === 'darwin') sub = ['osx-bin', 'hermesc'];
  else sub = ['linux64-bin', 'hermesc'];
  const p = path.join(base, ...sub);
  return fs.existsSync(p) ? p : null;
};

/**
 * 查询设备上已安装包的 DEBUGGABLE 标志
 * >查看定义:@see {@link getInstalledVariant}
 * @param {string} adb adb 路径
 * @param {string} appId 包名
 * @param {string} [serial] 设备序列号
 * @returns {string|null} 变体或 null(未安装)
 */
const getInstalledVariant = (adb, appId, serial) => {
  const pre = serial ? ['-s', serial] : [],
    r = spawnCmd(adb, [...pre, 'shell', 'dumpsys', 'package', appId], { encoding: 'utf-8' });
  if (r.status !== 0 || !r.stdout || !r.stdout.includes('Package [')) return null;
  return /\bDEBUGGABLE\b/.test(r.stdout) ? 'debug' : 'release';
};

/**
 * 判断文件名是否命中排除模式
 * >查看定义:@see {@link isExcluded}
 * @param {string} name 文件名
 * @param {string[]} patterns 模式列表
 * @returns {boolean} 是否命中
 */
const isExcluded = (name, patterns) => {
  for (let p of patterns) {
    p = p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    if (p === name) return true;
    if (p.includes('*')) {
      const escaped = p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&').replace(/\*/g, '.*');
      if (new RegExp('^' + escaped + '$').test(name)) return true;
    }
  }
  return false;
};


/**
 * 读取并解析 JSON 文件
 * >查看定义:@see {@link readJson}
 * @param {string} file 文件路径
 * @returns {*} 解析结果
 */
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf-8'));

/**
 * 目录存在则递归删除
 * >查看定义:@see {@link removeDir}
 * @param {string} dir 目录路径
 * @returns {void}
 */
const removeDir = dir => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
};

/**
 * 执行命令:默认实时输出;quiet=true 时捕获输出,成功静默、失败才打印
 * >查看定义:@see {@link run}
 * @param {string} bin 命令
 * @param {string[]} args 参数
 * @param {object} [opts] spawn 选项,支持 quiet
 * @returns {object} spawnSync 结果
 */
const run = (bin, args, opts = {}) => {
  const { quiet, ...restOpts } = opts;
  if (!quiet || process.env.OPTIMIZE_DEBUG) {
    const r = spawnCmd(bin, args, { stdio: 'inherit', ...restOpts });
    if (r.status !== 0) throw new Error(`${bin} ${args.join(' ')} 退出码 ${r.status}`);
    return r;
  }
  const r = spawnCmd(bin, args, { encoding: 'utf-8', ...restOpts });
  if (r.status !== 0) {
    if (r.stdout) process.stderr.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    throw new Error(`${bin} ${args.join(' ')} 退出码 ${r.status}`);
  }
  return r;
};

/**
 * 执行命令并捕获输出,不打印
 * >查看定义:@see {@link runQuiet}
 * @param {string} bin 命令
 * @param {string[]} args 参数
 * @param {object} [opts] spawn 选项
 * @returns {object} spawnSync 结果
 */
const runQuiet = (bin, args, opts = {}) => spawnCmd(bin, args, { encoding: 'utf-8', ...opts });

/**
 * 执行命令,成功静默、失败打印输出并抛错
 * >查看定义:@see {@link runSilent}
 * @param {string} bin 命令
 * @param {string[]} args 参数
 * @param {object} [opts] spawn 选项
 * @returns {object} spawnSync 结果
 */
const runSilent = (bin, args, opts = {}) => {
  const r = spawnCmd(bin, args, { encoding: 'utf-8', ...opts });
  if (r.status !== 0) {
    if (r.stdout) process.stderr.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    throw new Error(`${bin} ${args.join(' ')} 退出码 ${r.status}`);
  }
  return r;
};

/**
 * 执行命令并实时输出,仅首行加缩进前缀
 * >查看定义:@see {@link runStream}
 * @param {string} bin 命令
 * @param {string[]} args 参数
 * @param {object} [opts] spawn 选项,支持 prefix 与 quiet
 * @returns {Promise<void>}
 */
const runStream = (bin, args, opts = {}) => new Promise((resolve, reject) => {
  let first = true;
  const { prefix = '  ', quiet = false, ...restOpts } = opts, child = spawnCmdAsync(bin, args, restOpts),
    verbose = !quiet || process.env.OPTIMIZE_DEBUG, KEY_RE = /Installing|Installed|FAILED|error|Error|失败|退出码/,
    write = chunk => {
      if (verbose) {
        if (first) process.stdout.write(prefix), first = false;
        process.stdout.write(chunk);
        return;
      }
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (!line.trim() || !KEY_RE.test(line)) continue;
        process.stdout.write((first ? prefix : '') + line + '\n'), first = false;
      }
    };
  if (child.stdout) child.stdout.on('data', write);
  if (child.stderr) child.stderr.on('data', write);
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`${bin} ${args.join(' ')} 退出码 ${code}`)));
});

/**
 * 文件名安全化:去除文件系统非法字符,空结果回退 app
 * >查看定义:@see {@link sanitizeFileName}
 * @param {string} s 原始文件名
 * @returns {string} 安全文件名
 */
const sanitizeFileName = s => {
  const cleaned = String(s).replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned || 'app';
};

/**
 * 异步 spawn:参数同 spawnCmd,返回 ChildProcess
 * >查看定义:@see {@link spawnCmdAsync}
 * @param {string} bin 命令
 * @param {string[]} args 参数
 * @param {object} [baseOpts] spawn 选项
 * @returns {import('child_process').ChildProcess}
 */
const spawnCmdAsync = (bin, args, baseOpts = {}) => {
  if (process.platform === 'win32') {
    const cmd = [bin, ...args].map(quoteShellArg).join(' ');
    return spawn(cmd, { ...baseOpts, shell: true });
  }
  return spawn(bin, args, { ...baseOpts, shell: false });
};

/**
 * 内容不同才写文件,避免无谓的 mtime 变化
 * >查看定义:@see {@link writeIfChanged}
 * @param {string} file 文件路径
 * @param {string} content 内容
 * @returns {boolean} 是否写入
 */
const writeIfChanged = (file, content) => {
  if (fs.existsSync(file)) {
    try {
      if (fs.readFileSync(file, 'utf-8') === content) return false;
    } catch { /* 读失败就当需要写 */ }
  }
  fs.writeFileSync(file, content, 'utf-8');
  return true;
};

/**
 * 写入安装状态标志,安装成功后调用
 * >查看定义:@see {@link writeInstallState}
 * @param {string} buildDir 构建目录
 * @param {object} state 状态对象
 * @returns {void}
 */
const writeInstallState = (buildDir, state) => {
  try {
    ensureDir(buildDir), fs.writeFileSync(path.join(buildDir, '.install-state.json'), JSON.stringify(state, null, 2));
  } catch { }
};

/**
 * 把对象写入 JSON 文件
 * >查看定义:@see {@link writeJson}
 * @param {string} file 文件路径
 * @param {*} obj 待写入对象
 * @returns {void}
 */
const writeJson = (file, obj) => fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf-8');

export {
  buildEslintConfigSource, copyDir, copyFileIfChanged, ensureDir, ensureInstallable, findAdb, findHermesc,
  getInstalledVariant, isExcluded, readJson, removeDir, run, runQuiet, runSilent, runStream,
  sanitizeFileName, spawnCmdAsync, writeIfChanged, writeInstallState, writeJson
};