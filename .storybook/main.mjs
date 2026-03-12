// This file has been automatically migrated to valid ESM format by Storybook.
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  "stories": [
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],

  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
  ],

  "staticDirs": ["../public"],

  "framework": {
    "name": "@storybook/react-vite",
    "options": {
      "builder": {
        "viteConfigPath": "vite.config.ts"
      }
    }
  },

  "typescript": {
    "reactDocgen": false,
  },

  "viteFinal": (config) => {
    // Ensure source maps are generated for debugging
    config.build = config.build || {};
    config.build.sourcemap = true;

    // Enable CSS source maps
    config.css = config.css || {};
    config.css.devSourcemap = true;

    // Deduplicate React to avoid multiple copies during Vitest/Storybook tests
    config.resolve = config.resolve || {};
    config.resolve.dedupe = Array.from(
      new Set([...(config.resolve.dedupe || []), 'react', 'react-dom'])
    );
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(process.cwd(), 'node_modules/react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
    };

    // Disable Vite's publicDir to avoid conflict with Storybook's staticDirs
    // This prevents race condition when copying public assets
    config.publicDir = false;

    // Pre-bundle heavy dependencies to reduce HTTP requests during dev
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      'recharts',
      '@headlessui/react',
      'lucide-react',
      'cmdk',
    ];

    // Allow all hosts (for Tailscale / LAN access)
    config.server = config.server || {};
    config.server.allowedHosts = true;

    // Serve receiver-rpc.html through Vite's transform pipeline (not as static)
    // so that @vitejs/plugin-react injects its preamble for JSX support.
    // Also intercepts /receiver.html so the legacy URL routes to the RPC receiver
    // instead of the old static public/receiver.html served by staticDirs.
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'serve-receiver-rpc',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const isReceiverUrl =
            req.url === '/receiver-rpc.html' ||
            req.url === '/receiver-rpc' ||
            req.url === '/receiver.html' ||
            req.url === '/receiver';
          if (isReceiverUrl) {
            try {
              const htmlPath = path.resolve(process.cwd(), 'playground/receiver-rpc.html');
              const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
              const html = await server.transformIndexHtml('/receiver-rpc.html', rawHtml, req.originalUrl);
              res.setHeader('Content-Type', 'text/html');
              res.statusCode = 200;
              res.end(html);
            } catch (err) {
              console.error('[serve-receiver-rpc] Error transforming HTML:', err);
              next(err);
            }
            return;
          }
          next();
        });
      },
    });

    // Tailscale SSL Detection
    const rootDir = process.cwd();
    const certFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.ts.net.crt'));
    const keyFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.ts.net.key'));

    if (certFiles.length > 0 && keyFiles.length > 0) {
      config.server.https = {
        cert: fs.readFileSync(path.join(rootDir, certFiles[0])),
        key: fs.readFileSync(path.join(rootDir, keyFiles[0])),
      };
      console.log(`\n🔒 Storybook: HTTPS Active (using ${certFiles[0]})\n`);
    }

    return config;
  }
};

export default config;