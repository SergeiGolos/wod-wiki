// Temporary smoke-test config: playground config minus HTTPS (local cert is
// not trusted by the automation browser). Delete after use.
import base from './vite.config'

export default {
  ...base,
  server: {
    ...base.server,
    https: undefined,
  },
}
