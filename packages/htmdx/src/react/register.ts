import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { register, type HtmdxRegisterOptions } from '../index';
import { compileToReact, listComponents, type HtmdxReactComponents } from './index';

export type HtmdxReactRegisterOptions = Omit<
  HtmdxRegisterOptions,
  'components' | 'render' | 'cleanup'
> & {
  components?: HtmdxReactComponents;
};

const roots = new WeakMap<Element, Root>();

// Same contract as register(), but component blocks render through React so
// the components map can hold real React components (shadcn/ui included).
export function registerReact(options: HtmdxReactRegisterOptions = {}) {
  const { components, ...rest } = options;

  register({
    ...rest,
    render: (host, source) => {
      const element = compileToReact(source, { components });
      let root = roots.get(host);
      if (!root) {
        // The embedded source element is consumed here; renderHost caches the
        // source before this runs, so rerenders keep working.
        host.innerHTML = '';
        root = createRoot(host);
        roots.set(host, root);
      }
      flushSync(() => root.render(element));
      return { components: listComponents(source, components) };
    },
    cleanup: (host) => {
      const root = roots.get(host);
      if (!root) {
        return;
      }
      roots.delete(host);
      root.unmount();
    },
  });
}
