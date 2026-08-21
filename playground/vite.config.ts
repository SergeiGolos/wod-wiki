import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
const CODEMIRROR_SINGLETON_DEPS = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/theme-one-dark',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  '@lezer/markdown',
];

const pkg = JSON.parse(fs.readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

// Auto-detect Tailscale SSL certs for HTTPS (required for Chromecast)
const projectRoot = resolve(__dirname, '..');
const certFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.ts.net.crt'));
const keyFiles = fs.readdirSync(projectRoot).filter(f => f.endsWith('.ts.net.key'));
const https = !process.env.VITE_NO_HTTPS && certFiles.length > 0 && keyFiles.length > 0
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
        // CI pipelines stamp the deployed artifact's version via VITE_APP_VERSION
        // (tagged version on main/prod, X.Y.Z-pr.N on PR previews); local dev
        // and library builds fall back to package.json.
        __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version),
    },
    plugins: [react(), receiverRedirectPlugin],
    resolve: {
        dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
        alias: {
            // `@/` -> ../src remains for app-internal imports; @wod-wiki/* packages
            // resolve through the workspace node_modules + their exports maps
            // (packages/engine, packages/ui) — see CODEMIRROR_SINGLETON_DEPS dedupe.
            '@': resolve(__dirname, '../src'),
        },
    },
    server: {
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
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    // CodeMirror + Lezer — large, stable, zero React deps; cache separately
                    if (id.includes('@codemirror') || id.includes('@lezer') || id.includes('codemirror')) {
                        return 'vendor-codemirror';
                    }
                    // Everything else (React, router, recharts, zustand…) in one
                    // stable vendor chunk. Keeping them together avoids the circular
                    // dependency Rollup emits when React's scheduler is split out.
                    return 'vendor';
                },
            },
        },
    },
    css: {
        devSourcemap: true,
    },
    optimizeDeps: {
        exclude: ['@lezer/common'],
    },
});
