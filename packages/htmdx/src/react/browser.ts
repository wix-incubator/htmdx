// Self-contained browser bundle: one script tag injects React rendering, the
// shadcn/ui component pack, its theme, and the Tailwind browser runtime into
// a plain HTML artifact. The string-only runtime remains dist/browser.js.
import { VERSION } from '../version';
import { builtInReactComponents, compileToReact, Htmdx, listComponents } from './index';
import { registerReact } from './register';
import { shadcnComponents } from './shadcn';
import { injectShadcnTheme } from './shadcn/theme';

// String built-ins (bridged) plus the shadcn pack. On name collisions
// (Card) the shadcn component wins; the manifest documents the merged set.
const components = { ...builtInReactComponents, ...shadcnComponents };

const api = {
  VERSION,
  compileToReact,
  Htmdx,
  listComponents,
  registerReact,
  components,
  builtInReactComponents,
  shadcnComponents,
  injectShadcnTheme,
};

declare global {
  interface Window {
    HtmdxReact?: typeof api;
  }
}

if (globalThis.window) {
  window.HtmdxReact = api;
  injectShadcnTheme();
  registerReact({ components });
  window.dispatchEvent(new CustomEvent('htmdx:react-ready', { detail: { version: VERSION } }));
}

export default api;
