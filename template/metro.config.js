import { getDefaultConfig, mergeConfig } from '@react-native/metro-config';
import exclusionListModule from 'metro-config/private/defaults/exclusionList';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const exclusionList = exclusionListModule.default, __filename = fileURLToPath(import.meta.url),
  __dirname = dirname(__filename), workspaceRoot = resolve(__dirname, '..'),
  config = {
    watchFolders: [__dirname, resolve(workspaceRoot, 'node_modules')],
    resolver: {
      nodeModulesPaths: [resolve(__dirname, 'node_modules'), resolve(workspaceRoot, 'node_modules')],
      blockList: exclusionList([/[/\\]nodejs-assets[/\\].*/])
    }
  };

/**
 * Metro 打包配置,合并默认配置与 workspace 解析路径
 * >查看定义:@see {@link metroConfig}
 */
const metroConfig = mergeConfig(getDefaultConfig(__dirname), config);

export default metroConfig;