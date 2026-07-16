// Self-contained browser runtime: one script tag injects React, the built-in
// catalog, the shadcn/ui pack, its theme, and the Tailwind browser compiler.
import * as React from 'react';
import * as htmdx from './index';
import { injectShadcnTheme } from './react/shadcn';

// Extension scripts need createElement to define components without a build
// step; expose the bundled React so they don't load a second copy.
const api = { ...htmdx, React };

declare global {
  interface Window {
    Htmdx?: typeof api;
  }
}

if (globalThis.window) {
  window.Htmdx = api;
  injectShadcnTheme();
  htmdx.register();
  window.dispatchEvent(
    new CustomEvent('htmdx:ready', {
      detail: { version: htmdx.VERSION },
    }),
  );
}

// The IIFE global (`var Htmdx = ...`) overwrites the window.Htmdx assignment
// above; export the same enriched api so both references match.
export default api;
