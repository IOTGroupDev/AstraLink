// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve = config.resolve || {};

  // ✅ Ключевая настройка: Webpack теперь НЕ будет использовать "import" из package.json
  config.resolve.conditionNames = ['require', 'default', 'module', 'browser'];

  // ✅ Приоритет CommonJS
  config.resolve.mainFields = ['browser', 'main', 'module'];

  // ✅ Подстраховка — форсим CJS-версии Zustand
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'zustand/middleware': path.resolve(
      __dirname,
      'node_modules/zustand/middleware/index.js'
    ),
    'zustand/shallow': path.resolve(
      __dirname,
      'node_modules/zustand/shallow.js'
    ),
    zustand: path.resolve(__dirname, 'node_modules/zustand/index.js'),
    '@assets': path.resolve(__dirname, 'assets'),
  };

  console.log('✅ Expo Webpack forced to use CommonJS Zustand build');

  return config;
};
