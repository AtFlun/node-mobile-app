import * as NodeMobile from '@flun/nodejs-mobile-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { WebView } from 'react-native-webview';
import runtime from './mobileApp.runtime';

/**
 * 背景色解析,支持三种配置:
 *   - '#ffffff' / 'white' 等字符串:固定色
 *   - 'system':跟随系统(内部用默认浅/深色)
 *   - { light: '#fff', dark: '#000' }:按系统主题切换
 * @param {string|object} bg 背景色配置
 * @param {string|null|undefined} theme 当前系统主题
 * @returns {string} 解析后的颜色值
 */
const resolveBgColor = (bg: string | { light: string; dark: string }, theme: string | null | undefined): string => {
  if (typeof bg === 'object' && bg !== null)
    return (theme === 'dark' ? bg.dark : bg.light) || bg.light || '#ffffff';
  if (bg === 'system') return theme === 'dark' ? '#121212' : '#ffffff';
  return bg || '#ffffff';
};

/**
 * 应用根组件:启动 Node 服务,按消息切换 loading / 错误页 / WebView
 * >查看定义:@see {@link App}
 * @returns {JSX.Element} 当前状态对应的视图
 */
const App = () => {
  const systemTheme = useColorScheme(),
    [url, setUrl] = useState<string | null>(null), [failedReason, setFailedReason] = useState<string | null>(null),
    [showDetail, setShowDetail] = useState(false),
    styles = StyleSheet.create({
      fill: { flex: 1 },
      loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
      errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      },
      errorTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#c00' },
      errorHint: { fontSize: 14, textAlign: 'center', color: '#888' },
      detailToggle: { fontSize: 13, marginTop: 24, color: '#06c' },
      detailText: {
        fontSize: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        color: '#666',
        fontFamily: 'monospace',
        textAlign: 'center',
      },
    });
  useEffect(() => {
    NodeMobile.start('main.js');

    const listener = (msg: unknown) => {
      if (typeof msg !== 'string') return;
      if (msg.startsWith('Node started on ')) {
        const target = msg.slice('Node started on '.length).trim();
        setFailedReason(null);
        setUrl(target);
      } else if (msg.startsWith('Node failed: ')) {
        const reason = msg.slice('Node failed: '.length).trim();
        setFailedReason(reason);
      }
    };

    NodeMobile.channel.addListener('message', listener);
    return () => NodeMobile.channel.removeListener('message', listener);
  }, []);

  // 失败:显示错误页(用户看提示,开发者点开看详情)
  if (failedReason) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>应用启动失败</Text>
        <Text style={styles.errorHint}>请稍后重试,或联系应用发布者</Text>
        <Text
          style={styles.detailToggle}
          onPress={() => setShowDetail((v) => !v)}
        >
          {showDetail ? '▼ 收起详细信息' : '▶ 查看详细信息'}
        </Text>
        {showDetail && (
          <Text style={styles.detailText}>{failedReason}</Text>
        )}
      </View>
    );
  }

  // 尚未就绪:loading
  if (!url) {
    if (!runtime.showLoading) return <View style={styles.fill} />;
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text>{runtime.loadingText}</Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: url }}
      style={[styles.fill, { backgroundColor: resolveBgColor(runtime.webview.backgroundColor, systemTheme) }]}
      originWhitelist={['*']}
      javaScriptEnabled={runtime.webview.enableJavaScript}
      domStorageEnabled={runtime.webview.enableDomStorage}
      allowFileAccess={runtime.webview.allowFileAccess}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode={runtime.webview.mixedContentMode}
    />
  );
};

export { App };