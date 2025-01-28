import type { NextConfig } from "next";
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['typescript', 'javascript'],
          filename: 'static/[name].worker.js',
          publicPath: '_next/'
        })
      );

      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          'monaco-editor': path.resolve('./node_modules/monaco-editor')
        }
      };
    }
    return config;
  }
};

export default nextConfig;