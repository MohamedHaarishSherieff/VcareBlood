const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure vector icon font files are handled correctly on web
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    // Map react-native-vector-icons to @expo/vector-icons for web compat
    'react-native-vector-icons/MaterialCommunityIcons': '@expo/vector-icons/MaterialCommunityIcons',
    'react-native-vector-icons': '@expo/vector-icons',
  };

  return config;
};
