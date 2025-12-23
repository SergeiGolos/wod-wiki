## 2024-05-23 - Accessibility of Icon-Only Buttons
**Learning:** Icon-only buttons (like the '+' command palette trigger or close 'X' buttons) are frequently missed in accessibility passes because they look "clean" visually but offer no context to screen readers.
**Action:** When using `size="icon"` on Buttons, always verify `aria-label` or `sr-only` text is present. Use a linter rule or manual check for `size="icon"` usages.
