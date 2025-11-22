// This file has been automatically migrated to valid ESM format by Storybook.
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "staticDirs": ["../public"],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {}
  },
  "viteFinal": (config) => {
    // Ensure source maps are generated for debugging
    config.build = config.build || {};
    config.build.sourcemap = true;
    
    // Enable CSS source maps
    config.css = config.css || {};
    config.css.devSourcemap = true;

    // Deduplicate React to avoid multiple copies during Vitest/Storybook tests
    config.resolve = config.resolve || {};
    config.resolve.dedupe = Array.from(
      new Set([...(config.resolve.dedupe || []), 'react', 'react-dom'])
    );
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(process.cwd(), 'node_modules/react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
    };
    
    // Disable Vite's publicDir to avoid conflict with Storybook's staticDirs
    // This prevents race condition when copying public assets
    config.publicDir = false;
    
    return config;
  }
};

export default config;