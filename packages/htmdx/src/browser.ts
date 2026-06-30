import * as htmdx from './index';

declare global {
  interface Window {
    Htmdx?: typeof htmdx;
  }
}

if (globalThis.window) {
  window.Htmdx = htmdx;
  window.dispatchEvent(
    new CustomEvent('htmdx:ready', {
      detail: { version: htmdx.VERSION },
    }),
  );
  htmdx.register();
}

export default htmdx;
