const withTM = require('next-transpile-modules')(['monaco-editor']);

module.exports = withTM({
  experimental: {
    turbo: true, // Enable Turbopack
  },
});
