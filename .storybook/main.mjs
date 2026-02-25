// This file has been automatically migrated to valid ESM format by Storybook.
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  "stories": [
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],

  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    // "@storybook/addon-vitest" - disabled due to bun + Windows compatibility issues
    // Run tests via CLI: bun run test:storybook
  ],

  "staticDirs": ["../public"],

  "framework": {
    "name": "@storybook/react-vite",
    "options": {
      "builder": {
        "viteConfigPath": "vite.config.ts"
      }
    }
  },

  "typescript": {
    "reactDocgen": false,
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

    // Pre-bundle heavy dependencies to reduce HTTP requests during dev
    // Monaco Editor alone has 100+ modules that would otherwise be loaded separately
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      'monaco-editor',
      '@monaco-editor/react',
      'recharts',
      'chevrotain',
      '@headlessui/react',
      'lucide-react',
      'cmdk',
    ];

    return config;
  }
};

export default config;