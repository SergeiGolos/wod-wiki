import { addons } from '@storybook/manager-api';
import wodTheme from './wodTheme';

addons.setConfig({
  theme: wodTheme,
  brandImage: '/stories/assets/wod-wiki.png',
  brandUrl: 'https://wodwiki.com',
  brandTarget: '_self',
});
