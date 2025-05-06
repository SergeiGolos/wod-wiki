# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.


## Project Structure

```text
x:/wod-wiki
├── .git/                # Git repository metadata
├── .github/             # GitHub workflows and templates
├── .obsidian/           # Obsidian workspace data
├── .storybook/          # Storybook configuration files
├── .vscode/             # VSCode workspace settings
├── dist/                # Build output directory (library and styles)
├── docs/                # Project and component documentation
├── node_modules/        # Project dependencies (ignored by git)
├── public/              # Static assets for Storybook/Vite
├── src/
│   ├── cast/            # Casting utilities or logic
│   ├── components/      # React components
│   │   ├── analyrics/   # Analytics and metrics components
│   │   ├── buttons/     # UI button components
│   │   ├── clock/       # Timer/clock components
│   │   ├── common/      # Shared/common components
│   │   ├── editor/      # Editor-specific components
│   │   ├── hooks/       # React hooks
│   │   └── providers/   # Context providers
│   ├── contexts/        # React context definitions
│   ├── core/            # Core logic (parser, runtime, services, utils)
│   │   ├── fragments/
│   │   ├── jit/
│   │   ├── parser/
│   │   ├── runtime/
│   │   ├── services/
│   │   └── utils/
│   ├── stories/         # Storybook stories for components
│   ├── index.css        # Main CSS entry point (Tailwind directives)
│   └── index.ts         # Library entry point (exports components)
├── storybook-static/    # Static export of Storybook
├── .gitignore           # Specifies intentionally untracked files that Git should ignore
├── .windsurfrules       # Windsurf deployment/config rules
├── package.json         # Project metadata, dependencies, and scripts
├── package-lock.json    # Dependency lockfile
├── postcss.config.js    # PostCSS configuration (for Tailwind)
├── publish-alpha.ps1    # Script for publishing alpha builds
├── README.md            # This file
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration for the library source
├── tsconfig.node.json   # TypeScript configuration for config files (Vite, Storybook)
├── tsconfig.tsbuildinfo # TypeScript incremental build info (ignored by git)
└── vite.config.ts       # Vite configuration for building the library
```

## Documentation

Detailed documentation for the components, architecture, and workout syntax can be found in the `docs` directory:

[Project Documentation](./docs/Welcome.md)

## Development

This project uses Storybook for component development and visualization.

### Install Dependencies

```bash
npm install
```

### **Run Storybook:**

```bash
npm run dev
```

This will start the Storybook development server, typically on `http://localhost:6006`.

## Building the Library

To build the library for publishing or use in other projects:

```shell
npm run build
```

This command will:

1. Compile TypeScript types (`tsc`).
2. Bundle the library code using Vite into the `dist` folder (creating ES and UMD formats).
3. Process and output the Tailwind CSS into `dist/style.css`.

## Building Storybook

To build a static version of the Storybook application (e.g., for deployment):

```bash
npm run build-storybook
```

This will output the static Storybook site to the `storybook-static` directory.

## Consuming the Package

### **Install the package:**

```bash
npm install @bitcobblers/wod-wiki
```

### **Install Peer Dependencies:**

Ensure your project has the required peer dependencies installed:

```bash
npm install react react-dom monaco-editor
```

### **Import the component and styles:**

```jsx
    import React from 'react';
    import { WodWikiEditor } from '@bitcobblers/wod-wiki'; // Example component import
    import '@bitcobblers/wod-wiki/dist/style.css'; // Import the necessary CSS

    function App() {
      return (
        <div>
          <h1>My App</h1>
          <WodWikiEditor 
            language="javascript" 
            initialValue="console.log('Hello from Monaco!');" 
          />
        </div>
      );
    }

    export default App;
    ```

    *Important:* Ensure your application's build process can handle CSS imports and that Tailwind CSS (if used directly in the consuming application) doesn't conflict. The provided `style.css` contains the necessary Tailwind styles for the components.

## Testing

Run tests using Vitest:

```shell
npm run test
```
