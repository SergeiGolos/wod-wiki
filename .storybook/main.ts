import type { StorybookConfig } from "@storybook/html-vite";

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
};
export default config;
