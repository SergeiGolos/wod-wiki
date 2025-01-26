import type { NextConfig } from "next";
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const nextConfig: NextConfig = {  
  webpack: (config) => {
    config.plugins.push(
      new MonacoWebpackPlugin({
        languages: ['javascript', 'typescript'], // Add needed languages
        filename: 'static/[name].worker.js', // Workers served from static folder
      })
    );
    return config;
  },
};
export default nextConfig;
