import * as htmdx from './index';

declare global {
  interface Window {
    Htmdx?: typeof htmdx;
  }
}

if (globalThis.window) {
  window.Htmdx = htmdx;
  htmdx.register();
}

export default htmdx;
