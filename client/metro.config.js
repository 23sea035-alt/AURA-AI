const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "..");
config.watchFolders = [workspaceRoot];

// pnpm strict-linking: node_modules is symlinked and NOT hoisted, so a package's private deps
// (e.g. `expo` -> `expo-modules-core`) live under .pnpm rather than the top level. Let Metro
// follow those symlinks and resolve hierarchically so those private deps are found. (The previous
// config set disableHierarchicalLookup=true, which only works for a flat/hoisted layout and broke
// both native and web bundling under pnpm.)
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
