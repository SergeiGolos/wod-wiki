import type { NextConfig } from "next";
const withTM = require('next-transpile-modules')(['monaco-editor']);

const nextConfig: NextConfig = withTM({
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Add rule for worker files
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/i,
      loader: 'worker-loader',
      options: {
        filename: 'static/[hash].worker.js',
        publicPath: '/_next/',
      },
    });

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        "monaco-editor": false,
      };
    }

    // Add MonacoWebpackPlugin if you need custom Monaco features
    if (!isServer) {
      const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['javascript', 'typescript', 'html', 'css', 'json'],
          filename: 'static/[name].worker.js',
        })
      );
    }

    return config;
  },
  // Remove experimental turbo as it might conflict with Monaco
  // experimental: {
  //   turbo: true,
  // },
});

export default nextConfig;
