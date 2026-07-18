import type { HtmdxReactComponents } from '../index';

export { injectShadcnTheme, SHADCN_THEME_STYLE_ID, shadcnThemeCss } from './theme';
export { shadcnManifestComponents } from './manifest';

// All shadcn components now flow through the definition catalog. Keep the
// legacy map empty until the compatibility API is removed in the v4 release.
export const shadcnComponents = {} satisfies HtmdxReactComponents;
