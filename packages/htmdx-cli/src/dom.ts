// The runtime validates by rendering, so it needs a DOM. Node has none, so
// the CLI installs jsdom globals before the runtime module is loaded.

import { JSDOM } from 'jsdom';

export function installDom(): void {
  if (globalThis.document) {
    return;
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    HTMLTemplateElement: dom.window.HTMLTemplateElement,
    DOMParser: dom.window.DOMParser,
    CustomEvent: dom.window.CustomEvent,
    customElements: dom.window.customElements,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    MutationObserver: dom.window.MutationObserver,
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  });
}
