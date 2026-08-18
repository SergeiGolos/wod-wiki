/**
 * ts-prune stubs for the @wod-wiki/* workspace packages.
 *
 * The unused-export regression check analyzes the app layer (src/) only —
 * the same scope it had before the monorepo extraction. Pointing ts-prune's
 * program at the packages' real sources makes its usage scan effectively
 * unbounded (5k+ files), so the packages are stubbed as `any` modules here.
 * The packages never import from src/, so excluding them cannot hide a
 * src export that is actually used.
 */
declare const engineModule: any;
export = engineModule;
