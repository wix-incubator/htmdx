// Raw HTML in HTMDX source is allowlisted, never passed through: only these
// elements render, only these attributes survive, URL-bearing attributes are
// scheme-checked, and event handlers are rejected. An element outside the list
// stays literal Markdown text at the top level; inside a component body it
// keeps the passthrough that predates this allowlist, so existing documents
// still compile. Either way, agent-authored HTML cannot express code.
// Inline SVG answers to its own allowlist in `svg-elements.ts`.
import { HtmdxSourceError } from '../diagnostics';
import { safeHref } from './rendering';

// Elements that start an HTML block when they open a line: everything up to the
// matching close tag is parsed as markup, so blank lines and nested components
// stay inside one block.
const BLOCK_ELEMENTS = [
  'address',
  'article',
  'aside',
  'audio',
  'blockquote',
  'caption',
  'col',
  'colgroup',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'iframe',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'picture',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
  'video',
];

const INLINE_ELEMENTS = [
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'i',
  'img',
  'ins',
  'kbd',
  'mark',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'track',
  'u',
  'var',
  'wbr',
];

// Containers that hold flow content: Markdown inside them renders as blocks, so
// a heading or list written between blank lines stays a heading or a list.
// Text-level containers (`p`, headings, table rows, media) are excluded because
// block children would be invalid there.
const FLOW_CONTAINERS = [
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'details',
  'div',
  'figcaption',
  'figure',
  'footer',
  'header',
  'li',
  'main',
  'nav',
  'section',
  'td',
  'th',
];

export const HTML_BLOCK_ELEMENTS = new Set(BLOCK_ELEMENTS);
export const HTML_FLOW_CONTAINERS = new Set(FLOW_CONTAINERS);
export const HTML_ELEMENTS = new Set([...BLOCK_ELEMENTS, ...INLINE_ELEMENTS]);
// Void elements never have a close tag, so tag scanning must not go looking for
// one: an unbounded search per `<br>` turns a long document quadratic.
export const HTML_VOID_ELEMENTS = new Set(['br', 'col', 'hr', 'img', 'source', 'track', 'wbr']);

const GLOBAL_ATTRIBUTES = new Set([
  'class',
  'dir',
  'hidden',
  'id',
  'lang',
  'role',
  'style',
  'tabindex',
  'title',
]);

const ELEMENT_ATTRIBUTES = new Map([
  ['a', new Set(['download', 'href', 'hreflang', 'rel', 'target', 'type'])],
  ['audio', new Set(['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src'])],
  ['blockquote', new Set(['cite'])],
  ['col', new Set(['span'])],
  ['colgroup', new Set(['span'])],
  ['data', new Set(['value'])],
  ['del', new Set(['cite', 'datetime'])],
  ['details', new Set(['open'])],
  [
    'iframe',
    new Set([
      'allow',
      'allowfullscreen',
      'height',
      'loading',
      'referrerpolicy',
      'sandbox',
      'src',
      'width',
    ]),
  ],
  ['ins', new Set(['cite', 'datetime'])],
  ['li', new Set(['value'])],
  ['ol', new Set(['reversed', 'start', 'type'])],
  ['q', new Set(['cite'])],
  ['source', new Set(['height', 'media', 'sizes', 'src', 'srcset', 'type', 'width'])],
  ['td', new Set(['colspan', 'headers', 'rowspan'])],
  ['th', new Set(['abbr', 'colspan', 'headers', 'rowspan', 'scope'])],
  ['time', new Set(['datetime'])],
  ['track', new Set(['default', 'kind', 'label', 'src', 'srclang'])],
  [
    'video',
    new Set([
      'autoplay',
      'controls',
      'crossorigin',
      'height',
      'loop',
      'muted',
      'playsinline',
      'poster',
      'preload',
      'src',
      'width',
    ]),
  ],
]);

const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen',
  'autoplay',
  'controls',
  'default',
  'hidden',
  'loop',
  'muted',
  'open',
  'playsinline',
  'reversed',
]);

const URL_ATTRIBUTES = new Set(['cite', 'href', 'poster', 'src']);

const REACT_PROP_NAMES = new Map([
  ['allowfullscreen', 'allowFullScreen'],
  ['autoplay', 'autoPlay'],
  ['class', 'className'],
  ['colspan', 'colSpan'],
  ['crossorigin', 'crossOrigin'],
  ['datetime', 'dateTime'],
  ['hreflang', 'hrefLang'],
  ['playsinline', 'playsInline'],
  ['referrerpolicy', 'referrerPolicy'],
  ['rowspan', 'rowSpan'],
  ['srclang', 'srcLang'],
  ['srcset', 'srcSet'],
  ['tabindex', 'tabIndex'],
]);

export function safeElementProps(
  tagName: string,
  attributes: { name: string; value: string }[],
): Record<string, unknown> {
  const allowed = ELEMENT_ATTRIBUTES.get(tagName);
  const props: Record<string, unknown> = {};

  for (const { name, value } of attributes) {
    const attribute = name.toLowerCase();
    if (attribute.startsWith('on')) {
      throw new HtmdxSourceError(
        'event-handler-attribute',
        `event handler attribute "${name}" is not allowed`,
      );
    }
    if (/^(?:aria|data)-[a-z0-9_.:-]+$/.test(attribute)) {
      props[attribute] = value;
      continue;
    }
    if (!GLOBAL_ATTRIBUTES.has(attribute) && !allowed?.has(attribute)) {
      continue;
    }
    if (attribute === 'style') {
      const style = safeStyle(value);
      if (style) {
        props.style = style;
      }
      continue;
    }
    if (BOOLEAN_ATTRIBUTES.has(attribute)) {
      props[reactPropName(attribute)] = value !== 'false';
      continue;
    }
    if (URL_ATTRIBUTES.has(attribute)) {
      const url = safeHref(value);
      if (url) {
        props[reactPropName(attribute)] = url;
      }
      continue;
    }
    if (attribute === 'srcset') {
      const srcSet = safeSrcSet(value);
      if (srcSet) {
        props.srcSet = srcSet;
      }
      continue;
    }
    props[reactPropName(attribute)] = value;
  }
  return props;
}

function reactPropName(attribute: string) {
  return REACT_PROP_NAMES.get(attribute) || attribute;
}

// React needs a style object, and the string form is where CSS can smuggle in
// script-ish values, so declarations are parsed one at a time and any whose
// value carries an unsafe url() or a legacy expression() is dropped.
export function safeStyle(value: string): Record<string, string> | null {
  const style: Record<string, string> = {};
  for (const declaration of value.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) {
      continue;
    }
    const property = declaration.slice(0, separator).trim();
    const declared = declaration.slice(separator + 1).trim();
    if (!declared || !/^(?:--)?[a-z][a-z0-9-]*$/i.test(property)) {
      continue;
    }
    if (/expression\s*\(/i.test(declared) || !safeStyleUrls(declared)) {
      continue;
    }
    style[property.startsWith('--') ? property : camelCase(property)] = declared;
  }
  return Object.keys(style).length > 0 ? style : null;
}

function safeStyleUrls(declared: string) {
  return Array.from(declared.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)).every((match) =>
    Boolean(safeHref(match[2])),
  );
}

function safeSrcSet(value: string) {
  const candidates = value
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  if (candidates.length === 0) {
    return null;
  }
  return candidates.every((candidate) => safeHref(candidate.split(/\s+/)[0]))
    ? candidates.join(', ')
    : null;
}

function camelCase(property: string) {
  return property.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
}
