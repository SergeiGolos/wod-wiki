import type { Preview } from "@storybook/react";
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    settings: {
      "storybook.preview.importMap": {
        "@heroicons/react/20/solid": "@heroicons/react/20/solid"
      }
    }
  },
};

export default preview;