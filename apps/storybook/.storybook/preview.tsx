import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals?.theme || 'light';
      return (
        <div className={`min-h-screen bg-background text-foreground p-4 font-sans ${theme === 'dark' ? 'dark' : ''}`}>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
