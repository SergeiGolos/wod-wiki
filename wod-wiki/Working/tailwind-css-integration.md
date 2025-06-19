---
title: "Implementation: Tailwind CSS Integration"
date: 2025-06-18
tags: [implementation, styling, tailwind, postcss]
status: in-progress
related: ["./design-drift-analysis.md"]
---

# Implementation: Tailwind CSS Integration

## Overview
This document tracks the implementation of Tailwind CSS integration into the WOD Wiki project, including configuration challenges and resolution approaches.

## Project Context
The WOD Wiki project is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. The project uses:
- Storybook for component development and documentation
- Vite as the build tool
- CommonJS module format (`"type": "commonjs"` in package.json)

## Implementation Details

### Initial Approach
1. **Package Installation**: Attempted to install Tailwind CSS v4 (next/alpha version)
   ```bash
   npm install -D tailwindcss@next postcss autoprefixer
   ```

2. **Configuration Files Created**:
   - `tailwind.config.js` - Content paths and theme configuration
   - `postcss.config.js` - PostCSS plugin configuration
   - `src/index.css` - Tailwind directives and custom styles

3. **Storybook Integration**:
   - Added CSS import to `.storybook/preview.js`
   - Updated story files to import styles

### Challenges Encountered

#### Challenge 1: Module Format Conflicts
**Issue**: ES module syntax in config files conflicted with CommonJS project setup
**Error**: Build failures due to `export default` syntax
**Resolution**: Switched config files to use `module.exports` syntax

#### Challenge 2: Missing Native Dependencies
**Issue**: `lightningcss.win32-x64-msvc.node` module not found
**Error**: 
```
Cannot find module '../lightningcss.win32-x64-msvc.node'
```
**Root Cause**: Tailwind CSS v4 uses Lightning CSS engine with native dependencies that had installation issues on Windows

#### Challenge 3: PostCSS Plugin Architecture Changes
**Issue**: Direct use of `tailwindcss` as PostCSS plugin deprecated in v4
**Error**: 
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. 
The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS 
with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
```

### Resolution Strategy

#### Step 1: Clean Installation
- Removed `node_modules` and `package-lock.json`
- Performed fresh dependency installation

#### Step 2: Stable Version Adoption
- Uninstalled Tailwind CSS v4 (alpha/next versions)
- Installed stable Tailwind CSS v3 packages:
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  ```

#### Step 3: Configuration Standardization
Updated configuration files to use CommonJS format compatible with project setup:

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**postcss.config.js**:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Current Status
- **Status**: Complete
- **Resolution**: Successfully implemented using stable Tailwind CSS v3
- **Storybook**: Running successfully on localhost:6006

## File Structure Changes
```
x:\wod-wiki\
├── src\
│   └── index.css              # Tailwind directives + custom styles
├── .storybook\
│   └── preview.js             # Global CSS import for Storybook
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
└── stories\
    └── Parser.stories.tsx     # Updated with CSS import
```

## Lessons Learned
1. **Version Stability**: Alpha/next versions of major tools can have significant compatibility issues
2. **Module Format Consistency**: Ensure configuration files match project's module system
3. **Native Dependencies**: Windows environments may have additional challenges with native modules
4. **PostCSS Evolution**: Major version changes can introduce breaking changes in plugin architecture

## Recommendations
1. Use stable versions for production projects
2. Test configuration changes incrementally
3. Maintain consistent module format across configuration files
4. Consider alternative CSS approaches if PostCSS integration proves problematic

## Dependencies
- Tailwind CSS documentation for configuration patterns
- PostCSS plugin documentation for integration approaches
- Storybook CSS handling best practices
