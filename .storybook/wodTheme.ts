import { create } from '@storybook/theming/create';
import { version } from '../package.json';

export default create({
  base: 'light',
  
  // Brand
  brandTitle: `WOD.Wiki - ${version}`,
  brandUrl: 'https://wod.wiki',
  brandTarget: '_self',
  // brandImage: '/stories/assets/wod-wiki.png', // Comment out or remove this line to show text

  // UI
  appBg: '#F8FAFC',
  appContentBg: '#FFFFFF',
  appBorderColor: '#E2E8F0',
  appBorderRadius: 4,

  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: 'monospace',

  // Colors
  colorPrimary: '#1E40AF',
  colorSecondary: '#2563EB',

  // Toolbar default and active colors
  barTextColor: '#64748B',
  barSelectedColor: '#1E40AF',
  barBg: '#FFFFFF',
});
