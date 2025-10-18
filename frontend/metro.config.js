const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force zustand to use CJS builds to avoid import.meta.env issues
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'zustand/middleware': require.resolve('zustand/middleware'),
  zustand: require.resolve('zustand'),
  '@assets': require('path').resolve(__dirname, 'assets'),
};

// SVG Transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Combine source extensions: SVG + MJS + defaults
config.resolver.sourceExts = Array.from(
  new Set([
    ...(config.resolver.sourceExts || []),
    'mjs',
    'svg', // Добавляем svg как source
  ])
);

// Remove SVG from asset extensions (чтобы не обрабатывался как изображение)
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg'
);

module.exports = config;
