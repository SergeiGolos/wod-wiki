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
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import postcss from 'postcss';
import { transform as lightningTransform } from 'lightningcss';

/**
 * Lowers the emitted receiver CSS for Chromecast firmware Chromium /
 * Android System WebView (commonly < Chrome 99). Tailwind v4 emits every
 * rule inside `@layer` blocks, which those engines discard wholesale — the
 * receiver renders with no styling at all. Two passes:
 *
 *   1. postcss — unwrap `@layer` blocks in document order (single cascade
 *      order in this file, so semantics are preserved) and drop `@property`
 *      registrations (unsupported; old parsers skip them anyway).
 *   2. lightningcss at chrome 87 — lowers oklch/lab colors to hex/rgb
 *      fallbacks, keeping modern values behind `@supports` upgrades.
 *
 * Dev-server rendering (local debug tab) is untouched; only the built
 * artifact is rewritten. See docs/cast-research/chromecast-receiver-css-legacy.md.
 */
const legacyReceiverCssPlugin = (): Plugin => ({
    name: 'legacy-receiver-css',
    apply: 'build',
    closeBundle() {
        const assetsDir = resolve(__dirname, '../../dist/assets');
        const cssFiles = fs.existsSync(assetsDir)
            ? fs.readdirSync(assetsDir).filter((f) => f.startsWith('receiver-') && f.endsWith('.css'))
            : [];
        for (const file of cssFiles) {
            const filePath = resolve(assetsDir, file);
            const root = postcss.parse(fs.readFileSync(filePath, 'utf-8'), { from: filePath });
            root.walkAtRules('layer', (rule) => {
                if (rule.nodes && rule.nodes.length > 0) rule.replaceWith(...rule.nodes);
                else rule.remove();
            });
            root.walkAtRules('property', (rule) => rule.remove());
            const { code, map } = lightningTransform({
                filename: file,
                code: Buffer.from(root.toString()),
                minify: true,
                sourceMap: true,
                targets: { chrome: 87 << 16 },
            });
            fs.writeFileSync(filePath, `${code}\n/*# sourceMappingURL=${file}.map */`);
            if (map) fs.writeFileSync(`${filePath}.map`, map);
        }
    },
});

export default defineConfig({
    // Root is this app directory so that /app/receiver-rpc.tsx in
    // receiver-rpc.html resolves to apps/playground/app/receiver-rpc.tsx.
    root: __dirname,
    // Relative base so assets resolve correctly whether served at / or a subpath
    base: './',
    plugins: [react(), legacyReceiverCssPlugin()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        // Merge into the repo-root dist/ that the PR pipeline just
        // downloaded (playground-dist artifact) before the S3 sync, so the
        // Chromecast receiver page ships on the preview origin.
        outDir: resolve(__dirname, '../../dist'),
        // Do NOT empty — the playground bundle already populated this directory
        emptyOutDir: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                'receiver-rpc': resolve(__dirname, 'receiver-rpc.html'),
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
