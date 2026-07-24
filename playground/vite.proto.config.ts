// PROTOTYPE — throwaway: HTTP-only dev config so the browser smoke test can
// bypass the Tailscale HTTPS cert. Delete with the rest of the prototype.
import baseConfig from './vite.config'

const base = typeof baseConfig === 'object' ? baseConfig : {}

export default {
  ...base,
  server: {
    ...(base.server ?? {}),
    https: undefined,
    hmr: true,
  },
}
