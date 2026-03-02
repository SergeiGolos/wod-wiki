import { addons } from 'storybook/manager-api';

// Hide the addon panel by default.
// bottomPanelHeight: 0 is what Storybook 10 actually uses to determine
// whether the panel is shown (getIsPanelShown checks height > 0).
addons.setConfig({
  showPanel: false,
  bottomPanelHeight: 0,
  rightPanelWidth: 0,
});
