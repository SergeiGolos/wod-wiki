declare module '*.md?raw' {
    const content: string;
    export default content;
}

/** Vite `define` stamp from public/seed/manifest.json (seed unification, phase 2). */
declare const __SEED_VERSION__: number;
declare module '*.css';

/// <reference types="vite/client" />
