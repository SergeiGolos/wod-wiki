import { addons } from '@storybook/manager-api';
import wodTheme from './wodTheme';

addons.setConfig({
  theme: wodTheme,
  brandTitle: 'WOD Wiki',
  brandUrl: 'https://wodwiki.com',
  brandTarget: '_self',
});
