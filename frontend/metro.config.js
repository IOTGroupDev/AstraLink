const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force zustand to use CJS builds to avoid import.meta.env issues
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'zustand/middleware': require.resolve('zustand/middleware'),
  zustand: require.resolve('zustand'),
};

// Allow .mjs extensions for ESM packages
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), 'mjs'])
);

module.exports = config;
