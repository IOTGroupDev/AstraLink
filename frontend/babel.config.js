module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          native: {
            unstable_transformImportMeta: true,
          },
        },
      ],
    ],
    plugins: [
      // Required for react-native-reanimated (must be last)
      'react-native-reanimated/plugin',
    ],
  };
};
