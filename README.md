# WOD Wiki

A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. Features include a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

## Project Goal

- Build an NPM module for reusable UI components.
- Utilize Tailwind CSS for styling.
- Develop components within a Storybook environment.
- Include a component embedding the Monaco Editor.
- Use Vite for building the library and Vitest for testing.

## Project Structure

```
x:/wod-wiki
├── .storybook/         # Storybook configuration files
├── dist/               # Build output directory (library and styles)
├── node_modules/       # Project dependencies (ignored by git)
├── src/
│   ├── components/     # React components
│   │   └── MonacoEditorComponent.tsx
│   ├── stories/        # Storybook stories for components
│   │   └── MonacoEditorComponent.stories.tsx
│   ├── index.css       # Main CSS entry point (Tailwind directives)
│   └── index.ts        # Library entry point (exports components)
├── .gitignore          # Specifies intentionally untracked files that Git should ignore
├── package.json        # Project metadata, dependencies, and scripts
├── postcss.config.js   # PostCSS configuration (for Tailwind)
├── README.md           # This file
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration for the library source
├── tsconfig.node.json  # TypeScript configuration for config files (Vite, Storybook)
├── vite.config.ts      # Vite configuration for building the library
└── tsconfig.tsbuildinfo # TypeScript incremental build info (ignored by git)
```

## Documentation

Detailed documentation for the components, architecture, and workout syntax can be found in the `docs` directory:

[Project Documentation](./docs/README.md)

## Development

This project uses Storybook for component development and visualization.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run Storybook:**
    ```bash
    npm run dev
    ```
    This will start the Storybook development server, typically on `http://localhost:6006`.

## Building the Library

To build the library for publishing or use in other projects:

```bash
npm run build
```

This command will:
1.  Compile TypeScript types (`tsc`).
2.  Bundle the library code using Vite into the `dist` folder (creating ES and UMD formats).
3.  Process and output the Tailwind CSS into `dist/style.css`.

## Building Storybook

To build a static version of the Storybook application (e.g., for deployment):

```bash
npm run build-storybook
```

This will output the static Storybook site to the `storybook-static` directory.

## Consuming the Package

1.  **Install the package:**
    ```bash
    npm install wod-wiki
    ```
    *Note: Replace `wod-wiki` with the actual package name if published to npm, or use a local path/link during development.* 

2.  **Install Peer Dependencies:** Ensure your project has the required peer dependencies installed:
    ```bash
    npm install react react-dom monaco-editor
    ```

3.  **Import the component and styles:**
    ```jsx
    import React from 'react';
    import { WodWikiEditor } from 'wod-wiki'; // Example component import
    import 'wod-wiki/dist/style.css'; // Import the necessary CSS

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

```bash
npm run test
```
_(Test files need to be created within the `src` directory)._
