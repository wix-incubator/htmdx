// Self-contained browser bundle: one script tag injects React rendering, the
// shadcn/ui component pack, its theme, and the Tailwind browser runtime into
// a plain HTML artifact. The string-only runtime remains dist/browser.js.
import { VERSION } from '../version';
import { compileToReact, Htmdx, listComponents } from './index';
import { registerReact } from './register';
import { shadcnComponents } from './shadcn';
import { injectShadcnTheme } from './shadcn/theme';

const api = {
  VERSION,
  compileToReact,
  Htmdx,
  listComponents,
  registerReact,
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
  registerReact({ components: shadcnComponents });
  window.dispatchEvent(new CustomEvent('htmdx:react-ready', { detail: { version: VERSION } }));
}

export default api;
