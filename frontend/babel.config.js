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
      // Worklets transforms must run last for Reanimated 4.
      'react-native-worklets/plugin',
    ],
  };
};
