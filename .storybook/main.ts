import type { StorybookConfig } from "@storybook/html-vite";
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [        
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../stories/**/*.mdx"
  ],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  viteFinal: async (config) => {
    return mergeConfig(config, {
      build: {
        rollupOptions: {
          output: {
            format: 'es'
          }
        }
      },
      resolve: {
        alias: {
          'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
        },
      },
      optimizeDeps: {
        include: [
          'monaco-editor/esm/vs/editor/editor.worker',
          'monaco-editor/esm/vs/language/json/json.worker',
          'monaco-editor/esm/vs/language/typescript/ts.worker'
        ]
      }
    });
  },
};

export default config;
