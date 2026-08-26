const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure vector icon font files are handled correctly on web
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@react-native-vector-icons/material-design-icons': '@expo/vector-icons/MaterialCommunityIcons',
    'react-native-vector-icons/MaterialCommunityIcons': '@expo/vector-icons/MaterialCommunityIcons',
    'react-native-vector-icons': '@expo/vector-icons',
  };

  return config;
};
