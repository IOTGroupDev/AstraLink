const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const zustandRoot = path.dirname(require.resolve('zustand/package.json'));

// Expo/Metro can prefer package.json "exports" import conditions and pick
// Zustand's ESM build. That build contains import.meta.env, which React Native
// cannot execute. Disable package exports so Metro respects the CJS entry.
config.resolver.unstable_enablePackageExports = false;

const zustandCjsEntries = {
  zustand: path.join(zustandRoot, 'index.js'),
  'zustand/middleware': path.join(zustandRoot, 'middleware.js'),
  'zustand/vanilla': path.join(zustandRoot, 'vanilla.js'),
};

// Force Zustand to use CJS builds. Its ESM build contains import.meta.env,
// which Metro parses but React Native cannot execute.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const cjsEntry = zustandCjsEntries[moduleName];
  if (cjsEntry) {
    return {
      type: 'sourceFile',
      filePath: cjsEntry,
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@assets': path.resolve(__dirname, 'assets'),
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
