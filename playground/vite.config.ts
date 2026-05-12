import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

// Auto-detect Tailscale SSL certs for HTTPS (required for Chromecast)
const projectRoot = resolve(__dirname, '..');
const certFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.ts.net.crt'));
const keyFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.ts.net.key'));
const https = certFiles.length > 0 && keyFiles.length > 0
    ? { cert: fs.readFileSync(resolve(projectRoot, certFiles[0])), key: fs.readFileSync(resolve(projectRoot, keyFiles[0])) }
    : undefined;

const hmrHost = certFiles.length > 0 ? certFiles[0].replace('.crt', '') : undefined;

// Dev plugin: intercept receiver URLs and serve the RPC version through Vite's
// transform pipeline so that @vitejs/plugin-react injects its JSX preamble.
const receiverRedirectPlugin: Plugin = {
    name: 'receiver-redirect',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            const isReceiverUrl =
                req.url === '/receiver-rpc.html' ||
                req.url === '/receiver-rpc' ||
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
    root: __dirname,
    envDir: projectRoot,
    base: process.env.VITE_BASE_PATH || '/',
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), receiverRedirectPlugin],
    resolve: {
        alias: {
            '@': resolve(__dirname, '../src'),
        },
    },
    server: { allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true,  allowedHosts: true, 
        host: '0.0.0.0',
        ...(https ? { https } : {}),
        hmr: hmrHost ? { host: hmrHost } : true,
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
