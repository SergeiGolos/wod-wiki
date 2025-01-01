import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-links",
    "@storybook/addon-interactions",
    "@storybook/addon-mdx-gfm"
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  docs: {
    defaultName: 'Documentation',
    docsMode: true
  },

  core: {
    disableTelemetry: true
  },

  async viteFinal(config) {
    return {
      ...config,
      define: { 
        ...config.define,
        global: "window"
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: ['storybook-dark-mode', '@storybook/blocks'],
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'storybook': ['@storybook/blocks']
            }
          }
        }
      }
    };
  },

  typescript: {
    reactDocgen: "react-docgen-typescript"
  }
};

export default config;