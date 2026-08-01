// PROTOTYPE support — throwaway. Same as vite.config.ts but HTTP-only so the
// headless browser can open /proto/calc-authoring without cert errors.
import base from './vite.config';

export default {
    ...base,
    server: {
        ...(base.server ?? {}),
        https: undefined,
        hmr: true,
    },
};
