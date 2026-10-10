# syntax=docker/dockerfile:1
# wod.wiki server — Bun API serving the same-origin API playground (dist-api).
FROM oven/bun:1.4.2-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/
COPY packages/lang/package.json packages/lang/
COPY packages/storage/package.json packages/storage/
COPY packages/wql/package.json packages/wql/
COPY packages/engine/package.json packages/engine/
COPY packages/ui/package.json packages/ui/
COPY apps/playground/package.json apps/playground/
COPY apps/storybook/package.json apps/storybook/
COPY apps/api/package.json apps/api/
RUN bun install --frozen-lockfile

# Library packages + API playground. The seed compiler reads markdown/;
# git-derived created-at falls back to 0 without a .git dir.
# build:packages:seq skips the host-side flock wrapper (fresh container).
# Vite resolves postcss/tailwind config from the repo root.
COPY tsconfig.json tsconfig.base.json postcss.config.cjs tailwind.config.cjs ./
COPY scripts ./scripts
COPY markdown ./markdown
COPY packages ./packages
COPY apps/playground ./apps/playground
RUN bun run build:packages:seq \
    && bun run --filter '@bitcobblers/wod-wiki-playground' build:api

# Runtime: production deps only, no dev tooling.
FROM oven/bun:1.4.2-slim
WORKDIR /app
ENV NODE_ENV=production

# Same workspace metadata for a production-only install from the frozen lockfile.
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/
COPY packages/lang/package.json packages/lang/
COPY packages/storage/package.json packages/storage/
COPY packages/wql/package.json packages/wql/
COPY packages/engine/package.json packages/engine/
COPY packages/ui/package.json packages/ui/
COPY apps/playground/package.json apps/playground/
COPY apps/storybook/package.json apps/storybook/
COPY apps/api/package.json apps/api/
RUN bun install --frozen-lockfile --production

# Built package dists (apps/api imports @bitcobblers/wod-wiki-storage), the
# API-enabled SPA, and server source (Bun runs TS directly).
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/lang/dist ./packages/lang/dist
COPY --from=build /app/packages/storage/dist ./packages/storage/dist
COPY --from=build /app/packages/wql/dist ./packages/wql/dist
COPY --from=build /app/packages/engine/dist ./packages/engine/dist
COPY --from=build /app/packages/ui/dist ./packages/ui/dist
COPY --from=build /app/apps/playground/dist-api ./apps/playground/dist-api
COPY apps/api/src ./apps/api/src

# Durable data on the /data volume; DB_DRIVER selects sqlite|turso|postgres.
RUN mkdir -p /data && chown bun:bun /data
USER bun
ENV HOST=0.0.0.0 PORT=3000 DB_DRIVER=sqlite SQLITE_PATH=/data/wodwiki.db PLAYGROUND_DIST=/app/apps/playground/dist-api
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`).then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]

# Exec form + SIGTERM handling in src/index.ts → signal-safe shutdown.
WORKDIR /app/apps/api
CMD ["bun", "src/index.ts"]
