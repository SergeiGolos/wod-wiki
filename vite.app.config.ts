import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Auto-detect Tailscale SSL certs for HTTPS (required for Chromecast)
const certFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.ts.net.crt'));
const keyFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.ts.net.key'));
const https = certFiles.length > 0 && keyFiles.length > 0
    ? { cert: fs.readFileSync(resolve(__dirname, certFiles[0])), key: fs.readFileSync(resolve(__dirname, keyFiles[0])) }
    : undefined;

export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        host: '0.0.0.0',
        ...(https ? { https } : {}),
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                receiver: resolve(__dirname, 'public/receiver.html'),
                'receiver-rpc': resolve(__dirname, 'receiver-rpc.html'),
            },
        },
    },
    css: {
        devSourcemap: true,
    },
});
