import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

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

export default defineConfig(({ mode }) => {
    // Load env from repo root; '' prefix loads all variables (not just VITE_*)
    const env = loadEnv(mode, resolve(__dirname, '..'), '');

    // HTTPS is opt-in via .env.local. Set HTTPS_CERT, HTTPS_KEY, and HTTPS_HOST
    // to enable TLS (e.g. for Tailscale/Pluto DNS). By default the server runs
    // over plain HTTP so anyone cloning the repo can start it without extra setup.
    const https =
        env.HTTPS_CERT && env.HTTPS_KEY
            ? {
                  cert: fs.readFileSync(env.HTTPS_CERT),
                  key: fs.readFileSync(env.HTTPS_KEY),
              }
            : undefined;

    const hmrHost = env.HTTPS_HOST || undefined;

    return {
        root: __dirname,
        base: '/',
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
        },
        plugins: [react(), receiverRedirectPlugin],
        resolve: {
            alias: {
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
            },
        },
        css: {
            devSourcemap: true,
        },
    };
});
