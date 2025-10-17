const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure resolve exists
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    // Force zustand to use CJS builds to avoid import.meta.env issues in web builds
    'zustand/middleware': require.resolve('zustand/middleware'),
    zustand: require.resolve('zustand'),
  };

  return config;
};
