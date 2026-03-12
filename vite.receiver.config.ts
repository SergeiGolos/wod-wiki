/**
 * Vite config for building the Chromecast RPC receiver as a standalone page.
 *
 * Used by `postbuild-storybook` to compile receiver-rpc.html + its bundled
 * JS/CSS into storybook-static/ so it's served alongside Storybook on
 * GitHub Pages.
 *
 * Also used by `dev:app` when the receiver needs its own dev server,
 * but the primary dev path is via the Storybook middleware in .storybook/main.mjs.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    // Relative base so assets resolve correctly whether served at / or a subpath
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        // Output directly into storybook-static (files are merged, not replaced)
        outDir: 'storybook-static',
        // Do NOT empty — storybook build already populated this directory
        emptyOutDir: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                'receiver-rpc': resolve(__dirname, 'playground/receiver-rpc.html'),
            },
            output: {
                // Put JS/CSS in assets/ matching Storybook's convention
                entryFileNames: 'assets/receiver-[name]-[hash].js',
                chunkFileNames: 'assets/receiver-[name]-[hash].js',
                assetFileNames: 'assets/receiver-[name]-[hash][extname]',
            },
        },
    },
    css: {
        devSourcemap: true,
    },
});
