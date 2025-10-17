module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Enable import.meta syntax for ESM compatibility
      '@babel/plugin-syntax-import-meta',
    ],
  };
};
