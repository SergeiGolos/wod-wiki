# Plan: Static Web Application

This plan outlines the creation of a new web application within the `wod-wiki` repository. The application will be a single-page application (SPA) built with React and Vite (using Bun as the package manager and runner), serving the existing `Workbench` component in different modes.

## 1. Project Structure

We will add a new application entry point within the `src` directory to keep it alongside the library code it consumes.

```text
x:\wod-wiki\
├── index.html                  # Entry point for the web app
├── vite.app.config.ts          # Vite configuration for the web app
├── src\
│   ├── app\                    # New application source
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Main component with Routing
│   │   └── pages\
│   │       ├── PlaygroundPage.tsx # Route: /
│   │       ├── NotebookPage.tsx   # Route: /notes
│   │       └── WodPage.tsx        # Route: /note/:id
```

## 2. Infrastructure

1.  **HTML Entry Point (`index.html`)**: A standard HTML file linking to `src/app/main.tsx`.
2.  **Vite Config (`vite.app.config.ts`)**: A dedicated configuration to build the app (distinct from the library build). It will handle:
    *   React plugin.
    *   Path aliases (same as `vite.config.ts`).
    *   PostCSS/Tailwind processing.
3.  **Build Script**: Add `"build:app": "bun x vite build --config vite.app.config.ts"` to `package.json`.

## 3. Application Routes

We will use `react-router-dom` for routing.

### Route `/` : Playground (Static Workbench)
- **Component**: `PlaygroundPage`
- **Behavior**: Displays the `Workbench` with default "getting started" content (similar to `Playground.stories.tsx`).
- **Provider**: `StaticContentProvider` (implicitly via `initialContent` prop) or a simple in-memory provider.

### Route `/notes` : Notebook (Local Storage)
- **Component**: `NotebookPage`
- **Behavior**:
    1.  On mount, checks `LocalStorageContentProvider` for an entry with today's date (or a specific "daily" ID/tag).
    2.  If **not found**, it creates a new entry:
        *   **Title**: "Daily Log - YYYY-MM-DD"
        *   **Content**: A special "Getting Started" markdown template.
        *   **Tags**: `['daily']`
    3.  Loads the `Workbench` with the `LocalStorageContentProvider` and the target entry active.
- **Provider**: `LocalStorageContentProvider`.

### Route `/note/:id` : Generic WOD View
- **Component**: `WodPage`
- **Behavior**:
    1.  Extracts `:id` from the URL (e.g., `fran`, `cindy`).
    2.  Look up the corresponding markdown file from `src/wod/`.
        *   To support this, we will create a `src/app/wod-loader.ts` that uses `import.meta.glob` (Vite feature) to import all `../wod/*.md` files as raw strings.
    3.  If found, renders `Workbench` with the content of that markdown file.
    4.  If not found, renders a 404 state in the Workbench.

## 4. Implementation Steps

### Phase 1: Setup
1.  **Install Dependencies**: `react-router-dom`.
2.  **Create `index.html`**: Root level file.
3.  **Create `vite.app.config.ts`**: Configured for app build.

### Phase 2: Application Code
4.  **Create `src/app/wod-loader.ts`**:
    *   Use `const modules = import.meta.glob('../../wod/*.md', { as: 'raw', eager: true })` to load all WODs.
    *   Export a function `getWodContent(id: string): string | undefined`.
5.  **Create `src/app/pages/PlaygroundPage.tsx`**:
    *   Render `Workbench` with generic initial content.
6.  **Create `src/app/pages/NotebookPage.tsx`**:
    *   Implement usage of `LocalStorageContentProvider`.
    *   Add initialization logic (check/create daily entry).
7.  **Create `src/app/pages/WodPage.tsx`**:
    *   Use `useParams` to get `id`.
    *   Use `getWodContent(id)` to fetch content.
    *   Render `Workbench` with that content.
8.  **Create `src/app/App.tsx`**:
    *   Setup `BrowserRouter` and `Routes`.
9.  **Create `src/app/main.tsx`**:
    *   Mount `App` to DOM.

### Phase 3: Build & Verification
10. **Add Scripts**: Update `package.json`.
11. **Test Build**: Run `bun run build:app`.
12. **Verify**: Serve the `dist` folder and check all 3 routes.

## 5. Technical Considerations

-   **Content Loading**: Using `import.meta.glob` with `{ query: '?raw', eager: true }` ensures the markdown content is bundled directly into the JS, making it "static" and instantly available without extra network requests.
-   **Styling**: `index.css` must be imported in `main.tsx` to ensure Tailwind and global styles are applied.
-   **Workbench Props**: The `Workbench` is designed to be flexible. We will use:
    *   `mode="static"` for `/` and `/note/:id`.
    *   `mode="history"` (or similar) plus `provider` for `/notes`.

