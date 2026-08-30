// Empty browser shim for Node built-in modules in browser builds
export default {};
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const resolve = (...args: string[]) => args.join('/');
export const join = (...args: string[]) => args.join('/');
export const dirname = (p: string) => p;
export const basename = (p: string) => p;
export const extname = () => '';
export const fileURLToPath = (u: string) => u;
export const pathToFileURL = (p: string) => ({ href: p });
