// Runtime alias resolver for compiled dist/*.js
// Maps "@/..." to "./dist/*" equivalents to fix production requires.
//
// Usage: node -r ./register-paths.js dist/main
//
// This avoids tsconfig-paths/register reading tsconfig.json (which points to src/*)

const path = require('path');
const tsConfigPaths = require('tsconfig-paths');

// Prefer runtime config if present, otherwise fallback to dist defaults
let runtimeConfig = {
  compilerOptions: {
    baseUrl: './dist',
    paths: {
      '@/*': ['*'],
      '@/modules/*': ['modules/*'],
      '@/shared/*': ['shared/*'],
    },
  },
};

try {
  // Load optional runtime config (created by automation)
  // Allows customizations without changing this script
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const loaded = require(path.resolve(__dirname, 'tsconfig.runtime.json'));
  if (loaded && loaded.compilerOptions) {
    runtimeConfig = loaded;
  }
} catch {
  // ignore, will use defaults above
}

const baseUrl = path.resolve(
  __dirname,
  runtimeConfig.compilerOptions.baseUrl || './dist',
);
const paths = runtimeConfig.compilerOptions.paths || {
  '@/*': ['*'],
  '@/modules/*': ['modules/*'],
  '@/shared/*': ['shared/*'],
};

tsConfigPaths.register({
  baseUrl,
  paths,
});
