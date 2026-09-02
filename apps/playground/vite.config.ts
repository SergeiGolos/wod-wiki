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

const pkg = JSON.parse(fs.readFileSync(resolve(import.meta.dirname, './package.json'), 'utf-8'));

// Auto-detect Tailscale SSL certs for HTTPS (required for Chromecast)
const projectRoot = resolve(import.meta.dirname, '../..');
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
                    const htmlPath = resolve(import.meta.dirname, 'receiver-rpc.html');
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
    root: import.meta.dirname,
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
        alias: [
            { find: "url", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            { find: "node:url", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            { find: "path", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            { find: "node:path", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            { find: "fs", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            { find: "node:fs", replacement: resolve(import.meta.dirname, "../../scripts/empty-shim.ts") },
            // Workspace source aliases — instant HMR for packages/* edits with
            // zero build step. Most-specific first; dirs expand to their subtree.
            { find: '@bitcobblers/wod-wiki-lang/react', replacement: resolve(import.meta.dirname, '../../packages/lang/src/react.ts') },
            { find: /^@bitcobblers\/wod-wiki-ui\/styles\.css$/, replacement: resolve(import.meta.dirname, '../../packages/ui/src/styles.css') },
            { find: /^@bitcobblers\/wod-wiki-ui\/extensions$/, replacement: resolve(import.meta.dirname, '../../packages/ui/src/extensions/index.ts') },
            { find: '@bitcobblers/wod-wiki-core', replacement: resolve(import.meta.dirname, '../../packages/core/src') },
            { find: '@bitcobblers/wod-wiki-lang', replacement: resolve(import.meta.dirname, '../../packages/lang/src') },
            { find: '@bitcobblers/wod-wiki-wql', replacement: resolve(import.meta.dirname, '../../packages/wql/src') },
            { find: '@bitcobblers/wod-wiki-engine', replacement: resolve(import.meta.dirname, '../../packages/engine/src') },
            { find: '@bitcobblers/wod-wiki-ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
            // `@/` -> ./src for app-support library imports (hooks, clock,
            // runtime views); application code itself lives under ./app.
            { find: '@', replacement: resolve(import.meta.dirname, 'src') },
        ],
    },
    server: {
        host: '0.0.0.0',
        ...(https ? { https } : {}),
        hmr: hmrHost ? { host: hmrHost } : true,
    },
    build: {
        chunkSizeWarningLimit: 2000,
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                'receiver-rpc': resolve(import.meta.dirname, 'receiver-rpc.html'),
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
