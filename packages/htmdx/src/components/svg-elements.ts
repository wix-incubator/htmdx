// Inline SVG has its own element and attribute space, so it gets its own
// allowlist rather than an extension of the HTML one. Two properties of SVG
// drive the shape of this file: element and attribute names are case sensitive
// (`linearGradient`, `viewBox`), and the forgiving HTML parse uppercases tag
// names while lowercasing attribute names. Both are keyed by lowercase and
// resolve to canonical casing, so either parse path lands on the same element.
//
// Left out on purpose: `<script>`, `<foreignObject>`, `<use>`, `<image>`, the
// animation elements, and `<a>`. Each is a way to reach outside the graphic —
// into script, into HTML, or into another document.
import { HtmdxSourceError } from '../diagnostics';
import { safeStyle } from './html-elements';

const ELEMENT_NAMES = [
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComposite',
  'feDropShadow',
  'feFlood',
  'feGaussianBlur',
  'feMerge',
  'feMergeNode',
  'feOffset',
  'filter',
  'g',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'symbol',
  'text',
  'textPath',
  'title',
  'tspan',
];

/** Lowercased tag name to the casing React and the SVG DOM expect. */
export const SVG_ELEMENTS = new Map(ELEMENT_NAMES.map((name) => [name.toLowerCase(), name]));

// Attributes every element may carry, on top of `aria-*` and `data-*`.
const GLOBAL_ATTRIBUTES = new Set([
  'class',
  'id',
  'lang',
  'role',
  'style',
  'tabindex',
  'transform',
]);

// Presentation attributes are valid on any renderable element and are the SVG
// equivalent of styling, so they are shared rather than repeated per element.
const PRESENTATION_ATTRIBUTES = new Set([
  'alignment-baseline',
  'baseline-shift',
  'clip-path',
  'clip-rule',
  'color',
  'display',
  'dominant-baseline',
  'fill',
  'fill-opacity',
  'fill-rule',
  'filter',
  'font-family',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'mix-blend-mode',
  'opacity',
  'overflow',
  'paint-order',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'transform-origin',
  'vector-effect',
  'visibility',
  'word-spacing',
  'writing-mode',
]);

const FILTER_PRIMITIVE_ATTRIBUTES = ['height', 'in', 'result', 'width', 'x', 'y'] as const;

function filterPrimitive(...extra: string[]) {
  return new Set([...FILTER_PRIMITIVE_ATTRIBUTES, ...extra]);
}

const ELEMENT_ATTRIBUTES = new Map([
  ['circle', new Set(['cx', 'cy', 'r', 'pathlength'])],
  ['clippath', new Set(['clippathunits'])],
  ['ellipse', new Set(['cx', 'cy', 'rx', 'ry', 'pathlength'])],
  ['feblend', filterPrimitive('in2', 'mode')],
  ['fecolormatrix', filterPrimitive('type', 'values')],
  ['fecomposite', filterPrimitive('in2', 'k1', 'k2', 'k3', 'k4', 'operator')],
  ['fedropshadow', filterPrimitive('dx', 'dy', 'stddeviation')],
  ['feflood', filterPrimitive('flood-color', 'flood-opacity')],
  ['fegaussianblur', filterPrimitive('edgemode', 'stddeviation')],
  ['femerge', filterPrimitive()],
  ['femergenode', new Set(['in'])],
  ['feoffset', filterPrimitive('dx', 'dy')],
  ['filter', new Set(['filterunits', 'height', 'primitiveunits', 'width', 'x', 'y'])],
  ['line', new Set(['pathlength', 'x1', 'x2', 'y1', 'y2'])],
  [
    'lineargradient',
    new Set(['gradienttransform', 'gradientunits', 'spreadmethod', 'x1', 'x2', 'y1', 'y2']),
  ],
  [
    'marker',
    new Set([
      'markerheight',
      'markerunits',
      'markerwidth',
      'orient',
      'preserveaspectratio',
      'refx',
      'refy',
      'viewbox',
    ]),
  ],
  ['mask', new Set(['height', 'maskcontentunits', 'maskunits', 'width', 'x', 'y'])],
  ['path', new Set(['d', 'pathlength'])],
  [
    'pattern',
    new Set([
      'height',
      'patterncontentunits',
      'patterntransform',
      'patternunits',
      'preserveaspectratio',
      'viewbox',
      'width',
      'x',
      'y',
    ]),
  ],
  ['polygon', new Set(['pathlength', 'points'])],
  ['polyline', new Set(['pathlength', 'points'])],
  [
    'radialgradient',
    new Set([
      'cx',
      'cy',
      'fr',
      'fx',
      'fy',
      'gradienttransform',
      'gradientunits',
      'r',
      'spreadmethod',
    ]),
  ],
  ['rect', new Set(['height', 'pathlength', 'rx', 'ry', 'width', 'x', 'y'])],
  ['stop', new Set(['offset'])],
  ['svg', new Set(['height', 'preserveaspectratio', 'viewbox', 'width', 'xmlns'])],
  [
    'symbol',
    new Set(['height', 'preserveaspectratio', 'refx', 'refy', 'viewbox', 'width', 'x', 'y']),
  ],
  ['text', new Set(['dx', 'dy', 'lengthadjust', 'rotate', 'textlength', 'x', 'y'])],
  ['textpath', new Set(['href', 'method', 'side', 'spacing', 'startoffset', 'textlength'])],
  ['tspan', new Set(['dx', 'dy', 'lengthadjust', 'rotate', 'textlength', 'x', 'y'])],
]);

