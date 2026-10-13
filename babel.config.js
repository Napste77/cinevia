module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated/plugin TIENE que ir último (lo exige
    // Reanimated: es lo que reescribe los worklets). Si se agregan más
    // plugins, van ANTES de esta línea.
    plugins: ["react-native-reanimated/plugin"],
  };
};
