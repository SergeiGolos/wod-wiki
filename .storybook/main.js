

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
    
    return config;
  }
};
export default config;