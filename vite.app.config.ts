import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                receiver: resolve(__dirname, 'public/receiver.html'),
            },
        },
    },
    css: {
        devSourcemap: true,
    },
});
