import type { StorybookConfig } from "@storybook/react-vite";
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import type { PluginOption } from 'vite';

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-docs",
    // "storybook-dark-mode", // TODO: Re-enable once compatible with Storybook 9.x
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Add staticDirs configuration using the object syntax
  staticDirs: [
    // Serve public assets from the root path
    { from: "../public", to: "/" },
  ],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Speeds up Storybook build time
      compilerOptions: {
        allowSyntheticDefaultImports: false,
        esModuleInterop: false,
      },
      // Makes union prop types work
      shouldExtractLiteralValuesFromEnum: true,
      // Makes string union props work
      shouldRemoveUndefinedFromOptional: true,
      // Exclude node_modules
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  // Add viteFinal to customize Vite configuration
  async viteFinal(config, { configType }) {
    // Ensure plugins array exists
    if (!config.plugins) {
      config.plugins = [];
    }
    // Add the Monaco editor plugin.
    // The cast to `PluginOption` is used here because the `monacoEditorPlugin` type
    // might not perfectly align with Storybook's expected Vite plugin type,
    // but it is compatible in practice.
    config.plugins.push(monacoEditorPlugin({}) as PluginOption);
    return config;  },
};
export default config;
