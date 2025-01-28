import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-essentials", 
    // Often used for tailwind
{
  name: '@storybook/addon-styling-webpack',
  options: {
    rules: [
      // Replaces existing CSS rules to support PostCSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { importLoaders: 1 }
          },
          {
            // Gets options from `postcss.config.js` in your project root
            loader: 'postcss-loader',
            options: { implementation: require.resolve('postcss') }
          }
        ],
      }
    ]
  }
}
   ],
  framework: {
    name: "@storybook/nextjs",
    options: {}
  },
  webpackFinal: async (config) => {
    // Remove monaco-editor from external packages
    if (config.externals) {
      const externals = Array.isArray(config.externals) 
        ? config.externals 
        : [config.externals];
      config.externals = externals.filter(external => 
        typeof external !== 'string' || !external.includes('monaco-editor')
      );
    }
    return config;
  }
};

export default config;