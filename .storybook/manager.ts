import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';
import { version } from '../package.json';

// Create light theme
const lightTheme = create({
  base: 'light',
  
  // Brand
  brandTitle: `WOD.Wiki - ${version}`,
  brandUrl: 'https://wod.wiki',
  brandTarget: '_self',    

  // UI
  appBg: '#fdf6e3', // Solarized light base3
  appContentBg: '#eee8d5', // Solarized light base2
  appBorderColor: '#93a1a1', // Solarized light base1
  appBorderRadius: 8, // Rounded corners for journal feel
  
  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: 'monospace',

  // Colors
  colorPrimary: '#268bd2', // Solarized blue
  colorSecondary: '#859900', // Solarized green

  // Toolbar default and active colors
  barTextColor: '#657b83', // Solarized base00
  barSelectedColor: '#268bd2', // Solarized blue
  barBg: '#eee8d5', // Solarized light base2
});

// Create dark theme
const darkTheme = create({
  base: 'dark',
  
  // Brand
  brandTitle: `WOD.Wiki - ${version}`,
  brandUrl: 'https://wod.wiki',
  brandTarget: '_self',    

  // UI
  appBg: '#002b36', // Solarized dark base03
  appContentBg: '#073642', // Solarized dark base02
  appBorderColor: '#586e75', // Solarized dark base01
  appBorderRadius: 8, // Rounded corners for journal feel
  
  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: 'monospace',

  // Colors
  colorPrimary: '#268bd2', // Solarized blue
  colorSecondary: '#2aa198', // Solarized cyan

  // Toolbar default and active colors
  barTextColor: '#839496', // Solarized dark base0
  barSelectedColor: '#268bd2', // Solarized blue
  barBg: '#073642', // Solarized dark base02
});

addons.setConfig({
  theme: lightTheme,
  darkTheme: darkTheme,
  showToolbar: true,
});
