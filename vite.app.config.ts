import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Auto-detect Tailscale SSL certs for HTTPS (required for Chromecast)
const certFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.ts.net.crt'));
const keyFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.ts.net.key'));
const https = certFiles.length > 0 && keyFiles.length > 0
    ? { cert: fs.readFileSync(resolve(__dirname, certFiles[0])), key: fs.readFileSync(resolve(__dirname, keyFiles[0])) }
    : undefined;

// Dev plugin: intercept /receiver.html and serve the RPC version instead
const receiverRedirectPlugin: Plugin = {
    name: 'receiver-redirect',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            const isReceiverUrl =
                req.url === '/receiver.html' ||
                req.url === '/receiver';
            if (isReceiverUrl) {
                try {
                    const htmlPath = resolve(__dirname, 'receiver-rpc.html');
                    const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
                    const html = await server.transformIndexHtml('/receiver-rpc.html', rawHtml, req.originalUrl ?? '');
                    res.setHeader('Content-Type', 'text/html');
                    res.statusCode = 200;
                    res.end(html);
                } catch (err) {
                    next(err);
                }
                return;
            }
            next();
        });
    },
};

export default defineConfig({
    base: './',
    plugins: [react(), receiverRedirectPlugin],
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
                'receiver-rpc': resolve(__dirname, 'receiver-rpc.html'),
            },
        },
    },
    css: {
        devSourcemap: true,
    },
});
