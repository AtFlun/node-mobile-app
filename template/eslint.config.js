import reactNativeConfig from '@react-native/eslint-config/flat';

/**
 * ESLint flat config,基于 React Native 官方配置
 * >查看定义:@see {@link eslintConfig}
 */
const eslintConfig = [
    ...reactNativeConfig,
    // 你的自定义配置写在这里
];

export default eslintConfig;