// Attributes whose SVG spelling is not recoverable by lowercasing, plus the few
// React renames. Everything else is either already lowercase or hyphenated,
// and hyphenated names camel-case mechanically.
const CANONICAL_NAMES = new Map([
  ['class', 'className'],
  ['clippathunits', 'clipPathUnits'],
  ['edgemode', 'edgeMode'],
  ['filterunits', 'filterUnits'],
  ['gradienttransform', 'gradientTransform'],
  ['gradientunits', 'gradientUnits'],
  ['lengthadjust', 'lengthAdjust'],
  ['markerheight', 'markerHeight'],
  ['markerunits', 'markerUnits'],
  ['markerwidth', 'markerWidth'],
  ['maskcontentunits', 'maskContentUnits'],
  ['maskunits', 'maskUnits'],
  ['pathlength', 'pathLength'],
  ['patterncontentunits', 'patternContentUnits'],
  ['patterntransform', 'patternTransform'],
  ['patternunits', 'patternUnits'],
  ['preserveaspectratio', 'preserveAspectRatio'],
  ['primitiveunits', 'primitiveUnits'],
  ['refx', 'refX'],
  ['refy', 'refY'],
  ['spreadmethod', 'spreadMethod'],
  ['startoffset', 'startOffset'],
  ['stddeviation', 'stdDeviation'],
  ['tabindex', 'tabIndex'],
  ['textlength', 'textLength'],
  ['viewbox', 'viewBox'],
]);

// A paint value may reference a gradient, mask, or filter defined in the same
// document. That is the only `url()` an SVG attribute is allowed to carry: no
// scheme, no path, no other document.
const LOCAL_REFERENCE = /^url\(\s*(['"]?)#[A-Za-z_][\w.:-]*\1\s*\)$/;
const FRAGMENT = /^#[A-Za-z_][\w.:-]*$/;

export function safeSvgProps(
  tagName: string,
  attributes: { name: string; value: string }[],
): Record<string, unknown> {
  const allowed = ELEMENT_ATTRIBUTES.get(tagName.toLowerCase());
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
    if (attribute === 'href' || attribute === 'xlink:href') {
      // Only a same-document reference, and only where an SVG element needs one
      // to be useful at all. Anything else is a way out of the graphic.
      if (allowed?.has('href') && FRAGMENT.test(value.trim())) {
        props.href = value.trim();
      }
      continue;
    }
    if (
      !GLOBAL_ATTRIBUTES.has(attribute) &&
      !PRESENTATION_ATTRIBUTES.has(attribute) &&
      !allowed?.has(attribute)
    ) {
      continue;
    }
    if (attribute === 'style') {
      const style = safeStyle(value);
      if (style) {
        props.style = style;
      }
      continue;
    }
    if (value.includes('url(') && !LOCAL_REFERENCE.test(value.trim())) {
      continue;
    }
    props[reactPropName(attribute)] = value;
  }
  return props;
}

function reactPropName(attribute: string) {
  const canonical = CANONICAL_NAMES.get(attribute);
  if (canonical) {
    return canonical;
  }
  return attribute.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
}
