// Renders a ```mermaid fence as a real diagram, in the browser only.
//
// Mermaid is ~800KB gzip — six times the whole runtime — so it is never
// bundled. It is fetched from a CDN the first time a document actually
// contains a diagram, the same trade `injectTailwindBrowser` makes.
//
// Mermaid's SVG is a string produced by a third party, so it does not go into
// the DOM as markup. It is re-parsed and vetted against the same allowlist
// authored SVG passes (ADR `support-inline-svg`), which is what keeps
// `<foreignObject>`, `<script>`, and `on*` out of a graphic no matter what the
// library emits. Anything that fails leaves the fence text on screen.
import { createElement, useEffect, useState, type ReactNode } from 'react';
import { SVG_ELEMENTS, safeSvgProps } from '../components/svg-elements';
import { CodeBlock } from './CodeBlock';

export type HtmdxMermaidOptions = boolean | { src?: string };

export const DEFAULT_MERMAID_SRC =
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

// `secure` locks these keys against an in-source `%%{init: ...}%%` directive.
// `securityLevel: 'strict'` is what disables mermaid's `click` handlers, and
// `htmlLabels: false` makes it draw labels as `<text>`/`<tspan>` instead of
// wrapping HTML in a `<foreignObject>` the allowlist would drop. `flowchart` is
// locked as a whole because its own `htmlLabels` is a separate key a directive
// could otherwise raise on its own.
const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'htmlLabels', 'flowchart'],
};

type MermaidApi = {
  initialize: (config: unknown) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

type Diagram = { svg: ReactNode; css: string };

// A diagram that degrades is silent on the page — the fence text looks like a
// deliberate code block — so the reason goes to the console, where the agent or
// author that wrote the diagram can see it.
// oxlint-disable-next-line no-console
const warn = (message: string) => console.warn(`[htmdx] ${message}`);

let enabled = true;
let source = DEFAULT_MERMAID_SRC;
let loading: Promise<MermaidApi> | null = null;
let diagramCount = 0;

/** Applies `register({ mermaid })`. Called before any diagram mounts. */
export function configureMermaid(options: HtmdxMermaidOptions = true) {
  enabled = options !== false;
  source = (typeof options === 'object' && options.src) || DEFAULT_MERMAID_SRC;
  loading = null;
}

export function MermaidDiagram({ source: diagramSource }: { source: string }) {
  const [diagram, setDiagram] = useState<Diagram | null>(null);

  // An external renderer that is fetched over the network and answers with a
  // promise: there is nothing to derive during render and no store to
  // subscribe to, so this is the case the "avoid useEffect" rule leaves open.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    renderDiagram(diagramSource).then(
      (result) => {
        if (active) {
          setDiagram(result);
        }
      },
      (error: unknown) => {
        warn(`mermaid diagram failed to render: ${error}`);
      },
    );

    return () => {
      active = false;
    };
  }, [diagramSource]);

  if (!diagram) {
    return createElement(CodeBlock, { code: diagramSource, language: 'mermaid' });
  }

  return createElement(
    'div',
    { className: 'htmdx-mermaid' },
    diagram.css ? createElement('style', null, diagram.css) : null,
    diagram.svg,
  );
}

async function renderDiagram(diagramSource: string): Promise<Diagram> {
  const mermaid = await loadMermaid();
  // The id is what mermaid scopes its stylesheet to, so it has to be unique
  // per diagram and valid in a CSS selector.
  diagramCount += 1;
  const { svg } = await mermaid.render(`htmdx-mermaid-${diagramCount}`, diagramSource);
  return svgToDiagram(svg);
}

function loadMermaid() {
  // `@vite-ignore`: the URL is a runtime option, so the bundler must leave the
  // import alone rather than try to resolve or inline mermaid.
  loading ??= import(/* @vite-ignore */ source).then((module: { default?: MermaidApi }) => {
    const mermaid = (module.default ?? module) as MermaidApi;
    mermaid.initialize(MERMAID_CONFIG);
    return mermaid;
  });
  return loading;
}

export function svgToDiagram(svg: string): Diagram {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('mermaid did not return an <svg> element');
  }

  const styles: string[] = [];
  const dropped = new Set<string>();
  const element = elementToReact(root, 'mermaid', styles, dropped);
  if (dropped.size > 0) {
    warn(`mermaid output dropped: ${Array.from(dropped).toSorted().join(', ')}`);
  }

  return { svg: element, css: safeCss(styles.join('\n')) };
}

function elementToReact(
  element: Element,
  key: string,
  styles: string[],
  dropped: Set<string>,
): ReactNode {
  const tag = element.tagName.toLowerCase();
  // Mermaid puts its stylesheet inside the graphic. `<style>` is not in the
  // SVG allowlist and is not going to be, so the CSS is lifted out and
  // rendered as the diagram's own sibling element instead — filtered, and
  // already scoped by mermaid to the id above.
  if (tag === 'style') {
    styles.push(element.textContent || '');
    return null;
  }

  const canonical = SVG_ELEMENTS.get(tag);
  if (!canonical) {
    dropped.add(`<${tag}>`);
    return null;
  }

  const props: Record<string, unknown> = {
    key,
    ...safeSvgProps(
      canonical,
      element.getAttributeNames().map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
      })),
    ),
  };

  const children = Array.from(element.childNodes)
    .map((child, index) => {
      if (child.nodeType === 3) {
        return child.nodeValue;
      }
      if (child.nodeType !== 1) {
        return null;
      }
      return elementToReact(child as Element, `${key}-${index}`, styles, dropped);
    })
    .filter((child) => child !== null);

  return createElement(canonical, props, ...children);
}

// A stylesheet is coarser than the `style` attribute `safeStyle` handles: it
// can also fetch a remote document through `@import` or `image-set()`. None of
// those belong in a diagram's own styling, and mermaid emits none of them, so
// a stylesheet carrying one is dropped whole rather than repaired.
const UNSAFE_AT_RULE = /@import|image-set\s*\(|expression\s*\(/i;
const CSS_URL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi;
const LOCAL_REFERENCE = /^#[A-Za-z_][\w.:-]*$/;

export function safeCss(css: string) {
  if (UNSAFE_AT_RULE.test(css)) {
    return '';
  }
  const urls = Array.from(css.matchAll(CSS_URL));
  return urls.every((match) => LOCAL_REFERENCE.test(match[2].trim())) ? css : '';
}
