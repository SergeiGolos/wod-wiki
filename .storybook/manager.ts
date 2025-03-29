import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';
import { version } from '../package.json';

addons.setConfig({
  theme: create({
    base: 'light',
    
    // Brand
    brandTitle: `WOD.Wiki - ${version}`,
    brandUrl: 'https://wod.wiki',
    brandTarget: '_self',    
  
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
  }),  
  brandTitle: `WOD.Wiki v.${version}`,
  brandUrl: 'https://wodwiki.com',
  brandTarget: '_self',
});
